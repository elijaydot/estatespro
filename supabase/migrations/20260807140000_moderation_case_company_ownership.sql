ALTER TABLE public.moderation_cases
  ADD COLUMN IF NOT EXISTS company_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.moderation_cases'::regclass
      AND conname = 'moderation_cases_company_id_fkey'
  ) THEN
    ALTER TABLE public.moderation_cases
      ADD CONSTRAINT moderation_cases_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_moderation_case_company_id(
  p_entity_type text,
  p_entity_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  CASE p_entity_type
    WHEN 'listing' THEN
      SELECT company_id INTO v_company_id
      FROM public.marketplace_listings
      WHERE id = p_entity_id;
    WHEN 'inquiry' THEN
      SELECT company_id INTO v_company_id
      FROM public.marketplace_inquiries
      WHERE id = p_entity_id;
    WHEN 'lead' THEN
      SELECT company_id INTO v_company_id
      FROM public.leads
      WHERE id = p_entity_id;
    WHEN 'publisher' THEN
      SELECT company_id INTO v_company_id
      FROM public.publisher_verifications
      WHERE id = p_entity_id;

      IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id
        FROM public.companies
        WHERE id = p_entity_id;
      END IF;
    ELSE
      v_company_id := NULL;
  END CASE;

  RETURN v_company_id;
END;
$$;

UPDATE public.moderation_cases AS moderation_case
SET company_id = public.resolve_moderation_case_company_id(
  moderation_case.entity_type,
  moderation_case.entity_id
)
WHERE moderation_case.company_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.moderation_cases
    WHERE company_id IS NULL
  ) THEN
    RAISE EXCEPTION 'MODERATION_CASE_COMPANY_BACKFILL_INCOMPLETE';
  END IF;
END;
$$;

ALTER TABLE public.moderation_cases
  ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_cases_company_state_opened
  ON public.moderation_cases(company_id, state, opened_at);

CREATE OR REPLACE FUNCTION public.enforce_moderation_case_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_resolved_company_id uuid;
BEGIN
  v_resolved_company_id := public.resolve_moderation_case_company_id(
    NEW.entity_type,
    NEW.entity_id
  );

  IF v_resolved_company_id IS NULL THEN
    RAISE EXCEPTION 'MODERATION_CASE_COMPANY_NOT_FOUND';
  END IF;

  IF NEW.company_id IS NOT NULL AND NEW.company_id <> v_resolved_company_id THEN
    RAISE EXCEPTION 'MODERATION_CASE_COMPANY_MISMATCH';
  END IF;

  NEW.company_id := v_resolved_company_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_moderation_case_company_id ON public.moderation_cases;
CREATE TRIGGER enforce_moderation_case_company_id
BEFORE INSERT OR UPDATE OF entity_type, entity_id, company_id
ON public.moderation_cases
FOR EACH ROW
EXECUTE FUNCTION public.enforce_moderation_case_company_id();

REVOKE ALL ON FUNCTION public.resolve_moderation_case_company_id(text, uuid) FROM PUBLIC;