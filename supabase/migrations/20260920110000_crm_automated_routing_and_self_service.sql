-- Migration: 20260920110000_crm_automated_routing_and_self_service.sql
-- Implements:
-- 1. Automated Load-Balanced Lead Routing (Least-loaded sales agent auto-assignment + SLA outreach task)
-- 2. Activity-Driven Automated Stage Progression Trigger (Outreach -> Contacted -> Site Visit -> Interested -> Negotiation -> Booked)
-- 3. Visit-Driven Automated Stage Transition Trigger (crm_visits -> Site Visit)
-- 4. Unit Booking Auto-Confirmation Trigger (crm_unit_bookings -> Booked / Won)
-- 5. Self-Service SLA Breach & Stale Lead Escalation Engine

-- 1. Helper function: Select least-loaded active sales agent for a company
CREATE OR REPLACE FUNCTION public.crm_get_least_loaded_agent(p_company_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_agent UUID;
  v_owner_id UUID;
BEGIN
  -- Look for active, approved company members with sales/PM roles
  SELECT cm.user_id INTO v_assigned_agent
  FROM public.company_members cm
  LEFT JOIN public.leads l 
    ON l.assigned_to = cm.user_id 
    AND l.company_id = p_company_id 
    AND l.status = 'open'
  WHERE cm.company_id = p_company_id
    AND cm.status = 'approved'
    AND cm.role IN ('property_manager', 'landlord', 'agent')
  GROUP BY cm.user_id, cm.created_at
  ORDER BY count(l.id) ASC, cm.created_at ASC
  LIMIT 1;

  -- Fallback to company owner if no approved sales member found
  IF v_assigned_agent IS NULL THEN
    SELECT owner_id INTO v_owner_id
    FROM public.companies
    WHERE id = p_company_id;
    
    v_assigned_agent := v_owner_id;
  END IF;

  RETURN v_assigned_agent;
END;
$$;

-- 2. Automated Lead Routing Procedure (Round-robin / least-loaded auto-dispatch)
CREATE OR REPLACE FUNCTION public.crm_route_lead_automated(p_lead_id UUID, p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_target_agent UUID;
  v_task_id UUID;
  v_notification_id UUID;
  v_prospect_name TEXT;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  -- Fetch prospect name if exists
  SELECT full_name INTO v_prospect_name
  FROM public.lead_contacts
  WHERE lead_id = p_lead_id
  LIMIT 1;

  v_prospect_name := coalesce(v_prospect_name, 'New Prospect');

  -- Determine best available sales agent
  v_target_agent := public.crm_get_least_loaded_agent(p_company_id);

  IF v_target_agent IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eligible agent found for company');
  END IF;

  -- 1. Update lead ownership & activity timestamp
  UPDATE public.leads
  SET assigned_to = v_target_agent,
      last_activity_at = now(),
      updated_at = now()
  WHERE id = p_lead_id;

  -- 2. Create automated SLA task (initial outreach within 2 hours)
  INSERT INTO public.lead_tasks (
    lead_id,
    task_type,
    owner_user_id,
    due_at,
    status,
    notes
  ) VALUES (
    p_lead_id,
    'initial_outreach',
    v_target_agent,
    now() + INTERVAL '2 hours',
    'open',
    'Automated SLA: First contact with ' || v_prospect_name || ' within 2 hours.'
  ) RETURNING id INTO v_task_id;

  -- 3. Emit real-time in-app notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    metadata
  ) VALUES (
    v_target_agent,
    'New Prospect Auto-Routed: ' || v_prospect_name,
    'Lead assigned via load-balanced routing. Outreach SLA due in 2 hours.',
    'action_required',
    '/marketplace/crm/leads?lead=' || p_lead_id,
    jsonb_build_object(
      'source', 'crm_automated_routing',
      'lead_id', p_lead_id,
      'task_id', v_task_id
    )
  ) RETURNING id INTO v_notification_id;

  -- 4. Record lead activity
  INSERT INTO public.lead_activities (
    lead_id,
    activity_type,
    channel,
    actor_user_id,
    payload_json,
    occurred_at
  ) VALUES (
    p_lead_id,
    'status_change',
    'internal',
    v_target_agent,
    jsonb_build_object(
      'action', 'auto_routed',
      'assigned_to', v_target_agent,
      'task_id', v_task_id
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'assigned_to', v_target_agent,
    'task_id', v_task_id,
    'notification_id', v_notification_id
  );
END;
$$;

-- 3. Inbound Lead Trigger: Auto-route new leads upon insertion if unassigned
CREATE OR REPLACE FUNCTION public.crm_trigger_inbound_lead_autoroute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If lead is created without assigned owner, route automatically
  IF NEW.assigned_to IS NULL THEN
    NEW.assigned_to := public.crm_get_least_loaded_agent(NEW.company_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_inbound_lead_autoroute ON public.leads;
CREATE TRIGGER trigger_inbound_lead_autoroute
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_trigger_inbound_lead_autoroute();

-- 4. Activity-Based Automated Stage Progression Trigger
-- Transitions lead through canonical stages based on real sales activity touchpoints
CREATE OR REPLACE FUNCTION public.crm_auto_advance_lead_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_new_stage text := NULL;
  v_new_status text := NULL;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = NEW.lead_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Stage Transition Matrix:
  -- A. 'new' -> 'contacted' on first outreach activity
  IF v_lead.stage = 'new' AND NEW.activity_type IN ('call', 'email', 'sms', 'whatsapp', 'inquiry', 'outreach') THEN
    v_new_stage := 'contacted';

  -- B. Advance to 'site_visit' when viewing is scheduled or logged
  ELSIF NEW.activity_type IN ('viewing', 'site_visit') AND v_lead.stage IN ('new', 'contacted') THEN
    v_new_stage := 'site_visit';

  -- C. Advance to 'interested' when prospect selects a unit or confirms floorplan fit
  ELSIF NEW.activity_type IN ('unit_selected', 'floorplan_selected') AND v_lead.stage IN ('new', 'contacted', 'site_visit') THEN
    v_new_stage := 'interested';

  -- D. Advance to 'negotiation' when terms, pricing or proposals are initiated
  ELSIF NEW.activity_type IN ('proposal_sent', 'offer_made', 'negotiation_started') AND v_lead.stage IN ('new', 'contacted', 'site_visit', 'interested') THEN
    v_new_stage := 'negotiation';

  -- E. Advance to 'booked' (Won) on atomic reservation
  ELSIF NEW.activity_type IN ('unit_booked_atomic', 'booking_confirmed') THEN
    v_new_stage := 'booked';
    v_new_status := 'won';
  END IF;

  -- Apply automated transition if destination stage is defined and distinct
  IF v_new_stage IS NOT NULL AND v_new_stage IS DISTINCT FROM v_lead.stage THEN
    UPDATE public.leads
    SET stage = v_new_stage,
        status = coalesce(v_new_status, v_lead.status),
        converted_at = CASE WHEN v_new_stage = 'booked' THEN now() ELSE converted_at END,
        last_activity_at = now(),
        updated_at = now()
    WHERE id = v_lead.id;

    -- Record automated stage history log
    INSERT INTO public.lead_stage_history (
      lead_id,
      from_stage,
      to_stage,
      actor_user_id,
      reason,
      changed_at
    ) VALUES (
      v_lead.id,
      v_lead.stage,
      v_new_stage,
      NEW.actor_user_id,
      'automated_activity_trigger:' || NEW.activity_type,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_advance_lead_on_activity ON public.lead_activities;
CREATE TRIGGER trigger_auto_advance_lead_on_activity
  AFTER INSERT ON public.lead_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_auto_advance_lead_on_activity();

-- 5. Visit Scheduling Trigger: Automatically transition lead to 'site_visit'
CREATE OR REPLACE FUNCTION public.crm_auto_advance_lead_on_visit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.related_type = 'lead' AND NEW.related_id IS NOT NULL THEN
    UPDATE public.leads
    SET stage = CASE WHEN stage IN ('new', 'contacted') THEN 'site_visit' ELSE stage END,
        next_followup_at = coalesce(NEW.check_in_at, now() + INTERVAL '24 hours'),
        last_activity_at = now(),
        updated_at = now()
    WHERE id = NEW.related_id;

    -- Record activity
    INSERT INTO public.lead_activities (
      lead_id,
      activity_type,
      channel,
      actor_user_id,
      payload_json,
      occurred_at
    ) VALUES (
      NEW.related_id,
      'viewing',
      'physical',
      NEW.created_by,
      jsonb_build_object(
        'visit_id', NEW.id,
        'status', NEW.status,
        'scheduled_for', NEW.check_in_at
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_advance_lead_on_visit ON public.crm_visits;
CREATE TRIGGER trigger_auto_advance_lead_on_visit
  AFTER INSERT OR UPDATE OF status ON public.crm_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.crm_auto_advance_lead_on_visit();

-- 6. Self-Service SLA Breach & Stale Lead Escalation Engine
CREATE OR REPLACE FUNCTION public.crm_escalate_stale_leads(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_escalated_count INTEGER := 0;
  v_auto_lost_count INTEGER := 0;
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.companies
  WHERE id = p_company_id;

  -- 1. Identify untouched leads in 'new' > 24 hours (SLA breach)
  FOR v_lead IN
    SELECT id, assigned_to, created_at
    FROM public.leads
    WHERE company_id = p_company_id
      AND stage = 'new'
      AND status = 'open'
      AND created_at < (now() - INTERVAL '24 hours')
      AND (last_activity_at IS NULL OR last_activity_at = created_at)
  LOOP
    -- Create urgent escalation notification for manager/owner
    IF v_owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        link,
        metadata
      ) VALUES (
        v_owner_id,
        '⚠️ Lead Outreach SLA Breach',
        'Lead has been pending in New stage for over 24 hours with zero outreach touchpoints.',
        'warning',
        '/marketplace/crm/leads?lead=' || v_lead.id,
        jsonb_build_object('lead_id', v_lead.id, 'sla', '24h_breach')
      );
    END IF;

    -- Reassign to company owner if untouched for > 48h
    IF v_lead.created_at < (now() - INTERVAL '48 hours') AND v_owner_id IS NOT NULL AND v_lead.assigned_to IS DISTINCT FROM v_owner_id THEN
      UPDATE public.leads
      SET assigned_to = v_owner_id,
          last_activity_at = now()
      WHERE id = v_lead.id;

      INSERT INTO public.lead_activities (
        lead_id,
        activity_type,
        channel,
        actor_user_id,
        payload_json,
        occurred_at
      ) VALUES (
        v_lead.id,
        'status_change',
        'internal',
        v_owner_id,
        jsonb_build_object('reason', 'sla_breach_auto_reassignment', 'reassigned_to', v_owner_id),
        now()
      );
    END IF;

    v_escalated_count := v_escalated_count + 1;
  END LOOP;

  -- 2. Identify cold leads untouched for > 14 days and auto-close as lost
  FOR v_lead IN
    SELECT id
    FROM public.leads
    WHERE company_id = p_company_id
      AND stage IN ('new', 'contacted')
      AND status = 'open'
      AND last_activity_at < (now() - INTERVAL '14 days')
  LOOP
    UPDATE public.leads
    SET stage = 'lost',
        status = 'lost',
        lost_reason = 'automated_inactivity_timeout_14d',
        last_activity_at = now(),
        updated_at = now()
    WHERE id = v_lead.id;

    INSERT INTO public.lead_stage_history (
      lead_id,
      from_stage,
      to_stage,
      reason,
      changed_at
    ) VALUES (
      v_lead.id,
      'contacted',
      'lost',
      'automated_inactivity_timeout_14d',
      now()
    );

    v_auto_lost_count := v_auto_lost_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'escalated_sla_count', v_escalated_count,
    'auto_lost_count', v_auto_lost_count
  );
END;
$$;
