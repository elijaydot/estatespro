-- Catch-up slice (Days 10-12): SEO slugs, risk evaluation functions, and CRM automation helpers.

CREATE TABLE IF NOT EXISTS public.listing_search_index (
  listing_id uuid PRIMARY KEY REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  city_slug text NOT NULL,
  area_slug text,
  seo_path text NOT NULL UNIQUE,
  searchable_text tsvector,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_search_index_city_area
  ON public.listing_search_index(city_slug, area_slug);

CREATE INDEX IF NOT EXISTS idx_listing_search_index_tsv
  ON public.listing_search_index USING gin(searchable_text);

CREATE TABLE IF NOT EXISTS public.abuse_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL CHECK (signal_type IN ('inquiry_velocity', 'ip_reuse', 'duplicate_message', 'email_pattern', 'phone_pattern')),
  inquiry_id uuid REFERENCES public.marketplace_inquiries(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abuse_signals_company_detected
  ON public.abuse_signals(company_id, detected_at DESC);

CREATE OR REPLACE FUNCTION public.slugify_text(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.refresh_listing_search_index_for_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_listing public.marketplace_listings%ROWTYPE;
  v_city_slug text;
  v_area_slug text;
  v_seo_path text;
BEGIN
  SELECT * INTO v_listing
  FROM public.marketplace_listings
  WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_city_slug := public.slugify_text(v_listing.city);
  v_area_slug := NULLIF(public.slugify_text(v_listing.area), '');

  v_seo_path := '/rent/' || v_city_slug;
  IF v_area_slug IS NOT NULL THEN
    v_seo_path := v_seo_path || '/' || v_area_slug;
  END IF;
  v_seo_path := v_seo_path || '/' || coalesce(v_listing.slug, v_listing.id::text);

  INSERT INTO public.listing_search_index (
    listing_id,
    city_slug,
    area_slug,
    seo_path,
    searchable_text,
    updated_at
  ) VALUES (
    v_listing.id,
    v_city_slug,
    v_area_slug,
    v_seo_path,
    to_tsvector('simple', concat_ws(' ', v_listing.title, v_listing.description, v_listing.city, v_listing.area)),
    now()
  )
  ON CONFLICT (listing_id)
  DO UPDATE SET
    city_slug = EXCLUDED.city_slug,
    area_slug = EXCLUDED.area_slug,
    seo_path = EXCLUDED.seo_path,
    searchable_text = EXCLUDED.searchable_text,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_listing_search_index_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_listing_search_index_for_listing(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_listing_search_index_trigger ON public.marketplace_listings;
CREATE TRIGGER refresh_listing_search_index_trigger
AFTER INSERT OR UPDATE OF title, description, city, area, slug ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.refresh_listing_search_index_trigger();

CREATE OR REPLACE FUNCTION public.get_public_marketplace_cities()
RETURNS TABLE(city_slug text, city_name text, listing_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    lsi.city_slug,
    ml.city as city_name,
    COUNT(*)::bigint as listing_count
  FROM public.listing_search_index lsi
  JOIN public.marketplace_listings ml ON ml.id = lsi.listing_id
  WHERE ml.status = 'live'
  GROUP BY lsi.city_slug, ml.city
  ORDER BY COUNT(*) DESC, ml.city ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_marketplace_areas(p_city_slug text)
RETURNS TABLE(city_slug text, area_slug text, area_name text, listing_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    lsi.city_slug,
    lsi.area_slug,
    ml.area as area_name,
    COUNT(*)::bigint as listing_count
  FROM public.listing_search_index lsi
  JOIN public.marketplace_listings ml ON ml.id = lsi.listing_id
  WHERE ml.status = 'live'
    AND lsi.city_slug = p_city_slug
    AND lsi.area_slug IS NOT NULL
  GROUP BY lsi.city_slug, lsi.area_slug, ml.area
  ORDER BY COUNT(*) DESC, ml.area ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_marketplace_listings_by_location(
  p_city_slug text,
  p_area_slug text DEFAULT NULL,
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
  FROM public.listing_search_index lsi
  JOIN public.marketplace_listings ml ON ml.id = lsi.listing_id
  JOIN public.companies c ON c.id = ml.company_id
  WHERE ml.status = 'live'
    AND lsi.city_slug = p_city_slug
    AND (p_area_slug IS NULL OR lsi.area_slug = p_area_slug)
  ORDER BY ml.published_at DESC NULLS LAST, ml.created_at DESC
  OFFSET GREATEST(0, (GREATEST(1, COALESCE(p_page, 1)) - 1) * LEAST(100, GREATEST(1, COALESCE(p_page_size, 20))))
  LIMIT LEAST(100, GREATEST(1, COALESCE(p_page_size, 20)));
$$;

CREATE OR REPLACE FUNCTION public.evaluate_marketplace_inquiry_risk(p_inquiry_id uuid)
RETURNS TABLE(score int, decision text, reason_codes text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inquiry public.marketplace_inquiries%ROWTYPE;
  v_score int := 0;
  v_reasons text[] := '{}'::text[];
  v_recent_same_phone int := 0;
  v_recent_same_ip int := 0;
  v_decision text := 'allow';
BEGIN
  SELECT * INTO v_inquiry
  FROM public.marketplace_inquiries
  WHERE id = p_inquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INQUIRY_NOT_FOUND';
  END IF;

  SELECT COUNT(*) INTO v_recent_same_phone
  FROM public.marketplace_inquiries mi
  WHERE mi.phone_e164 = v_inquiry.phone_e164
    AND mi.created_at >= (now() - interval '15 minutes')
    AND mi.id <> v_inquiry.id;

  IF v_recent_same_phone >= 2 THEN
    v_score := v_score + 35;
    v_reasons := array_append(v_reasons, 'phone_velocity');
  END IF;

  IF v_inquiry.source_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_same_ip
    FROM public.marketplace_inquiries mi
    WHERE mi.source_ip = v_inquiry.source_ip
      AND mi.created_at >= (now() - interval '15 minutes')
      AND mi.id <> v_inquiry.id;

    IF v_recent_same_ip >= 5 THEN
      v_score := v_score + 45;
      v_reasons := array_append(v_reasons, 'ip_velocity');
    END IF;
  END IF;

  IF coalesce(length(v_inquiry.message), 0) > 900 THEN
    v_score := v_score + 10;
    v_reasons := array_append(v_reasons, 'long_message_anomaly');
  END IF;

  IF v_score >= 70 THEN
    v_decision := 'block';
  ELSIF v_score >= 35 THEN
    v_decision := 'review';
  ELSE
    v_decision := 'allow';
  END IF;

  UPDATE public.marketplace_inquiries
  SET risk_state = CASE v_decision WHEN 'allow' THEN 'allow' WHEN 'review' THEN 'review' ELSE 'block' END
  WHERE id = v_inquiry.id;

  INSERT INTO public.risk_decisions (
    inquiry_id,
    listing_id,
    company_id,
    score,
    decision,
    reason_codes,
    metadata,
    decided_at
  ) VALUES (
    v_inquiry.id,
    v_inquiry.listing_id,
    v_inquiry.company_id,
    LEAST(100, v_score),
    v_decision,
    v_reasons,
    jsonb_build_object('source', 'rule_engine_v1', 'same_phone_count', v_recent_same_phone, 'same_ip_count', v_recent_same_ip),
    now()
  );

  IF v_decision IN ('review', 'block') THEN
    INSERT INTO public.moderation_cases (
      company_id,
      entity_type,
      entity_id,
      reason_code,
      severity,
      state,
      queue,
      opened_at,
      created_at,
      updated_at
    ) VALUES (
      v_inquiry.company_id,
      'inquiry',
      v_inquiry.id,
      CASE WHEN v_decision = 'block' THEN 'risk_blocked_inquiry' ELSE 'risk_review_inquiry' END,
      CASE WHEN v_decision = 'block' THEN 'high' ELSE 'medium' END,
      'open',
      'risk',
      now(),
      now(),
      now()
    );

    INSERT INTO public.abuse_signals (
      signal_type,
      inquiry_id,
      listing_id,
      company_id,
      severity,
      metadata,
      detected_at
    ) VALUES (
      'inquiry_velocity',
      v_inquiry.id,
      v_inquiry.listing_id,
      v_inquiry.company_id,
      CASE WHEN v_decision = 'block' THEN 'critical' ELSE 'high' END,
      jsonb_build_object('decision', v_decision, 'reason_codes', v_reasons),
      now()
    );
  END IF;

  RETURN QUERY SELECT LEAST(100, v_score), v_decision, v_reasons;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_crm_followup_tasks(p_company_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int := 0;
BEGIN
  WITH candidate_leads AS (
    SELECT l.id as lead_id
    FROM public.leads l
    WHERE l.company_id = p_company_id
      AND l.status = 'open'
      AND l.stage IN ('new', 'attempted_contact', 'contacted', 'qualified')
      AND (
        l.last_activity_at IS NULL
        OR l.last_activity_at <= (now() - interval '24 hours')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.lead_tasks t
        WHERE t.lead_id = l.id
          AND t.status = 'open'
          AND t.task_type = 'follow_up'
      )
    LIMIT 200
  ), inserted AS (
    INSERT INTO public.lead_tasks (
      lead_id,
      task_type,
      owner_user_id,
      due_at,
      status,
      notes,
      created_at
    )
    SELECT
      c.lead_id,
      'follow_up',
      coalesce(l.assigned_to, l.created_by),
      now() + interval '6 hours',
      'open',
      'Auto-generated follow-up task for stale open lead.',
      now()
    FROM candidate_leads c
    JOIN public.leads l ON l.id = c.lead_id
    WHERE coalesce(l.assigned_to, l.created_by) IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  RETURN coalesce(v_count, 0);
END;
$$;

ALTER TABLE public.listing_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read listing search index" ON public.listing_search_index;
CREATE POLICY "Public can read listing search index" ON public.listing_search_index
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_listings ml
    WHERE ml.id = listing_search_index.listing_id
      AND ml.status = 'live'
  )
);

DROP POLICY IF EXISTS "Service role can manage listing search index" ON public.listing_search_index;
CREATE POLICY "Service role can manage listing search index" ON public.listing_search_index
FOR ALL TO authenticated
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company users can read abuse signals" ON public.abuse_signals;
CREATE POLICY "Company users can read abuse signals" ON public.abuse_signals
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = abuse_signals.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage abuse signals" ON public.abuse_signals;
CREATE POLICY "Company managers can manage abuse signals" ON public.abuse_signals
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = abuse_signals.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = abuse_signals.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

GRANT EXECUTE ON FUNCTION public.get_public_marketplace_cities() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_areas(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_marketplace_listings_by_location(text, text, int, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_marketplace_inquiry_risk(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_crm_followup_tasks(uuid) TO authenticated, service_role;

INSERT INTO public.listing_search_index (
  listing_id,
  city_slug,
  area_slug,
  seo_path,
  searchable_text,
  updated_at
)
SELECT
  ml.id,
  public.slugify_text(ml.city),
  NULLIF(public.slugify_text(ml.area), ''),
  '/rent/' || public.slugify_text(ml.city) ||
    CASE WHEN NULLIF(public.slugify_text(ml.area), '') IS NOT NULL THEN '/' || public.slugify_text(ml.area) ELSE '' END ||
    '/' || coalesce(ml.slug, ml.id::text),
  to_tsvector('simple', concat_ws(' ', ml.title, ml.description, ml.city, ml.area)),
  now()
FROM public.marketplace_listings ml
ON CONFLICT (listing_id)
DO UPDATE SET
  city_slug = EXCLUDED.city_slug,
  area_slug = EXCLUDED.area_slug,
  seo_path = EXCLUDED.seo_path,
  searchable_text = EXCLUDED.searchable_text,
  updated_at = now();