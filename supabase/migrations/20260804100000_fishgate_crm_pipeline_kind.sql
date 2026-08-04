-- Add the authoritative pipeline discriminator without changing legacy deal stages.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pipeline_kind text NOT NULL DEFAULT 'leasing';

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_pipeline_kind_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_pipeline_kind_check
  CHECK (pipeline_kind IN ('leasing', 'renewal', 'collections'));

CREATE INDEX IF NOT EXISTS idx_leads_company_pipeline_stage
  ON public.leads(company_id, pipeline_kind, stage, last_activity_at DESC NULLS LAST);