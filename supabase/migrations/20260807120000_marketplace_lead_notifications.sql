CREATE OR REPLACE FUNCTION public.notify_listing_owner_of_lead(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_listing public.marketplace_listings%ROWTYPE;
  v_contact_name text;
  v_recipient uuid;
BEGIN
  SELECT * INTO STRICT v_lead FROM public.leads WHERE id = p_lead_id;
  SELECT * INTO STRICT v_listing FROM public.marketplace_listings WHERE id = v_lead.listing_id;
  SELECT full_name INTO v_contact_name FROM public.lead_contacts WHERE lead_id = p_lead_id LIMIT 1;

  SELECT member.user_id INTO v_recipient
  FROM public.company_members AS member
  WHERE member.company_id = v_listing.company_id
    AND member.user_id = v_listing.created_by
    AND member.status = 'approved'
    AND member.role IN ('landlord', 'property_manager')
  LIMIT 1;

  IF v_recipient IS NULL THEN
    SELECT member.user_id INTO v_recipient
    FROM public.company_members AS member
    WHERE member.company_id = v_listing.company_id
      AND member.status = 'approved'
      AND member.role IN ('landlord', 'property_manager')
    ORDER BY CASE member.role WHEN 'landlord' THEN 0 ELSE 1 END, member.created_at
    LIMIT 1;
  END IF;

  IF v_recipient IS NULL THEN
    RAISE EXCEPTION 'MARKETPLACE_LEAD_RECIPIENT_NOT_FOUND';
  END IF;

  UPDATE public.leads SET assigned_to = v_recipient, updated_at = now() WHERE id = p_lead_id;

  BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
    VALUES (
      v_recipient,
      'New marketplace lead',
      COALESCE(v_contact_name, 'A renter') || ' is interested in ' || v_listing.title,
      'marketplace_lead',
      '/marketplace/crm/leads?lead=' || p_lead_id,
      jsonb_build_object('listing_id', v_listing.id, 'lead_id', p_lead_id, 'contact_name', v_contact_name)
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      IF to_regclass('public.platform_audit_events') IS NOT NULL THEN
        INSERT INTO public.platform_audit_events (
          source, event_type, module, action, severity, result_status, company_id,
          target_entity_type, target_entity_id, correlation_id, metadata
        ) VALUES (
          'database', 'marketplace.lead.notification_failed', 'marketplace', 'notify_listing_owner',
          'warning', 'error', v_listing.company_id, 'lead', p_lead_id::text, gen_random_uuid()::text,
          jsonb_build_object('error', SQLERRM, 'listing_id', v_listing.id)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_listing_owner_of_lead(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.on_marketplace_inquiry_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  BEGIN
    PERFORM public.notify_listing_owner_of_lead(NEW.lead_id);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      IF to_regclass('public.platform_audit_events') IS NOT NULL THEN
        INSERT INTO public.platform_audit_events (
          source, event_type, module, action, severity, result_status, company_id,
          target_entity_type, target_entity_id, correlation_id, metadata
        ) VALUES (
          'database', 'marketplace.lead.notification_failed', 'marketplace', 'notify_listing_owner',
          'warning', 'error', NEW.company_id, 'lead', NEW.lead_id::text, gen_random_uuid()::text,
          jsonb_build_object('error', SQLERRM, 'listing_id', NEW.listing_id)
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_marketplace_inquiry_created ON public.marketplace_inquiries;
CREATE TRIGGER notify_marketplace_inquiry_created
AFTER INSERT ON public.marketplace_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.on_marketplace_inquiry_created();