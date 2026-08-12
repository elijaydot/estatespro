-- Persisted fleet aggregates for scale-grade Control Plane reporting.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.company_members') IS NULL
     OR to_regclass('public.owner_billing_groups') IS NULL
     OR to_regclass('public.saas_company_plan_subscriptions') IS NULL
     OR to_regclass('public.saas_owner_group_plan_subscriptions') IS NULL THEN
    RAISE EXCEPTION 'ADMINISTRATION_SNAPSHOT_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.platform_administration_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_users bigint NOT NULL,
  total_landlords bigint NOT NULL,
  total_property_managers bigint NOT NULL,
  total_companies bigint NOT NULL,
  verified_companies bigint NOT NULL,
  total_billing_groups bigint NOT NULL,
  active_billing_groups bigint NOT NULL,
  company_subscriptions bigint NOT NULL,
  group_subscriptions bigint NOT NULL,
  company_subscription_statuses jsonb NOT NULL DEFAULT '{}'::jsonb,
  group_subscription_statuses jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_administration_snapshots_generated
  ON public.platform_administration_snapshots (generated_at DESC, id DESC);
ALTER TABLE public.platform_administration_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_administration_snapshots' AND policyname = 'Platform operators can read administration snapshots') THEN
    CREATE POLICY "Platform operators can read administration snapshots"
    ON public.platform_administration_snapshots FOR SELECT TO authenticated
    USING (public.is_platform_super_admin(auth.uid())
      OR public.has_platform_operator_role(auth.uid(), 'support_operator')
      OR public.has_platform_operator_role(auth.uid(), 'billing_operator')
      OR public.has_platform_operator_role(auth.uid(), 'security_auditor'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_refresh_administration_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_snapshot public.platform_administration_snapshots%ROWTYPE;
  v_correlation_id text := gen_random_uuid()::text;
  v_verified_companies bigint := 0;
BEGIN
  IF v_actor IS NOT NULL AND (
    NOT public.is_platform_super_admin(v_actor)
    AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'billing_operator')
    AND NOT public.has_platform_operator_role(v_actor, 'security_auditor')
  ) THEN RAISE EXCEPTION 'PLATFORM_OPERATOR_REQUIRED'; END IF;

  IF to_regclass('public.publisher_verifications') IS NOT NULL THEN
    EXECUTE $query$
      SELECT count(DISTINCT company_id)
      FROM public.publisher_verifications
      WHERE state = 'verified'
    $query$ INTO v_verified_companies;
  END IF;

  INSERT INTO public.platform_administration_snapshots (
    total_users, total_landlords, total_property_managers, total_companies, verified_companies,
    total_billing_groups, active_billing_groups, company_subscriptions, group_subscriptions,
    company_subscription_statuses, group_subscription_statuses, generated_by
  )
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(DISTINCT owner_id) FROM public.companies),
    (SELECT count(DISTINCT user_id) FROM public.company_members WHERE role = 'property_manager' AND status = 'approved'),
    (SELECT count(*) FROM public.companies),
    v_verified_companies,
    (SELECT count(*) FROM public.owner_billing_groups),
    (SELECT count(*) FROM public.owner_billing_groups WHERE status = 'active'),
    (SELECT count(*) FROM public.saas_company_plan_subscriptions),
    (SELECT count(*) FROM public.saas_owner_group_plan_subscriptions),
    coalesce((SELECT jsonb_object_agg(status, count) FROM (SELECT status, count(*) AS count FROM public.saas_company_plan_subscriptions GROUP BY status) rows), '{}'::jsonb),
    coalesce((SELECT jsonb_object_agg(status, count) FROM (SELECT status, count(*) AS count FROM public.saas_owner_group_plan_subscriptions GROUP BY status) rows), '{}'::jsonb),
    v_actor
  RETURNING * INTO v_snapshot;

  IF v_actor IS NOT NULL THEN
    INSERT INTO public.platform_audit_events (source, event_type, module, action, severity, result_status, actor_user_id,
      target_entity_type, target_entity_id, correlation_id, metadata)
    VALUES ('control_plane', 'analytics.administration_snapshot.refreshed', 'analytics', 'refresh_administration_snapshot',
      'info', 'success', v_actor, 'platform_administration_snapshot', v_snapshot.id::text, v_correlation_id,
      jsonb_build_object('generated_at', v_snapshot.generated_at));
  END IF;

  RETURN to_jsonb(v_snapshot) || jsonb_build_object('correlation_id', v_correlation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_schedule_administration_snapshot_worker()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $$
DECLARE v_job_id bigint;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN; END IF;
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'platform_administration_snapshot_hourly' LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule('platform_administration_snapshot_hourly', '23 * * * *', 'SELECT public.platform_refresh_administration_snapshot();');
END;
$$;

REVOKE ALL ON FUNCTION public.platform_refresh_administration_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_schedule_administration_snapshot_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_refresh_administration_snapshot() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_schedule_administration_snapshot_worker() TO service_role;

SELECT public.platform_refresh_administration_snapshot();
SELECT public.platform_schedule_administration_snapshot_worker();