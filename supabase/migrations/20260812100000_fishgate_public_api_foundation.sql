-- FishGate Public API foundation: key custody, entitlement resolution, distributed
-- rate limiting, request telemetry, and write idempotency.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL
     OR to_regclass('public.saas_entitlement_keys') IS NULL
     OR to_regclass('public.saas_plan_entitlements') IS NULL
     OR to_regprocedure('public.saas_get_effective_plan_id(uuid,text)') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'FISHGATE_API_FOUNDATION_PREREQUISITES_MISSING';
  END IF;
END;
$$;

INSERT INTO public.saas_entitlement_keys (key, domain, value_type, description)
VALUES ('api.access.level', 'platform', 'json', 'API access level: "none" | "limited" | "full".')
ON CONFLICT (key) DO NOTHING;

WITH api_grants(plan_code, access_level) AS (
  VALUES
    ('fishgate_starter', 'none'),
    ('fishgate_growth', 'none'),
    ('fishgate_professional', 'limited'),
    ('fishgate_enterprise', 'full')
)
INSERT INTO public.saas_plan_entitlements (plan_id, entitlement_key_id, json_value)
SELECT plan.id, entitlement.id, to_jsonb(grant_row.access_level)
FROM api_grants grant_row
JOIN public.saas_plans plan ON plan.code = grant_row.plan_code
JOIN public.saas_entitlement_keys entitlement ON entitlement.key = 'api.access.level'
ON CONFLICT (plan_id, entitlement_key_id) DO UPDATE SET
  bool_value = NULL,
  int_value = NULL,
  json_value = EXCLUDED.json_value,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  key_hash text NOT NULL,
  key_prefix text NOT NULL CHECK (key_prefix ~ '^fg_(test|live)_[A-Za-z0-9_-]{8}$'),
  scopes text[] NOT NULL DEFAULT '{}',
  tier text NOT NULL CHECK (tier IN ('limited', 'full')),
  rate_limit_per_min integer NOT NULL DEFAULT 60 CHECK (rate_limit_per_min BETWEEN 1 AND 10000),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT api_keys_scopes_valid CHECK (
    scopes <@ ARRAY['pm:read', 'pm:write', 'marketplace:read', 'marketplace:write', 'crm:read', 'crm:write']::text[]
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_company_created ON public.api_keys(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_active_prefix ON public.api_keys(key_prefix) WHERE revoked_at IS NULL;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins manage API keys" ON public.api_keys;
CREATE POLICY "Super admins manage API keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.is_platform_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.api_rate_limit_windows (
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (api_key_id, window_started_at)
);

ALTER TABLE public.api_rate_limit_windows ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.api_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_id uuid NOT NULL UNIQUE,
  method text NOT NULL,
  route text NOT NULL,
  status_code integer NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  ip_address text,
  user_agent text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_request_events_key_created
  ON public.api_request_events(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_events_company_created
  ON public.api_request_events(company_id, created_at DESC);

ALTER TABLE public.api_request_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins view API request events" ON public.api_request_events;
CREATE POLICY "Super admins view API request events"
  ON public.api_request_events FOR SELECT TO authenticated
  USING (public.is_platform_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.api_idempotency_records (
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 255),
  request_fingerprint text NOT NULL,
  response_status integer CHECK (response_status BETWEEN 100 AND 599),
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (api_key_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_expiry ON public.api_idempotency_records(expires_at);
ALTER TABLE public.api_idempotency_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.api_get_access_level(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_level text := 'none';
  v_override record;
BEGIN
  v_plan_id := public.saas_get_effective_plan_id(p_company_id, 'core_property');

  SELECT trim(both '"' from entitlement.json_value::text)
  INTO v_level
  FROM public.saas_plan_entitlements entitlement
  JOIN public.saas_entitlement_keys key_definition ON key_definition.id = entitlement.entitlement_key_id
  WHERE entitlement.plan_id = v_plan_id
    AND key_definition.key = 'api.access.level'
  LIMIT 1;

  SELECT override_row.decision, override_row.metadata
  INTO v_override
  FROM public.platform_entitlement_overrides override_row
  WHERE override_row.company_id = p_company_id
    AND override_row.entitlement_key = 'api.access.level'
    AND override_row.revoked_at IS NULL
    AND (override_row.expires_at IS NULL OR override_row.expires_at > now())
  ORDER BY override_row.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_override.decision = 'deny' THEN
      RETURN 'none';
    END IF;
    v_level := coalesce(nullif(v_override.metadata->>'access_level', ''), 'full');
  END IF;

  RETURN CASE WHEN v_level IN ('limited', 'full') THEN v_level ELSE 'none' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.api_consume_rate_limit(p_api_key_id uuid)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_window timestamptz := date_trunc('minute', clock_timestamp());
  v_count integer;
BEGIN
  SELECT rate_limit_per_min INTO v_limit
  FROM public.api_keys
  WHERE id = p_api_key_id AND revoked_at IS NULL;

  IF v_limit IS NULL THEN
    RETURN QUERY SELECT false, 0, v_window + interval '1 minute';
    RETURN;
  END IF;

  INSERT INTO public.api_rate_limit_windows(api_key_id, window_started_at, request_count)
  VALUES (p_api_key_id, v_window, 1)
  ON CONFLICT (api_key_id, window_started_at) DO UPDATE
    SET request_count = public.api_rate_limit_windows.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT v_count <= v_limit, greatest(0, v_limit - v_count), v_window + interval '1 minute';
END;
$$;

CREATE OR REPLACE FUNCTION public.api_record_request(
  p_api_key_id uuid,
  p_request_id uuid,
  p_method text,
  p_route text,
  p_status_code integer,
  p_duration_ms integer,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_error_code text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.api_request_events(
    api_key_id, company_id, request_id, method, route, status_code,
    duration_ms, ip_address, user_agent, error_code
  )
  SELECT key_row.id, key_row.company_id, p_request_id, upper(p_method), p_route,
    p_status_code, p_duration_ms, p_ip_address, p_user_agent, p_error_code
  FROM public.api_keys key_row
  WHERE key_row.id = p_api_key_id;

  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE id = p_api_key_id;
END;
$$;

REVOKE ALL ON TABLE public.api_rate_limit_windows, public.api_idempotency_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_get_access_level(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_consume_rate_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.api_record_request(uuid,uuid,text,text,integer,integer,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_get_access_level(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_consume_rate_limit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.api_record_request(uuid,uuid,text,text,integer,integer,text,text,text) TO service_role;
