-- Time-box support impersonation records and expire linked platform sessions automatically.

ALTER TABLE public.platform_impersonation_sessions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.platform_impersonation_sessions
SET expires_at = started_at + interval '30 minutes'
WHERE expires_at IS NULL;

ALTER TABLE public.platform_impersonation_sessions
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_impersonation_expiry
  ON public.platform_impersonation_sessions (expires_at, id)
  WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION public.platform_timebox_impersonation_session()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.expires_at := least(coalesce(NEW.expires_at, NEW.started_at + interval '30 minutes'), NEW.started_at + interval '30 minutes');
  IF NEW.expires_at <= NEW.started_at THEN RAISE EXCEPTION 'IMPERSONATION_EXPIRY_INVALID'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_timebox_impersonation_session_trigger ON public.platform_impersonation_sessions;
CREATE TRIGGER platform_timebox_impersonation_session_trigger
BEFORE INSERT OR UPDATE OF started_at, expires_at ON public.platform_impersonation_sessions
FOR EACH ROW EXECUTE FUNCTION public.platform_timebox_impersonation_session();

CREATE OR REPLACE FUNCTION public.platform_expire_impersonation_sessions(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.platform_impersonation_sessions%ROWTYPE;
  v_expired integer := 0;
BEGIN
  FOR v_session IN
    SELECT * FROM public.platform_impersonation_sessions
    WHERE ended_at IS NULL AND expires_at <= now()
    ORDER BY expires_at, id
    LIMIT least(500, greatest(1, coalesce(p_limit, 100)))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.platform_impersonation_sessions
    SET ended_at = now(), metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('expired_automatically', true, 'expired_at', now())
    WHERE id = v_session.id AND ended_at IS NULL;

    UPDATE public.platform_sessions
    SET ended_at = coalesce(ended_at, now()), metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('impersonation_expired_automatically', true)
    WHERE id = v_session.session_id;

    PERFORM public.platform_ingest_audit_event(
      'platform_control_plane', 'impersonation.session.expired', 'support', 'expire_impersonation',
      'success', 'warning', v_session.actor_user_id, v_session.company_id, 'user', v_session.target_user_id::text,
      concat('impersonation-expire-', v_session.id::text), 60, NULL, NULL,
      jsonb_build_object('operator_user_id', v_session.actor_user_id),
      jsonb_build_object('impersonation_session_id', v_session.id, 'expired_at', now())
    );
    v_expired := v_expired + 1;
  END LOOP;
  RETURN jsonb_build_object('expired', v_expired);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_schedule_impersonation_expiry_worker()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $$
DECLARE v_job_id bigint;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN false; END IF;
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'platform_impersonation_expiry_every_minute' LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule('platform_impersonation_expiry_every_minute', '* * * * *',
    'SELECT public.platform_expire_impersonation_sessions(100);');
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unable to schedule impersonation expiry worker: %', SQLERRM;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_expire_impersonation_sessions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_schedule_impersonation_expiry_worker() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_expire_impersonation_sessions(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_schedule_impersonation_expiry_worker() TO service_role;

SELECT public.platform_schedule_impersonation_expiry_worker();