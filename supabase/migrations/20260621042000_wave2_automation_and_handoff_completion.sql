-- Wave 2: Automation Engine v1 + Handoff Completion Lifecycle
-- Covers:
-- - Generic trigger-condition-action automation rules with run logs
-- - Retry metadata and correlation tracing for automation runs
-- - End-to-end handoff completion into tenant + lease draft creation

CREATE TABLE IF NOT EXISTS public.crm_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_type text NOT NULL,
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  retry_limit integer NOT NULL DEFAULT 2 CHECK (retry_limit >= 0 AND retry_limit <= 10),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_automation_rules_company_name
  ON public.crm_automation_rules(company_id, name);

CREATE INDEX IF NOT EXISTS idx_crm_automation_rules_company_event
  ON public.crm_automation_rules(company_id, event_type, is_active);

CREATE TABLE IF NOT EXISTS public.crm_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.crm_automation_rules(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_source_type text NOT NULL,
  event_source_id uuid,
  correlation_id text,
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 0 CHECK (max_attempts >= 0),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_automation_runs_company_created
  ON public.crm_automation_runs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_automation_runs_correlation
  ON public.crm_automation_runs(correlation_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.crm_conditions_match(conditions jsonb, payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required_field text;
  kv record;
BEGIN
  IF conditions IS NULL OR conditions = '{}'::jsonb THEN
    RETURN true;
  END IF;

  IF conditions ? 'required_fields' THEN
    FOR required_field IN
      SELECT jsonb_array_elements_text(coalesce(conditions->'required_fields', '[]'::jsonb))
    LOOP
      IF nullif(coalesce(payload->>required_field, ''), '') IS NULL THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  IF conditions ? 'equals' THEN
    FOR kv IN
      SELECT key, value
      FROM jsonb_each_text(coalesce(conditions->'equals', '{}'::jsonb))
    LOOP
      IF coalesce(payload->>kv.key, '') <> kv.value THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_execute_automation_rule(
  p_rule_id uuid,
  p_payload jsonb,
  p_event_type text,
  p_source_type text,
  p_source_id uuid,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.crm_automation_rules%ROWTYPE;
  v_run_id uuid;
  v_action jsonb;
  v_error_count integer := 0;
  v_task_id uuid;
  v_lead_id uuid;
  v_owner_user_id uuid;
  v_due_in_hours integer;
  v_result jsonb := '{}'::jsonb;
BEGIN
  SELECT *
  INTO v_rule
  FROM public.crm_automation_rules
  WHERE id = p_rule_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.crm_automation_runs (
    rule_id,
    company_id,
    event_type,
    event_source_type,
    event_source_id,
    correlation_id,
    status,
    attempts,
    max_attempts,
    payload_json,
    result_json
  ) VALUES (
    v_rule.id,
    v_rule.company_id,
    p_event_type,
    p_source_type,
    p_source_id,
    p_correlation_id,
    'pending',
    0,
    v_rule.retry_limit,
    coalesce(p_payload, '{}'::jsonb),
    '{}'::jsonb
  ) RETURNING id INTO v_run_id;

  IF NOT v_rule.is_active THEN
    UPDATE public.crm_automation_runs
    SET status = 'skipped',
        result_json = jsonb_build_object('reason', 'rule_inactive'),
        updated_at = now()
    WHERE id = v_run_id;
    RETURN;
  END IF;

  IF NOT public.crm_conditions_match(v_rule.conditions_json, p_payload) THEN
    UPDATE public.crm_automation_runs
    SET status = 'skipped',
        result_json = jsonb_build_object('reason', 'condition_not_matched'),
        updated_at = now()
    WHERE id = v_run_id;
    RETURN;
  END IF;

  FOR v_action IN
    SELECT value FROM jsonb_array_elements(coalesce(v_rule.actions_json, '[]'::jsonb))
  LOOP
    BEGIN
      IF v_action->>'type' = 'create_task' THEN
        v_lead_id := coalesce(nullif(v_action->>'lead_id', '')::uuid, nullif(p_payload->>'lead_id', '')::uuid);
        v_owner_user_id := coalesce(nullif(v_action->>'owner_user_id', '')::uuid, nullif(p_payload->>'owner_user_id', '')::uuid, auth.uid());
        v_due_in_hours := coalesce(nullif(v_action->>'due_in_hours', '')::integer, 24);

        IF v_lead_id IS NULL OR v_owner_user_id IS NULL THEN
          v_error_count := v_error_count + 1;
        ELSE
          INSERT INTO public.lead_tasks (
            lead_id,
            task_type,
            owner_user_id,
            due_at,
            status,
            notes
          ) VALUES (
            v_lead_id,
            coalesce(nullif(v_action->>'task_type', ''), 'automation_follow_up'),
            v_owner_user_id,
            now() + make_interval(hours => v_due_in_hours),
            'open',
            coalesce(nullif(v_action->>'notes', ''), format('Automation task for %s', p_event_type))
          ) RETURNING id INTO v_task_id;

          v_result := v_result || jsonb_build_object('task_id', v_task_id);
        END IF;
      ELSIF v_action->>'type' = 'audit_event' THEN
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
          coalesce(nullif(v_action->>'event_type', ''), 'crm.automation.executed'),
          coalesce(nullif(v_action->>'severity', ''), 'info'),
          auth.uid(),
          p_source_type,
          p_source_id,
          jsonb_build_object(
            'rule_id', v_rule.id,
            'event_type', p_event_type,
            'action', v_action
          ),
          p_correlation_id
        );
      ELSIF v_action->>'type' = 'set_handoff_status' THEN
        UPDATE public.crm_deal_handoffs
        SET status = coalesce(nullif(v_action->>'status', ''), status),
            started_at = CASE WHEN coalesce(nullif(v_action->>'status', ''), '') = 'in_progress' THEN coalesce(started_at, now()) ELSE started_at END,
            updated_at = now()
        WHERE deal_id = coalesce(nullif(v_action->>'deal_id', '')::uuid, nullif(p_payload->>'deal_id', '')::uuid)
          AND company_id = v_rule.company_id;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;

  UPDATE public.crm_automation_runs
  SET status = CASE WHEN v_error_count = 0 THEN 'success' ELSE 'failed' END,
      attempts = 1,
      next_retry_at = CASE WHEN v_error_count = 0 THEN NULL ELSE now() + interval '5 minutes' END,
      last_error = CASE WHEN v_error_count = 0 THEN NULL ELSE 'One or more automation actions failed' END,
      result_json = v_result || jsonb_build_object('error_count', v_error_count),
      updated_at = now()
  WHERE id = v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_run_automation_for_event(
  p_company_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_source_type text,
  p_source_id uuid,
  p_correlation_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_id uuid;
BEGIN
  FOR v_rule_id IN
    SELECT id
    FROM public.crm_automation_rules
    WHERE company_id = p_company_id
      AND event_type = p_event_type
      AND is_active = true
  LOOP
    PERFORM public.crm_execute_automation_rule(
      v_rule_id,
      p_payload,
      p_event_type,
      p_source_type,
      p_source_id,
      p_correlation_id
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_trigger_automation_deal_stage_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correlation text;
BEGIN
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    RETURN NEW;
  END IF;

  v_correlation := format('crm:%s:%s:%s', NEW.company_id, NEW.id, extract(epoch FROM now())::bigint);

  PERFORM public.crm_run_automation_for_event(
    NEW.company_id,
    'deal.stage_changed',
    jsonb_build_object(
      'deal_id', NEW.id,
      'lead_id', NEW.lead_id,
      'account_id', NEW.account_id,
      'contact_id', NEW.contact_id,
      'from_stage', OLD.stage,
      'to_stage', NEW.stage,
      'owner_user_id', NEW.owner_user_id
    ),
    'crm_deal',
    NEW.id,
    v_correlation
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_trigger_automation_call_logged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correlation text;
BEGIN
  v_correlation := format('crm:%s:%s:%s', NEW.company_id, NEW.id, extract(epoch FROM now())::bigint);

  PERFORM public.crm_run_automation_for_event(
    NEW.company_id,
    'call.logged',
    jsonb_build_object(
      'call_id', NEW.id,
      'lead_id', CASE WHEN NEW.related_type = 'lead' THEN NEW.related_id ELSE NULL END,
      'owner_user_id', NEW.owner_user_id,
      'result', NEW.result,
      'subject', NEW.subject
    ),
    'crm_call',
    NEW.id,
    v_correlation
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_trigger_automation_meeting_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correlation text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'done' OR OLD.status = 'done' THEN
    RETURN NEW;
  END IF;

  v_correlation := format('crm:%s:%s:%s', NEW.company_id, NEW.id, extract(epoch FROM now())::bigint);

  PERFORM public.crm_run_automation_for_event(
    NEW.company_id,
    'meeting.completed',
    jsonb_build_object(
      'meeting_id', NEW.id,
      'lead_id', CASE WHEN NEW.related_type = 'lead' THEN NEW.related_id ELSE NULL END,
      'owner_user_id', NEW.host_user_id,
      'title', NEW.title
    ),
    'crm_meeting',
    NEW.id,
    v_correlation
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_trigger_automation_visit_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correlation text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_correlation := format('crm:%s:%s:%s', NEW.company_id, NEW.id, extract(epoch FROM now())::bigint);

  PERFORM public.crm_run_automation_for_event(
    NEW.company_id,
    'visit.completed',
    jsonb_build_object(
      'visit_id', NEW.id,
      'related_id', NEW.related_id,
      'related_type', NEW.related_type,
      'outcome', NEW.outcome,
      'proof_path', NEW.proof_path,
      'owner_user_id', NEW.created_by
    ),
    'crm_visit',
    NEW.id,
    v_correlation
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_complete_handoff(
  p_handoff_id uuid,
  p_tenant_name text,
  p_tenant_email text,
  p_tenant_phone text,
  p_lease_start date,
  p_lease_end date,
  p_monthly_rent numeric,
  p_security_deposit numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handoff public.crm_deal_handoffs%ROWTYPE;
  v_deal public.crm_deals%ROWTYPE;
  v_listing public.marketplace_listings%ROWTYPE;
  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_lease_id uuid;
  v_actor uuid;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED_FOR_HANDOFF_COMPLETION';
  END IF;

  SELECT *
  INTO v_handoff
  FROM public.crm_deal_handoffs
  WHERE id = p_handoff_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HANDOFF_NOT_FOUND';
  END IF;

  SELECT *
  INTO v_deal
  FROM public.crm_deals
  WHERE id = v_handoff.deal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEAL_NOT_FOUND_FOR_HANDOFF';
  END IF;

  IF v_deal.stage <> 'closed_won' THEN
    RAISE EXCEPTION 'HANDOFF_REQUIRES_CLOSED_WON_DEAL';
  END IF;

  IF v_deal.listing_id IS NOT NULL THEN
    SELECT *
    INTO v_listing
    FROM public.marketplace_listings
    WHERE id = v_deal.listing_id;
  END IF;

  v_unit_id := coalesce(v_deal.unit_id, v_listing.unit_id);
  v_property_id := coalesce(v_listing.property_id, (
    SELECT u.property_id
    FROM public.units u
    WHERE u.id = v_unit_id
    LIMIT 1
  ));

  INSERT INTO public.tenants (
    user_id,
    unit_id,
    property_id,
    name,
    email,
    phone,
    move_in_date,
    lease_end_date,
    monthly_rent,
    security_deposit,
    status
  ) VALUES (
    v_actor,
    v_unit_id,
    v_property_id,
    p_tenant_name,
    p_tenant_email,
    p_tenant_phone,
    p_lease_start,
    p_lease_end,
    p_monthly_rent,
    p_security_deposit,
    'pending'
  ) RETURNING id INTO v_tenant_id;

  INSERT INTO public.leases (
    user_id,
    tenant_id,
    property_id,
    unit_id,
    lease_number,
    start_date,
    end_date,
    monthly_rent,
    security_deposit,
    status,
    terms,
    special_conditions
  ) VALUES (
    v_actor,
    v_tenant_id,
    v_property_id,
    v_unit_id,
    format('HND-%s', upper(replace(gen_random_uuid()::text, '-', ''))),
    p_lease_start,
    p_lease_end,
    p_monthly_rent,
    p_security_deposit,
    'draft',
    format('Auto-generated from CRM handoff for deal %s', v_deal.deal_name),
    'Generated by crm_complete_handoff'
  ) RETURNING id INTO v_lease_id;

  UPDATE public.crm_deal_handoffs
  SET tenant_id = v_tenant_id,
      lease_id = v_lease_id,
      status = 'completed',
      started_at = coalesce(started_at, now()),
      completed_at = now(),
      readiness_notes = 'Handoff completed. Tenant and lease draft created.',
      updated_at = now()
  WHERE id = p_handoff_id;

  INSERT INTO public.audit_events (
    source,
    event_type,
    severity,
    actor_user_id,
    entity_type,
    entity_id,
    details
  ) VALUES (
    'marketplace_crm',
    'deal.handoff.completed',
    'info',
    v_actor,
    'crm_deal_handoffs',
    v_handoff.deal_id,
    jsonb_build_object(
      'handoff_id', p_handoff_id,
      'deal_id', v_handoff.deal_id,
      'tenant_id', v_tenant_id,
      'lease_id', v_lease_id
    )
  );

  RETURN v_lease_id;
END;
$$;

DROP TRIGGER IF EXISTS crm_trigger_automation_deal_stage_changed_trigger ON public.crm_deals;
CREATE TRIGGER crm_trigger_automation_deal_stage_changed_trigger
AFTER UPDATE ON public.crm_deals
FOR EACH ROW
EXECUTE FUNCTION public.crm_trigger_automation_deal_stage_changed();

DROP TRIGGER IF EXISTS crm_trigger_automation_call_logged_trigger ON public.crm_calls;
CREATE TRIGGER crm_trigger_automation_call_logged_trigger
AFTER INSERT ON public.crm_calls
FOR EACH ROW
EXECUTE FUNCTION public.crm_trigger_automation_call_logged();

DROP TRIGGER IF EXISTS crm_trigger_automation_meeting_completed_trigger ON public.crm_meetings;
CREATE TRIGGER crm_trigger_automation_meeting_completed_trigger
AFTER UPDATE ON public.crm_meetings
FOR EACH ROW
EXECUTE FUNCTION public.crm_trigger_automation_meeting_completed();

DROP TRIGGER IF EXISTS crm_trigger_automation_visit_completed_trigger ON public.crm_visits;
CREATE TRIGGER crm_trigger_automation_visit_completed_trigger
AFTER UPDATE ON public.crm_visits
FOR EACH ROW
EXECUTE FUNCTION public.crm_trigger_automation_visit_completed();

DROP TRIGGER IF EXISTS update_crm_automation_rules_updated_at ON public.crm_automation_rules;
CREATE TRIGGER update_crm_automation_rules_updated_at
BEFORE UPDATE ON public.crm_automation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_automation_runs_updated_at ON public.crm_automation_runs;
CREATE TRIGGER update_crm_automation_runs_updated_at
BEFORE UPDATE ON public.crm_automation_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can read crm automation rules" ON public.crm_automation_rules;
CREATE POLICY "Company users can read crm automation rules" ON public.crm_automation_rules
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_automation_rules.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm automation rules" ON public.crm_automation_rules;
CREATE POLICY "Company managers can manage crm automation rules" ON public.crm_automation_rules
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_automation_rules.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_automation_rules.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm automation runs" ON public.crm_automation_runs;
CREATE POLICY "Company users can read crm automation runs" ON public.crm_automation_runs
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_automation_runs.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm automation runs" ON public.crm_automation_runs;
CREATE POLICY "Company managers can manage crm automation runs" ON public.crm_automation_runs
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_automation_runs.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_automation_runs.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

GRANT EXECUTE ON FUNCTION public.crm_complete_handoff(uuid, text, text, text, date, date, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_run_automation_for_event(uuid, text, jsonb, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_execute_automation_rule(uuid, jsonb, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_conditions_match(jsonb, jsonb) TO authenticated;
