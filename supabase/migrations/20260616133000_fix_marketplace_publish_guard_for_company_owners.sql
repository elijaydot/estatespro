-- Fix: allow company owners to change marketplace listing publish status.
-- Previous trigger logic only accepted company_members.role='landlord',
-- which could block actual company owners without a matching company_members landlord row.

CREATE OR REPLACE FUNCTION public.enforce_marketplace_publish_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_landlord_member boolean := false;
  v_is_company_owner boolean := false;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('live', 'paused', 'archived', 'blocked') THEN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.company_members cm
        WHERE cm.company_id = OLD.company_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'approved'
          AND cm.role = 'landlord'
      ) INTO v_is_landlord_member;

      SELECT EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = OLD.company_id
          AND c.owner_id = auth.uid()
      ) INTO v_is_company_owner;

      IF NOT v_is_landlord_member AND NOT v_is_company_owner THEN
        RAISE EXCEPTION 'ONLY_LANDLORD_CAN_CHANGE_LISTING_STATUS';
      END IF;
    END IF;

    IF NEW.status = 'live'
       AND COALESCE(NEW.verification_state, OLD.verification_state, 'unverified') <> 'verified' THEN
      RAISE EXCEPTION 'VERIFICATION_REQUIRED_BEFORE_PUBLISH';
    END IF;

    IF NEW.status = 'live' THEN
      NEW.published_at := COALESCE(NEW.published_at, now());
      NEW.paused_at := NULL;
      NEW.archived_at := NULL;
    ELSIF NEW.status = 'paused' THEN
      NEW.paused_at := COALESCE(NEW.paused_at, now());
    ELSIF NEW.status = 'archived' THEN
      NEW.archived_at := COALESCE(NEW.archived_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;