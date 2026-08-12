-- Server-paginated safety operations and reliable current-operator session lookup.

CREATE INDEX IF NOT EXISTS idx_platform_entitlement_overrides_active_created
  ON public.platform_entitlement_overrides (company_id, decision, created_at DESC, id DESC)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_principal_suspensions_active_created
  ON public.platform_principal_suspensions (principal_type, created_at DESC, id DESC)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_impersonation_actor_active_started
  ON public.platform_impersonation_sessions (actor_user_id, started_at DESC, id DESC)
  WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_platform_impersonation_company_active_started
  ON public.platform_impersonation_sessions (company_id, started_at DESC, id DESC)
  WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION public.platform_get_entitlement_overrides_page(
  p_company_id uuid DEFAULT NULL, p_search text DEFAULT NULL, p_decision text DEFAULT NULL,
  p_only_active boolean DEFAULT true, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid(); v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_decision text := nullif(lower(btrim(coalesce(p_decision, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 20)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
  )) THEN RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE'; END IF;
  IF v_decision IS NOT NULL AND v_decision NOT IN ('allow', 'deny') THEN RAISE EXCEPTION 'INVALID_OVERRIDE_DECISION'; END IF;

  WITH filtered AS MATERIALIZED (
    SELECT override.id, override.company_id, override.entitlement_key, override.decision, override.reason,
      override.expires_at, override.created_by, override.created_at, override.revoked_at, override.revoked_by
    FROM public.platform_entitlement_overrides override
    WHERE (p_company_id IS NULL OR override.company_id = p_company_id)
      AND (NOT coalesce(p_only_active, true) OR override.revoked_at IS NULL)
      AND (v_decision IS NULL OR override.decision = v_decision)
      AND (v_search IS NULL OR lower(override.entitlement_key) LIKE '%' || v_search || '%'
        OR lower(override.reason) LIKE '%' || v_search || '%'
        OR override.id::text = v_search OR override.company_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered) INTO v_rows, v_total_count;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_active_suspensions_page(
  p_principal_type text DEFAULT NULL, p_search text DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid(); v_type text := nullif(lower(btrim(coalesce(p_principal_type, ''))), '');
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 20)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  )) THEN RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE'; END IF;
  IF v_type IS NOT NULL AND v_type NOT IN ('company', 'user') THEN RAISE EXCEPTION 'INVALID_PRINCIPAL_TYPE'; END IF;

  WITH filtered AS MATERIALIZED (
    SELECT suspension.id, suspension.principal_type, suspension.principal_id, suspension.reason,
      suspension.created_by, suspension.created_at, suspension.metadata
    FROM public.platform_principal_suspensions suspension
    WHERE suspension.is_active = true
      AND (v_type IS NULL OR suspension.principal_type = v_type)
      AND (v_search IS NULL OR lower(suspension.reason) LIKE '%' || v_search || '%'
        OR suspension.principal_id::text = v_search OR lower(suspension.principal_type) LIKE '%' || v_search || '%')
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered) INTO v_rows, v_total_count;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_impersonation_sessions_page(
  p_company_id uuid DEFAULT NULL, p_actor_user_id uuid DEFAULT NULL, p_search text DEFAULT NULL,
  p_only_active boolean DEFAULT true, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid(); v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 20)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  )) THEN RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE'; END IF;

  WITH filtered AS MATERIALIZED (
    SELECT session.id, session.session_id, session.actor_user_id, session.target_user_id, session.company_id,
      session.reason, session.started_at, session.expires_at, session.ended_at, session.created_at
    FROM public.platform_impersonation_sessions session
    WHERE (p_company_id IS NULL OR session.company_id = p_company_id)
      AND (p_actor_user_id IS NULL OR session.actor_user_id = p_actor_user_id)
      AND (NOT coalesce(p_only_active, true) OR (session.ended_at IS NULL AND session.expires_at > now()))
      AND (v_search IS NULL OR lower(session.reason) LIKE '%' || v_search || '%'
        OR session.id::text = v_search OR session.actor_user_id::text = v_search
        OR session.target_user_id::text = v_search OR session.company_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered ORDER BY started_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY started_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered) INTO v_rows, v_total_count;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_current_operator_impersonation_session()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid(); v_session public.platform_impersonation_sessions%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_platform_super_admin(v_actor) AND NOT public.has_platform_operator_role(v_actor, 'support_operator') THEN
    RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
  END IF;
  SELECT * INTO v_session FROM public.platform_impersonation_sessions session
  WHERE session.actor_user_id = v_actor AND session.ended_at IS NULL AND session.expires_at > now()
  ORDER BY session.started_at DESC, session.id DESC LIMIT 1;
  IF v_session.id IS NULL THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_session);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_entitlement_overrides_page(uuid,text,text,boolean,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_active_suspensions_page(text,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_impersonation_sessions_page(uuid,uuid,text,boolean,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_current_operator_impersonation_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_entitlement_overrides_page(uuid,text,text,boolean,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_active_suspensions_page(text,text,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_impersonation_sessions_page(uuid,uuid,text,boolean,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_current_operator_impersonation_session() TO authenticated, service_role;