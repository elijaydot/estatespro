-- Section 4.3: Lead scoring engine + automatic recompute triggers.
-- Scoring is explainable and bounded to 0..100.

CREATE OR REPLACE FUNCTION public.crm_compute_lead_score(
  p_lead_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_contact record;
  v_listing_rent numeric;
  v_budget_min numeric;
  v_budget_max numeric;
  v_activity_count integer := 0;
  v_first_inquiry_at timestamptz;
  v_first_outbound_at timestamptz;
  v_age_hours numeric;
  v_response_hours numeric;
  v_score integer := 0;
BEGIN
  SELECT *
  INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Source quality weighting.
  v_score := v_score + CASE v_lead.source
    WHEN 'referral' THEN 24
    WHEN 'marketplace_public' THEN 20
    WHEN 'manual' THEN 12
    ELSE 8
  END;

  -- Stage momentum weighting.
  v_score := v_score + CASE v_lead.stage
    WHEN 'new' THEN 2
    WHEN 'attempted_contact' THEN 4
    WHEN 'contacted' THEN 7
    WHEN 'qualified' THEN 10
    WHEN 'viewing_scheduled' THEN 12
    WHEN 'offer_made' THEN 14
    WHEN 'lease_in_progress' THEN 16
    WHEN 'converted' THEN 20
    WHEN 'lost' THEN 0
    ELSE 0
  END;

  SELECT full_name, phone_e164, email, consent_marketing
  INTO v_contact
  FROM public.lead_contacts
  WHERE lead_id = p_lead_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF coalesce(nullif(trim(coalesce(v_contact.phone_e164, '')), ''), '') <> '' THEN
      v_score := v_score + 10;
    END IF;

    IF coalesce(nullif(trim(coalesce(v_contact.email, '')), ''), '') <> '' THEN
      v_score := v_score + 10;
    END IF;

    IF coalesce(v_contact.consent_marketing, false) THEN
      v_score := v_score + 5;
    END IF;
  END IF;

  -- Engagement depth: each activity contributes up to a cap.
  SELECT count(*)::integer
  INTO v_activity_count
  FROM public.lead_activities
  WHERE lead_id = p_lead_id;

  v_score := v_score + least(24, greatest(0, v_activity_count) * 3);

  -- Recency score using last activity freshness.
  IF v_lead.last_activity_at IS NOT NULL THEN
    IF v_lead.last_activity_at >= now() - interval '1 day' THEN
      v_score := v_score + 15;
    ELSIF v_lead.last_activity_at >= now() - interval '7 days' THEN
      v_score := v_score + 10;
    ELSIF v_lead.last_activity_at >= now() - interval '30 days' THEN
      v_score := v_score + 5;
    END IF;
  END IF;

  -- Response-time score: time from first inquiry to first outbound touch.
  SELECT min(occurred_at)
  INTO v_first_inquiry_at
  FROM public.lead_activities
  WHERE lead_id = p_lead_id
    AND activity_type = 'inquiry';

  SELECT min(occurred_at)
  INTO v_first_outbound_at
  FROM public.lead_activities
  WHERE lead_id = p_lead_id
    AND activity_type IN ('call', 'sms', 'whatsapp', 'email');

  IF v_first_inquiry_at IS NOT NULL AND v_first_outbound_at IS NOT NULL THEN
    v_response_hours := extract(epoch FROM (v_first_outbound_at - v_first_inquiry_at)) / 3600.0;

    IF v_response_hours <= 1 THEN
      v_score := v_score + 15;
    ELSIF v_response_hours <= 24 THEN
      v_score := v_score + 10;
    ELSIF v_response_hours <= 72 THEN
      v_score := v_score + 5;
    END IF;
  ELSIF v_first_inquiry_at IS NOT NULL THEN
    v_age_hours := extract(epoch FROM (now() - v_first_inquiry_at)) / 3600.0;
    IF v_age_hours > 48 THEN
      v_score := v_score - 5;
    END IF;
  END IF;

  -- Budget-fit score from latest inquiry budget against listing rent.
  IF v_lead.listing_id IS NOT NULL THEN
    SELECT rent_amount
    INTO v_listing_rent
    FROM public.marketplace_listings
    WHERE id = v_lead.listing_id;

    SELECT mi.budget_min, mi.budget_max
    INTO v_budget_min, v_budget_max
    FROM public.marketplace_inquiries mi
    WHERE mi.lead_id = p_lead_id
    ORDER BY mi.created_at DESC
    LIMIT 1;

    IF v_listing_rent IS NOT NULL THEN
      IF v_budget_min IS NULL AND v_budget_max IS NULL THEN
        v_score := v_score + 3;
      ELSIF v_budget_min IS NOT NULL AND v_budget_max IS NOT NULL THEN
        IF v_listing_rent BETWEEN v_budget_min AND v_budget_max THEN
          v_score := v_score + 15;
        ELSIF v_listing_rent <= (v_budget_max * 1.10) THEN
          v_score := v_score + 8;
        END IF;
      ELSIF v_budget_max IS NOT NULL THEN
        IF v_listing_rent <= v_budget_max THEN
          v_score := v_score + 12;
        ELSIF v_listing_rent <= (v_budget_max * 1.10) THEN
          v_score := v_score + 6;
        END IF;
      ELSIF v_budget_min IS NOT NULL THEN
        IF v_listing_rent >= v_budget_min THEN
          v_score := v_score + 8;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Priority boost gives operator intent a small influence.
  v_score := v_score + CASE v_lead.priority
    WHEN 'urgent' THEN 8
    WHEN 'high' THEN 5
    WHEN 'normal' THEN 2
    ELSE 0
  END;

  RETURN greatest(0, least(100, v_score));
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_refresh_lead_score(
  p_lead_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_score integer;
BEGIN
  IF p_lead_id IS NULL THEN
    RETURN 0;
  END IF;

  v_new_score := public.crm_compute_lead_score(p_lead_id);

  UPDATE public.leads
  SET score = v_new_score,
      updated_at = now()
  WHERE id = p_lead_id;

  RETURN v_new_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_recompute_lead_score_on_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_lead_id uuid;
BEGIN
  v_target_lead_id := coalesce(NEW.lead_id, OLD.lead_id);

  PERFORM public.crm_refresh_lead_score(v_target_lead_id);

  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_recompute_lead_score_on_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_lead_id uuid;
BEGIN
  v_target_lead_id := coalesce(NEW.lead_id, OLD.lead_id);

  PERFORM public.crm_refresh_lead_score(v_target_lead_id);

  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_recompute_lead_score_on_lead_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.crm_refresh_lead_score(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_recompute_lead_score_after_activity_write ON public.lead_activities;
CREATE TRIGGER crm_recompute_lead_score_after_activity_write
AFTER INSERT OR UPDATE OR DELETE ON public.lead_activities
FOR EACH ROW
EXECUTE FUNCTION public.crm_recompute_lead_score_on_activity();

DROP TRIGGER IF EXISTS crm_recompute_lead_score_after_contact_write ON public.lead_contacts;
CREATE TRIGGER crm_recompute_lead_score_after_contact_write
AFTER INSERT OR UPDATE OR DELETE ON public.lead_contacts
FOR EACH ROW
EXECUTE FUNCTION public.crm_recompute_lead_score_on_contact();

DROP TRIGGER IF EXISTS crm_recompute_lead_score_after_lead_update ON public.leads;
CREATE TRIGGER crm_recompute_lead_score_after_lead_update
AFTER UPDATE OF stage, priority, source, listing_id, status, last_activity_at ON public.leads
FOR EACH ROW
WHEN (
  NEW.stage IS DISTINCT FROM OLD.stage
  OR NEW.priority IS DISTINCT FROM OLD.priority
  OR NEW.source IS DISTINCT FROM OLD.source
  OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
  OR NEW.status IS DISTINCT FROM OLD.status
  OR NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at
)
EXECUTE FUNCTION public.crm_recompute_lead_score_on_lead_update();

UPDATE public.leads
SET score = public.crm_compute_lead_score(id),
    updated_at = now();

GRANT EXECUTE ON FUNCTION public.crm_compute_lead_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_refresh_lead_score(uuid) TO service_role;
