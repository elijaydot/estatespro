-- Follow-up warning remediations: storage policy correctness, invite token exposure,
-- maintenance photo upload authorization, realtime policy hardening, and definer execute surface.

-- 1) Correct and harden lease attachment tenant read policy.
DROP POLICY IF EXISTS "Users and assigned tenants can view lease attachments" ON storage.objects;

CREATE POLICY "Users and assigned tenants can view lease attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lease-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.tenants t ON t.id = l.tenant_id
      WHERE (storage.foldername(name))[2] = l.id::text
        AND t.tenant_user_id = auth.uid()
    )
  )
);

-- 2) Require uploads to be linked to an owned/authorized maintenance request.
DROP POLICY IF EXISTS "Users can upload own maintenance photos" ON storage.objects;

CREATE POLICY "Users can upload own maintenance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (storage.foldername(name))[2] IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    LEFT JOIN public.tenants t ON t.id = mr.tenant_id
    WHERE mr.id::text = (storage.foldername(name))[2]
      AND (
        t.tenant_user_id = auth.uid()
        OR mr.user_id = auth.uid()
        OR public.is_approved_pm(auth.uid(), mr.property_id)
      )
  )
);

-- 3) Remove PM invite token read access from direct table SELECT.
REVOKE SELECT (token)
ON public.pm_invites
FROM anon, authenticated;

-- 4) Minimize public listing on public buckets by removing broad SELECT policies.
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;

CREATE POLICY "Authenticated users can view company logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can view property images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'property-images');

-- 5) Enforce strict realtime topic allowlist; remove any broad existing policies.
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'realtime' AND tablename = 'messages'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', pol.policyname);
    END LOOP;

    EXECUTE '
      CREATE POLICY "Users can read own realtime topics"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        realtime.topic() LIKE ''user:'' || auth.uid()::text || ''%''
        OR realtime.topic() LIKE ''tenant:'' || auth.uid()::text || ''%''
      )
    ';
  END IF;
END $$;

-- 6) Revoke PUBLIC execute on SECURITY DEFINER functions in public schema.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', fn.proname, fn.args);
  END LOOP;
END $$;

-- Trigger-only functions should never be directly callable by signed-in users.
DO $$
BEGIN
  IF to_regprocedure('public.validate_tenant_lease_update()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.validate_tenant_lease_update() FROM authenticated;
  END IF;
  IF to_regprocedure('public.enforce_tenant_maintenance_request_ownership()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.enforce_tenant_maintenance_request_ownership() FROM authenticated;
  END IF;
END $$;
