-- Section 4.2: Scheduled retries for failed CRM automation runs.
-- Adds a system replay path that does not require an authenticated end-user,
-- plus a cron-backed worker that replays eligible failed runs.

CREATE OR REPLACE FUNCTION public.crm_replay_automation_run_system(
  p_run_id uuid,
  p_replay_mode text DEFAULT 'scheduled'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.crm_automation_runs%ROWTYPE;
  v_rule public.crm_automation_rules%ROWTYPE;
  v_replay_correlation text;
  v_replay_run_id uuid;
  v_replay_status text;
BEGIN
  SELECT *
  INTO v_run
  FROM public.crm_automation_runs
  WHERE id = p_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUTOMATION_RUN_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_rule
  FROM public.crm_automation_rules
  WHERE id = v_run.rule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUTOMATION_RULE_NOT_FOUND';
  END IF;

  IF v_run.status NOT IN ('failed', 'pending') THEN
    RAISE EXCEPTION 'RUN_STATUS_NOT_REPLAYABLE';
  END IF;

  IF coalesce(v_run.max_attempts, 0) <= 0 OR coalesce(v_run.attempts, 0) >= coalesce(v_run.max_attempts, 0) THEN
    RAISE EXCEPTION 'RUN_MAX_ATTEMPTS_REACHED';
  END IF;

  v_replay_correlation := coalesce(v_run.correlation_id, format('crm-replay:%s', p_run_id))
    || format(':%s:%s', coalesce(nullif(p_replay_mode, ''), 'scheduled'), gen_random_uuid()::text);

  PERFORM public.crm_execute_automation_rule(
    v_run.rule_id,
    v_run.payload_json,
    v_run.event_type,
    v_run.event_source_type,
    v_run.event_source_id,
    v_replay_correlation
  );

  SELECT id, status
  INTO v_replay_run_id, v_replay_status
  FROM public.crm_automation_runs
  WHERE correlation_id = v_replay_correlation
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.crm_automation_runs
  SET status = CASE WHEN v_replay_status = 'success' THEN 'success' ELSE status END,
      attempts = least(max_attempts, attempts + 1),
      next_retry_at = CASE
        WHEN v_replay_status = 'success' THEN NULL
        WHEN (attempts + 1) >= max_attempts THEN NULL
        ELSE now() + interval '5 minutes'
      END,
      last_error = CASE
        WHEN v_replay_status = 'success' THEN NULL
        WHEN v_replay_run_id IS NULL THEN coalesce(last_error, 'Replay run not found')
        ELSE last_error
      END,
      result_json = coalesce(result_json, '{}'::jsonb) || jsonb_build_object(
        'last_system_replay_mode', coalesce(nullif(p_replay_mode, ''), 'scheduled'),
        'last_system_replay_at', now(),
        'last_system_replay_correlation_id', v_replay_correlation,
        'last_system_replay_run_id', v_replay_run_id,
        'last_system_replay_status', v_replay_status
      ),
      updated_at = now()
  WHERE id = v_run.id;

  INSERT INTO public.audit_events (
    source,
    event_type,
    severity,
    actor_user_id,
    entity_type,
    entity_id,
    details,
    correlation_id
  ) VALUES (
    'marketplace_crm_automation',
    'crm.automation.system_replay',
    'info',
    null,
    'crm_automation_run',
    v_run.id,
    jsonb_build_object(
      'original_run_id', v_run.id,
      'replay_run_id', v_replay_run_id,
      'rule_id', v_run.rule_id,
      'event_type', v_run.event_type,
      'mode', coalesce(nullif(p_replay_mode, ''), 'scheduled')
    ),
    v_replay_correlation
  );

  RETURN v_replay_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_retry_failed_automation_runs(
  p_limit integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run record;
  v_replay_run_id uuid;
  v_processed integer := 0;
  v_replayed integer := 0;
  v_errors integer := 0;
  v_limit integer := greatest(coalesce(p_limit, 25), 1);
BEGIN
  FOR v_run IN
    SELECT id
    FROM public.crm_automation_runs
    WHERE status = 'failed'
      AND next_retry_at IS NOT NULL
      AND next_retry_at <= now()
      AND attempts < max_attempts
    ORDER BY next_retry_at ASC, created_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;

    BEGIN
      SELECT public.crm_replay_automation_run_system(v_run.id, 'scheduled')
      INTO v_replay_run_id;

      IF v_replay_run_id IS NOT NULL THEN
        v_replayed := v_replayed + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;

        UPDATE public.crm_automation_runs
        SET attempts = least(max_attempts, attempts + 1),
            next_retry_at = CASE
              WHEN (attempts + 1) >= max_attempts THEN NULL
              ELSE now() + interval '5 minutes'
            END,
            last_error = left(coalesce(last_error, '') || CASE WHEN coalesce(last_error, '') = '' THEN '' ELSE '; ' END || SQLERRM, 2000),
            result_json = coalesce(result_json, '{}'::jsonb) || jsonb_build_object(
              'last_system_retry_error', SQLERRM,
              'last_system_retry_error_at', now()
            ),
            updated_at = now()
        WHERE id = v_run.id;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'replayed', v_replayed,
    'errors', v_errors,
    'limit', v_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_schedule_automation_retry_worker()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron extension not found; skipping crm automation retry schedule setup.';
    RETURN false;
  END IF;

  FOR v_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'crm_automation_retry_worker_every_5m'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'crm_automation_retry_worker_every_5m',
    '*/5 * * * *',
    'SELECT public.crm_retry_failed_automation_runs(25);'
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unable to schedule crm automation retry worker: %', SQLERRM;
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_replay_automation_run_system(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_retry_failed_automation_runs(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_schedule_automation_retry_worker() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.crm_replay_automation_run_system(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_retry_failed_automation_runs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_schedule_automation_retry_worker() TO service_role;

DO $$
BEGIN
  PERFORM public.crm_schedule_automation_retry_worker();
END;
$$;
