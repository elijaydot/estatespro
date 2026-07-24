-- Hardening: enforce company-scoped first path segment for storage objects.
-- Applies to verification-documents and crm-documents buckets.

DROP POLICY IF EXISTS "Company users can view verification documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can upload verification documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can update verification documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can delete verification documents bucket objects" ON storage.objects;

CREATE POLICY "Company users can view verification documents bucket objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company users can upload verification documents bucket objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company users can update verification documents bucket objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company users can delete verification documents bucket objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Company users can view crm documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can upload crm documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can update crm documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can delete crm documents bucket objects" ON storage.objects;

CREATE POLICY "Company users can view crm documents bucket objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'crm-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company users can upload crm documents bucket objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'crm-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company users can update crm documents bucket objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'crm-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'crm-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Company users can delete crm documents bucket objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'crm-documents'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    public.is_platform_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'approved'
        AND cm.company_id::text = (storage.foldername(name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND c.id::text = (storage.foldername(name))[1]
    )
  )
);
