-- Wave 2 Milestones 1-3 core implementation
-- Covers:
-- - Deal stage transition governance + stage history
-- - Follow-up automation logs
-- - Trust coupling flags from verification/moderation
-- - Closed-won handoff pipeline into property operations
-- - Marketplace funnel reporting view

CREATE TABLE IF NOT EXISTS public.crm_deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_stage_history_deal_changed
  ON public.crm_deal_stage_history(deal_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_deal_stage_history_company_changed
  ON public.crm_deal_stage_history(company_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_followup_automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('call', 'meeting', 'deal_stage')),
  source_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.lead_tasks(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('created', 'skipped', 'failed')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_followup_automation_log_company_created
  ON public.crm_followup_automation_log(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_trust_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'listing', 'lead', 'deal')),
  entity_id uuid,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'cleared')),
  source text NOT NULL CHECK (source IN ('verification', 'moderation')),
  source_id uuid,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_trust_flags_company_state
  ON public.crm_trust_flags(company_id, state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_trust_flags_source
  ON public.crm_trust_flags(source, source_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_deal_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL UNIQUE REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'requires_input', 'ready', 'in_progress', 'completed', 'failed')),
  checklist_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  readiness_notes text,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_handoffs_company_status
  ON public.crm_deal_handoffs(company_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_valid_crm_deal_stage_transition(from_stage text, to_stage text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN from_stage IS NULL THEN true
    WHEN from_stage = to_stage THEN true
    WHEN from_stage = 'qualification' AND to_stage IN ('needs_analysis', 'closed_lost') THEN true
    WHEN from_stage = 'needs_analysis' AND to_stage IN ('value_proposition', 'closed_lost') THEN true
    WHEN from_stage = 'value_proposition' AND to_stage IN ('identify_decision_makers', 'closed_lost') THEN true
    WHEN from_stage = 'identify_decision_makers' AND to_stage IN ('proposal', 'closed_lost') THEN true
    WHEN from_stage = 'proposal' AND to_stage IN ('negotiation', 'closed_lost') THEN true
    WHEN from_stage = 'negotiation' AND to_stage IN ('proposal', 'closed_won', 'closed_lost') THEN true
    WHEN from_stage = 'closed_lost' AND to_stage IN ('qualification', 'needs_analysis') THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_crm_deal_stage_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NOT public.is_valid_crm_deal_stage_transition(OLD.stage, NEW.stage) THEN
      RAISE EXCEPTION 'INVALID_DEAL_STAGE_TRANSITION: % -> %', OLD.stage, NEW.stage;
    END IF;

    IF NEW.stage = 'closed_won' THEN
      IF COALESCE(NEW.amount, 0) <= 0 THEN
        RAISE EXCEPTION 'CLOSED_WON_REQUIRES_POSITIVE_AMOUNT';
      END IF;

      IF NEW.account_id IS NULL AND NEW.contact_id IS NULL AND NEW.lead_id IS NULL THEN
        RAISE EXCEPTION 'CLOSED_WON_REQUIRES_ACCOUNT_OR_CONTACT_OR_LEAD';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_crm_deal_stage_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.crm_deal_stage_history (
      deal_id,
      company_id,
      from_stage,
      to_stage,
      changed_by,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      NEW.company_id,
      OLD.stage,
      NEW.stage,
      auth.uid(),
      CASE WHEN NEW.stage = 'closed_lost' THEN COALESCE(NEW.deal_name, 'Closed lost') ELSE NULL END,
      jsonb_build_object('amount', NEW.amount, 'probability', NEW.probability)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_followup_task_from_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
  v_owner uuid;
BEGIN
  IF NEW.related_type <> 'lead' OR NEW.related_id IS NULL THEN
    INSERT INTO public.crm_followup_automation_log(company_id, source_type, source_id, status, message)
    VALUES (NEW.company_id, 'call', NEW.id, 'skipped', 'Call not linked to lead');
    RETURN NEW;
  END IF;

  IF COALESCE(TRIM(NEW.result), '') = '' THEN
    INSERT INTO public.crm_followup_automation_log(company_id, source_type, source_id, lead_id, status, message)
    VALUES (NEW.company_id, 'call', NEW.id, NEW.related_id, 'skipped', 'No call result provided');
    RETURN NEW;
  END IF;

  v_owner := COALESCE(NEW.owner_user_id, NEW.created_by, auth.uid());

  IF v_owner IS NULL THEN
    INSERT INTO public.crm_followup_automation_log(company_id, source_type, source_id, lead_id, status, message)
    VALUES (NEW.company_id, 'call', NEW.id, NEW.related_id, 'failed', 'Owner not resolvable for follow-up task');
    RETURN NEW;
  END IF;

  INSERT INTO public.lead_tasks (
    lead_id,
    task_type,
    owner_user_id,
    due_at,
    status,
    notes
  ) VALUES (
    NEW.related_id,
    'call_follow_up',
    v_owner,
    now() + interval '1 day',
    'open',
    format('Follow up after call: %s (%s)', NEW.subject, NEW.result)
  ) RETURNING id INTO v_task_id;

  INSERT INTO public.crm_followup_automation_log(company_id, source_type, source_id, lead_id, task_id, status, message)
  VALUES (NEW.company_id, 'call', NEW.id, NEW.related_id, v_task_id, 'created', 'Follow-up task created from call result');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_followup_task_from_meeting_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
  v_owner uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM 'done' OR OLD.status = 'done' THEN
    RETURN NEW;
  END IF;

  IF NEW.related_type <> 'lead' OR NEW.related_id IS NULL THEN
    INSERT INTO public.crm_followup_automation_log(company_id, source_type, source_id, status, message)
    VALUES (NEW.company_id, 'meeting', NEW.id, 'skipped', 'Meeting completion not linked to lead');
    RETURN NEW;
  END IF;

  v_owner := COALESCE(NEW.host_user_id, NEW.created_by, auth.uid());

  IF v_owner IS NULL THEN
    INSERT INTO public.crm_followup_automation_log(company_id, source_type, source_id, lead_id, status, message)
    VALUES (NEW.company_id, 'meeting', NEW.id, NEW.related_id, 'failed', 'Owner not resolvable for meeting follow-up task');
    RETURN NEW;
  END IF;

  INSERT INTO public.lead_tasks (
    lead_id,
    task_type,
    owner_user_id,
    due_at,
    status,
    notes
  ) VALUES (
    NEW.related_id,
    'meeting_follow_up',
    v_owner,
    now() + interval '2 days',
    'open',
    format('Post-meeting follow up: %s', NEW.title)
  ) RETURNING id INTO v_task_id;

  INSERT INTO public.crm_followup_automation_log(company_id, source_type, source_id, lead_id, task_id, status, message)
  VALUES (NEW.company_id, 'meeting', NEW.id, NEW.related_id, v_task_id, 'created', 'Follow-up task created from completed meeting');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_crm_trust_flag_from_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.state IN ('rejected', 'needs_review') THEN
    INSERT INTO public.crm_trust_flags (
      company_id,
      entity_type,
      entity_id,
      severity,
      state,
      source,
      source_id,
      reason,
      metadata
    ) VALUES (
      NEW.company_id,
      'company',
      NEW.company_id,
      CASE WHEN NEW.state = 'rejected' THEN 'critical' ELSE 'high' END,
      'active',
      'verification',
      NEW.id,
      COALESCE(NEW.rejection_reason, NEW.state),
      jsonb_build_object('verification_state', NEW.state)
    )
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.crm_trust_flags
    SET state = 'cleared',
        reason = COALESCE(reason, 'Verification cleared'),
        updated_at = now()
    WHERE source = 'verification'
      AND source_id = NEW.id
      AND state = 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_crm_trust_flag_from_moderation_case()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT l.company_id
  INTO v_company_id
  FROM public.leads l
  WHERE NEW.entity_type = 'lead'
    AND l.id = NEW.entity_id;

  IF v_company_id IS NULL THEN
    SELECT ml.company_id
    INTO v_company_id
    FROM public.marketplace_listings ml
    WHERE NEW.entity_type = 'listing'
      AND ml.id = NEW.entity_id;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.state IN ('open', 'in_review') THEN
    INSERT INTO public.crm_trust_flags (
      company_id,
      entity_type,
      entity_id,
      severity,
      state,
      source,
      source_id,
      reason,
      metadata
    ) VALUES (
      v_company_id,
      NEW.entity_type,
      NEW.entity_id,
      NEW.severity,
      'active',
      'moderation',
      NEW.id,
      NEW.reason_code,
      jsonb_build_object('moderation_state', NEW.state, 'queue', NEW.queue)
    )
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.crm_trust_flags
    SET state = 'cleared',
        updated_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('moderation_state', NEW.state)
    WHERE source = 'moderation'
      AND source_id = NEW.id
      AND state = 'active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_crm_deal_handoff_on_closed_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checklist jsonb;
  v_status text;
BEGIN
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    RETURN NEW;
  END IF;

  IF NEW.stage <> 'closed_won' THEN
    RETURN NEW;
  END IF;

  v_checklist := jsonb_build_object(
    'has_amount', COALESCE(NEW.amount, 0) > 0,
    'has_contact_or_account', (NEW.contact_id IS NOT NULL OR NEW.account_id IS NOT NULL OR NEW.lead_id IS NOT NULL),
    'has_listing_or_unit', (NEW.listing_id IS NOT NULL OR NEW.unit_id IS NOT NULL),
    'notes', 'Complete tenant + lease handoff package before marking completed'
  );

  v_status := CASE
    WHEN (COALESCE(NEW.amount, 0) > 0)
      AND (NEW.contact_id IS NOT NULL OR NEW.account_id IS NOT NULL OR NEW.lead_id IS NOT NULL)
      AND (NEW.listing_id IS NOT NULL OR NEW.unit_id IS NOT NULL)
    THEN 'ready'
    ELSE 'requires_input'
  END;

  INSERT INTO public.crm_deal_handoffs (
    deal_id,
    company_id,
    status,
    checklist_json,
    readiness_notes
  ) VALUES (
    NEW.id,
    NEW.company_id,
    v_status,
    v_checklist,
    CASE WHEN v_status = 'requires_input' THEN 'Missing required handoff fields' ELSE 'Ready for property operations handoff' END
  )
  ON CONFLICT (deal_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    checklist_json = EXCLUDED.checklist_json,
    readiness_notes = EXCLUDED.readiness_notes,
    updated_at = now();

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
    'deal.handoff.prepared',
    CASE WHEN v_status = 'ready' THEN 'info' ELSE 'warning' END,
    auth.uid(),
    'crm_deal_handoffs',
    NEW.id,
    jsonb_build_object('deal_id', NEW.id, 'status', v_status, 'checklist', v_checklist)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.crm_marketplace_funnel_metrics AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  COALESCE(inq.inquiries_30d, 0) AS inquiries_30d,
  COALESCE(ld.leads_open, 0) AS leads_open,
  COALESCE(dl.deals_open, 0) AS deals_open,
  COALESCE(dl.deals_won_30d, 0) AS deals_won_30d,
  CASE WHEN COALESCE(inq.inquiries_30d, 0) = 0 THEN 0
       ELSE ROUND((COALESCE(dl.deals_won_30d, 0)::numeric / NULLIF(inq.inquiries_30d, 0)::numeric) * 100, 2)
  END AS inquiry_to_won_rate_pct
FROM public.companies c
LEFT JOIN (
  SELECT company_id, COUNT(*) AS inquiries_30d
  FROM public.marketplace_inquiries
  WHERE created_at >= now() - interval '30 days'
  GROUP BY company_id
) inq ON inq.company_id = c.id
LEFT JOIN (
  SELECT company_id, COUNT(*) AS leads_open
  FROM public.leads
  WHERE status = 'open'
  GROUP BY company_id
) ld ON ld.company_id = c.id
LEFT JOIN (
  SELECT
    company_id,
    COUNT(*) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) AS deals_open,
    COUNT(*) FILTER (WHERE stage = 'closed_won' AND updated_at >= now() - interval '30 days') AS deals_won_30d
  FROM public.crm_deals
  GROUP BY company_id
) dl ON dl.company_id = c.id;

DROP TRIGGER IF EXISTS enforce_crm_deal_stage_transition_trigger ON public.crm_deals;
CREATE TRIGGER enforce_crm_deal_stage_transition_trigger
BEFORE UPDATE ON public.crm_deals
FOR EACH ROW
EXECUTE FUNCTION public.enforce_crm_deal_stage_transition();

DROP TRIGGER IF EXISTS log_crm_deal_stage_transition_trigger ON public.crm_deals;
CREATE TRIGGER log_crm_deal_stage_transition_trigger
AFTER UPDATE ON public.crm_deals
FOR EACH ROW
EXECUTE FUNCTION public.log_crm_deal_stage_transition();

DROP TRIGGER IF EXISTS upsert_crm_deal_handoff_on_closed_won_trigger ON public.crm_deals;
CREATE TRIGGER upsert_crm_deal_handoff_on_closed_won_trigger
AFTER UPDATE ON public.crm_deals
FOR EACH ROW
EXECUTE FUNCTION public.upsert_crm_deal_handoff_on_closed_won();

DROP TRIGGER IF EXISTS create_followup_task_from_call_trigger ON public.crm_calls;
CREATE TRIGGER create_followup_task_from_call_trigger
AFTER INSERT ON public.crm_calls
FOR EACH ROW
EXECUTE FUNCTION public.create_followup_task_from_call();

DROP TRIGGER IF EXISTS create_followup_task_from_meeting_completion_trigger ON public.crm_meetings;
CREATE TRIGGER create_followup_task_from_meeting_completion_trigger
AFTER UPDATE ON public.crm_meetings
FOR EACH ROW
EXECUTE FUNCTION public.create_followup_task_from_meeting_completion();

DROP TRIGGER IF EXISTS sync_crm_trust_flag_from_verification_trigger ON public.publisher_verifications;
CREATE TRIGGER sync_crm_trust_flag_from_verification_trigger
AFTER INSERT OR UPDATE ON public.publisher_verifications
FOR EACH ROW
EXECUTE FUNCTION public.sync_crm_trust_flag_from_verification();

DROP TRIGGER IF EXISTS sync_crm_trust_flag_from_moderation_case_trigger ON public.moderation_cases;
CREATE TRIGGER sync_crm_trust_flag_from_moderation_case_trigger
AFTER INSERT OR UPDATE ON public.moderation_cases
FOR EACH ROW
EXECUTE FUNCTION public.sync_crm_trust_flag_from_moderation_case();

DROP TRIGGER IF EXISTS update_crm_trust_flags_updated_at ON public.crm_trust_flags;
CREATE TRIGGER update_crm_trust_flags_updated_at
BEFORE UPDATE ON public.crm_trust_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_deal_handoffs_updated_at ON public.crm_deal_handoffs;
CREATE TRIGGER update_crm_deal_handoffs_updated_at
BEFORE UPDATE ON public.crm_deal_handoffs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followup_automation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_trust_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can read crm deal stage history" ON public.crm_deal_stage_history;
CREATE POLICY "Company users can read crm deal stage history" ON public.crm_deal_stage_history
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deal_stage_history.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm deal stage history" ON public.crm_deal_stage_history;
CREATE POLICY "Company managers can manage crm deal stage history" ON public.crm_deal_stage_history
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deal_stage_history.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deal_stage_history.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm followup automation log" ON public.crm_followup_automation_log;
CREATE POLICY "Company users can read crm followup automation log" ON public.crm_followup_automation_log
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_followup_automation_log.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm followup automation log" ON public.crm_followup_automation_log;
CREATE POLICY "Company managers can manage crm followup automation log" ON public.crm_followup_automation_log
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_followup_automation_log.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_followup_automation_log.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm trust flags" ON public.crm_trust_flags;
CREATE POLICY "Company users can read crm trust flags" ON public.crm_trust_flags
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_trust_flags.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm trust flags" ON public.crm_trust_flags;
CREATE POLICY "Company managers can manage crm trust flags" ON public.crm_trust_flags
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_trust_flags.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_trust_flags.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read crm deal handoffs" ON public.crm_deal_handoffs;
CREATE POLICY "Company users can read crm deal handoffs" ON public.crm_deal_handoffs
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deal_handoffs.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage crm deal handoffs" ON public.crm_deal_handoffs;
CREATE POLICY "Company managers can manage crm deal handoffs" ON public.crm_deal_handoffs
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deal_handoffs.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = crm_deal_handoffs.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);
