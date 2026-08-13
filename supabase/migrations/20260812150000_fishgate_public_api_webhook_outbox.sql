-- Durable tenant-scoped outbound webhook outbox for Public API integrations.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN ('lease.signed','payment.received','lead.converted','listing.published')),
  correlation_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_events_dispatch_idx ON public.webhook_events(status,next_attempt_at,created_at);
CREATE INDEX IF NOT EXISTS webhook_events_company_idx ON public.webhook_events(company_id,created_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform super admins can inspect webhook events" ON public.webhook_events;
CREATE POLICY "Platform super admins can inspect webhook events" ON public.webhook_events FOR SELECT TO authenticated USING (public.is_platform_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.enqueue_fishgate_webhook_event(p_company_id uuid,p_event_type text,p_payload jsonb,p_correlation_id text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_event_id text := 'evt_'||replace(gen_random_uuid()::text,'-','');
BEGIN
  IF p_company_id IS NULL OR p_event_type NOT IN ('lease.signed','payment.received','lead.converted','listing.published') THEN RAISE EXCEPTION 'INVALID_WEBHOOK_EVENT'; END IF;
  INSERT INTO public.webhook_events(company_id,event_id,event_type,correlation_id,payload) VALUES(p_company_id,v_event_id,p_event_type,p_correlation_id,coalesce(p_payload,'{}'::jsonb));
  RETURN v_event_id;
END; $$;

CREATE OR REPLACE FUNCTION public.fishgate_webhook_domain_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid;
BEGIN
  IF TG_TABLE_NAME='leases' AND NEW.landlord_signed_at IS NOT NULL AND NEW.tenant_signed_at IS NOT NULL AND (TG_OP='INSERT' OR OLD.landlord_signed_at IS NULL OR OLD.tenant_signed_at IS NULL) THEN
    SELECT property.company_id INTO v_company FROM public.properties property WHERE property.id=NEW.property_id;
    PERFORM public.enqueue_fishgate_webhook_event(v_company,'lease.signed',jsonb_build_object('lease_id',NEW.id,'property_id',NEW.property_id,'unit_id',NEW.unit_id,'tenant_id',NEW.tenant_id,'signed_at',greatest(NEW.landlord_signed_at,NEW.tenant_signed_at)));
  ELSIF TG_TABLE_NAME='payments' AND NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT property.company_id INTO v_company FROM public.invoices invoice JOIN public.properties property ON property.id=invoice.property_id WHERE invoice.id=NEW.invoice_id;
    PERFORM public.enqueue_fishgate_webhook_event(v_company,'payment.received',jsonb_build_object('payment_id',NEW.id,'invoice_id',NEW.invoice_id,'tenant_id',NEW.tenant_id,'amount',NEW.amount,'reference',NEW.reference,'received_at',coalesce(NEW.created_at,now())));
  ELSIF TG_TABLE_NAME='leads' AND NEW.stage='converted' AND (TG_OP='INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    PERFORM public.enqueue_fishgate_webhook_event(NEW.company_id,'lead.converted',jsonb_build_object('lead_id',NEW.id,'listing_id',NEW.listing_id,'pipeline_kind',NEW.pipeline_kind,'converted_at',coalesce(NEW.converted_at,now())));
  ELSIF TG_TABLE_NAME='marketplace_listings' AND NEW.status='live' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.enqueue_fishgate_webhook_event(NEW.company_id,'listing.published',jsonb_build_object('listing_id',NEW.id,'property_id',NEW.property_id,'unit_id',NEW.unit_id,'slug',NEW.slug,'published_at',coalesce(NEW.published_at,now())));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS fishgate_webhook_lease_signed ON public.leases;
CREATE TRIGGER fishgate_webhook_lease_signed AFTER INSERT OR UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_domain_transition();
DROP TRIGGER IF EXISTS fishgate_webhook_payment_received ON public.payments;
CREATE TRIGGER fishgate_webhook_payment_received AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_domain_transition();
DROP TRIGGER IF EXISTS fishgate_webhook_lead_converted ON public.leads;
CREATE TRIGGER fishgate_webhook_lead_converted AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_domain_transition();
DROP TRIGGER IF EXISTS fishgate_webhook_listing_published ON public.marketplace_listings;
CREATE TRIGGER fishgate_webhook_listing_published AFTER INSERT OR UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_domain_transition();

CREATE OR REPLACE FUNCTION public.claim_fishgate_webhook_events(p_limit integer DEFAULT 25)
RETURNS SETOF public.webhook_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  RETURN QUERY WITH candidates AS (
    SELECT event.id FROM public.webhook_events event
    WHERE (event.status='pending' AND event.next_attempt_at<=now()) OR (event.status='processing' AND event.claimed_at<now()-interval '5 minutes')
    ORDER BY event.created_at FOR UPDATE SKIP LOCKED LIMIT least(100,greatest(1,p_limit))
  ) UPDATE public.webhook_events event SET status='processing',claimed_at=now(),attempt_count=event.attempt_count+1
  FROM candidates WHERE event.id=candidates.id RETURNING event.*;
END; $$;

REVOKE ALL ON FUNCTION public.enqueue_fishgate_webhook_event(uuid,text,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_fishgate_webhook_events(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_fishgate_webhook_event(uuid,text,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_fishgate_webhook_events(integer) TO service_role;