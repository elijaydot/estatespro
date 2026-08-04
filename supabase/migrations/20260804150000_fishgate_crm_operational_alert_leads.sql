-- Feed existing threshold alerts into the canonical lead pipeline and automation engine.

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN ('marketplace_public', 'manual', 'referral', 'other', 'system_alert'));

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source_reference_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_system_alert_source
  ON public.leads(company_id, source_reference_id)
  WHERE source = 'system_alert' AND source_reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.crm_process_operational_alert(p_alert_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert public.operational_alerts%ROWTYPE;
  v_lead_id uuid;
  v_tenant public.tenants%ROWTYPE;
  v_owner_id uuid;
  v_pipeline_kind text;
  v_event_type text;
  v_entity_id uuid;
BEGIN
  SELECT * INTO v_alert
  FROM public.operational_alerts
  WHERE id = p_alert_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_alert.status NOT IN ('open', 'acknowledged')
     OR v_alert.alert_type NOT IN ('lease_expiry', 'overdue_payment') THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_lead_id
  FROM public.leads
  WHERE company_id = v_alert.company_id
    AND source = 'system_alert'
    AND source_reference_id = v_alert.id;

  IF v_lead_id IS NOT NULL THEN RETURN v_lead_id; END IF;

  SELECT owner_id INTO v_owner_id FROM public.companies WHERE id = v_alert.company_id;

  IF v_alert.alert_type = 'lease_expiry' THEN
    v_pipeline_kind := 'renewal';
    v_event_type := 'lease.expiry_threshold_crossed';
    SELECT t.* INTO v_tenant
    FROM public.leases l
    JOIN public.tenants t ON t.id = l.tenant_id
    WHERE l.id = v_alert.reference_id;
  ELSE
    v_pipeline_kind := 'collections';
    v_event_type := 'payment.overdue_threshold_crossed';
    SELECT t.* INTO v_tenant
    FROM public.invoices i
    JOIN public.tenants t ON t.id = i.tenant_id
    WHERE i.id = v_alert.reference_id;
  END IF;

  INSERT INTO public.leads (
    company_id, source, source_reference_id, pipeline_kind, stage, status, priority,
    assigned_to, first_seen_at, last_activity_at, created_by
  ) VALUES (
    v_alert.company_id, 'system_alert', v_alert.id, v_pipeline_kind, 'new', 'open',
    CASE WHEN v_alert.severity = 'critical' THEN 'urgent' ELSE 'high' END,
    v_owner_id, v_alert.created_at, now(), v_owner_id
  ) RETURNING id INTO v_lead_id;

  IF v_tenant.id IS NOT NULL
     AND btrim(coalesce(v_tenant.name, '')) <> ''
     AND btrim(coalesce(v_tenant.phone, '')) <> '' THEN
    INSERT INTO public.lead_contacts (
      lead_id, full_name, phone_e164, email, preferred_channel, tenant_id
    ) VALUES (
      v_lead_id, v_tenant.name, v_tenant.phone, v_tenant.email, 'phone', v_tenant.id
    );
  END IF;

  INSERT INTO public.lead_activities (
    lead_id, activity_type, channel, actor_user_id, payload_json, occurred_at
  ) VALUES (
    v_lead_id, 'inquiry', 'internal', v_owner_id,
    jsonb_build_object(
      'source', 'system_alert', 'operational_alert_id', v_alert.id,
      'alert_type', v_alert.alert_type, 'reference_id', v_alert.reference_id,
      'severity', v_alert.severity, 'metadata', v_alert.metadata
    ),
    now()
  );

  v_entity_id := v_alert.reference_id;
  PERFORM public.crm_run_automation_for_event(
    v_alert.company_id,
    v_event_type,
    v_alert.metadata || jsonb_build_object(
      'alert_id', v_alert.id,
      'company_id', v_alert.company_id,
      'reference_id', v_alert.reference_id,
      'lease_id', CASE WHEN v_alert.alert_type = 'lease_expiry' THEN v_entity_id ELSE NULL END,
      'invoice_id', CASE WHEN v_alert.alert_type = 'overdue_payment' THEN v_entity_id ELSE NULL END,
      'lead_id', v_lead_id,
      'owner_user_id', v_owner_id,
      'severity', v_alert.severity
    ),
    'operational_alert',
    v_alert.id,
    format('operational-alert:%s', v_alert.id)
  );

  RETURN v_lead_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_process_operational_alert_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('open', 'acknowledged')
     AND NEW.alert_type IN ('lease_expiry', 'overdue_payment') THEN
    PERFORM public.crm_process_operational_alert(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_process_operational_alert_trigger ON public.operational_alerts;
CREATE TRIGGER crm_process_operational_alert_trigger
AFTER INSERT OR UPDATE OF status ON public.operational_alerts
FOR EACH ROW EXECUTE FUNCTION public.crm_process_operational_alert_trigger();

DO $$
DECLARE
  v_alert_id uuid;
BEGIN
  FOR v_alert_id IN
    SELECT id FROM public.operational_alerts
    WHERE status IN ('open', 'acknowledged')
      AND alert_type IN ('lease_expiry', 'overdue_payment')
  LOOP
    PERFORM public.crm_process_operational_alert(v_alert_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.crm_process_operational_alert(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_process_operational_alert(uuid) TO service_role;