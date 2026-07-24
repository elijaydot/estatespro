-- Section 3.1 and 3.2 hardening:
-- - Introduce delegated marketplace_reviewer operator role.
-- - Expand internal reviewer function beyond super_admin.
-- - Apply stronger moderation separation-of-duties controls.

ALTER TABLE public.platform_operator_roles
  DROP CONSTRAINT IF EXISTS platform_operator_roles_role_check;

ALTER TABLE public.platform_operator_roles
  ADD CONSTRAINT platform_operator_roles_role_check
  CHECK (role IN ('security_auditor', 'support_operator', 'billing_operator', 'marketplace_reviewer'));

CREATE OR REPLACE FUNCTION public.is_internal_marketplace_reviewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE (p.user_id = _user_id OR p.id = _user_id)
        AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.platform_operator_roles por
      WHERE por.user_id = _user_id
        AND por.role = 'marketplace_reviewer'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_internal_marketplace_reviewer(uuid) TO authenticated;

DROP POLICY IF EXISTS "Internal reviewers can read publisher verifications" ON public.publisher_verifications;
CREATE POLICY "Internal reviewers can read publisher verifications"
ON public.publisher_verifications
FOR SELECT TO authenticated
USING (public.is_internal_marketplace_reviewer(auth.uid()));

DROP POLICY IF EXISTS "Internal reviewers can read verification documents" ON public.verification_documents;
CREATE POLICY "Internal reviewers can read verification documents"
ON public.verification_documents
FOR SELECT TO authenticated
USING (public.is_internal_marketplace_reviewer(auth.uid()));

ALTER TABLE public.moderation_cases
  ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moderation_cases_opened_by
  ON public.moderation_cases(opened_by);

DROP POLICY IF EXISTS "Company users can manage moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "Company users can create moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "Company users can update own open moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "Internal reviewers can read moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "Internal reviewers can decide moderation cases" ON public.moderation_cases;

CREATE POLICY "Company users can create moderation cases"
ON public.moderation_cases
FOR INSERT TO authenticated
WITH CHECK (
  state = 'open'
  AND opened_by = auth.uid()
  AND assigned_moderator IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.marketplace_listings ml
    WHERE ml.id = moderation_cases.entity_id
      AND moderation_cases.entity_type = 'listing'
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
);

CREATE POLICY "Company users can update own open moderation cases"
ON public.moderation_cases
FOR UPDATE TO authenticated
USING (
  opened_by = auth.uid()
  AND state = 'open'
  AND EXISTS (
    SELECT 1
    FROM public.marketplace_listings ml
    WHERE ml.id = moderation_cases.entity_id
      AND moderation_cases.entity_type = 'listing'
      AND (
        ml.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = ml.company_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'approved'
            AND cm.role IN ('property_manager', 'landlord')
        )
      )
  )
)
WITH CHECK (
  opened_by = auth.uid()
  AND state = 'open'
  AND assigned_moderator IS NULL
  AND resolved_by IS NULL
  AND resolved_at IS NULL
  AND closed_at IS NULL
);

CREATE POLICY "Internal reviewers can read moderation cases"
ON public.moderation_cases
FOR SELECT TO authenticated
USING (public.is_internal_marketplace_reviewer(auth.uid()));

CREATE POLICY "Internal reviewers can decide moderation cases"
ON public.moderation_cases
FOR UPDATE TO authenticated
USING (public.is_internal_marketplace_reviewer(auth.uid()))
WITH CHECK (public.is_internal_marketplace_reviewer(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_moderation_case_accountability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_reviewer boolean := false;
  v_opened_by uuid;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_is_reviewer := public.is_internal_marketplace_reviewer(v_uid);

  IF TG_OP = 'INSERT' THEN
    NEW.opened_by := COALESCE(NEW.opened_by, v_uid);
  ELSE
    NEW.opened_by := COALESCE(OLD.opened_by, NEW.opened_by);
    IF OLD.opened_by IS NOT NULL AND NEW.opened_by IS DISTINCT FROM OLD.opened_by THEN
      RAISE EXCEPTION 'OPENED_BY_LOCKED';
    END IF;

    IF (NEW.resolved_by IS DISTINCT FROM OLD.resolved_by OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at)
       AND NOT v_is_reviewer THEN
      RAISE EXCEPTION 'REVIEWER_FIELDS_LOCKED';
    END IF;
  END IF;

  v_opened_by := NEW.opened_by;

  IF NEW.state IN ('in_review', 'resolved', 'dismissed') THEN
    IF NOT v_is_reviewer THEN
      RAISE EXCEPTION 'REVIEWER_APPROVAL_REQUIRED';
    END IF;

    IF NEW.assigned_moderator IS NULL THEN
      RAISE EXCEPTION 'ASSIGNED_MODERATOR_REQUIRED';
    END IF;

    IF NOT public.is_internal_marketplace_reviewer(NEW.assigned_moderator) THEN
      RAISE EXCEPTION 'ASSIGNED_MODERATOR_REVIEWER_REQUIRED';
    END IF;
  END IF;

  IF NEW.state IN ('resolved', 'dismissed') THEN
    IF v_opened_by IS NOT NULL AND v_opened_by = v_uid THEN
      RAISE EXCEPTION 'SUBMITTER_CANNOT_DECIDE_OWN_CASE';
    END IF;

    IF NEW.resolution_notes IS NULL OR btrim(NEW.resolution_notes) = '' THEN
      RAISE EXCEPTION 'RESOLUTION_REASON_REQUIRED';
    END IF;

    NEW.closed_at := COALESCE(NEW.closed_at, now());
    NEW.resolved_by := COALESCE(NEW.resolved_by, v_uid);
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSE
    NEW.closed_at := NULL;
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_moderation_case_accountability ON public.moderation_cases;
CREATE TRIGGER enforce_moderation_case_accountability
BEFORE INSERT OR UPDATE ON public.moderation_cases
FOR EACH ROW EXECUTE FUNCTION public.enforce_moderation_case_accountability();
