ALTER TABLE public.crm_visits
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

CREATE INDEX IF NOT EXISTS idx_crm_visits_company_scheduled_at
  ON public.crm_visits(company_id, scheduled_at DESC)
  WHERE scheduled_at IS NOT NULL;

COMMENT ON COLUMN public.crm_visits.scheduled_at IS 'Planned start time for the property visit.';
COMMENT ON COLUMN public.crm_visits.assigned_to IS 'User responsible for conducting the visit.';