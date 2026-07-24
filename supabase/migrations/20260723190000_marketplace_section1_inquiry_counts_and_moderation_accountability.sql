-- Section 1 remediation: managed listing inquiry counts + moderation accountability hardening.

ALTER TABLE public.moderation_cases
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_moderation_case_accountability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NEW.state IN ('in_review', 'resolved', 'dismissed') AND NEW.assigned_moderator IS NULL THEN
    RAISE EXCEPTION 'ASSIGNED_MODERATOR_REQUIRED';
  END IF;

  IF NEW.state IN ('resolved', 'dismissed') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    NEW.resolved_by := COALESCE(NEW.resolved_by, v_uid);
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSE
    NEW.closed_at := NULL;
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_moderation_case_accountability ON public.moderation_cases;
CREATE TRIGGER enforce_moderation_case_accountability
BEFORE INSERT OR UPDATE ON public.moderation_cases
FOR EACH ROW EXECUTE FUNCTION public.enforce_moderation_case_accountability();

CREATE OR REPLACE FUNCTION public.get_managed_marketplace_listings_with_inquiry_counts(
  p_company_id uuid
)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  title text,
  slug text,
  status text,
  verification_state text,
  city text,
  area text,
  rent_amount numeric,
  currency text,
  published_at timestamptz,
  inquiry_count bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    ml.id,
    ml.company_id,
    ml.title,
    ml.slug,
    ml.status,
    ml.verification_state,
    ml.city,
    ml.area,
    ml.rent_amount,
    ml.currency,
    ml.published_at,
    COALESCE(COUNT(mi.id), 0)::bigint AS inquiry_count,
    ml.created_at
  FROM public.marketplace_listings ml
  LEFT JOIN public.marketplace_inquiries mi ON mi.listing_id = ml.id
  WHERE ml.company_id = p_company_id
  GROUP BY ml.id
  ORDER BY ml.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_managed_marketplace_listings_with_inquiry_counts(uuid) TO authenticated;
