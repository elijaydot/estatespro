-- Collapse the generic deal funnel onto the authoritative lead pipeline.

DO $$
DECLARE
  v_deal public.crm_deals%ROWTYPE;
  v_lead_id uuid;
  v_lead_stage text;
BEGIN
  FOR v_deal IN
    SELECT * FROM public.crm_deals WHERE lead_id IS NULL FOR UPDATE
  LOOP
    v_lead_stage := CASE v_deal.stage
      WHEN 'qualification' THEN 'qualified'
      WHEN 'needs_analysis' THEN 'qualified'
      WHEN 'value_proposition' THEN 'viewing_scheduled'
      WHEN 'identify_decision_makers' THEN 'viewing_scheduled'
      WHEN 'proposal' THEN 'offer_made'
      WHEN 'negotiation' THEN 'lease_in_progress'
      WHEN 'closed_won' THEN 'converted'
      WHEN 'closed_lost' THEN 'lost'
      ELSE 'qualified'
    END;

    INSERT INTO public.leads (
      company_id,
      listing_id,
      source,
      pipeline_kind,
      stage,
      status,
      priority,
      assigned_to,
      converted_at,
      lost_reason,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      v_deal.company_id,
      v_deal.listing_id,
      'manual',
      'leasing',
      v_lead_stage,
      CASE WHEN v_lead_stage = 'converted' THEN 'won' WHEN v_lead_stage = 'lost' THEN 'lost' ELSE 'open' END,
      'normal',
      v_deal.owner_user_id,
      CASE WHEN v_lead_stage = 'converted' THEN coalesce(v_deal.updated_at, now()) ELSE NULL END,
      CASE WHEN v_lead_stage = 'lost' THEN 'Migrated from legacy closed-lost deal' ELSE NULL END,
      v_deal.created_by,
      v_deal.created_at,
      coalesce(v_deal.updated_at, now())
    ) RETURNING id INTO v_lead_id;

    UPDATE public.crm_deals SET lead_id = v_lead_id WHERE id = v_deal.id;

    INSERT INTO public.audit_events (
      source, event_type, severity, actor_user_id, entity_type, entity_id, details
    ) VALUES (
      'marketplace_crm',
      'deal.orphan_lead_backfilled',
      'info',
      NULL,
      'crm_deals',
      v_deal.id,
      jsonb_build_object('deal_id', v_deal.id, 'lead_id', v_lead_id, 'legacy_stage', v_deal.stage, 'lead_stage', v_lead_stage)
    );
  END LOOP;
END
$$;

ALTER TABLE public.crm_deals ALTER COLUMN lead_id SET NOT NULL;

UPDATE public.crm_automation_rules
SET conditions_json = jsonb_set(conditions_json, '{equals,to_stage}', '"converted"'::jsonb, false),
    updated_at = now()
WHERE event_type = 'deal.stage_changed'
  AND conditions_json #>> '{equals,to_stage}' = 'closed_won';

CREATE INDEX IF NOT EXISTS idx_crm_deals_lead_id ON public.crm_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_account_id ON public.crm_deals(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact_id ON public.crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_listing_id ON public.crm_deals(listing_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_unit_id ON public.crm_deals(unit_id);

CREATE OR REPLACE FUNCTION public.crm_update_deal_and_lead_stage(
  p_deal_id uuid,
  p_company_id uuid,
  p_stage text,
  p_probability integer,
  p_amount numeric DEFAULT NULL,
  p_owner_user_id uuid DEFAULT NULL,
  p_expected_close_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  UPDATE public.crm_deals
  SET probability = p_probability,
      amount = p_amount,
      owner_user_id = p_owner_user_id,
      expected_close_date = p_expected_close_date,
      updated_at = now()
  WHERE id = p_deal_id
    AND company_id = p_company_id
  RETURNING lead_id INTO v_lead_id;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'DEAL_NOT_FOUND_IN_COMPANY';
  END IF;

  UPDATE public.leads
  SET stage = p_stage,
      status = CASE WHEN p_stage = 'converted' THEN 'won' WHEN p_stage = 'lost' THEN 'lost' ELSE 'open' END,
      converted_at = CASE WHEN p_stage = 'converted' THEN coalesce(converted_at, now()) ELSE converted_at END,
      last_activity_at = now(),
      updated_at = now()
  WHERE id = v_lead_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND_IN_COMPANY';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_update_deal_and_lead_stage(uuid, uuid, text, integer, numeric, uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_handle_lead_stage_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal public.crm_deals%ROWTYPE;
  v_checklist jsonb;
  v_handoff_status text;
  v_correlation text;
BEGIN
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    RETURN NEW;
  END IF;

  FOR v_deal IN SELECT * FROM public.crm_deals WHERE lead_id = NEW.id
  LOOP
    v_correlation := format('crm:%s:%s:%s', NEW.company_id, v_deal.id, extract(epoch FROM now())::bigint);

    PERFORM public.crm_run_automation_for_event(
      NEW.company_id,
      'deal.stage_changed',
      jsonb_build_object(
        'deal_id', v_deal.id,
        'lead_id', NEW.id,
        'account_id', v_deal.account_id,
        'contact_id', v_deal.contact_id,
        'from_stage', OLD.stage,
        'to_stage', NEW.stage,
        'pipeline_kind', NEW.pipeline_kind,
        'owner_user_id', coalesce(v_deal.owner_user_id, NEW.assigned_to)
      ),
      'lead',
      NEW.id,
      v_correlation
    );

    IF NEW.stage = 'converted' THEN
      v_checklist := jsonb_build_object(
        'has_amount', coalesce(v_deal.amount, 0) > 0,
        'has_contact_or_account', (v_deal.contact_id IS NOT NULL OR v_deal.account_id IS NOT NULL),
        'has_listing_or_unit', (v_deal.listing_id IS NOT NULL OR v_deal.unit_id IS NOT NULL),
        'notes', 'Complete tenant + lease handoff package before marking completed'
      );

      v_handoff_status := CASE
        WHEN coalesce(v_deal.amount, 0) > 0
          AND (v_deal.contact_id IS NOT NULL OR v_deal.account_id IS NOT NULL)
          AND (v_deal.listing_id IS NOT NULL OR v_deal.unit_id IS NOT NULL)
        THEN 'ready'
        ELSE 'requires_input'
      END;

      INSERT INTO public.crm_deal_handoffs (deal_id, company_id, status, checklist_json, readiness_notes)
      VALUES (
        v_deal.id,
        v_deal.company_id,
        v_handoff_status,
        v_checklist,
        CASE WHEN v_handoff_status = 'ready' THEN 'Ready for property operations handoff' ELSE 'Missing required handoff fields' END
      )
      ON CONFLICT (deal_id) DO UPDATE SET
        status = EXCLUDED.status,
        checklist_json = EXCLUDED.checklist_json,
        readiness_notes = EXCLUDED.readiness_notes,
        updated_at = now();
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_handle_lead_stage_changed_trigger ON public.leads;
CREATE TRIGGER crm_handle_lead_stage_changed_trigger
AFTER UPDATE OF stage ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.crm_handle_lead_stage_changed();

CREATE OR REPLACE VIEW public.crm_marketplace_funnel_metrics AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  coalesce(inq.inquiries_30d, 0) AS inquiries_30d,
  coalesce(ld.leads_open, 0) AS leads_open,
  coalesce(ld.leads_open, 0) AS deals_open,
  coalesce(ld.leads_won_30d, 0) AS deals_won_30d,
  CASE WHEN coalesce(inq.inquiries_30d, 0) = 0 THEN 0
       ELSE round((coalesce(ld.leads_won_30d, 0)::numeric / nullif(inq.inquiries_30d, 0)::numeric) * 100, 2)
  END AS inquiry_to_won_rate_pct
FROM public.companies c
LEFT JOIN (
  SELECT company_id, count(*) AS inquiries_30d
  FROM public.marketplace_inquiries
  WHERE created_at >= now() - interval '30 days'
  GROUP BY company_id
) inq ON inq.company_id = c.id
LEFT JOIN (
  SELECT
    company_id,
    count(*) FILTER (WHERE stage NOT IN ('converted', 'lost')) AS leads_open,
    count(*) FILTER (WHERE stage = 'converted' AND converted_at >= now() - interval '30 days') AS leads_won_30d
  FROM public.leads
  GROUP BY company_id
) ld ON ld.company_id = c.id;

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
  v_lead public.leads%ROWTYPE;
  v_listing public.marketplace_listings%ROWTYPE;
  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_lease_id uuid;
  v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED_FOR_HANDOFF_COMPLETION'; END IF;

  SELECT * INTO v_handoff FROM public.crm_deal_handoffs WHERE id = p_handoff_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'HANDOFF_NOT_FOUND'; END IF;

  SELECT * INTO v_deal FROM public.crm_deals WHERE id = v_handoff.deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'DEAL_NOT_FOUND_FOR_HANDOFF'; END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = v_deal.lead_id;
  IF NOT FOUND OR v_lead.stage <> 'converted' THEN
    RAISE EXCEPTION 'HANDOFF_REQUIRES_CONVERTED_LEAD';
  END IF;

  IF v_deal.listing_id IS NOT NULL THEN
    SELECT * INTO v_listing FROM public.marketplace_listings WHERE id = v_deal.listing_id;
  END IF;

  v_unit_id := coalesce(v_deal.unit_id, v_listing.unit_id);
  v_property_id := coalesce(v_listing.property_id, (SELECT u.property_id FROM public.units u WHERE u.id = v_unit_id LIMIT 1));

  INSERT INTO public.tenants (
    user_id, unit_id, property_id, name, email, phone, move_in_date, lease_end_date,
    monthly_rent, security_deposit, status
  ) VALUES (
    v_actor, v_unit_id, v_property_id, p_tenant_name, p_tenant_email, p_tenant_phone,
    p_lease_start, p_lease_end, p_monthly_rent, p_security_deposit, 'pending'
  ) RETURNING id INTO v_tenant_id;

  INSERT INTO public.leases (
    user_id, tenant_id, property_id, unit_id, lease_number, start_date, end_date,
    monthly_rent, security_deposit, status, terms, special_conditions
  ) VALUES (
    v_actor, v_tenant_id, v_property_id, v_unit_id,
    format('HND-%s', upper(replace(gen_random_uuid()::text, '-', ''))),
    p_lease_start, p_lease_end, p_monthly_rent, p_security_deposit, 'draft',
    format('Auto-generated from CRM handoff for deal %s', v_deal.deal_name),
    'Generated by crm_complete_handoff'
  ) RETURNING id INTO v_lease_id;

  UPDATE public.crm_deal_handoffs
  SET tenant_id = v_tenant_id, lease_id = v_lease_id, status = 'completed',
      started_at = coalesce(started_at, now()), completed_at = now(),
      readiness_notes = 'Handoff completed. Tenant and lease draft created.', updated_at = now()
  WHERE id = p_handoff_id;

  INSERT INTO public.audit_events (source, event_type, severity, actor_user_id, entity_type, entity_id, details)
  VALUES (
    'marketplace_crm', 'deal.handoff.completed', 'info', v_actor, 'crm_deal_handoffs',
    v_handoff.deal_id,
    jsonb_build_object('handoff_id', p_handoff_id, 'deal_id', v_handoff.deal_id, 'lead_id', v_deal.lead_id, 'tenant_id', v_tenant_id, 'lease_id', v_lease_id)
  );

  RETURN v_lease_id;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crm_deal_stage_transition_trigger ON public.crm_deals;
DROP TRIGGER IF EXISTS log_crm_deal_stage_transition_trigger ON public.crm_deals;
DROP TRIGGER IF EXISTS upsert_crm_deal_handoff_on_closed_won_trigger ON public.crm_deals;
DROP TRIGGER IF EXISTS crm_trigger_automation_deal_stage_changed_trigger ON public.crm_deals;

DROP FUNCTION IF EXISTS public.enforce_crm_deal_stage_transition();
DROP FUNCTION IF EXISTS public.is_valid_crm_deal_stage_transition(text, text);
DROP FUNCTION IF EXISTS public.log_crm_deal_stage_transition();
DROP FUNCTION IF EXISTS public.upsert_crm_deal_handoff_on_closed_won();
DROP FUNCTION IF EXISTS public.crm_trigger_automation_deal_stage_changed();

DROP INDEX IF EXISTS public.idx_crm_deals_company_stage;
ALTER TABLE public.crm_deals DROP COLUMN stage;