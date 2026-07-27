-- Phase 12: Control Plane trust-and-safety operations.
-- Adds entitlement overrides, suspension controls, impersonation lifecycle,
-- and a unified risk queue feed for operator triage.

DO $$
BEGIN
  IF to_regclass('public.companies') IS NULL
     OR to_regclass('public.saas_entitlement_keys') IS NULL
     OR to_regclass('public.platform_sessions') IS NULL
     OR to_regclass('public.platform_impersonation_sessions') IS NULL
     OR to_regclass('public.governance_alerts') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL
     OR to_regprocedure('public.platform_ingest_audit_event(text,text,text,text,text,text,uuid,uuid,text,text,text,integer,text,text,jsonb,jsonb)') IS NULL
     OR to_regprocedure('public.saas_has_entitlement(uuid,text,text)') IS NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_SAFETY_PHASE12_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.platform_entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('allow', 'deny')),
  reason text NOT NULL,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_entitlement_overrides_company_created
  ON public.platform_entitlement_overrides(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_entitlement_overrides_entitlement
  ON public.platform_entitlement_overrides(entitlement_key, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_entitlement_override_active
  ON public.platform_entitlement_overrides(company_id, entitlement_key)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.platform_principal_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_type text NOT NULL CHECK (principal_type IN ('company', 'user')),
  principal_id uuid NOT NULL,
  reason text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cleared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cleared_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_principal_suspensions_lookup
  ON public.platform_principal_suspensions(principal_type, principal_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_principal_suspension_active
  ON public.platform_principal_suspensions(principal_type, principal_id)
  WHERE is_active = true;

ALTER TABLE public.platform_entitlement_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_principal_suspensions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_entitlement_overrides'
      AND policyname = 'Super admins can manage platform entitlement overrides'
  ) THEN
    CREATE POLICY "Super admins can manage platform entitlement overrides"
    ON public.platform_entitlement_overrides
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_principal_suspensions'
      AND policyname = 'Super admins can manage platform principal suspensions'
  ) THEN
    CREATE POLICY "Super admins can manage platform principal suspensions"
    ON public.platform_principal_suspensions
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_set_entitlement_override(
  p_company_id uuid,
  p_entitlement_key text,
  p_decision text,
  p_reason text,
  p_expires_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing_id uuid;
  v_override public.platform_entitlement_overrides%ROWTYPE;
  v_norm_decision text := lower(trim(coalesce(p_decision, '')));
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  IF v_norm_decision NOT IN ('allow', 'deny') THEN
    RAISE EXCEPTION 'INVALID_OVERRIDE_DECISION';
  END IF;

  IF nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'OVERRIDE_REASON_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.saas_entitlement_keys sek
    WHERE sek.key = p_entitlement_key
  ) THEN
    RAISE EXCEPTION 'ENTITLEMENT_KEY_NOT_FOUND';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.platform_entitlement_overrides
  WHERE company_id = p_company_id
    AND entitlement_key = p_entitlement_key
    AND revoked_at IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.platform_entitlement_overrides
    SET revoked_at = now(),
        revoked_by = v_actor,
        updated_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object('replaced_by_new_override', true, 'replaced_at', now())
    WHERE id = v_existing_id;
  END IF;

  INSERT INTO public.platform_entitlement_overrides (
    company_id,
    entitlement_key,
    decision,
    reason,
    expires_at,
    created_by,
    metadata
  ) VALUES (
    p_company_id,
    p_entitlement_key,
    v_norm_decision,
    trim(p_reason),
    p_expires_at,
    v_actor,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('source', 'control_plane')
  ) RETURNING * INTO v_override;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    'entitlement.override.set',
    'entitlement',
    'set_override',
    'success',
    'warning',
    v_actor,
    p_company_id,
    'company',
    p_company_id::text,
    concat('ent-override-', p_company_id::text, '-', p_entitlement_key, '-', extract(epoch FROM now())::bigint::text),
    25,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object(
      'override_id', v_override.id,
      'entitlement_key', p_entitlement_key,
      'decision', v_norm_decision,
      'expires_at', p_expires_at,
      'reason', trim(p_reason)
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'override_id', v_override.id,
    'company_id', v_override.company_id,
    'entitlement_key', v_override.entitlement_key,
    'decision', v_override.decision,
    'reason', v_override.reason,
    'expires_at', v_override.expires_at,
    'created_at', v_override.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_revoke_entitlement_override(
  p_override_id uuid,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_override public.platform_entitlement_overrides%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  UPDATE public.platform_entitlement_overrides
  SET revoked_at = now(),
      revoked_by = v_actor,
      updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object('revocation_reason', nullif(trim(coalesce(p_reason, '')), ''))
  WHERE id = p_override_id
    AND revoked_at IS NULL
  RETURNING * INTO v_override;

  IF v_override.id IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_OVERRIDE_NOT_FOUND';
  END IF;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    'entitlement.override.revoked',
    'entitlement',
    'revoke_override',
    'success',
    'info',
    v_actor,
    v_override.company_id,
    'company',
    v_override.company_id::text,
    concat('ent-override-revoke-', v_override.id::text),
    10,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object(
      'override_id', v_override.id,
      'entitlement_key', v_override.entitlement_key,
      'decision', v_override.decision,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object('applied', true, 'override_id', v_override.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_list_entitlement_overrides(
  p_company_id uuid DEFAULT NULL,
  p_only_active boolean DEFAULT true,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  entitlement_key text,
  decision text,
  reason text,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_limit integer := LEAST(500, GREATEST(1, COALESCE(p_limit, 200)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'billing_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.company_id,
    o.entitlement_key,
    o.decision,
    o.reason,
    o.expires_at,
    o.created_by,
    o.created_at,
    o.revoked_at,
    o.revoked_by
  FROM public.platform_entitlement_overrides o
  WHERE (p_company_id IS NULL OR o.company_id = p_company_id)
    AND (NOT p_only_active OR o.revoked_at IS NULL)
  ORDER BY o.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_set_principal_suspension(
  p_principal_type text,
  p_principal_id uuid,
  p_suspend boolean,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text := lower(trim(coalesce(p_principal_type, '')));
  v_active public.platform_principal_suspensions%ROWTYPE;
  v_company_id uuid := NULL;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  IF v_type NOT IN ('company', 'user') THEN
    RAISE EXCEPTION 'INVALID_PRINCIPAL_TYPE';
  END IF;

  IF nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'SUSPENSION_REASON_REQUIRED';
  END IF;

  IF v_type = 'company' THEN
    v_company_id := p_principal_id;
  ELSE
    SELECT cm.company_id INTO v_company_id
    FROM public.company_members cm
    WHERE cm.user_id = p_principal_id
    ORDER BY cm.created_at DESC
    LIMIT 1;
  END IF;

  SELECT * INTO v_active
  FROM public.platform_principal_suspensions s
  WHERE s.principal_type = v_type
    AND s.principal_id = p_principal_id
    AND s.is_active = true
  FOR UPDATE;

  IF p_suspend THEN
    IF v_active.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'applied', true,
        'idempotent', true,
        'suspension_id', v_active.id,
        'principal_type', v_active.principal_type,
        'principal_id', v_active.principal_id
      );
    END IF;

    INSERT INTO public.platform_principal_suspensions (
      principal_type,
      principal_id,
      reason,
      is_active,
      created_by,
      metadata
    ) VALUES (
      v_type,
      p_principal_id,
      trim(p_reason),
      true,
      v_actor,
      coalesce(p_metadata, '{}'::jsonb)
    ) RETURNING * INTO v_active;
  ELSE
    IF v_active.id IS NULL THEN
      RETURN jsonb_build_object('applied', true, 'idempotent', true, 'suspension_id', NULL);
    END IF;

    UPDATE public.platform_principal_suspensions
    SET is_active = false,
        cleared_by = v_actor,
        cleared_at = now(),
        updated_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || coalesce(p_metadata, '{}'::jsonb)
          || jsonb_build_object('clear_reason', trim(p_reason))
    WHERE id = v_active.id
    RETURNING * INTO v_active;
  END IF;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    CASE WHEN p_suspend THEN 'principal.suspension.applied' ELSE 'principal.suspension.cleared' END,
    'security',
    CASE WHEN p_suspend THEN 'apply_suspension' ELSE 'clear_suspension' END,
    'success',
    CASE WHEN p_suspend THEN 'critical' ELSE 'warning' END,
    v_actor,
    v_company_id,
    v_type,
    p_principal_id::text,
    concat('principal-suspension-', v_type, '-', p_principal_id::text, '-', extract(epoch FROM now())::bigint::text),
    CASE WHEN p_suspend THEN 90 ELSE 40 END,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object(
      'suspension_id', v_active.id,
      'principal_type', v_type,
      'principal_id', p_principal_id,
      'suspended', p_suspend,
      'reason', trim(p_reason)
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'idempotent', false,
    'suspension_id', v_active.id,
    'principal_type', v_type,
    'principal_id', p_principal_id,
    'is_active', v_active.is_active
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_list_active_suspensions(
  p_principal_type text DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  principal_type text,
  principal_id uuid,
  reason text,
  created_by uuid,
  created_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_type text := nullif(lower(trim(coalesce(p_principal_type, ''))), '');
  v_limit integer := LEAST(500, GREATEST(1, COALESCE(p_limit, 200)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.principal_type,
    s.principal_id,
    s.reason,
    s.created_by,
    s.created_at,
    s.metadata
  FROM public.platform_principal_suspensions s
  WHERE s.is_active = true
    AND (v_type IS NULL OR s.principal_type = v_type)
  ORDER BY s.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_start_impersonation_session(
  p_target_user_id uuid,
  p_company_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_session public.platform_sessions%ROWTYPE;
  v_impersonation public.platform_impersonation_sessions%ROWTYPE;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'IMPERSONATION_REASON_REQUIRED';
  END IF;

  INSERT INTO public.platform_sessions (
    session_key,
    user_id,
    company_id,
    metadata
  ) VALUES (
    concat('impersonation:', gen_random_uuid()::text),
    p_target_user_id,
    p_company_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('impersonated_by', v_actor)
  ) RETURNING * INTO v_session;

  INSERT INTO public.platform_impersonation_sessions (
    session_id,
    actor_user_id,
    target_user_id,
    company_id,
    reason,
    metadata
  ) VALUES (
    v_session.id,
    v_actor,
    p_target_user_id,
    p_company_id,
    v_reason,
    coalesce(p_metadata, '{}'::jsonb)
  ) RETURNING * INTO v_impersonation;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    'impersonation.session.started',
    'support',
    'start_impersonation',
    'warning',
    'critical',
    v_actor,
    p_company_id,
    'user',
    p_target_user_id::text,
    concat('impersonation-start-', v_impersonation.id::text),
    95,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object(
      'impersonation_session_id', v_impersonation.id,
      'platform_session_id', v_session.id,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'impersonation_session_id', v_impersonation.id,
    'platform_session_id', v_session.id,
    'session_key', v_session.session_key,
    'actor_user_id', v_actor,
    'target_user_id', p_target_user_id,
    'company_id', p_company_id,
    'started_at', v_impersonation.started_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_stop_impersonation_session(
  p_impersonation_session_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_impersonation public.platform_impersonation_sessions%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  UPDATE public.platform_impersonation_sessions
  SET ended_at = coalesce(ended_at, now()),
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object('stopped_by', v_actor, 'stopped_at', now())
  WHERE id = p_impersonation_session_id
  RETURNING * INTO v_impersonation;

  IF v_impersonation.id IS NULL THEN
    RAISE EXCEPTION 'IMPERSONATION_SESSION_NOT_FOUND';
  END IF;

  UPDATE public.platform_sessions
  SET ended_at = coalesce(ended_at, now()),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('impersonation_stopped_by', v_actor, 'impersonation_stopped_at', now())
  WHERE id = v_impersonation.session_id;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    'impersonation.session.stopped',
    'support',
    'stop_impersonation',
    'success',
    'warning',
    v_actor,
    v_impersonation.company_id,
    'user',
    v_impersonation.target_user_id::text,
    concat('impersonation-stop-', v_impersonation.id::text),
    40,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object('impersonation_session_id', v_impersonation.id)
  );

  RETURN jsonb_build_object(
    'applied', true,
    'impersonation_session_id', v_impersonation.id,
    'ended_at', v_impersonation.ended_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_list_impersonation_sessions(
  p_only_active boolean DEFAULT true,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  actor_user_id uuid,
  target_user_id uuid,
  company_id uuid,
  reason text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_limit integer := LEAST(500, GREATEST(1, COALESCE(p_limit, 100)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.session_id,
    i.actor_user_id,
    i.target_user_id,
    i.company_id,
    i.reason,
    i.started_at,
    i.ended_at,
    i.created_at
  FROM public.platform_impersonation_sessions i
  WHERE (NOT p_only_active OR i.ended_at IS NULL)
  ORDER BY i.started_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_get_risk_queue(
  p_company_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  row_type text,
  row_id uuid,
  company_id uuid,
  severity text,
  status text,
  title text,
  detail text,
  score integer,
  occurred_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_limit integer := LEAST(500, GREATEST(1, COALESCE(p_limit, 200)));
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF NOT public.is_platform_super_admin(v_actor)
       AND NOT public.has_platform_operator_role(v_actor, 'support_operator')
       AND NOT public.has_platform_operator_role(v_actor, 'security_auditor') THEN
      RAISE EXCEPTION 'INSUFFICIENT_PLATFORM_OPERATOR_ROLE';
    END IF;
  END IF;

  RETURN QUERY
  WITH combined AS (
    SELECT
      'governance_alert'::text AS row_type,
      ga.id AS row_id,
      ga.company_id,
      ga.severity,
      ga.status,
      ga.title,
      coalesce(ga.description, ga.alert_type) AS detail,
      CASE ga.severity
        WHEN 'critical' THEN 95
        WHEN 'warning' THEN 70
        ELSE 30
      END AS score,
      ga.created_at AS occurred_at,
      coalesce(ga.metadata, '{}'::jsonb) AS metadata
    FROM public.governance_alerts ga
    WHERE ga.status IN ('open', 'acknowledged')
      AND (p_company_id IS NULL OR ga.company_id = p_company_id)

    UNION ALL

    SELECT
      'abuse_signal'::text AS row_type,
      a.id AS row_id,
      a.company_id,
      CASE a.severity
        WHEN 'critical' THEN 'critical'
        WHEN 'high' THEN 'warning'
        WHEN 'medium' THEN 'warning'
        ELSE 'info'
      END AS severity,
      'open'::text AS status,
      concat('Abuse signal: ', a.signal_type) AS title,
      concat('Detected ', a.signal_type, ' for marketplace flow') AS detail,
      CASE a.severity
        WHEN 'critical' THEN 95
        WHEN 'high' THEN 85
        WHEN 'medium' THEN 65
        ELSE 40
      END AS score,
      a.detected_at AS occurred_at,
      coalesce(a.metadata, '{}'::jsonb) AS metadata
    FROM public.abuse_signals a
    WHERE (p_company_id IS NULL OR a.company_id = p_company_id)

    UNION ALL

    SELECT
      'risk_decision'::text AS row_type,
      r.id AS row_id,
      r.company_id,
      CASE r.decision
        WHEN 'block' THEN 'critical'
        WHEN 'review' THEN 'warning'
        ELSE 'info'
      END AS severity,
      'open'::text AS status,
      concat('Risk decision: ', r.decision) AS title,
      concat('Risk decision score ', r.score::text) AS detail,
      r.score AS score,
      r.decided_at AS occurred_at,
      coalesce(r.metadata, '{}'::jsonb)
        || jsonb_build_object('reason_codes', r.reason_codes) AS metadata
    FROM public.risk_decisions r
    WHERE (p_company_id IS NULL OR r.company_id = p_company_id)
  )
  SELECT
    c.row_type,
    c.row_id,
    c.company_id,
    c.severity,
    c.status,
    c.title,
    c.detail,
    c.score,
    c.occurred_at,
    c.metadata
  FROM combined c
  ORDER BY c.occurred_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_is_principal_suspended(
  p_principal_type text,
  p_principal_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_principal_suspensions s
    WHERE s.principal_type = lower(trim(coalesce(p_principal_type, '')))
      AND s.principal_id = p_principal_id
      AND s.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.platform_set_entitlement_override(uuid, text, text, text, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_revoke_entitlement_override(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_entitlement_overrides(uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_set_principal_suspension(text, uuid, boolean, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_active_suspensions(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_start_impersonation_session(uuid, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_stop_impersonation_session(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_impersonation_sessions(boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_get_risk_queue(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_is_principal_suspended(text, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.platform_set_entitlement_override(uuid, text, text, text, timestamptz, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_revoke_entitlement_override(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_entitlement_overrides(uuid, boolean, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_set_principal_suspension(text, uuid, boolean, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_active_suspensions(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_start_impersonation_session(uuid, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_stop_impersonation_session(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_impersonation_sessions(boolean, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_get_risk_queue(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_is_principal_suspended(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.saas_has_entitlement(
  p_company_id uuid,
  p_entitlement_key text,
  p_product_code text DEFAULT 'core_property'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_entitlement_key_id uuid;
  v_base_bool boolean := false;
  v_addon_override boolean := false;
  v_manual_decision text;
BEGIN
  SELECT o.decision INTO v_manual_decision
  FROM public.platform_entitlement_overrides o
  WHERE o.company_id = p_company_id
    AND o.entitlement_key = p_entitlement_key
    AND o.revoked_at IS NULL
    AND (o.expires_at IS NULL OR o.expires_at > now())
  ORDER BY o.created_at DESC
  LIMIT 1;

  IF v_manual_decision = 'allow' THEN
    RETURN true;
  END IF;

  IF v_manual_decision = 'deny' THEN
    RETURN false;
  END IF;

  v_plan_id := public.saas_get_effective_plan_id(p_company_id, p_product_code);

  IF v_plan_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT sek.id INTO v_entitlement_key_id
  FROM public.saas_entitlement_keys sek
  WHERE sek.key = p_entitlement_key
  LIMIT 1;

  IF v_entitlement_key_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(spe.bool_value, false)
  INTO v_base_bool
  FROM public.saas_plan_entitlements spe
  WHERE spe.plan_id = v_plan_id
    AND spe.entitlement_key_id = v_entitlement_key_id
  LIMIT 1;

  SELECT COALESCE(bool_or(COALESCE(sae.bool_value, false)), false)
  INTO v_addon_override
  FROM public.saas_company_addon_subscriptions cas
  JOIN public.saas_addon_entitlements sae ON sae.addon_id = cas.addon_id
  WHERE cas.company_id = p_company_id
    AND cas.status IN ('active', 'trialing', 'grace_period')
    AND sae.entitlement_key_id = v_entitlement_key_id
    AND sae.mode = 'set';

  RETURN (COALESCE(v_base_bool, false) OR COALESCE(v_addon_override, false));
END;
$$;
