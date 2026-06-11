-- Day 2: marketplace helper SQL + inquiry idempotency pipeline

CREATE TABLE IF NOT EXISTS public.marketplace_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone_e164 text NOT NULL,
  email text,
  message text,
  move_in_date date,
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  consent_marketing boolean NOT NULL DEFAULT false,
  risk_state text NOT NULL DEFAULT 'pending' CHECK (risk_state IN ('pending', 'allow', 'review', 'block')),
  source_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (budget_min IS NULL OR budget_min >= 0),
  CHECK (budget_max IS NULL OR budget_max >= 0),
  CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_inquiries_company_created
  ON public.marketplace_inquiries(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_inquiries_listing_created
  ON public.marketplace_inquiries(listing_id, created_at DESC);

ALTER TABLE public.marketplace_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can read marketplace inquiries" ON public.marketplace_inquiries;
CREATE POLICY "Company users can read marketplace inquiries" ON public.marketplace_inquiries
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = marketplace_inquiries.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company users can manage marketplace inquiries" ON public.marketplace_inquiries;
CREATE POLICY "Company users can manage marketplace inquiries" ON public.marketplace_inquiries
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = marketplace_inquiries.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = marketplace_inquiries.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

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

CREATE OR REPLACE FUNCTION public.create_marketplace_inquiry(
  p_listing_id uuid,
  p_idempotency_key text,
  p_full_name text,
  p_phone_e164 text,
  p_email text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_move_in_date date DEFAULT NULL,
  p_budget_min numeric DEFAULT NULL,
  p_budget_max numeric DEFAULT NULL,
  p_consent_marketing boolean DEFAULT false,
  p_source_ip text DEFAULT NULL
)
RETURNS TABLE(inquiry_id uuid, lead_id uuid, reused boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing public.marketplace_inquiries%ROWTYPE;
  v_listing public.marketplace_listings%ROWTYPE;
  v_lead_id uuid;
  v_inquiry_id uuid;
BEGIN
  IF p_listing_id IS NULL THEN
    RAISE EXCEPTION 'LISTING_ID_REQUIRED';
  END IF;

  IF COALESCE(TRIM(p_idempotency_key), '') = '' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;

  IF COALESCE(TRIM(p_full_name), '') = '' THEN
    RAISE EXCEPTION 'FULL_NAME_REQUIRED';
  END IF;

  IF COALESCE(TRIM(p_phone_e164), '') = '' THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  SELECT * INTO v_existing
  FROM public.marketplace_inquiries mi
  WHERE mi.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN QUERY SELECT v_existing.id, v_existing.lead_id, true;
    RETURN;
  END IF;

  SELECT * INTO v_listing
  FROM public.marketplace_listings ml
  WHERE ml.id = p_listing_id;

  IF NOT FOUND OR v_listing.status <> 'live' THEN
    RAISE EXCEPTION 'LISTING_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.leads (
    company_id,
    listing_id,
    source,
    stage,
    status,
    priority,
    score,
    first_seen_at,
    last_activity_at,
    created_at,
    updated_at
  ) VALUES (
    v_listing.company_id,
    v_listing.id,
    'marketplace_public',
    'new',
    'open',
    'normal',
    0,
    now(),
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_lead_id;

  INSERT INTO public.lead_contacts (
    lead_id,
    full_name,
    phone_e164,
    email,
    preferred_channel,
    consent_marketing,
    created_at
  ) VALUES (
    v_lead_id,
    TRIM(p_full_name),
    TRIM(p_phone_e164),
    NULLIF(TRIM(COALESCE(p_email, '')), ''),
    'phone',
    COALESCE(p_consent_marketing, false),
    now()
  );

  INSERT INTO public.lead_activities (
    lead_id,
    activity_type,
    channel,
    actor_user_id,
    payload_json,
    occurred_at,
    created_at
  ) VALUES (
    v_lead_id,
    'inquiry',
    'marketplace',
    NULL,
    jsonb_build_object(
      'message', NULLIF(TRIM(COALESCE(p_message, '')), ''),
      'move_in_date', p_move_in_date,
      'budget_min', p_budget_min,
      'budget_max', p_budget_max,
      'source_ip', p_source_ip
    ),
    now(),
    now()
  );

  INSERT INTO public.marketplace_inquiries (
    listing_id,
    lead_id,
    company_id,
    idempotency_key,
    full_name,
    phone_e164,
    email,
    message,
    move_in_date,
    budget_min,
    budget_max,
    consent_marketing,
    source_ip,
    created_at
  ) VALUES (
    v_listing.id,
    v_lead_id,
    v_listing.company_id,
    p_idempotency_key,
    TRIM(p_full_name),
    TRIM(p_phone_e164),
    NULLIF(TRIM(COALESCE(p_email, '')), ''),
    NULLIF(TRIM(COALESCE(p_message, '')), ''),
    p_move_in_date,
    p_budget_min,
    p_budget_max,
    COALESCE(p_consent_marketing, false),
    p_source_ip,
    now()
  )
  RETURNING id INTO v_inquiry_id;

  RETURN QUERY SELECT v_inquiry_id, v_lead_id, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_marketplace_listings(text, text, numeric, numeric, int, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_listing_detail(text) TO anon, authenticated;
