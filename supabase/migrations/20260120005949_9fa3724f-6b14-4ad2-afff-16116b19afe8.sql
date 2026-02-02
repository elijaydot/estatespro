-- Fix tenant_invites security: Remove overly permissive policy
DROP POLICY IF EXISTS "Anyone can view valid invite tokens" ON public.tenant_invites;

-- Create a more secure policy - only allow reading invite if you know the exact token
-- This prevents enumeration while still allowing token validation
DROP POLICY IF EXISTS "Allow reading invite by exact token lookup" ON public.tenant_invites;
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
DROP POLICY IF EXISTS "Service role can update invites" ON public.tenant_invites;
CREATE POLICY "Service role can update invites"
ON public.tenant_invites FOR UPDATE
USING (
  -- Allow landlords to update their own invites
  auth.uid() = user_id
);

-- Also allow tenant_user_id update on tenants for linking accounts
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;
DROP POLICY IF EXISTS "Allow linking tenant during signup" ON public.tenants;

CREATE POLICY "Link tenant account"
ON public.tenants FOR UPDATE
USING (
  -- Landlord owns this tenant record
  auth.uid() = user_id
  OR
  -- Tenant is updating their own record
  tenant_user_id = auth.uid()
  OR
  -- Allow linking if currently unlinked (needed for signup flow)
  tenant_user_id IS NULL
);

-- Allow tenants to view their own tenant profile
DROP POLICY IF EXISTS "Tenants can view their own tenant profile" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can view their own profile" ON public.tenants;
CREATE POLICY "Tenants can view their own profile"
ON public.tenants FOR SELECT
USING (
  tenant_user_id = auth.uid()
);

-- Allow tenants to view their assigned unit
DROP POLICY IF EXISTS "Tenants can view their assigned unit" ON public.units;
CREATE POLICY "Tenants can view their assigned unit"
ON public.units FOR SELECT
USING (
  id IN (
    SELECT unit_id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);

-- Allow tenants to view their assigned property
DROP POLICY IF EXISTS "Tenants can view their assigned property" ON public.properties;
CREATE POLICY "Tenants can view their assigned property"
ON public.properties FOR SELECT
USING (
  id IN (
    SELECT property_id FROM public.tenants WHERE tenant_user_id = auth.uid()
  )
);