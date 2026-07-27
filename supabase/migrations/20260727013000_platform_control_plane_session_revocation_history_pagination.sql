-- Phase 12 hardening: dedicated server-side session revocation history pagination.

DO $$
BEGIN
  IF to_regclass('public.platform_audit_events') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_SESSION_REVOCATION_HISTORY_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_platform_audit_events_revocation_feed
  ON public.platform_audit_events (created_at DESC)
  WHERE event_type = 'session.revocation.applied'
     OR action = 'revoke_active_platform_sessions';

CREATE OR REPLACE FUNCTION public.platform_get_session_revocation_history_page(
  p_company_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_principal_type text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL,
  p_result_status text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_principal_type text := nullif(lower(trim(coalesce(p_principal_type, ''))), '');
  v_result_status text := nullif(lower(trim(coalesce(p_result_status, ''))), '');
  v_severity text := nullif(lower(trim(coalesce(p_severity, ''))), '');
  v_correlation_id text := nullif(trim(coalesce(p_correlation_id, '')), '');
  v_page integer := GREATEST(1, COALESCE(p_page, 1));
  v_page_size integer := LEAST(200, GREATEST(10, COALESCE(p_page_size, 50)));
  v_offset integer;
  v_rows jsonb := '[]'::jsonb;
  v_total_count integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  IF v_principal_type IS NOT NULL AND v_principal_type NOT IN ('company', 'user') THEN
    RAISE EXCEPTION 'INVALID_PRINCIPAL_TYPE';
  END IF;

  IF v_result_status IS NOT NULL AND v_result_status NOT IN ('success', 'warning', 'blocked', 'denied', 'error') THEN
    RAISE EXCEPTION 'INVALID_RESULT_STATUS';
  END IF;

  IF v_severity IS NOT NULL AND v_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    RAISE EXCEPTION 'INVALID_SEVERITY';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  WITH filtered AS (
    SELECT
      e.id,
      e.created_at,
      e.result_status,
      e.severity,
      e.company_id,
      e.actor_user_id,
      e.correlation_id,
      coalesce(nullif(e.principal_type, ''), nullif(e.metadata ->> 'principal_type', '')) AS principal_type,
      coalesce(nullif(e.principal_id, ''), nullif(e.metadata ->> 'principal_id', '')) AS principal_id,
      CASE
        WHEN jsonb_typeof(e.metadata -> 'revoked_sessions') = 'number' THEN (e.metadata ->> 'revoked_sessions')::integer
        ELSE 0
      END AS revoked_sessions,
      CASE
        WHEN jsonb_typeof(e.metadata -> 'revoked_impersonation_sessions') = 'number' THEN (e.metadata ->> 'revoked_impersonation_sessions')::integer
        ELSE 0
      END AS revoked_impersonation_sessions,
      nullif(e.metadata ->> 'reason', '') AS reason,
      e.module,
      e.action
    FROM public.platform_audit_events e
    WHERE (e.event_type = 'session.revocation.applied' OR e.action = 'revoke_active_platform_sessions')
      AND (p_company_id IS NULL OR e.company_id = p_company_id)
      AND (p_actor_user_id IS NULL OR e.actor_user_id = p_actor_user_id)
      AND (v_principal_type IS NULL OR coalesce(nullif(e.principal_type, ''), nullif(e.metadata ->> 'principal_type', '')) = v_principal_type)
      AND (p_created_after IS NULL OR e.created_at >= p_created_after)
      AND (p_created_before IS NULL OR e.created_at <= p_created_before)
      AND (v_result_status IS NULL OR e.result_status = v_result_status)
      AND (v_severity IS NULL OR e.severity = v_severity)
      AND (v_correlation_id IS NULL OR e.correlation_id = v_correlation_id)
  ),
  counted AS (
    SELECT count(*)::integer AS total_count
    FROM filtered
  ),
  paged AS (
    SELECT *
    FROM filtered
    ORDER BY created_at DESC
    OFFSET v_offset
    LIMIT v_page_size
  )
  SELECT
    coalesce((SELECT jsonb_agg(row_to_json(paged)) FROM paged), '[]'::jsonb),
    coalesce((SELECT total_count FROM counted), 0)
  INTO v_rows, v_total_count;

  RETURN jsonb_build_object(
    'rows', v_rows,
    'page', v_page,
    'page_size', v_page_size,
    'total_count', v_total_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_session_revocation_history_page(uuid, uuid, text, timestamptz, timestamptz, text, text, text, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.platform_get_session_revocation_history_page(uuid, uuid, text, timestamptz, timestamptz, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_session_revocation_history_page(uuid, uuid, text, timestamptz, timestamptz, text, text, text, integer, integer) TO service_role;
