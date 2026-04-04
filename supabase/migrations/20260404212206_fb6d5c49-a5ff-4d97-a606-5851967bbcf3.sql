DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

DROP POLICY IF EXISTS "Authenticated view companies" ON public.companies;
CREATE POLICY "Users view related companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR id IN (SELECT company_id FROM public.get_pm_approved_membership(auth.uid()))
  OR id IN (
    SELECT p.company_id
    FROM public.properties p
    WHERE p.company_id IS NOT NULL
      AND p.id IN (SELECT public.get_tenant_property_id(auth.uid()))
  )
);

DROP POLICY IF EXISTS "PMs view assigned payment settings" ON public.landlord_payment_settings;

DROP POLICY IF EXISTS "PMs manage assigned tenants" ON public.tenants;
CREATE POLICY "PMs view assigned tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (public.is_approved_pm(auth.uid(), property_id));
CREATE POLICY "PMs update assigned tenants"
ON public.tenants
FOR UPDATE
TO authenticated
USING (public.is_approved_pm(auth.uid(), property_id))
WITH CHECK (public.is_approved_pm(auth.uid(), property_id));

DROP POLICY IF EXISTS "PMs manage assigned units" ON public.units;
CREATE POLICY "PMs view assigned units"
ON public.units
FOR SELECT
TO authenticated
USING (public.is_approved_pm(auth.uid(), property_id));
CREATE POLICY "PMs update assigned units"
ON public.units
FOR UPDATE
TO authenticated
USING (public.is_approved_pm(auth.uid(), property_id))
WITH CHECK (public.is_approved_pm(auth.uid(), property_id));

DROP POLICY IF EXISTS "Allow marking invite as used" ON public.tenant_invites;
CREATE POLICY "Invite recipients can mark invite as used"
ON public.tenant_invites
FOR UPDATE
TO authenticated
USING (
  token IS NOT NULL
  AND expires_at > now()
  AND used_at IS NULL
  AND lower(coalesce(auth.jwt() ->> 'email', '')) = lower(email)
)
WITH CHECK (
  used_at IS NOT NULL
  AND lower(coalesce(auth.jwt() ->> 'email', '')) = lower(email)
);

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);