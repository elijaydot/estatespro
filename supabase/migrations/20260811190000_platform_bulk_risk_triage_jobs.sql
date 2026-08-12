-- Durable, resumable bulk triage jobs for Control Plane governance alerts.

CREATE TABLE IF NOT EXISTS public.platform_bulk_risk_triage_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  triage_status text NOT NULL CHECK (triage_status IN ('acknowledged', 'resolved', 'escalated', 'false_positive')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'partial_error', 'failed')),
  total_items integer NOT NULL CHECK (total_items BETWEEN 1 AND 500),
  completed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.platform_bulk_risk_triage_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.platform_bulk_risk_triage_jobs(id) ON DELETE CASCADE,
  row_id uuid NOT NULL REFERENCES public.governance_alerts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, row_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_bulk_triage_jobs_claim
  ON public.platform_bulk_risk_triage_jobs (status, created_at, id)
  WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_platform_bulk_triage_items_claim
  ON public.platform_bulk_risk_triage_job_items (job_id, status, created_at, id)
  WHERE status = 'pending';

ALTER TABLE public.platform_bulk_risk_triage_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_bulk_risk_triage_job_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_bulk_risk_triage_jobs' AND policyname = 'Platform operators can read bulk triage jobs') THEN
    CREATE POLICY "Platform operators can read bulk triage jobs"
    ON public.platform_bulk_risk_triage_jobs FOR SELECT TO authenticated
    USING (public.is_platform_super_admin(auth.uid())
      OR public.has_platform_operator_role(auth.uid(), 'support_operator')
      OR public.has_platform_operator_role(auth.uid(), 'security_auditor'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'platform_bulk_risk_triage_job_items' AND policyname = 'Platform operators can read bulk triage job items') THEN
    CREATE POLICY "Platform operators can read bulk triage job items"
    ON public.platform_bulk_risk_triage_job_items FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.platform_bulk_risk_triage_jobs job
      WHERE job.id = job_id
        AND (public.is_platform_super_admin(auth.uid())
          OR public.has_platform_operator_role(auth.uid(), 'support_operator')
          OR public.has_platform_operator_role(auth.uid(), 'security_auditor'))
    ));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_queue_bulk_risk_triage_job(
  p_row_ids uuid[],
  p_triage_status text,
  p_reason text,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_status text := lower(btrim(coalesce(p_triage_status, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_row_ids uuid[];
  v_job public.platform_bulk_risk_triage_jobs%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_platform_super_admin(v_actor)
     AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
     AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
    RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
  END IF;
  IF v_status NOT IN ('acknowledged', 'resolved', 'escalated', 'false_positive') THEN
    RAISE EXCEPTION 'INVALID_TRIAGE_STATUS';
  END IF;
  IF char_length(v_reason) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'REASON_LENGTH_INVALID'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED'; END IF;

  SELECT array_agg(DISTINCT row_id ORDER BY row_id) INTO v_row_ids
  FROM unnest(coalesce(p_row_ids, ARRAY[]::uuid[])) row_id;
  IF coalesce(cardinality(v_row_ids), 0) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'BULK_ITEM_COUNT_INVALID'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_row_ids) row_id LEFT JOIN public.governance_alerts alert ON alert.id = row_id WHERE alert.id IS NULL) THEN
    RAISE EXCEPTION 'GOVERNANCE_ALERT_NOT_FOUND';
  END IF;

  INSERT INTO public.platform_bulk_risk_triage_jobs (
    idempotency_key, actor_user_id, triage_status, reason, total_items
  ) VALUES (
    p_idempotency_key, v_actor, v_status, v_reason, cardinality(v_row_ids)
  )
  ON CONFLICT (actor_user_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    SELECT * INTO v_job FROM public.platform_bulk_risk_triage_jobs
    WHERE actor_user_id = v_actor AND idempotency_key = p_idempotency_key;
    IF v_job.triage_status <> v_status OR v_job.reason <> v_reason OR v_job.total_items <> cardinality(v_row_ids) THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED';
    END IF;
    IF EXISTS (
      (SELECT row_id FROM unnest(v_row_ids) row_id EXCEPT SELECT item.row_id FROM public.platform_bulk_risk_triage_job_items item WHERE item.job_id = v_job.id)
      UNION ALL
      (SELECT item.row_id FROM public.platform_bulk_risk_triage_job_items item WHERE item.job_id = v_job.id EXCEPT SELECT row_id FROM unnest(v_row_ids) row_id)
    ) THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED';
    END IF;
  ELSE
    INSERT INTO public.platform_bulk_risk_triage_job_items (job_id, row_id)
    SELECT v_job.id, row_id FROM unnest(v_row_ids) row_id;
  END IF;

  RETURN jsonb_build_object('job_id', v_job.id, 'status', v_job.status, 'total_items', v_job.total_items,
    'idempotency_key', v_job.idempotency_key, 'created_at', v_job.created_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_process_bulk_risk_triage_jobs(
  p_job_limit integer DEFAULT 3,
  p_item_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.platform_bulk_risk_triage_jobs%ROWTYPE;
  v_item public.platform_bulk_risk_triage_job_items%ROWTYPE;
  v_jobs_processed integer := 0;
  v_items_processed integer := 0;
  v_previous_sub text;
  v_previous_role text;
  v_pending integer;
BEGIN
  FOR v_job IN
    SELECT * FROM public.platform_bulk_risk_triage_jobs
    WHERE status IN ('queued', 'processing')
    ORDER BY created_at, id
    LIMIT least(10, greatest(1, coalesce(p_job_limit, 3)))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.platform_bulk_risk_triage_jobs
    SET status = 'processing', started_at = coalesce(started_at, now()), updated_at = now()
    WHERE id = v_job.id;

    FOR v_item IN
      SELECT * FROM public.platform_bulk_risk_triage_job_items
      WHERE job_id = v_job.id AND status = 'pending'
      ORDER BY created_at, id
      LIMIT least(200, greatest(1, coalesce(p_item_limit, 50)))
      FOR UPDATE SKIP LOCKED
    LOOP
      BEGIN
        v_previous_sub := current_setting('request.jwt.claim.sub', true);
        v_previous_role := current_setting('request.jwt.claim.role', true);
        PERFORM set_config('request.jwt.claim.sub', v_job.actor_user_id::text, true);
        PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
        PERFORM public.platform_triage_risk_queue_item(
          'governance_alert', v_item.row_id, v_job.triage_status, v_job.reason,
          jsonb_build_object('bulk_job_id', v_job.id, 'bulk_idempotency_key', v_job.idempotency_key)
        );
        PERFORM set_config('request.jwt.claim.sub', coalesce(v_previous_sub, ''), true);
        PERFORM set_config('request.jwt.claim.role', coalesce(v_previous_role, ''), true);
        UPDATE public.platform_bulk_risk_triage_job_items
        SET status = 'completed', error_message = NULL, processed_at = now() WHERE id = v_item.id;
      EXCEPTION WHEN OTHERS THEN
        PERFORM set_config('request.jwt.claim.sub', coalesce(v_previous_sub, ''), true);
        PERFORM set_config('request.jwt.claim.role', coalesce(v_previous_role, ''), true);
        UPDATE public.platform_bulk_risk_triage_job_items
        SET status = 'failed', error_message = left(SQLERRM, 2000), processed_at = now() WHERE id = v_item.id;
      END;
      v_items_processed := v_items_processed + 1;
    END LOOP;

    SELECT count(*) FILTER (WHERE status = 'pending')::integer,
      count(*) FILTER (WHERE status = 'completed')::integer,
      count(*) FILTER (WHERE status = 'failed')::integer
    INTO v_pending, v_job.completed_items, v_job.failed_items
    FROM public.platform_bulk_risk_triage_job_items WHERE job_id = v_job.id;

    UPDATE public.platform_bulk_risk_triage_jobs
    SET completed_items = v_job.completed_items, failed_items = v_job.failed_items,
      status = CASE WHEN v_pending > 0 THEN 'queued' WHEN v_job.failed_items = 0 THEN 'completed'
        WHEN v_job.completed_items = 0 THEN 'failed' ELSE 'partial_error' END,
      completed_at = CASE WHEN v_pending = 0 THEN now() ELSE NULL END, updated_at = now()
    WHERE id = v_job.id;
    v_jobs_processed := v_jobs_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('jobs_processed', v_jobs_processed, 'items_processed', v_items_processed);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_schedule_bulk_risk_triage_worker()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $$
DECLARE v_job_id bigint;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN false; END IF;
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'platform_bulk_risk_triage_every_minute' LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule('platform_bulk_risk_triage_every_minute', '* * * * *',
    'SELECT public.platform_process_bulk_risk_triage_jobs(3, 50);');
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unable to schedule bulk risk triage worker: %', SQLERRM;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_queue_bulk_risk_triage_job(uuid[],text,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_process_bulk_risk_triage_jobs(integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_schedule_bulk_risk_triage_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_queue_bulk_risk_triage_job(uuid[],text,text,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_process_bulk_risk_triage_jobs(integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_schedule_bulk_risk_triage_worker() TO service_role;

SELECT public.platform_schedule_bulk_risk_triage_worker();