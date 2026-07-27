-- Phase 12 follow-up: risk queue triage actions and active session revocation.

DO $$
BEGIN
  IF to_regclass('public.platform_sessions') IS NULL
     OR to_regclass('public.platform_impersonation_sessions') IS NULL
     OR to_regclass('public.governance_alerts') IS NULL
     OR to_regclass('public.abuse_signals') IS NULL
     OR to_regclass('public.risk_decisions') IS NULL
     OR to_regprocedure('public.is_platform_super_admin(uuid)') IS NULL
     OR to_regprocedure('public.has_platform_operator_role(uuid,text)') IS NULL
     OR to_regprocedure('public.platform_ingest_audit_event(text,text,text,text,text,text,uuid,uuid,text,text,text,integer,text,text,jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'CONTROL_PLANE_RISK_TRIAGE_PREREQUISITES_MISSING';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.platform_risk_queue_triage_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_type text NOT NULL CHECK (row_type IN ('governance_alert', 'abuse_signal', 'risk_decision')),
  row_id uuid NOT NULL,
  triage_status text NOT NULL CHECK (triage_status IN ('acknowledged', 'resolved', 'escalated', 'false_positive')),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_risk_triage_created
  ON public.platform_risk_queue_triage_actions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_risk_triage_row
  ON public.platform_risk_queue_triage_actions (row_type, row_id, created_at DESC);

ALTER TABLE public.platform_risk_queue_triage_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_risk_queue_triage_actions'
      AND policyname = 'Super admins can manage platform risk queue triage actions'
  ) THEN
    CREATE POLICY "Super admins can manage platform risk queue triage actions"
    ON public.platform_risk_queue_triage_actions
    FOR ALL TO authenticated
    USING (public.is_platform_super_admin(auth.uid()))
    WITH CHECK (public.is_platform_super_admin(auth.uid()));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_triage_risk_queue_item(
  p_row_type text,
  p_row_id uuid,
  p_triage_status text,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_row_type text := lower(trim(coalesce(p_row_type, '')));
  v_triage_status text := lower(trim(coalesce(p_triage_status, '')));
  v_company_id uuid := NULL;
  v_existing_alert public.governance_alerts%ROWTYPE;
  v_action public.platform_risk_queue_triage_actions%ROWTYPE;
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

  IF v_row_type NOT IN ('governance_alert', 'abuse_signal', 'risk_decision') THEN
    RAISE EXCEPTION 'INVALID_RISK_ROW_TYPE';
  END IF;

  IF v_triage_status NOT IN ('acknowledged', 'resolved', 'escalated', 'false_positive') THEN
    RAISE EXCEPTION 'INVALID_TRIAGE_STATUS';
  END IF;

  IF v_row_type = 'governance_alert' THEN
    SELECT * INTO v_existing_alert
    FROM public.governance_alerts ga
    WHERE ga.id = p_row_id
    LIMIT 1;

    IF v_existing_alert.id IS NULL THEN
      RAISE EXCEPTION 'GOVERNANCE_ALERT_NOT_FOUND';
    END IF;

    v_company_id := v_existing_alert.company_id;

    UPDATE public.governance_alerts ga
    SET status = CASE
        WHEN v_triage_status = 'acknowledged' THEN 'acknowledged'
        WHEN v_triage_status = 'resolved' THEN 'resolved'
        ELSE ga.status
      END,
      resolved_at = CASE
        WHEN v_triage_status = 'resolved' THEN now()
        ELSE ga.resolved_at
      END,
      updated_at = now(),
      metadata = coalesce(ga.metadata, '{}'::jsonb)
        || jsonb_build_object(
          'last_triage_status', v_triage_status,
          'last_triage_notes', nullif(trim(coalesce(p_notes, '')), ''),
          'last_triage_actor_user_id', v_actor,
          'last_triage_at', now()
        )
        || coalesce(p_metadata, '{}'::jsonb)
    WHERE ga.id = p_row_id;
  ELSIF v_row_type = 'abuse_signal' THEN
    SELECT a.company_id INTO v_company_id
    FROM public.abuse_signals a
    WHERE a.id = p_row_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'ABUSE_SIGNAL_NOT_FOUND';
    END IF;
  ELSE
    SELECT r.company_id INTO v_company_id
    FROM public.risk_decisions r
    WHERE r.id = p_row_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'RISK_DECISION_NOT_FOUND';
    END IF;
  END IF;

  INSERT INTO public.platform_risk_queue_triage_actions (
    row_type,
    row_id,
    triage_status,
    company_id,
    actor_user_id,
    notes,
    metadata
  ) VALUES (
    v_row_type,
    p_row_id,
    v_triage_status,
    v_company_id,
    v_actor,
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  ) RETURNING * INTO v_action;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    'risk.queue.triage',
    'security',
    'triage_risk_queue_item',
    'success',
    CASE
      WHEN v_triage_status IN ('escalated', 'resolved') THEN 'warning'
      ELSE 'info'
    END,
    v_actor,
    v_company_id,
    'risk_item',
    concat(v_row_type, ':', p_row_id::text),
    concat('risk-triage-', v_row_type, '-', p_row_id::text, '-', extract(epoch FROM now())::bigint::text),
    CASE WHEN v_triage_status = 'escalated' THEN 80 ELSE 35 END,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object(
      'triage_action_id', v_action.id,
      'row_type', v_row_type,
      'row_id', p_row_id,
      'triage_status', v_triage_status,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'triage_action_id', v_action.id,
    'row_type', v_row_type,
    'row_id', p_row_id,
    'triage_status', v_triage_status,
    'company_id', v_company_id,
    'created_at', v_action.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_revoke_active_platform_sessions(
  p_principal_type text,
  p_principal_id uuid,
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
  v_revoked_sessions integer := 0;
  v_revoked_impersonation integer := 0;
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
    RAISE EXCEPTION 'REVOCATION_REASON_REQUIRED';
  END IF;

  IF v_type = 'company' THEN
    v_company_id := p_principal_id;

    WITH target_sessions AS (
      SELECT ps.id
      FROM public.platform_sessions ps
      WHERE ps.company_id = p_principal_id
        AND ps.ended_at IS NULL
      FOR UPDATE
    )
    UPDATE public.platform_sessions ps
    SET ended_at = now(),
        metadata = coalesce(ps.metadata, '{}'::jsonb)
          || coalesce(p_metadata, '{}'::jsonb)
          || jsonb_build_object('revoked_by', v_actor, 'revoked_reason', trim(p_reason), 'revoked_at', now())
    WHERE ps.id IN (SELECT id FROM target_sessions);

    GET DIAGNOSTICS v_revoked_sessions = ROW_COUNT;
  ELSE
    SELECT cm.company_id INTO v_company_id
    FROM public.company_members cm
    WHERE cm.user_id = p_principal_id
    ORDER BY cm.created_at DESC
    LIMIT 1;

    WITH target_sessions AS (
      SELECT ps.id
      FROM public.platform_sessions ps
      WHERE ps.user_id = p_principal_id
        AND ps.ended_at IS NULL
      FOR UPDATE
    )
    UPDATE public.platform_sessions ps
    SET ended_at = now(),
        metadata = coalesce(ps.metadata, '{}'::jsonb)
          || coalesce(p_metadata, '{}'::jsonb)
          || jsonb_build_object('revoked_by', v_actor, 'revoked_reason', trim(p_reason), 'revoked_at', now())
    WHERE ps.id IN (SELECT id FROM target_sessions);

    GET DIAGNOSTICS v_revoked_sessions = ROW_COUNT;
  END IF;

  UPDATE public.platform_impersonation_sessions i
  SET ended_at = now(),
      metadata = coalesce(i.metadata, '{}'::jsonb)
        || jsonb_build_object('revoked_by', v_actor, 'revoked_reason', trim(p_reason), 'revoked_at', now())
  WHERE i.ended_at IS NULL
    AND i.session_id IN (
      SELECT ps.id
      FROM public.platform_sessions ps
      WHERE (v_type = 'company' AND ps.company_id = p_principal_id)
         OR (v_type = 'user' AND ps.user_id = p_principal_id)
    );

  GET DIAGNOSTICS v_revoked_impersonation = ROW_COUNT;

  PERFORM public.platform_ingest_audit_event(
    'platform_control_plane',
    'session.revocation.applied',
    'security',
    'revoke_active_platform_sessions',
    'success',
    'critical',
    v_actor,
    v_company_id,
    v_type,
    p_principal_id::text,
    concat('session-revoke-', v_type, '-', p_principal_id::text, '-', extract(epoch FROM now())::bigint::text),
    85,
    NULL,
    NULL,
    jsonb_build_object('operator_user_id', v_actor),
    jsonb_build_object(
      'principal_type', v_type,
      'principal_id', p_principal_id,
      'revoked_sessions', v_revoked_sessions,
      'revoked_impersonation_sessions', v_revoked_impersonation,
      'reason', trim(p_reason)
    )
  );

  RETURN jsonb_build_object(
    'applied', true,
    'principal_type', v_type,
    'principal_id', p_principal_id,
    'revoked_sessions', v_revoked_sessions,
    'revoked_impersonation_sessions', v_revoked_impersonation
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_triage_risk_queue_item(text, uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_revoke_active_platform_sessions(text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_triage_risk_queue_item(text, uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_revoke_active_platform_sessions(text, uuid, text, jsonb) TO service_role;
