-- Scale-grade server pagination and filtering for the unified risk queue.

DO $$
BEGIN
  IF to_regclass('public.governance_alerts') IS NULL
     OR to_regclass('public.abuse_signals') IS NULL
     OR to_regclass('public.risk_decisions') IS NULL
     OR to_regclass('public.platform_risk_queue_triage_actions') IS NULL THEN
    RAISE EXCEPTION 'RISK_QUEUE_PAGE_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_platform_governance_alerts_company_status_created
  ON public.governance_alerts (company_id, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_abuse_signals_company_detected_id
  ON public.abuse_signals (company_id, detected_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_platform_risk_decisions_company_decided_id
  ON public.risk_decisions (company_id, decided_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.platform_get_risk_queue_page(
  p_company_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_triage_status text DEFAULT NULL,
  p_occurred_after timestamptz DEFAULT NULL,
  p_occurred_before timestamptz DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
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
  v_triage_status text := nullif(lower(btrim(coalesce(p_triage_status, ''))), '');
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := least(100, greatest(5, coalesce(p_page_size, 20)));
  v_rows jsonb := '[]'::jsonb;
  v_total_count bigint := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;
  IF v_severity = 'error' THEN v_severity := 'critical'; END IF;
  IF v_severity IS NOT NULL AND v_severity NOT IN ('info', 'warning', 'critical') THEN
    RAISE EXCEPTION 'INVALID_RISK_SEVERITY';
  END IF;
  IF v_triage_status IS NOT NULL AND v_triage_status NOT IN ('open', 'acknowledged', 'resolved', 'escalated', 'false_positive') THEN
    RAISE EXCEPTION 'INVALID_TRIAGE_STATUS';
  END IF;

  WITH combined AS MATERIALIZED (
    SELECT 'governance_alert'::text AS row_type, ga.id AS row_id, ga.company_id, ga.severity, ga.status,
      ga.title, coalesce(ga.description, ga.alert_type) AS detail,
      CASE ga.severity WHEN 'critical' THEN 95 WHEN 'warning' THEN 70 ELSE 30 END AS score,
      ga.created_at AS occurred_at, coalesce(ga.metadata, '{}'::jsonb) AS metadata
    FROM public.governance_alerts ga
    WHERE (p_company_id IS NULL OR ga.company_id = p_company_id)
      AND (p_occurred_after IS NULL OR ga.created_at >= p_occurred_after)
      AND (p_occurred_before IS NULL OR ga.created_at <= p_occurred_before)
    UNION ALL
    SELECT 'abuse_signal', a.id, a.company_id,
      CASE a.severity WHEN 'critical' THEN 'critical' WHEN 'high' THEN 'warning' WHEN 'medium' THEN 'warning' ELSE 'info' END,
      'open', concat('Abuse signal: ', a.signal_type), concat('Detected ', a.signal_type, ' for marketplace flow'),
      CASE a.severity WHEN 'critical' THEN 95 WHEN 'high' THEN 85 WHEN 'medium' THEN 65 ELSE 40 END,
      a.detected_at, coalesce(a.metadata, '{}'::jsonb)
    FROM public.abuse_signals a
    WHERE (p_company_id IS NULL OR a.company_id = p_company_id)
      AND (p_occurred_after IS NULL OR a.detected_at >= p_occurred_after)
      AND (p_occurred_before IS NULL OR a.detected_at <= p_occurred_before)
    UNION ALL
    SELECT 'risk_decision', r.id, r.company_id,
      CASE r.decision WHEN 'block' THEN 'critical' WHEN 'review' THEN 'warning' ELSE 'info' END,
      'open', concat('Risk decision: ', r.decision), concat('Risk decision score ', r.score::text), r.score,
      r.decided_at, coalesce(r.metadata, '{}'::jsonb) || jsonb_build_object('reason_codes', r.reason_codes)
    FROM public.risk_decisions r
    WHERE (p_company_id IS NULL OR r.company_id = p_company_id)
      AND (p_occurred_after IS NULL OR r.decided_at >= p_occurred_after)
      AND (p_occurred_before IS NULL OR r.decided_at <= p_occurred_before)
  ), with_triage AS MATERIALIZED (
    SELECT c.row_type, c.row_id, c.company_id, c.severity,
      coalesce(latest_triage.triage_status, c.status) AS status,
      c.title, c.detail, c.score, c.occurred_at, c.metadata
    FROM combined c
    LEFT JOIN LATERAL (
      SELECT action.triage_status
      FROM public.platform_risk_queue_triage_actions action
      WHERE action.row_type = c.row_type AND action.row_id = c.row_id
      ORDER BY action.created_at DESC, action.id DESC
      LIMIT 1
    ) latest_triage ON true
  ), filtered AS MATERIALIZED (
    SELECT * FROM with_triage item
    WHERE (v_severity IS NULL OR item.severity = v_severity)
      AND (v_triage_status IS NULL OR item.status = v_triage_status)
      AND (v_search IS NULL OR lower(item.title) LIKE '%' || v_search || '%'
        OR lower(item.detail) LIKE '%' || v_search || '%'
        OR lower(item.row_type) LIKE '%' || v_search || '%'
        OR item.row_id::text = v_search OR item.company_id::text = v_search)
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY occurred_at DESC, row_type, row_id DESC
    OFFSET (v_page - 1) * v_page_size LIMIT v_page_size
  )
  SELECT coalesce((SELECT jsonb_agg(to_jsonb(paged) ORDER BY occurred_at DESC, row_type, row_id DESC) FROM paged), '[]'::jsonb),
    (SELECT count(*) FROM filtered)
  INTO v_rows, v_total_count;

  RETURN jsonb_build_object('rows', v_rows, 'page', v_page, 'page_size', v_page_size, 'total_count', v_total_count);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_get_risk_queue_page(uuid,text,text,text,timestamptz,timestamptz,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_get_risk_queue_page(uuid,text,text,text,timestamptz,timestamptz,integer,integer) TO authenticated, service_role;