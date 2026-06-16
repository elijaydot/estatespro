-- Catch-up slice (Days 8-12): moderation, verification, and server-side publish enforcement.

CREATE TABLE IF NOT EXISTS public.listing_publish_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  reason_code text,
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_publish_history_listing_changed
  ON public.listing_publish_history(listing_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_publish_history_company_changed
  ON public.listing_publish_history(company_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS public.publisher_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'verified', 'rejected', 'needs_review')),
  verified_by uuid,
  verified_at timestamptz,
  rejection_reason text,
  last_submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.publisher_verifications(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('id_card', 'business_registration', 'utility_bill', 'other')),
  storage_path text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_documents_verification
  ON public.verification_documents(verification_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('assign', 'state_change', 'note', 'risk_override', 'dismiss', 'resolve')),
  actor_user_id uuid,
  from_state text,
  to_state text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_case_created
  ON public.moderation_actions(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_company_created
  ON public.moderation_actions(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.risk_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES public.marketplace_inquiries(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  decision text NOT NULL CHECK (decision IN ('allow', 'review', 'block')),
  reason_codes text[] NOT NULL DEFAULT '{}'::text[],
  decided_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_decisions_company_decided
  ON public.risk_decisions(company_id, decided_at DESC);

DROP TRIGGER IF EXISTS update_publisher_verifications_updated_at ON public.publisher_verifications;
CREATE TRIGGER update_publisher_verifications_updated_at
BEFORE UPDATE ON public.publisher_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.listing_publish_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publisher_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can read listing publish history" ON public.listing_publish_history;
CREATE POLICY "Company users can read listing publish history" ON public.listing_publish_history
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = listing_publish_history.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Landlords can create listing publish history" ON public.listing_publish_history;
CREATE POLICY "Landlords can create listing publish history" ON public.listing_publish_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = listing_publish_history.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role = 'landlord'
  )
);

DROP POLICY IF EXISTS "Company users can read publisher verifications" ON public.publisher_verifications;
CREATE POLICY "Company users can read publisher verifications" ON public.publisher_verifications
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = publisher_verifications.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Landlords can manage publisher verifications" ON public.publisher_verifications;
CREATE POLICY "Landlords can manage publisher verifications" ON public.publisher_verifications
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = publisher_verifications.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role = 'landlord'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = publisher_verifications.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role = 'landlord'
  )
);

DROP POLICY IF EXISTS "Company users can read verification documents" ON public.verification_documents;
CREATE POLICY "Company users can read verification documents" ON public.verification_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    LEFT JOIN public.company_members cm ON cm.company_id = pv.company_id AND cm.user_id = auth.uid() AND cm.status = 'approved'
    WHERE pv.id = verification_documents.verification_id
      AND (
        pv.company_id IN (SELECT public.get_user_company_ids(auth.uid()))
        OR cm.user_id IS NOT NULL
      )
  )
);

DROP POLICY IF EXISTS "Landlords can manage verification documents" ON public.verification_documents;
CREATE POLICY "Landlords can manage verification documents" ON public.verification_documents
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    JOIN public.company_members cm ON cm.company_id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role = 'landlord'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    JOIN public.company_members cm ON cm.company_id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role = 'landlord'
  )
);

DROP POLICY IF EXISTS "Company users can read moderation actions" ON public.moderation_actions;
CREATE POLICY "Company users can read moderation actions" ON public.moderation_actions
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = moderation_actions.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage moderation actions" ON public.moderation_actions;
CREATE POLICY "Company managers can manage moderation actions" ON public.moderation_actions
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = moderation_actions.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = moderation_actions.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

DROP POLICY IF EXISTS "Company users can read risk decisions" ON public.risk_decisions;
CREATE POLICY "Company users can read risk decisions" ON public.risk_decisions
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = risk_decisions.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Company managers can manage risk decisions" ON public.risk_decisions;
CREATE POLICY "Company managers can manage risk decisions" ON public.risk_decisions
FOR ALL TO authenticated
USING (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = risk_decisions.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
)
WITH CHECK (
  company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = risk_decisions.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role IN ('property_manager', 'landlord')
  )
);

CREATE OR REPLACE FUNCTION public.enforce_marketplace_publish_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_landlord boolean := false;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('live', 'paused', 'archived', 'blocked') THEN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED';
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.company_members cm
        WHERE cm.company_id = OLD.company_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'approved'
          AND cm.role = 'landlord'
      ) INTO v_is_landlord;

      IF NOT v_is_landlord THEN
        RAISE EXCEPTION 'ONLY_LANDLORD_CAN_CHANGE_LISTING_STATUS';
      END IF;
    END IF;

    IF NEW.status = 'live'
       AND COALESCE(NEW.verification_state, OLD.verification_state, 'unverified') <> 'verified' THEN
      RAISE EXCEPTION 'VERIFICATION_REQUIRED_BEFORE_PUBLISH';
    END IF;

    IF NEW.status = 'live' THEN
      NEW.published_at := COALESCE(NEW.published_at, now());
      NEW.paused_at := NULL;
      NEW.archived_at := NULL;
    ELSIF NEW.status = 'paused' THEN
      NEW.paused_at := COALESCE(NEW.paused_at, now());
    ELSIF NEW.status = 'archived' THEN
      NEW.archived_at := COALESCE(NEW.archived_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_marketplace_publish_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('live', 'paused', 'archived', 'blocked') THEN
    INSERT INTO public.listing_publish_history (
      listing_id,
      company_id,
      from_status,
      to_status,
      actor_user_id,
      metadata,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.company_id,
      OLD.status,
      NEW.status,
      auth.uid(),
      jsonb_build_object('verification_state', NEW.verification_state),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_marketplace_publish_transition ON public.marketplace_listings;
CREATE TRIGGER enforce_marketplace_publish_transition
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_marketplace_publish_transition();

DROP TRIGGER IF EXISTS log_marketplace_publish_history ON public.marketplace_listings;
CREATE TRIGGER log_marketplace_publish_history
AFTER UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.log_marketplace_publish_history();