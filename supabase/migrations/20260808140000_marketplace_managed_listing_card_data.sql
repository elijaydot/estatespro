BEGIN;

DROP FUNCTION IF EXISTS public.get_managed_marketplace_listings_with_inquiry_counts(uuid);

CREATE FUNCTION public.get_managed_marketplace_listings_with_inquiry_counts(
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
  bedrooms integer,
  bathrooms integer,
  cover_media_path text,
  published_at timestamptz,
  inquiry_count bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT
    listing.id,
    listing.company_id,
    listing.title,
    listing.slug,
    listing.status,
    listing.verification_state,
    listing.city,
    listing.area,
    listing.rent_amount,
    listing.currency,
    listing.bedrooms,
    listing.bathrooms,
    (
      SELECT media.storage_path
      FROM public.listing_media media
      WHERE media.listing_id = listing.id
        AND media.is_cover = true
      ORDER BY media.sort_order ASC
      LIMIT 1
    ) AS cover_media_path,
    listing.published_at,
    COALESCE(COUNT(inquiry.id), 0)::bigint AS inquiry_count,
    listing.created_at
  FROM public.marketplace_listings listing
  LEFT JOIN public.marketplace_inquiries inquiry ON inquiry.listing_id = listing.id
  WHERE listing.company_id = p_company_id
  GROUP BY listing.id
  ORDER BY listing.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_managed_marketplace_listings_with_inquiry_counts(uuid) TO authenticated;

COMMIT;