-- Fix publisher verification RLS: allow company owners (not only landlord members)

DROP POLICY IF EXISTS "Landlords can manage publisher verifications" ON public.publisher_verifications;
DROP POLICY IF EXISTS "Owners and landlords can manage publisher verifications" ON public.publisher_verifications;

CREATE POLICY "Owners and landlords can manage publisher verifications"
ON public.publisher_verifications
FOR ALL TO authenticated
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
);

DROP POLICY IF EXISTS "Landlords can manage verification documents" ON public.verification_documents;
DROP POLICY IF EXISTS "Owners and landlords can manage verification documents" ON public.verification_documents;

CREATE POLICY "Owners and landlords can manage verification documents"
ON public.verification_documents
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    JOIN public.companies c ON c.id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND c.owner_id = auth.uid()
  )
  OR EXISTS (
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
    JOIN public.companies c ON c.id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.publisher_verifications pv
    JOIN public.company_members cm ON cm.company_id = pv.company_id
    WHERE pv.id = verification_documents.verification_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'approved'
      AND cm.role = 'landlord'
  )
);
