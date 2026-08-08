CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_lead_contacts_full_name_trgm
  ON public.lead_contacts USING gin (lower(full_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_lead_contacts_email_trgm
  ON public.lead_contacts USING gin (lower(email) gin_trgm_ops)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_contacts_phone_trgm
  ON public.lead_contacts USING gin (phone_e164 gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_title_trgm
  ON public.marketplace_listings USING gin (lower(title) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_crm_leads(
  p_company_id uuid,
  p_query text DEFAULT '',
  p_stage text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  listing_id uuid,
  pipeline_kind text,
  stage text,
  status text,
  priority text,
  score integer,
  assigned_to uuid,
  created_at timestamptz,
  last_activity_at timestamptz,
  converted_at timestamptz,
  lost_reason text,
  listing_title text,
  listing_slug text,
  contact_name text,
  contact_email text,
  contact_phone text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    lead.id,
    lead.company_id,
    lead.listing_id,
    'leasing'::text AS pipeline_kind,
    lead.stage,
    lead.status,
    lead.priority,
    lead.score,
    lead.assigned_to,
    lead.created_at,
    lead.last_activity_at,
    lead.converted_at,
    lead.lost_reason,
    listing.title,
    listing.slug,
    contact.full_name,
    contact.email,
    contact.phone_e164
  FROM public.leads lead
  LEFT JOIN public.lead_contacts contact ON contact.lead_id = lead.id
  LEFT JOIN public.marketplace_listings listing ON listing.id = lead.listing_id
  WHERE lead.company_id = p_company_id
    AND (p_stage IS NULL OR lead.stage = p_stage)
    AND (p_status IS NULL OR lead.status = p_status)
    AND (
      btrim(COALESCE(p_query, '')) = ''
      OR lower(COALESCE(contact.full_name, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(COALESCE(contact.email, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR COALESCE(contact.phone_e164, '') LIKE '%' || btrim(p_query) || '%'
      OR lower(COALESCE(listing.title, '')) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(lead.stage) LIKE '%' || lower(btrim(p_query)) || '%'
      OR lower(lead.status) LIKE '%' || lower(btrim(p_query)) || '%'
    )
  ORDER BY
    CASE
      WHEN lower(COALESCE(contact.full_name, '')) = lower(btrim(p_query)) THEN 0
      WHEN lower(COALESCE(contact.full_name, '')) LIKE lower(btrim(p_query)) || '%' THEN 1
      WHEN COALESCE(contact.phone_e164, '') = btrim(p_query) THEN 2
      ELSE 3
    END,
    lead.score DESC,
    lead.last_activity_at DESC NULLS LAST,
    lead.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);
$$;

COMMENT ON FUNCTION public.search_crm_leads(uuid, text, text, text, integer) IS
  'Returns a ranked, capped lead record result set for the CRM navigator. Existing table RLS remains authoritative.';