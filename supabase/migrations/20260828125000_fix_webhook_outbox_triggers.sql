-- Fix webhook outbox triggers by separating table-specific transition handlers
-- This prevents Postgres PL/pgSQL runtime errors when accessing table-specific fields (e.g., NEW.stage on leases table).

CREATE OR REPLACE FUNCTION public.fishgate_webhook_lease_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid;
BEGIN
  IF NEW.landlord_signed_at IS NOT NULL AND NEW.tenant_signed_at IS NOT NULL AND (TG_OP='INSERT' OR OLD.landlord_signed_at IS NULL OR OLD.tenant_signed_at IS NULL) THEN
    SELECT property.company_id INTO v_company FROM public.properties property WHERE property.id=NEW.property_id;
    IF v_company IS NOT NULL THEN
      PERFORM public.enqueue_fishgate_webhook_event(v_company,'lease.signed',jsonb_build_object('lease_id',NEW.id,'property_id',NEW.property_id,'unit_id',NEW.unit_id,'tenant_id',NEW.tenant_id,'signed_at',greatest(NEW.landlord_signed_at,NEW.tenant_signed_at)));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.fishgate_webhook_payment_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company uuid;
BEGIN
  IF NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT property.company_id INTO v_company FROM public.invoices invoice JOIN public.properties property ON property.id=invoice.property_id WHERE invoice.id=NEW.invoice_id;
    IF v_company IS NOT NULL THEN
      PERFORM public.enqueue_fishgate_webhook_event(v_company,'payment.received',jsonb_build_object('payment_id',NEW.id,'invoice_id',NEW.invoice_id,'tenant_id',NEW.tenant_id,'amount',NEW.amount,'reference',NEW.reference,'received_at',coalesce(NEW.created_at,now())));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.fishgate_webhook_lead_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.stage='converted' AND (TG_OP='INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    IF NEW.company_id IS NOT NULL THEN
      PERFORM public.enqueue_fishgate_webhook_event(NEW.company_id,'lead.converted',jsonb_build_object('lead_id',NEW.id,'listing_id',NEW.listing_id,'pipeline_kind',NEW.pipeline_kind,'converted_at',coalesce(NEW.converted_at,now())));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.fishgate_webhook_listing_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='live' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.company_id IS NOT NULL THEN
      PERFORM public.enqueue_fishgate_webhook_event(NEW.company_id,'listing.published',jsonb_build_object('listing_id',NEW.id,'property_id',NEW.property_id,'unit_id',NEW.unit_id,'slug',NEW.slug,'published_at',coalesce(NEW.published_at,now())));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Drop obsolete unified trigger function if exists
DROP FUNCTION IF EXISTS public.fishgate_webhook_domain_transition() CASCADE;

-- Recreate dedicated triggers on each target table
DROP TRIGGER IF EXISTS fishgate_webhook_lease_signed ON public.leases;
CREATE TRIGGER fishgate_webhook_lease_signed 
AFTER INSERT OR UPDATE ON public.leases 
FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_lease_transition();

DROP TRIGGER IF EXISTS fishgate_webhook_payment_received ON public.payments;
CREATE TRIGGER fishgate_webhook_payment_received 
AFTER INSERT OR UPDATE ON public.payments 
FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_payment_transition();

DROP TRIGGER IF EXISTS fishgate_webhook_lead_converted ON public.leads;
CREATE TRIGGER fishgate_webhook_lead_converted 
AFTER INSERT OR UPDATE ON public.leads 
FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_lead_transition();

DROP TRIGGER IF EXISTS fishgate_webhook_listing_published ON public.marketplace_listings;
CREATE TRIGGER fishgate_webhook_listing_published 
AFTER INSERT OR UPDATE ON public.marketplace_listings 
FOR EACH ROW EXECUTE FUNCTION public.fishgate_webhook_listing_transition();
