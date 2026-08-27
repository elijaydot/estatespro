-- Follow-up hardening for RLS/auth/storage findings.

-- 1) Prevent self-escalation via user_roles inserts.
DROP POLICY IF EXISTS "System insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

CREATE POLICY "Users can insert tenant role for self"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'tenant'::public.app_role
);

-- 2) Tighten maintenance photo uploads to the caller's namespace only.
DROP POLICY IF EXISTS "Authenticated users can upload maintenance photos" ON storage.objects;

CREATE POLICY "Users can upload own maintenance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Allow tenant access to lease attachment objects tied to their lease.
DROP POLICY IF EXISTS "Users can view their own lease attachments" ON storage.objects;

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
      WHERE l.id::text = (storage.foldername(name))[2]
        AND t.tenant_user_id = auth.uid()
    )
  )
);

-- 4) Remove broad invite-token read surfaces and move lookup to edge function.
DROP POLICY IF EXISTS "Read valid PM invites" ON public.pm_invites;
DROP POLICY IF EXISTS "Anyone can read valid PM invite by token" ON public.pm_invites;
DROP POLICY IF EXISTS "Allow reading invite by exact token lookup" ON public.tenant_invites;
DROP POLICY IF EXISTS "Token holders can read their specific invite" ON public.tenant_invites;
DROP POLICY IF EXISTS "Anyone can view valid invite tokens" ON public.tenant_invites;

DO $$
BEGIN
  IF to_regprocedure('public.validate_invite_token(text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.validate_invite_token(text) FROM anon, authenticated;
  END IF;
  IF to_regprocedure('public.validate_pm_invite_token(text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.validate_pm_invite_token(text) FROM anon, authenticated;
  END IF;
END $$;

-- 5) Reduce secret key exposure from direct table reads.
REVOKE SELECT (paystack_secret_key, flutterwave_secret_key)
ON public.landlord_payment_settings
FROM anon, authenticated;

-- 6) Reduce executable surface for SECURITY DEFINER role helper functions.
DO $$
BEGIN
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) FROM anon, authenticated;
  END IF;
  IF to_regprocedure('public.get_user_role(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
  END IF;
  IF to_regprocedure('public.get_profile_role(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_profile_role(uuid) FROM anon;
  END IF;
END $$;

-- 7) Restrict realtime.messages subscriptions to user-scoped topics.
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
      EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages';
      EXECUTE 'DROP POLICY IF EXISTS "Users can read own realtime topics" ON realtime.messages';
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
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;
END $$;
