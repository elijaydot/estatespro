-- Server-paginated entitlement decisions and usage snapshots for Control Plane operations.

CREATE INDEX IF NOT EXISTS idx_entitlement_decisions_actor_created
  ON public.entitlement_decisions (actor_user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_entitlement_decisions_allowed_created
  ON public.entitlement_decisions (allowed, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_state_snapshot
  ON public.usage_snapshots (limit_state, snapshot_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.platform_get_entitlement_decisions_page(
  p_company_id uuid DEFAULT NULL, p_actor_user_id uuid DEFAULT NULL, p_search text DEFAULT NULL,
  p_allowed boolean DEFAULT NULL, p_correlation_id text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL, p_created_before timestamptz DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid(); v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 25)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  )) THEN RAISE EXCEPTION 'PLATFORM_OPERATOR_REQUIRED'; END IF;

  WITH filtered AS MATERIALIZED (
    SELECT decision.id, decision.company_id, decision.actor_user_id, decision.module, decision.action,
      decision.entitlement_key, decision.allowed, decision.decision_reason, decision.correlation_id,
      decision.risk_score, decision.created_at
    FROM public.entitlement_decisions decision
    WHERE (p_company_id IS NULL OR decision.company_id = p_company_id)
      AND (p_actor_user_id IS NULL OR decision.actor_user_id = p_actor_user_id)
      AND (p_allowed IS NULL OR decision.allowed = p_allowed)
      AND (v_correlation_id IS NULL OR decision.correlation_id = v_correlation_id)
      AND (p_created_after IS NULL OR decision.created_at >= p_created_after)
      AND (p_created_before IS NULL OR decision.created_at <= p_created_before)
      AND (v_search IS NULL OR lower(decision.module) LIKE '%' || v_search || '%'
        OR lower(decision.action) LIKE '%' || v_search || '%'
        OR lower(decision.entitlement_key) LIKE '%' || v_search || '%'
        OR lower(coalesce(decision.decision_reason, '')) LIKE '%' || v_search || '%'
        OR decision.id::text = v_search OR decision.company_id::text = v_search OR decision.actor_user_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered) INTO v_rows, v_total_count;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_usage_snapshots_page(
  p_company_id uuid DEFAULT NULL, p_search text DEFAULT NULL, p_limit_state text DEFAULT NULL,
  p_snapshot_after timestamptz DEFAULT NULL, p_snapshot_before timestamptz DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid(); v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_limit_state text := nullif(lower(btrim(coalesce(p_limit_state, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 25)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  )) THEN RAISE EXCEPTION 'PLATFORM_OPERATOR_REQUIRED'; END IF;

  WITH filtered AS MATERIALIZED (
    SELECT snapshot.id, snapshot.company_id, snapshot.product_code, snapshot.quota_code,
      snapshot.used_value, snapshot.soft_limit, snapshot.hard_limit, snapshot.remaining,
      snapshot.usage_percent, snapshot.limit_state, snapshot.snapshot_at
    FROM public.usage_snapshots snapshot
    WHERE (p_company_id IS NULL OR snapshot.company_id = p_company_id)
      AND (v_limit_state IS NULL OR lower(snapshot.limit_state) = v_limit_state)
      AND (p_snapshot_after IS NULL OR snapshot.snapshot_at >= p_snapshot_after)
      AND (p_snapshot_before IS NULL OR snapshot.snapshot_at <= p_snapshot_before)
      AND (v_search IS NULL OR lower(snapshot.product_code) LIKE '%' || v_search || '%'
        OR lower(snapshot.quota_code) LIKE '%' || v_search || '%'
        OR lower(snapshot.limit_state) LIKE '%' || v_search || '%'
        OR snapshot.id::text = v_search OR snapshot.company_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered ORDER BY snapshot_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY snapshot_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered) INTO v_rows, v_total_count;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_entitlement_decisions_page(uuid,uuid,text,boolean,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_get_usage_snapshots_page(uuid,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_entitlement_decisions_page(uuid,uuid,text,boolean,text,timestamptz,timestamptz,integer,integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_usage_snapshots_page(uuid,text,text,timestamptz,timestamptz,integer,integer) TO authenticated, service_role;