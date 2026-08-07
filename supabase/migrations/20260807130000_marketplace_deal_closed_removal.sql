ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS removal_flagged_at timestamptz;
ALTER TABLE public.marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_status_check;
ALTER TABLE public.marketplace_listings ADD CONSTRAINT marketplace_listings_status_check
  CHECK (status IN ('draft', 'pending_review', 'live', 'paused', 'pending_removal', 'archived', 'blocked'));

ALTER TABLE public.operational_alerts DROP CONSTRAINT IF EXISTS operational_alerts_alert_type_check;
ALTER TABLE public.operational_alerts ADD CONSTRAINT operational_alerts_alert_type_check
  CHECK (alert_type IN ('lease_expiry', 'vacant_unit', 'overdue_payment', 'vendor_document_expiring', 'listing_deal_closed'));
ALTER TABLE public.operational_alerts DROP CONSTRAINT IF EXISTS operational_alerts_reference_table_check;
ALTER TABLE public.operational_alerts ADD CONSTRAINT operational_alerts_reference_table_check
  CHECK (reference_table IN ('leases', 'units', 'invoices', 'vendor_documents', 'marketplace_listings'));

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_pending_removal
  ON public.marketplace_listings(removal_flagged_at)
  WHERE status = 'pending_removal';

CREATE OR REPLACE FUNCTION public.notify_listing_owner(p_listing_id uuid, p_title text, p_message text, p_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_listing public.marketplace_listings%ROWTYPE; v_recipient uuid;
BEGIN
  SELECT * INTO STRICT v_listing FROM public.marketplace_listings WHERE id = p_listing_id;
  SELECT member.user_id INTO v_recipient FROM public.company_members member
  WHERE member.company_id = v_listing.company_id AND member.status = 'approved'
    AND member.role IN ('landlord', 'property_manager')
  ORDER BY CASE WHEN member.user_id = v_listing.created_by THEN 0 WHEN member.role = 'landlord' THEN 1 ELSE 2 END, member.created_at
  LIMIT 1;
  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, link, metadata)
    VALUES (v_recipient, p_title, p_message, p_type, '/marketplace/manage', jsonb_build_object('listing_id', p_listing_id));
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.notify_listing_owner(uuid, text, text, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.on_lease_activated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_listing public.marketplace_listings%ROWTYPE; v_company_id uuid;
BEGIN
  IF OLD.status = 'active' OR NEW.status <> 'active' OR NEW.landlord_signed_at IS NULL OR NEW.tenant_signed_at IS NULL THEN RETURN NEW; END IF;
  UPDATE public.units SET status = 'occupied', updated_at = now() WHERE id = NEW.unit_id;

  FOR v_listing IN SELECT * FROM public.marketplace_listings WHERE unit_id = NEW.unit_id AND status IN ('live', 'pending_review') FOR UPDATE LOOP
    UPDATE public.marketplace_listings SET status = 'pending_removal', removal_flagged_at = now(), updated_at = now() WHERE id = v_listing.id;
    INSERT INTO public.operational_alerts(company_id, alert_type, severity, status, title, description, reference_table, reference_id, metadata)
    VALUES (v_listing.company_id, 'listing_deal_closed', 'warning', 'open', 'Listing pending removal', v_listing.title || ' has an activated lease and is no longer publicly available.', 'marketplace_listings', v_listing.id, jsonb_build_object('lease_id', NEW.id, 'unit_id', NEW.unit_id, 'flagged_at', now()))
    ON CONFLICT (company_id, alert_type, reference_table, reference_id) DO UPDATE SET status = 'open', resolved_at = NULL, updated_at = now(), metadata = EXCLUDED.metadata;
    BEGIN PERFORM public.notify_listing_owner(v_listing.id, 'Lease activated: remove listing', v_listing.title || ' is unavailable and will be archived automatically after 24 hours.', 'listing_deal_closed'); EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_lease_activated ON public.leases;
CREATE TRIGGER on_lease_activated AFTER UPDATE OF status ON public.leases
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active')
EXECUTE FUNCTION public.on_lease_activated();

CREATE OR REPLACE FUNCTION public.handle_pending_listing_removal(p_listing_id uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_listing public.marketplace_listings%ROWTYPE; v_next_status text; v_previous_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  SELECT * INTO STRICT v_listing FROM public.marketplace_listings WHERE id = p_listing_id FOR UPDATE;
  IF v_listing.status <> 'pending_removal' THEN RAISE EXCEPTION 'LISTING_NOT_PENDING_REMOVAL'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_members member WHERE member.company_id = v_listing.company_id AND member.user_id = auth.uid() AND member.status = 'approved' AND member.role IN ('landlord', 'property_manager')) THEN RAISE EXCEPTION 'LISTING_REMOVAL_ACCESS_DENIED'; END IF;
  IF p_action NOT IN ('confirm', 'keep_live') THEN RAISE EXCEPTION 'INVALID_LISTING_REMOVAL_ACTION'; END IF;
  v_next_status := CASE p_action WHEN 'confirm' THEN 'archived' ELSE 'live' END;
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE public.marketplace_listings SET status = v_next_status, removal_flagged_at = NULL, archived_at = CASE WHEN p_action = 'confirm' THEN now() ELSE NULL END, published_at = CASE WHEN p_action = 'keep_live' THEN now() ELSE published_at END, updated_at = now() WHERE id = p_listing_id;
  PERFORM set_config('request.jwt.claim.role', COALESCE(v_previous_role, ''), true);
  UPDATE public.operational_alerts SET status = 'resolved', resolved_at = now(), updated_at = now() WHERE alert_type = 'listing_deal_closed' AND reference_table = 'marketplace_listings' AND reference_id = p_listing_id AND status IN ('open', 'acknowledged');
  INSERT INTO public.platform_audit_events(source, event_type, module, action, severity, result_status, actor_user_id, company_id, target_entity_type, target_entity_id, correlation_id, metadata)
  VALUES ('database', 'marketplace.listing_removal_action', 'marketplace', p_action, CASE WHEN p_action = 'keep_live' THEN 'warning' ELSE 'info' END, 'success', auth.uid(), v_listing.company_id, 'marketplace_listing', p_listing_id::text, gen_random_uuid()::text, jsonb_build_object('previous_status', v_listing.status, 'next_status', v_next_status));
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claim.role', COALESCE(v_previous_role, ''), true);
  RAISE;
END; $$;
REVOKE ALL ON FUNCTION public.handle_pending_listing_removal(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_pending_listing_removal(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_remove_stale_pending_listings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_listing public.marketplace_listings%ROWTYPE; v_count integer := 0; v_previous_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  FOR v_listing IN SELECT * FROM public.marketplace_listings WHERE status = 'pending_removal' AND removal_flagged_at < now() - interval '24 hours' FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.marketplace_listings SET status = 'archived', archived_at = now(), removal_flagged_at = NULL, updated_at = now() WHERE id = v_listing.id;
    UPDATE public.operational_alerts SET status = 'resolved', resolved_at = now(), updated_at = now() WHERE alert_type = 'listing_deal_closed' AND reference_id = v_listing.id AND status IN ('open', 'acknowledged');
    INSERT INTO public.platform_audit_events(source, event_type, module, action, severity, result_status, company_id, target_entity_type, target_entity_id, correlation_id, metadata)
    VALUES ('database', 'marketplace.listing_auto_removed', 'marketplace', 'auto_archive', 'warning', 'success', v_listing.company_id, 'marketplace_listing', v_listing.id::text, gen_random_uuid()::text, jsonb_build_object('flagged_at', v_listing.removal_flagged_at));
    BEGIN PERFORM public.notify_listing_owner(v_listing.id, 'Listing auto-removed', v_listing.title || ' was archived after the 24-hour removal window.', 'listing_auto_removed'); EXCEPTION WHEN OTHERS THEN NULL; END;
    v_count := v_count + 1;
  END LOOP;
  PERFORM set_config('request.jwt.claim.role', COALESCE(v_previous_role, ''), true);
  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claim.role', COALESCE(v_previous_role, ''), true);
  RAISE;
END; $$;
REVOKE ALL ON FUNCTION public.auto_remove_stale_pending_listings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_remove_stale_pending_listings() TO service_role;

CREATE OR REPLACE FUNCTION public.schedule_marketplace_stale_listing_removal()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
BEGIN
  IF to_regnamespace('cron') IS NULL THEN RETURN; END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'marketplace_stale_listing_removal';
  PERFORM cron.schedule('marketplace_stale_listing_removal', '0 * * * *', 'SELECT public.auto_remove_stale_pending_listings();');
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Unable to schedule stale listing removal: %', SQLERRM;
END; $$;
REVOKE ALL ON FUNCTION public.schedule_marketplace_stale_listing_removal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_marketplace_stale_listing_removal() TO service_role;
DO $$ BEGIN PERFORM public.schedule_marketplace_stale_listing_removal(); END $$;