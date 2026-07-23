-- Enforce photo evidence for damaged items before key tenant-exit transitions.

CREATE OR REPLACE FUNCTION public.enforce_tenant_exit_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_photos integer := 0;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'inspection_pending' AND NEW.status = 'inspection_complete' THEN
    IF NEW.inspection_date IS NULL THEN
      RAISE EXCEPTION 'INSPECTION_DATE_REQUIRED';
    END IF;

    SELECT COUNT(*)
    INTO v_missing_photos
    FROM public.exit_inspection_items
    WHERE exit_id = NEW.id
      AND condition = 'damaged'
      AND (photo_url IS NULL OR btrim(photo_url) = '');

    IF v_missing_photos > 0 THEN
      RAISE EXCEPTION 'DAMAGED_ITEM_PHOTO_REQUIRED';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'inspection_complete' AND NEW.status = 'deposit_decided' THEN
    IF NEW.deposit_decision IS NULL OR NEW.deposit_decision = 'pending' THEN
      RAISE EXCEPTION 'DEPOSIT_DECISION_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'deposit_decided' AND NEW.status = 'approved' THEN
    IF NEW.landlord_approved_by IS NULL OR NEW.landlord_approved_at IS NULL THEN
      RAISE EXCEPTION 'LANDLORD_APPROVAL_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'approved' AND NEW.status = 'completed' THEN
    IF NEW.refund_method IS NULL OR NEW.refund_method = '' OR NEW.refund_processed_at IS NULL THEN
      RAISE EXCEPTION 'REFUND_DETAILS_REQUIRED';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'INVALID_EXIT_STATUS_TRANSITION: % -> %', OLD.status, NEW.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enforce_tenant_exit_status_transition() TO authenticated;
