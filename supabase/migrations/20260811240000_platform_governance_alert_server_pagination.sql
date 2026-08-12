-- Server-paginated governance alerts for scale-grade monitoring.

CREATE INDEX IF NOT EXISTS idx_governance_alerts_severity_created
  ON public.governance_alerts (severity, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_correlation_created
  ON public.governance_alerts (correlation_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.platform_get_governance_alerts_page(
  p_company_id uuid DEFAULT NULL, p_search text DEFAULT NULL, p_severity text DEFAULT NULL,
  p_status text DEFAULT NULL, p_correlation_id text DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL, p_created_before timestamptz DEFAULT NULL,
  p_page integer DEFAULT 1, p_page_size integer DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid(); v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
  v_severity text := nullif(lower(btrim(coalesce(p_severity, ''))), '');
  v_status text := nullif(lower(btrim(coalesce(p_status, ''))), '');
  v_correlation_id text := nullif(btrim(coalesce(p_correlation_id, '')), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 25)));
  v_rows jsonb := '[]'::jsonb; v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' AND (v_actor IS NULL OR (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  )) THEN RAISE EXCEPTION 'RISK_OPERATOR_REQUIRED'; END IF;
  IF v_severity = 'error' THEN v_severity := 'critical'; END IF;
  IF v_severity IS NOT NULL AND v_severity NOT IN ('info', 'warning', 'critical') THEN RAISE EXCEPTION 'INVALID_ALERT_SEVERITY'; END IF;
  IF v_status IS NOT NULL AND v_status NOT IN ('open', 'acknowledged', 'resolved') THEN RAISE EXCEPTION 'INVALID_ALERT_STATUS'; END IF;

  WITH filtered AS MATERIALIZED (
    SELECT alert.id, alert.severity, alert.status, alert.alert_type, alert.title, alert.description,
      alert.company_id, alert.correlation_id, alert.metadata, alert.created_at, alert.updated_at, alert.resolved_at
    FROM public.governance_alerts alert
    WHERE (p_company_id IS NULL OR alert.company_id = p_company_id)
      AND (v_severity IS NULL OR alert.severity = v_severity)
      AND (v_status IS NULL OR alert.status = v_status)
      AND (v_correlation_id IS NULL OR alert.correlation_id = v_correlation_id)
      AND (p_created_after IS NULL OR alert.created_at >= p_created_after)
      AND (p_created_before IS NULL OR alert.created_at <= p_created_before)
      AND (v_search IS NULL OR lower(alert.title) LIKE '%' || v_search || '%'
        OR lower(coalesce(alert.description, '')) LIKE '%' || v_search || '%'
        OR lower(alert.alert_type) LIKE '%' || v_search || '%'
        OR alert.id::text = v_search OR alert.company_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered ORDER BY created_at DESC, id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY created_at DESC, id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered) INTO v_rows, v_total_count;
  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_governance_alerts_page(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_governance_alerts_page(uuid,text,text,text,text,timestamptz,timestamptz,integer,integer) TO authenticated, service_role;