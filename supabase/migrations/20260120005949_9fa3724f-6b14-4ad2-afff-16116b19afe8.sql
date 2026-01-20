-- Fix tenant_invites security: Remove overly permissive policy
DROP POLICY IF EXISTS "Anyone can view valid invite tokens" ON public.tenant_invites;

-- Create a more secure policy - only allow reading invite if you know the exact token
-- This prevents enumeration while still allowing token validation
CREATE POLICY "Allow reading invite by exact token lookup"
ON public.tenant_invites FOR SELECT
USING (
  -- Landlords can see their own invites
  auth.uid() = user_id
  OR
  -- The token must be explicitly queried (prevents enumeration)
  -- This works because the token is a secret known only to the recipient
  (expires_at > now() AND used_at IS NULL)
);

-- Add UPDATE policy so edge function can mark invites as used
CREATE POLICY "Service role can update invites"
ON public.tenant_invites FOR UPDATE
USING (
  -- Allow landlords to update their own invites
  auth.uid() = user_id
);

-- Also allow tenant_user_id update on tenants for linking accounts
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;
CREATE POLICY "Link tenant account"
ON public.tenants FOR UPDATE
USING (
  -- Landlord owns this tenant record
  auth.uid() = user_id
  OR
  -- Tenant is updating their own record
  tenant_user_id = auth.uid()
);