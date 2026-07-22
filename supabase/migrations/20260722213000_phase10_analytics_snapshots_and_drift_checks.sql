-- Phase 10 backend extension: persisted analytics snapshots + drift checks + governance alerts.

DO $$
BEGIN
  IF to_regclass('public.platform_audit_events') IS NULL
     OR to_regclass('public.entitlement_decisions') IS NULL
     OR to_regclass('public.usage_snapshots') IS NULL
     OR to_regclass('public.governance_alerts') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL
     OR to_regprocedure('public.platform_create_governance_alert(text,text,text,text,uuid,uuid,text,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'PHASE10_PREREQUISITES_MISSING: Run Phase 7 control plane foundation first.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.platform_analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_window text NOT NULL,
  snapshot_start timestamptz NOT NULL,
  snapshot_end timestamptz NOT NULL,
  total_events integer NOT NULL DEFAULT 0,
  blocked_events integer NOT NULL DEFAULT 0,
  denied_events integer NOT NULL DEFAULT 0,
  high_risk_events integer NOT NULL DEFAULT 0,
  entitlement_allowed integer NOT NULL DEFAULT 0,
  entitlement_denied integer NOT NULL DEFAULT 0,
  open_alerts integer NOT NULL DEFAULT 0,
  critical_open_alerts integer NOT NULL DEFAULT 0,
  usage_pressure_count integer NOT NULL DEFAULT 0,
  module_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  company_risk_watchlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_window, snapshot_start, snapshot_end)
);

CREATE TABLE IF NOT EXISTS public.platform_drift_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'warning', 'critical')),
  observed_value numeric NOT NULL,
  threshold_value numeric NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_id uuid REFERENCES public.governance_alerts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_analytics_snapshots_created
  ON public.platform_analytics_snapshots (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_analytics_snapshots_window
  ON public.platform_analytics_snapshots (snapshot_start DESC, snapshot_end DESC);

CREATE INDEX IF NOT EXISTS idx_platform_drift_checks_created
  ON public.platform_drift_checks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_drift_checks_key
  ON public.platform_drift_checks (check_key, created_at DESC);

ALTER TABLE public.platform_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_drift_checks ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'platform_analytics_snapshots',
    'platform_drift_checks'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = 'Super admins can manage ' || v_table
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()))',
        'Super admins can manage ' || v_table,
        v_table
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_analytics_snapshots'
      AND policyname = 'Security auditors can read analytics snapshots'
  ) THEN
    CREATE POLICY "Security auditors can read analytics snapshots"
    ON public.platform_analytics_snapshots
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'security_auditor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_analytics_snapshots'
      AND policyname = 'Billing operators can read analytics snapshots'
  ) THEN
    CREATE POLICY "Billing operators can read analytics snapshots"
    ON public.platform_analytics_snapshots
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'billing_operator'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_drift_checks'
      AND policyname = 'Security auditors can read drift checks'
  ) THEN
    CREATE POLICY "Security auditors can read drift checks"
    ON public.platform_drift_checks
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'security_auditor'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_record_drift_check(
  p_check_key text,
  p_status text,
  p_observed_value numeric,
  p_threshold_value numeric,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_emit_alert boolean DEFAULT true,
  p_correlation_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_id uuid;
  v_alert_id uuid;
  v_severity text;
BEGIN
  INSERT INTO public.platform_drift_checks (
    check_key,
    status,
    observed_value,
    threshold_value,
    window_start,
    window_end,
    details
  ) VALUES (
    p_check_key,
    p_status,
    p_observed_value,
    p_threshold_value,
    p_window_start,
    p_window_end,
    COALESCE(p_details, '{}'::jsonb)
  ) RETURNING id INTO v_check_id;

  IF p_emit_alert AND p_status IN ('warning', 'critical') THEN
    v_severity := CASE
      WHEN p_status = 'critical' THEN 'critical'
      ELSE 'warning'
    END;

    v_alert_id := public.platform_create_governance_alert(
      v_severity,
      'phase10_drift_check',
      'Phase 10 drift threshold exceeded',
      p_check_key || ' breached threshold.',
      NULL,
      NULL,
      COALESCE(p_correlation_id, p_check_key || ':' || extract(epoch from now())::text),
      jsonb_build_object(
        'check_key', p_check_key,
        'status', p_status,
        'observed_value', p_observed_value,
        'threshold_value', p_threshold_value,
        'window_start', p_window_start,
        'window_end', p_window_end,
        'details', COALESCE(p_details, '{}'::jsonb)
      )
    );

    UPDATE public.platform_drift_checks
    SET alert_id = v_alert_id
    WHERE id = v_check_id;
  END IF;

  RETURN v_check_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_phase10_run_all(
  p_window interval DEFAULT interval '24 hours',
  p_emit_alerts boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_window_start timestamptz := now() - COALESCE(p_window, interval '24 hours');
  v_window_end timestamptz := now();
  v_snapshot_window text := COALESCE(p_window::text, '24 hours');
  v_snapshot_id uuid;
  v_total_events integer := 0;
  v_blocked_events integer := 0;
  v_denied_events integer := 0;
  v_high_risk_events integer := 0;
  v_entitlement_allowed integer := 0;
  v_entitlement_denied integer := 0;
  v_open_alerts integer := 0;
  v_critical_open_alerts integer := 0;
  v_usage_pressure integer := 0;
  v_webhook_dead_letters integer := 0;
  v_module_breakdown jsonb := '[]'::jsonb;
  v_company_watchlist jsonb := '[]'::jsonb;
  v_denial_rate numeric := 0;
  v_high_risk_rate numeric := 0;
  v_correlation_id text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_PHASE10_ANALYTICS';
    END IF;
  END IF;

  v_correlation_id := 'phase10-run:' || extract(epoch from now())::text;

  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE result_status = 'blocked')::integer,
    COUNT(*) FILTER (WHERE result_status = 'denied')::integer,
    COUNT(*) FILTER (WHERE risk_score >= 80)::integer
  INTO v_total_events, v_blocked_events, v_denied_events, v_high_risk_events
  FROM public.platform_audit_events
  WHERE created_at >= v_window_start
    AND created_at <= v_window_end;

  SELECT
    COUNT(*) FILTER (WHERE allowed)::integer,
    COUNT(*) FILTER (WHERE NOT allowed)::integer
  INTO v_entitlement_allowed, v_entitlement_denied
  FROM public.entitlement_decisions
  WHERE created_at >= v_window_start
    AND created_at <= v_window_end;

  SELECT
    COUNT(*) FILTER (WHERE status = 'open')::integer,
    COUNT(*) FILTER (WHERE status = 'open' AND severity = 'critical')::integer
  INTO v_open_alerts, v_critical_open_alerts
  FROM public.governance_alerts;

  SELECT COUNT(*)::integer
  INTO v_usage_pressure
  FROM public.usage_snapshots
  WHERE snapshot_at >= v_window_start
    AND snapshot_at <= v_window_end
    AND usage_percent >= 90;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'module', module,
        'events', events,
        'blocked_or_denied', blocked_or_denied,
        'high_risk', high_risk
      )
      ORDER BY events DESC
    ),
    '[]'::jsonb
  )
  INTO v_module_breakdown
  FROM (
    SELECT
      CASE
        WHEN pae.module ILIKE 'marketplace%' THEN 'marketplace'
        WHEN pae.module ILIKE 'crm%' THEN 'crm'
        WHEN pae.module ILIKE 'ai%' THEN 'ai'
        WHEN pae.module ILIKE 'billing%' OR pae.module ILIKE 'entitlement%' THEN 'billing'
        WHEN pae.module ILIKE 'admin%' THEN 'admin'
        ELSE 'core'
      END AS module,
      COUNT(*)::integer AS events,
      COUNT(*) FILTER (WHERE pae.result_status IN ('blocked', 'denied'))::integer AS blocked_or_denied,
      COUNT(*) FILTER (WHERE pae.risk_score >= 80)::integer AS high_risk
    FROM public.platform_audit_events pae
    WHERE pae.created_at >= v_window_start
      AND pae.created_at <= v_window_end
    GROUP BY 1
  ) agg;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'company_id', company_id,
        'denials', denials,
        'high_risk_events', high_risk_events,
        'open_alerts', open_alerts,
        'usage_pressure', usage_pressure,
        'risk_score', risk_score
      )
      ORDER BY risk_score DESC
    ),
    '[]'::jsonb
  )
  INTO v_company_watchlist
  FROM (
    WITH event_rollup AS (
      SELECT
        COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid) AS company_id,
        COUNT(*) FILTER (WHERE result_status IN ('blocked', 'denied'))::integer AS denials,
        COUNT(*) FILTER (WHERE risk_score >= 80)::integer AS high_risk_events
      FROM public.platform_audit_events
      WHERE created_at >= v_window_start
        AND created_at <= v_window_end
      GROUP BY 1
    ),
    decision_rollup AS (
      SELECT
        COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid) AS company_id,
        COUNT(*) FILTER (WHERE NOT allowed)::integer AS decision_denials
      FROM public.entitlement_decisions
      WHERE created_at >= v_window_start
        AND created_at <= v_window_end
      GROUP BY 1
    ),
    alert_rollup AS (
      SELECT
        COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid) AS company_id,
        COUNT(*) FILTER (WHERE status = 'open')::integer AS open_alerts
      FROM public.governance_alerts
      GROUP BY 1
    ),
    usage_rollup AS (
      SELECT
        COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid) AS company_id,
        COUNT(*) FILTER (WHERE usage_percent >= 90)::integer AS usage_pressure
      FROM public.usage_snapshots
      WHERE snapshot_at >= v_window_start
        AND snapshot_at <= v_window_end
      GROUP BY 1
    )
    SELECT
      company_id::text,
      denials,
      high_risk_events,
      open_alerts,
      usage_pressure,
      ((denials * 2) + (high_risk_events * 3) + (open_alerts * 2) + usage_pressure)::integer AS risk_score
    FROM (
      SELECT
        COALESCE(e.company_id, d.company_id, a.company_id, u.company_id) AS company_id,
        COALESCE(e.denials, 0) + COALESCE(d.decision_denials, 0) AS denials,
        COALESCE(e.high_risk_events, 0) AS high_risk_events,
        COALESCE(a.open_alerts, 0) AS open_alerts,
        COALESCE(u.usage_pressure, 0) AS usage_pressure
      FROM event_rollup e
      FULL OUTER JOIN decision_rollup d ON d.company_id = e.company_id
      FULL OUTER JOIN alert_rollup a ON a.company_id = COALESCE(e.company_id, d.company_id)
      FULL OUTER JOIN usage_rollup u ON u.company_id = COALESCE(e.company_id, d.company_id, a.company_id)
    ) merged
    WHERE ((denials * 2) + (high_risk_events * 3) + (open_alerts * 2) + usage_pressure) > 0
    ORDER BY risk_score DESC
    LIMIT 15
  ) watchlist;

  INSERT INTO public.platform_analytics_snapshots (
    snapshot_window,
    snapshot_start,
    snapshot_end,
    total_events,
    blocked_events,
    denied_events,
    high_risk_events,
    entitlement_allowed,
    entitlement_denied,
    open_alerts,
    critical_open_alerts,
    usage_pressure_count,
    module_breakdown,
    company_risk_watchlist,
    metadata
  ) VALUES (
    v_snapshot_window,
    v_window_start,
    v_window_end,
    v_total_events,
    v_blocked_events,
    v_denied_events,
    v_high_risk_events,
    v_entitlement_allowed,
    v_entitlement_denied,
    v_open_alerts,
    v_critical_open_alerts,
    v_usage_pressure,
    v_module_breakdown,
    v_company_watchlist,
    jsonb_build_object(
      'generated_by', v_actor,
      'window_interval', v_snapshot_window,
      'correlation_id', v_correlation_id
    )
  ) RETURNING id INTO v_snapshot_id;

  v_denial_rate := CASE
    WHEN (v_entitlement_allowed + v_entitlement_denied) = 0 THEN 0
    ELSE v_entitlement_denied::numeric / (v_entitlement_allowed + v_entitlement_denied)
  END;

  v_high_risk_rate := CASE
    WHEN v_total_events = 0 THEN 0
    ELSE v_high_risk_events::numeric / v_total_events
  END;

  PERFORM public.platform_record_drift_check(
    'entitlement_denial_rate',
    CASE WHEN v_denial_rate > 0.20 THEN 'warning' ELSE 'ok' END,
    v_denial_rate,
    0.20,
    v_window_start,
    v_window_end,
    jsonb_build_object('denied', v_entitlement_denied, 'allowed', v_entitlement_allowed),
    p_emit_alerts,
    v_correlation_id
  );

  PERFORM public.platform_record_drift_check(
    'high_risk_event_rate',
    CASE WHEN v_high_risk_rate > 0.10 THEN 'warning' ELSE 'ok' END,
    v_high_risk_rate,
    0.10,
    v_window_start,
    v_window_end,
    jsonb_build_object('high_risk_events', v_high_risk_events, 'total_events', v_total_events),
    p_emit_alerts,
    v_correlation_id
  );

  PERFORM public.platform_record_drift_check(
    'critical_open_alerts',
    CASE WHEN v_critical_open_alerts > 0 THEN 'critical' ELSE 'ok' END,
    v_critical_open_alerts,
    0,
    v_window_start,
    v_window_end,
    jsonb_build_object('open_alerts', v_open_alerts),
    p_emit_alerts,
    v_correlation_id
  );

  PERFORM public.platform_record_drift_check(
    'usage_pressure_count',
    CASE WHEN v_usage_pressure > 0 THEN 'warning' ELSE 'ok' END,
    v_usage_pressure,
    0,
    v_window_start,
    v_window_end,
    jsonb_build_object('usage_percent_threshold', 90),
    p_emit_alerts,
    v_correlation_id
  );

  IF to_regclass('public.webhook_dead_letters') IS NOT NULL THEN
    EXECUTE '
      SELECT COUNT(*)::integer
      FROM public.webhook_dead_letters
      WHERE created_at >= $1
        AND created_at <= $2
    '
    INTO v_webhook_dead_letters
    USING v_window_start, v_window_end;

    PERFORM public.platform_record_drift_check(
      'webhook_dead_letters',
      CASE WHEN v_webhook_dead_letters > 0 THEN 'warning' ELSE 'ok' END,
      v_webhook_dead_letters,
      0,
      v_window_start,
      v_window_end,
      jsonb_build_object('source', 'webhook_dead_letters'),
      p_emit_alerts,
      v_correlation_id
    );
  END IF;

  PERFORM public.platform_ingest_audit_event(
    'control_plane_backend',
    'admin.phase10.run_all',
    'admin',
    'phase10_run_all',
    'success',
    CASE WHEN v_critical_open_alerts > 0 THEN 'warning' ELSE 'info' END,
    v_actor,
    NULL,
    'platform_analytics_snapshots',
    v_snapshot_id::text,
    v_correlation_id,
    CASE WHEN v_critical_open_alerts > 0 THEN 70 ELSE 20 END,
    NULL,
    NULL,
    jsonb_build_object('runner', 'phase10_backend_extension'),
    jsonb_build_object(
      'window_start', v_window_start,
      'window_end', v_window_end,
      'total_events', v_total_events,
      'entitlement_denial_rate', v_denial_rate,
      'high_risk_rate', v_high_risk_rate,
      'critical_open_alerts', v_critical_open_alerts
    )
  );

  RETURN jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'window_start', v_window_start,
    'window_end', v_window_end,
    'total_events', v_total_events,
    'entitlement_denial_rate', v_denial_rate,
    'high_risk_rate', v_high_risk_rate,
    'critical_open_alerts', v_critical_open_alerts,
    'usage_pressure_count', v_usage_pressure,
    'webhook_dead_letters', v_webhook_dead_letters,
    'correlation_id', v_correlation_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_phase10_schedule_drift_checks()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension not found; skipping schedule setup.';
    RETURN false;
  END IF;

  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'phase10_drift_checks_hourly'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'phase10_drift_checks_hourly',
    '15 * * * *',
    'SELECT public.platform_phase10_run_all(interval ''24 hours'', true);'
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unable to schedule phase10 drift checks: %', SQLERRM;
    RETURN false;
END;
$$;

GRANT SELECT ON public.platform_analytics_snapshots TO authenticated;
GRANT SELECT ON public.platform_drift_checks TO authenticated;

GRANT EXECUTE ON FUNCTION public.platform_phase10_run_all(interval, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_phase10_schedule_drift_checks() TO authenticated;

DO $$
BEGIN
  PERFORM public.platform_phase10_schedule_drift_checks();
END;
$$;
