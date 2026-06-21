-- Wave 2 closure tranche: document lifecycle governance + automation replay operations

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS compliance_state text NOT NULL DEFAULT 'pending';

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS version_no integer NOT NULL DEFAULT 1;

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS review_notes text;

ALTER TABLE public.crm_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_documents_status_check'
  ) THEN
    ALTER TABLE public.crm_documents
      ADD CONSTRAINT crm_documents_status_check
      CHECK (status IN ('draft', 'under_review', 'approved', 'rejected', 'archived'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_documents_compliance_state_check'
  ) THEN
    ALTER TABLE public.crm_documents
      ADD CONSTRAINT crm_documents_compliance_state_check
      CHECK (compliance_state IN ('pending', 'verified', 'expired', 'rejected'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_documents_version_no_check'
  ) THEN
    ALTER TABLE public.crm_documents
      ADD CONSTRAINT crm_documents_version_no_check
      CHECK (version_no >= 1);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_crm_documents_company_status
  ON public.crm_documents(company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_documents_company_compliance
  ON public.crm_documents(company_id, compliance_state, created_at DESC);

DROP TRIGGER IF EXISTS update_crm_documents_updated_at ON public.crm_documents;
CREATE TRIGGER update_crm_documents_updated_at
BEFORE UPDATE ON public.crm_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.crm_replay_automation_run(p_run_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.crm_automation_runs%ROWTYPE;
  v_rule public.crm_automation_rules%ROWTYPE;
  v_actor uuid;
  v_can_manage boolean;
  v_replay_correlation text;
  v_replay_run_id uuid;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

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

  SELECT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = v_run.company_id
      AND cm.user_id = v_actor
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
  INTO v_can_manage;

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'INSUFFICIENT_PERMISSIONS_TO_REPLAY_AUTOMATION_RUN';
  END IF;

  IF v_run.status NOT IN ('failed', 'pending') THEN
    RAISE EXCEPTION 'RUN_STATUS_NOT_REPLAYABLE';
  END IF;

  v_replay_correlation := coalesce(v_run.correlation_id, format('crm-replay:%s', p_run_id)) || ':manual:' || gen_random_uuid()::text;

  PERFORM public.crm_execute_automation_rule(
    v_run.rule_id,
    v_run.payload_json,
    v_run.event_type,
    v_run.event_source_type,
    v_run.event_source_id,
    v_replay_correlation
  );

  SELECT id
  INTO v_replay_run_id
  FROM public.crm_automation_runs
  WHERE correlation_id = v_replay_correlation
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.crm_automation_runs
  SET result_json = coalesce(result_json, '{}'::jsonb) || jsonb_build_object(
        'manual_replay_requested_by', v_actor,
        'manual_replay_requested_at', now(),
        'manual_replay_correlation_id', v_replay_correlation,
        'manual_replay_run_id', v_replay_run_id
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
    'crm.automation.manual_replay',
    'info',
    v_actor,
    'crm_automation_run',
    v_run.id,
    jsonb_build_object(
      'original_run_id', v_run.id,
      'replay_run_id', v_replay_run_id,
      'rule_id', v_run.rule_id,
      'event_type', v_run.event_type
    ),
    v_replay_correlation
  );

  RETURN v_replay_run_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_replay_automation_run(uuid) TO authenticated;
