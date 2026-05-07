-- Security hardening: audit events and backup/recovery codes

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_user_created
  ON public.security_audit_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_events_event_type
  ON public.security_audit_events (event_type);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own security audit events" ON public.security_audit_events;
CREATE POLICY "Users can read their own security audit events"
ON public.security_audit_events
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own security audit events" ON public.security_audit_events;
CREATE POLICY "Users can insert their own security audit events"
ON public.security_audit_events
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_event_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.security_audit_events (
    user_id,
    event_type,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    v_uid,
    p_event_type,
    COALESCE(p_metadata, '{}'::jsonb),
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb, text, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.security_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_security_recovery_codes_user_active
  ON public.security_recovery_codes (user_id, used_at, created_at DESC);

ALTER TABLE public.security_recovery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own recovery code metadata" ON public.security_recovery_codes;
CREATE POLICY "Users can read own recovery code metadata"
ON public.security_recovery_codes
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_recovery_codes(p_codes text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_code text;
  v_count integer := 0;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.security_recovery_codes
  WHERE user_id = v_uid;

  FOREACH v_code IN ARRAY p_codes
  LOOP
    IF length(trim(v_code)) > 0 THEN
      INSERT INTO public.security_recovery_codes (user_id, code_hash)
      VALUES (v_uid, crypt(trim(v_code), gen_salt('bf')));
      v_count := v_count + 1;
    END IF;
  END LOOP;

  PERFORM public.log_security_event(
    'recovery_codes_regenerated',
    jsonb_build_object('count', v_count)
  );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_recovery_codes(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_recovery_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT src.id
  INTO v_id
  FROM public.security_recovery_codes src
  WHERE src.user_id = v_uid
    AND src.used_at IS NULL
    AND crypt(trim(p_code), src.code_hash) = src.code_hash
  ORDER BY src.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NULL THEN
    PERFORM public.log_security_event(
      'recovery_code_failed',
      jsonb_build_object('reason', 'invalid_or_used')
    );
    RETURN FALSE;
  END IF;

  UPDATE public.security_recovery_codes
  SET used_at = now()
  WHERE id = v_id;

  PERFORM public.log_security_event(
    'recovery_code_used',
    jsonb_build_object('recovery_code_id', v_id)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_recovery_code(text) TO authenticated;
