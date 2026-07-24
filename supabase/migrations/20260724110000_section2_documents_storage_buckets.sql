-- Section 2.2: Real uploads for verification and CRM documents
-- Creates private storage buckets and company-scoped storage object policies.

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-documents', 'crm-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Company users can view verification documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can upload verification documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can update verification documents bucket objects" ON storage.objects;
DROP POLICY IF EXISTS "Company users can delete verification documents bucket objects" ON storage.objects;

CREATE POLICY "Company users can view verification documents bucket objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
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
