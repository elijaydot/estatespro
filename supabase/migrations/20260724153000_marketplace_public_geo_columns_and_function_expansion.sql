-- Section 4.4: Add optional geo coordinates for listing map rendering
-- and expose them through public listing helper functions.

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_listings_latitude_check'
  ) THEN
    ALTER TABLE public.marketplace_listings
      ADD CONSTRAINT marketplace_listings_latitude_check
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_listings_longitude_check'
  ) THEN
    ALTER TABLE public.marketplace_listings
      ADD CONSTRAINT marketplace_listings_longitude_check
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_city_area_geo
  ON public.marketplace_listings(city, area, latitude, longitude)
  WHERE status = 'live';

DROP FUNCTION IF EXISTS public.get_public_marketplace_listings(text, text, numeric, numeric, int, int, int);
DROP FUNCTION IF EXISTS public.get_public_marketplace_listing_detail(text);

CREATE OR REPLACE FUNCTION public.get_public_marketplace_listings(
  p_city text DEFAULT NULL,
  p_area text DEFAULT NULL,
  p_min_rent numeric DEFAULT NULL,
  p_max_rent numeric DEFAULT NULL,
  p_bedrooms int DEFAULT NULL,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  city text,
  area text,
  latitude numeric,
  longitude numeric,
  rent_amount numeric,
  currency text,
  bedrooms int,
  bathrooms int,
  available_from date,
  verification_state text,
  published_at timestamptz,
  company_name text,
  company_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ml.id,
    ml.slug,
    ml.title,
    ml.city,
    ml.area,
    ml.latitude,
    ml.longitude,
    ml.rent_amount,
    ml.currency,
    ml.bedrooms,
    ml.bathrooms,
    ml.available_from,
    ml.verification_state,
    ml.published_at,
    c.name as company_name,
    c.logo_url as company_logo_url
  FROM public.marketplace_listings ml
  JOIN public.companies c ON c.id = ml.company_id
  WHERE ml.status = 'live'
    AND (p_city IS NULL OR ml.city ILIKE p_city)
    AND (p_area IS NULL OR ml.area ILIKE p_area)
    AND (p_min_rent IS NULL OR ml.rent_amount >= p_min_rent)
    AND (p_max_rent IS NULL OR ml.rent_amount <= p_max_rent)
    AND (p_bedrooms IS NULL OR ml.bedrooms = p_bedrooms)
  ORDER BY ml.published_at DESC NULLS LAST, ml.created_at DESC
  OFFSET GREATEST(0, (GREATEST(1, COALESCE(p_page, 1)) - 1) * LEAST(100, GREATEST(1, COALESCE(p_page_size, 20))))
  LIMIT LEAST(100, GREATEST(1, COALESCE(p_page_size, 20)));
$$;

CREATE OR REPLACE FUNCTION public.get_public_marketplace_listing_detail(p_id_or_slug text)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  description text,
  city text,
  area text,
  latitude numeric,
  longitude numeric,
  rent_amount numeric,
  currency text,
  bedrooms int,
  bathrooms int,
  available_from date,
  verification_state text,
  published_at timestamptz,
  company_name text,
  company_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ml.id,
    ml.slug,
    ml.title,
    ml.description,
    ml.city,
    ml.area,
    ml.latitude,
    ml.longitude,
    ml.rent_amount,
    ml.currency,
    ml.bedrooms,
    ml.bathrooms,
    ml.available_from,
    ml.verification_state,
    ml.published_at,
    c.name as company_name,
    c.logo_url as company_logo_url
  FROM public.marketplace_listings ml
  JOIN public.companies c ON c.id = ml.company_id
  WHERE ml.status = 'live'
    AND (
      ml.id::text = p_id_or_slug
      OR ml.slug = p_id_or_slug
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_marketplace_listings(text, text, numeric, numeric, int, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_listing_detail(text) TO anon, authenticated;
