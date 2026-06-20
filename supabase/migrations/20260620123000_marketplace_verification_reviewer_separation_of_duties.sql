-- Enforce separation-of-duties for marketplace verification.
-- Owners/landlords can submit/resubmit evidence.
-- Internal FishGate reviewers (super_admin) can approve/reject decisions.

CREATE OR REPLACE FUNCTION public.is_internal_marketplace_reviewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_internal_marketplace_reviewer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_publisher_verification_sod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_reviewer boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_is_reviewer := public.is_internal_marketplace_reviewer(v_uid);

  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'pending' THEN
      RAISE EXCEPTION 'ONLY_PENDING_SUBMISSION_ALLOWED';
    END IF;

    NEW.verified_by := NULL;
    NEW.verified_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.last_submitted_at := COALESCE(NEW.last_submitted_at, now());
    RETURN NEW;
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NEW.state IN ('verified', 'rejected', 'needs_review') AND NOT v_is_reviewer THEN
      RAISE EXCEPTION 'REVIEWER_APPROVAL_REQUIRED';
    END IF;

    IF NEW.state = 'pending' AND OLD.state IN ('verified', 'rejected', 'needs_review') THEN
      NEW.verified_by := NULL;
      NEW.verified_at := NULL;
      NEW.rejection_reason := NULL;
      NEW.last_submitted_at := now();
    ELSIF NEW.state = 'verified' THEN
      NEW.verified_by := COALESCE(NEW.verified_by, v_uid);
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    ELSIF NEW.state = 'rejected' THEN
      NEW.verified_by := COALESCE(NEW.verified_by, v_uid);
      NEW.verified_at := COALESCE(NEW.verified_at, now());
      IF NEW.rejection_reason IS NULL OR btrim(NEW.rejection_reason) = '' THEN
        RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
      END IF;
    ELSIF NEW.state = 'needs_review' THEN
      NEW.verified_by := COALESCE(NEW.verified_by, v_uid);
      NEW.verified_at := COALESCE(NEW.verified_at, now());
    END IF;
  ELSE
    IF (NEW.verified_by IS DISTINCT FROM OLD.verified_by OR NEW.verified_at IS DISTINCT FROM OLD.verified_at)
       AND NOT v_is_reviewer THEN
      RAISE EXCEPTION 'REVIEWER_FIELDS_LOCKED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_publisher_verification_sod ON public.publisher_verifications;
CREATE TRIGGER enforce_publisher_verification_sod
BEFORE INSERT OR UPDATE ON public.publisher_verifications
FOR EACH ROW EXECUTE FUNCTION public.enforce_publisher_verification_sod();

CREATE OR REPLACE FUNCTION public.enforce_verification_document_sod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_reviewer boolean := false;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_is_reviewer := public.is_internal_marketplace_reviewer(v_uid);

  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'pending' THEN
      RAISE EXCEPTION 'ONLY_PENDING_DOCUMENT_ALLOWED';
    END IF;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.rejection_reason := NULL;
    RETURN NEW;
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NEW.state IN ('approved', 'rejected') AND NOT v_is_reviewer THEN
      RAISE EXCEPTION 'REVIEWER_APPROVAL_REQUIRED';
    END IF;

    IF NEW.state = 'approved' THEN
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, v_uid);
      NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
      NEW.rejection_reason := NULL;
    ELSIF NEW.state = 'rejected' THEN
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, v_uid);
      NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
      IF NEW.rejection_reason IS NULL OR btrim(NEW.rejection_reason) = '' THEN
        RAISE EXCEPTION 'REJECTION_REASON_REQUIRED';
      END IF;
    ELSIF NEW.state = 'pending' THEN
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
      NEW.rejection_reason := NULL;
    END IF;
  ELSE
    IF (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
       AND NOT v_is_reviewer THEN
      RAISE EXCEPTION 'REVIEWER_FIELDS_LOCKED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_verification_document_sod ON public.verification_documents;
CREATE TRIGGER enforce_verification_document_sod
BEFORE INSERT OR UPDATE ON public.verification_documents
FOR EACH ROW EXECUTE FUNCTION public.enforce_verification_document_sod();

-- Replace broad FOR ALL policies with scoped submitter/reviewer policies.
DROP POLICY IF EXISTS "Owners and landlords can manage publisher verifications" ON public.publisher_verifications;

CREATE POLICY "Owners and landlords can submit publisher verifications"
ON public.publisher_verifications
FOR INSERT TO authenticated
WITH CHECK (
  state = 'pending'
  AND (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = publisher_verifications.company_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = publisher_verifications.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role = 'landlord'
    )
  )
);

CREATE POLICY "Owners and landlords can resubmit publisher verifications"
ON public.publisher_verifications
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = publisher_verifications.company_id
      AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = publisher_verifications.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role = 'landlord'
  )
)
WITH CHECK (
  state = 'pending'
  AND (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = publisher_verifications.company_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.company_id = publisher_verifications.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.role = 'landlord'
    )
  )
);

CREATE POLICY "Internal reviewers can decide publisher verifications"
ON public.publisher_verifications
FOR UPDATE TO authenticated
USING (public.is_internal_marketplace_reviewer(auth.uid()))
WITH CHECK (public.is_internal_marketplace_reviewer(auth.uid()));

DROP POLICY IF EXISTS "Owners and landlords can manage verification documents" ON public.verification_documents;

CREATE POLICY "Owners and landlords can submit verification documents"
ON public.verification_documents
FOR INSERT TO authenticated
WITH CHECK (
  state = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    LEFT JOIN public.companies c ON c.id = pv.company_id
    LEFT JOIN public.company_members cm ON cm.company_id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND (
        c.owner_id = auth.uid()
        OR (
          cm.user_id = auth.uid()
          AND cm.status = 'approved'
          AND cm.role = 'landlord'
        )
      )
  )
);

CREATE POLICY "Owners and landlords can update pending verification documents"
ON public.verification_documents
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    LEFT JOIN public.companies c ON c.id = pv.company_id
    LEFT JOIN public.company_members cm ON cm.company_id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND (
        c.owner_id = auth.uid()
        OR (
          cm.user_id = auth.uid()
          AND cm.status = 'approved'
          AND cm.role = 'landlord'
        )
      )
  )
)
WITH CHECK (
  state = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    LEFT JOIN public.companies c ON c.id = pv.company_id
    LEFT JOIN public.company_members cm ON cm.company_id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND (
        c.owner_id = auth.uid()
        OR (
          cm.user_id = auth.uid()
          AND cm.status = 'approved'
          AND cm.role = 'landlord'
        )
      )
  )
);

CREATE POLICY "Internal reviewers can decide verification documents"
ON public.verification_documents
FOR UPDATE TO authenticated
USING (public.is_internal_marketplace_reviewer(auth.uid()))
WITH CHECK (public.is_internal_marketplace_reviewer(auth.uid()));
