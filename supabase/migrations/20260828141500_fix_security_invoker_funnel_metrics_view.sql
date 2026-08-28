-- Fix critical Supabase security advisor warning: convert view to SECURITY INVOKER
DROP VIEW IF EXISTS public.crm_marketplace_funnel_metrics;

CREATE VIEW public.crm_marketplace_funnel_metrics
WITH (security_invoker = true)
AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  coalesce(inq.inquiries_30d, 0) AS inquiries_30d,
  coalesce(ld.leads_open, 0) AS leads_open,
  coalesce(ld.leads_open, 0) AS deals_open,
  coalesce(ld.leads_won_30d, 0) AS deals_won_30d,
  CASE WHEN coalesce(inq.inquiries_30d, 0) = 0 THEN 0
       ELSE round((coalesce(ld.leads_won_30d, 0)::numeric / nullif(inq.inquiries_30d, 0)::numeric) * 100, 2)
  END AS inquiry_to_won_rate_pct
FROM public.companies c
LEFT JOIN (
  SELECT company_id, count(*) AS inquiries_30d
  FROM public.marketplace_inquiries
  WHERE created_at >= now() - interval '30 days'
  GROUP BY company_id
) inq ON inq.company_id = c.id
LEFT JOIN (
  SELECT
    company_id,
    count(*) FILTER (WHERE stage NOT IN ('converted', 'lost')) AS leads_open,
    count(*) FILTER (WHERE stage = 'converted' AND converted_at >= now() - interval '30 days') AS leads_won_30d
  FROM public.leads
  GROUP BY company_id
) ld ON ld.company_id = c.id;

GRANT SELECT ON public.crm_marketplace_funnel_metrics TO authenticated;
