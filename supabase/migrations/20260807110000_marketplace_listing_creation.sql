DROP POLICY IF EXISTS "Company users can create listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Company landlords and PMs can create draft listings" ON public.marketplace_listings;

CREATE POLICY "Company landlords and PMs can create draft listings"
ON public.marketplace_listings
FOR INSERT TO authenticated
WITH CHECK (
  status = 'draft'
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.units AS unit_record
    JOIN public.properties AS property_record ON property_record.id = unit_record.property_id
    WHERE unit_record.id = marketplace_listings.unit_id
      AND unit_record.status = 'vacant'
      AND property_record.id = marketplace_listings.property_id
      AND property_record.company_id = marketplace_listings.company_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.company_members AS member
    WHERE member.company_id = marketplace_listings.company_id
      AND member.user_id = auth.uid()
      AND member.status = 'approved'
      AND member.role IN ('property_manager', 'landlord')
  )
);

DO $$
DECLARE
  v_previous_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  WITH ranked_listings AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY unit_id
        ORDER BY
          CASE status
            WHEN 'live' THEN 0
            WHEN 'pending_review' THEN 1
            WHEN 'paused' THEN 2
            WHEN 'draft' THEN 3
            ELSE 4
          END,
          published_at DESC NULLS LAST,
          created_at DESC,
          id DESC
      ) AS unit_rank
    FROM public.marketplace_listings
    WHERE unit_id IS NOT NULL
      AND status <> 'archived'
  )
  UPDATE public.marketplace_listings AS listing
  SET status = 'archived', archived_at = COALESCE(listing.archived_at, now()), updated_at = now()
  FROM ranked_listings
  WHERE ranked_listings.id = listing.id
    AND ranked_listings.unit_rank > 1;

  PERFORM set_config('request.jwt.claim.role', COALESCE(v_previous_role, ''), true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claim.role', COALESCE(v_previous_role, ''), true);
  RAISE;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_listings_active_unit
  ON public.marketplace_listings(unit_id)
  WHERE unit_id IS NOT NULL AND status <> 'archived';