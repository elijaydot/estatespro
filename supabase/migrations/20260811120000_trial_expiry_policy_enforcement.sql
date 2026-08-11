-- Configurable, audited enforcement for expired company subscription trials.

ALTER TABLE public.saas_plans
  ADD COLUMN IF NOT EXISTS post_trial_action text NOT NULL DEFAULT 'grace_period'
    CHECK (post_trial_action IN ('grace_period', 'lockout')),
  ADD COLUMN IF NOT EXISTS post_trial_grace_days integer NOT NULL DEFAULT 7
    CHECK (post_trial_grace_days BETWEEN 1 AND 90);

ALTER TABLE public.saas_company_plan_subscriptions
  ADD COLUMN IF NOT EXISTS trial_policy_enforced_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_final_action text
    CHECK (trial_final_action IS NULL OR trial_final_action IN ('grace_period', 'lockout'));

CREATE INDEX IF NOT EXISTS idx_saas_company_plan_subscriptions_expired_trial_pending
  ON public.saas_company_plan_subscriptions (trial_end_at, id)
  WHERE status = 'trialing' AND trial_policy_enforced_at IS NULL;

CREATE OR REPLACE FUNCTION public.saas_catalog_set_trial_policy(
  p_plan_id uuid,
  p_trial_days integer,
  p_post_trial_action text,
  p_post_trial_grace_days integer DEFAULT 7
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.is_platform_super_admin(v_actor) THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED';
  END IF;

  IF p_plan_id IS NULL
     OR p_trial_days IS NULL OR p_trial_days < 0 OR p_trial_days > 365
     OR p_post_trial_action NOT IN ('grace_period', 'lockout')
     OR p_post_trial_grace_days IS NULL OR p_post_trial_grace_days < 1 OR p_post_trial_grace_days > 90 THEN
    RAISE EXCEPTION 'INVALID_TRIAL_POLICY';
  END IF;

  UPDATE public.saas_plans
  SET trial_days = p_trial_days,
      post_trial_action = p_post_trial_action,
      post_trial_grace_days = p_post_trial_grace_days,
      updated_at = now()
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND';
  END IF;

  INSERT INTO public.platform_audit_events (
    source, event_type, module, action, result_status, actor_user_id,
    target_entity_type, target_entity_id, metadata
  ) VALUES (
    'catalog_management', 'catalog.trial_policy.updated', 'catalog', 'set_trial_policy', 'success', v_actor,
    'saas_plan', p_plan_id::text,
    jsonb_build_object(
      'trial_days', p_trial_days,
      'post_trial_action', p_post_trial_action,
      'post_trial_grace_days', p_post_trial_grace_days
    )
  );

  RETURN p_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_process_expired_trials(
  p_limit integer DEFAULT 100,
  p_correlation_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription record;
  v_processed integer := 0;
  v_grace_started integer := 0;
  v_locked_out integer := 0;
  v_limit integer := greatest(least(coalesce(p_limit, 100), 1000), 1);
BEGIN
  FOR v_subscription IN
    SELECT subscription.id, subscription.company_id, subscription.plan_id,
           plan.post_trial_action, plan.post_trial_grace_days
    FROM public.saas_company_plan_subscriptions subscription
    JOIN public.saas_plans plan ON plan.id = subscription.plan_id
    WHERE subscription.status = 'trialing'
      AND subscription.trial_end_at IS NOT NULL
      AND subscription.trial_end_at <= now()
      AND subscription.trial_policy_enforced_at IS NULL
    ORDER BY subscription.trial_end_at, subscription.id
    LIMIT v_limit
    FOR UPDATE OF subscription SKIP LOCKED
  LOOP
    IF v_subscription.post_trial_action = 'grace_period' THEN
      UPDATE public.saas_company_plan_subscriptions
      SET status = 'grace_period',
          payment_state = 'grace',
          grace_end_at = now() + make_interval(days => v_subscription.post_trial_grace_days),
          trial_policy_enforced_at = now(),
          trial_final_action = 'grace_period',
          updated_at = now(),
          notes = coalesce(notes, '') || ' Trial ended and grace period started at ' || now()::text
      WHERE id = v_subscription.id
        AND status = 'trialing'
        AND trial_policy_enforced_at IS NULL;
      v_grace_started := v_grace_started + 1;
    ELSE
      UPDATE public.saas_company_plan_subscriptions
      SET status = 'expired',
          payment_state = 'canceled',
          auto_renew = false,
          end_at = now(),
          trial_policy_enforced_at = now(),
          trial_final_action = 'lockout',
          updated_at = now(),
          notes = coalesce(notes, '') || ' Trial expired with lockout at ' || now()::text
      WHERE id = v_subscription.id
        AND status = 'trialing'
        AND trial_policy_enforced_at IS NULL;
      v_locked_out := v_locked_out + 1;
    END IF;

    v_processed := v_processed + 1;

    INSERT INTO public.platform_audit_events (
      source, event_type, module, action, result_status,
      target_entity_type, target_entity_id, company_id, correlation_id, metadata
    ) VALUES (
      'trial_enforcement', 'billing.subscription.trial_expired', 'billing', 'enforce_trial_expiry', 'success',
      'saas_company_plan_subscription', v_subscription.id::text, v_subscription.company_id, p_correlation_id,
      jsonb_build_object(
        'plan_id', v_subscription.plan_id,
        'post_trial_action', v_subscription.post_trial_action,
        'post_trial_grace_days', v_subscription.post_trial_grace_days
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'grace_started', v_grace_started,
    'locked_out', v_locked_out,
    'limit', v_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.saas_schedule_trial_expiry_worker()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id bigint;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron extension not found; skipping trial expiry worker schedule setup.';
    RETURN false;
  END IF;

  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'saas_trial_expiry_worker_hourly'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'saas_trial_expiry_worker_hourly',
    '17 * * * *',
    'SELECT public.saas_process_expired_trials(100, ''cron:saas_trial_expiry_worker_hourly'');'
  );
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unable to schedule trial expiry worker: %', SQLERRM;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.saas_catalog_set_trial_policy(uuid,integer,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_process_expired_trials(integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.saas_schedule_trial_expiry_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saas_catalog_set_trial_policy(uuid,integer,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.saas_process_expired_trials(integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.saas_schedule_trial_expiry_worker() TO service_role;

DO $$
BEGIN
  PERFORM public.saas_schedule_trial_expiry_worker();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Trial expiry worker was not scheduled during migration: %', SQLERRM;
END;
$$;
