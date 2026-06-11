-- Seed one live marketplace listing for API smoke tests.
-- Safe approach: reuse existing company if available; otherwise create a test company.

DO $$
DECLARE
  v_company_id uuid;
  v_owner_id uuid;
  v_listing_id uuid;
  v_slug text;
BEGIN
  -- Prefer an existing company.
  SELECT c.id, c.owner_id
  INTO v_company_id, v_owner_id
  FROM public.companies c
  ORDER BY c.created_at ASC
  LIMIT 1;

  -- If no company exists, create a test company.
  IF v_company_id IS NULL THEN
    v_owner_id := gen_random_uuid();
    INSERT INTO public.companies (name, owner_id, is_verified)
    VALUES ('FishGate Test Company', v_owner_id, true)
    RETURNING id INTO v_company_id;
  END IF;

  -- Create a unique slug for repeatable runs.
  v_slug := 'test-listing-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  INSERT INTO public.marketplace_listings (
    company_id,
    title,
    slug,
    description,
    city,
    area,
    rent_amount,
    currency,
    bedrooms,
    bathrooms,
    available_from,
    status,
    verification_state,
    created_by,
    published_at
  ) VALUES (
    v_company_id,
    'Test 2 Bedroom Apartment',
    v_slug,
    'Seed listing for Postman and Swagger smoke tests',
    'Lagos',
    'Lekki',
    2500000,
    'NGN',
    2,
    2,
    CURRENT_DATE + INTERVAL '7 days',
    'live',
    'verified',
    v_owner_id,
    now()
  )
  RETURNING id INTO v_listing_id;

  -- Optional media row so cover_media_url is populated.
  INSERT INTO public.listing_media (
    listing_id,
    media_type,
    storage_path,
    sort_order,
    is_cover,
    moderation_state
  ) VALUES (
    v_listing_id,
    'image',
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?q=80&w=1200&auto=format&fit=crop',
    0,
    true,
    'approved'
  );

  RAISE NOTICE 'Seed listing created. id=%, slug=%', v_listing_id, v_slug;
END $$;

-- Verify rows and copy values into Postman variables.
SELECT
  id,
  slug,
  title,
  status,
  city,
  area,
  published_at
FROM public.marketplace_listings
WHERE status = 'live'
ORDER BY published_at DESC NULLS LAST, created_at DESC
LIMIT 5;
