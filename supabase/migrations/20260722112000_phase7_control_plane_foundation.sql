-- Phase 7: Super Admin Control Plane governance domain foundation

-- Bootstrap helper for environments where this may not exist yet.
CREATE OR REPLACE FUNCTION public.is_platform_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_super_admin(uuid) TO authenticated;

-- Platform operator roles for non-super-admin governance personas.
CREATE TABLE IF NOT EXISTS public.platform_operator_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('security_auditor', 'support_operator', 'billing_operator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.platform_operator_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_platform_operator_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_operator_roles por
    WHERE por.user_id = _user_id
      AND por.role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_platform_operator_role(uuid, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.platform_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  result_status text NOT NULL DEFAULT 'success' CHECK (result_status IN ('success', 'warning', 'blocked', 'denied', 'error')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  impersonator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  target_entity_type text,
  target_entity_id text,
  correlation_id text NOT NULL,
  ip_address text,
  user_agent text,
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ip_address text,
  user_agent text,
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.platform_sessions(id) ON DELETE SET NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entitlement_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  module text NOT NULL,
  action text NOT NULL,
  entitlement_key text NOT NULL,
  allowed boolean NOT NULL,
  decision_reason text,
  correlation_id text NOT NULL,
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  quota_code text NOT NULL,
  used_value integer NOT NULL,
  soft_limit integer NOT NULL,
  hard_limit integer NOT NULL,
  remaining integer NOT NULL,
  usage_percent integer NOT NULL CHECK (usage_percent >= 0 AND usage_percent <= 100),
  limit_state text NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.governance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  alert_type text NOT NULL,
  title text NOT NULL,
  description text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.platform_audit_events(id) ON DELETE SET NULL,
  correlation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_events_created_at
  ON public.platform_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_correlation_id
  ON public.platform_audit_events (correlation_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_company
  ON public.platform_audit_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_module_action
  ON public.platform_audit_events (module, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_sessions_user
  ON public.platform_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_company
  ON public.platform_sessions (company_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_impersonation_sessions_target
  ON public.platform_impersonation_sessions (target_user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_entitlement_decisions_company
  ON public.entitlement_decisions (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entitlement_decisions_key
  ON public.entitlement_decisions (entitlement_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entitlement_decisions_correlation
  ON public.entitlement_decisions (correlation_id);

CREATE INDEX IF NOT EXISTS idx_usage_snapshots_company
  ON public.usage_snapshots (company_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_company_quota
  ON public.usage_snapshots (company_id, quota_code, snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_governance_alerts_status_created
  ON public.governance_alerts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_company_created
  ON public.governance_alerts (company_id, created_at DESC);

ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlement_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_alerts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'platform_audit_events',
    'platform_sessions',
    'platform_impersonation_sessions',
    'entitlement_decisions',
    'usage_snapshots',
    'governance_alerts',
    'platform_operator_roles'
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
      AND tablename = 'platform_audit_events'
      AND policyname = 'Security auditors can read platform audit events'
  ) THEN
    CREATE POLICY "Security auditors can read platform audit events"
    ON public.platform_audit_events
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'security_auditor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_sessions'
      AND policyname = 'Security auditors can read platform sessions'
  ) THEN
    CREATE POLICY "Security auditors can read platform sessions"
    ON public.platform_sessions
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'security_auditor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_impersonation_sessions'
      AND policyname = 'Security auditors can read impersonation sessions'
  ) THEN
    CREATE POLICY "Security auditors can read impersonation sessions"
    ON public.platform_impersonation_sessions
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'security_auditor'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'entitlement_decisions'
      AND policyname = 'Billing operators can read entitlement decisions'
  ) THEN
    CREATE POLICY "Billing operators can read entitlement decisions"
    ON public.entitlement_decisions
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'billing_operator'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'usage_snapshots'
      AND policyname = 'Billing operators can read usage snapshots'
  ) THEN
    CREATE POLICY "Billing operators can read usage snapshots"
    ON public.usage_snapshots
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'billing_operator'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'governance_alerts'
      AND policyname = 'Support operators can read governance alerts'
  ) THEN
    CREATE POLICY "Support operators can read governance alerts"
    ON public.governance_alerts
    FOR SELECT TO authenticated
    USING (public.has_platform_operator_role(auth.uid(), 'support_operator'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_create_governance_alert(
  p_severity text,
  p_alert_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO public.governance_alerts (
    severity,
    alert_type,
    title,
    description,
    company_id,
    event_id,
    correlation_id,
    metadata
  ) VALUES (
    p_severity,
    p_alert_type,
    p_title,
    p_description,
    p_company_id,
    p_event_id,
    p_correlation_id,
    p_metadata
  ) RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_create_governance_alert(text, text, text, text, uuid, uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_ingest_audit_event(
  p_source text,
  p_event_type text,
  p_module text,
  p_action text,
  p_result_status text DEFAULT 'success',
  p_severity text DEFAULT 'info',
  p_actor_user_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_target_entity_type text DEFAULT NULL,
  p_target_entity_id text DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_risk_score integer DEFAULT 0,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_info jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_correlation text;
BEGIN
  v_correlation := COALESCE(p_correlation_id, p_module || ':' || p_action || ':' || extract(epoch from now())::text);

  INSERT INTO public.platform_audit_events (
    source,
    event_type,
    module,
    action,
    result_status,
    severity,
    actor_user_id,
    company_id,
    target_entity_type,
    target_entity_id,
    correlation_id,
    risk_score,
    ip_address,
    user_agent,
    device_info,
    metadata
  ) VALUES (
    p_source,
    p_event_type,
    p_module,
    p_action,
    p_result_status,
    p_severity,
    p_actor_user_id,
    p_company_id,
    p_target_entity_type,
    p_target_entity_id,
    v_correlation,
    LEAST(GREATEST(COALESCE(p_risk_score, 0), 0), 100),
    p_ip_address,
    p_user_agent,
    COALESCE(p_device_info, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_event_id;

  IF COALESCE(p_risk_score, 0) >= 80 OR p_result_status IN ('blocked', 'denied', 'error') THEN
    PERFORM public.platform_create_governance_alert(
      CASE
        WHEN COALESCE(p_risk_score, 0) >= 90 THEN 'critical'
        WHEN p_result_status IN ('blocked', 'denied') THEN 'warning'
        ELSE 'info'
      END,
      'risk_or_blocked_event',
      'Governance event requires review',
      'High-risk or blocked event captured: ' || p_event_type,
      p_company_id,
      v_event_id,
      v_correlation,
      jsonb_build_object(
        'risk_score', COALESCE(p_risk_score, 0),
        'result_status', p_result_status,
        'module', p_module,
        'action', p_action
      )
    );
  END IF;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_ingest_audit_event(text, text, text, text, text, text, uuid, uuid, text, text, text, integer, text, text, jsonb, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_refresh_usage_snapshot(
  p_company_id uuid,
  p_product_code text DEFAULT 'core_property'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_inserted integer := 0;
  v_row record;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_FOR_USAGE_SNAPSHOT';
    END IF;
  END IF;

  FOR v_row IN
    SELECT *
    FROM public.saas_get_quota_snapshot(p_company_id, p_product_code)
  LOOP
    INSERT INTO public.usage_snapshots (
      company_id,
      product_code,
      quota_code,
      used_value,
      soft_limit,
      hard_limit,
      remaining,
      usage_percent,
      limit_state,
      snapshot_at
    ) VALUES (
      p_company_id,
      p_product_code,
      v_row.quota_code,
      v_row.used_value,
      v_row.soft_limit,
      v_row.hard_limit,
      v_row.remaining,
      v_row.usage_percent,
      v_row.limit_state,
      now()
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_refresh_usage_snapshot(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_governance_alerts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_governance_alerts_updated_at ON public.governance_alerts;
CREATE TRIGGER trg_governance_alerts_updated_at
BEFORE UPDATE ON public.governance_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_governance_alerts_updated_at();
