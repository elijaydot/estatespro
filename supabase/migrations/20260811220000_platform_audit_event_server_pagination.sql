-- Scale-grade audit event filtering and pagination for the Control Plane.

CREATE INDEX IF NOT EXISTS idx_platform_audit_events_actor_created
  ON public.platform_audit_events (actor_user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_result_created
  ON public.platform_audit_events (result_status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_severity_created
  ON public.platform_audit_events (severity, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.platform_get_audit_events_page(
  p_company_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_result_status text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL,
  p_created_before timestamptz DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_severity text := nullif(lower(btrim(coalesce(p_severity, ''))), '');
  v_result_status text := nullif(lower(btrim(coalesce(p_result_status, ''))), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 25)));
  v_rows jsonb := '[]'::jsonb;
  v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;
  IF v_severity IS NOT NULL AND v_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    RAISE EXCEPTION 'INVALID_EVENT_SEVERITY';
  END IF;
  IF v_result_status IS NOT NULL AND v_result_status NOT IN ('success', 'warning', 'blocked', 'denied', 'error') THEN
    RAISE EXCEPTION 'INVALID_EVENT_RESULT_STATUS';
  END IF;

  WITH filtered AS MATERIALIZED (
    SELECT event.id, event.source, event.event_type, event.module, event.action, event.severity,
      event.result_status, event.actor_user_id, event.company_id, event.correlation_id,
      event.risk_score, event.metadata, event.created_at
    FROM public.platform_audit_events event
    WHERE (p_company_id IS NULL OR event.company_id = p_company_id)
      AND (p_actor_user_id IS NULL OR event.actor_user_id = p_actor_user_id)
      AND (v_severity IS NULL OR event.severity = v_severity)
      AND (v_result_status IS NULL OR event.result_status = v_result_status)
      AND (v_correlation_id IS NULL OR event.correlation_id = v_correlation_id)
      AND (p_created_after IS NULL OR event.created_at >= p_created_after)
      AND (p_created_before IS NULL OR event.created_at <= p_created_before)
      AND (v_search IS NULL
        OR lower(event.source) LIKE '%' || v_search || '%'
        OR lower(event.event_type) LIKE '%' || v_search || '%'
        OR lower(event.module) LIKE '%' || v_search || '%'
        OR lower(event.action) LIKE '%' || v_search || '%'
        OR lower(coalesce(event.correlation_id, '')) LIKE '%' || v_search || '%'
        OR event.id::text = v_search OR event.company_id::text = v_search OR event.actor_user_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered)
  INTO v_rows, v_total_count;

  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_audit_events_page(uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_audit_events_page(uuid,uuid,text,text,text,text,timestamptz,timestamptz,integer,integer) TO authenticated, service_role;