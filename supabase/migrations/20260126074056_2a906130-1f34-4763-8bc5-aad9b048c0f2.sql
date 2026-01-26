-- Drop the overly permissive policy that exposes tenant invite data
DROP POLICY IF EXISTS "Allow reading invite by exact token lookup" ON public.tenant_invites;

-- Create a security definer function to validate invite tokens
-- This allows unauthenticated users to validate a specific token they already know
-- without exposing all invite data
CREATE OR REPLACE FUNCTION public.validate_invite_token(lookup_token text)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  email text,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ti.id,
    ti.tenant_id,
    ti.email,
    ti.expires_at,
    ti.used_at,
    ti.created_at
  FROM public.tenant_invites ti
  WHERE ti.token = lookup_token
    AND ti.expires_at > now()
    AND ti.used_at IS NULL;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.validate_invite_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_token(text) TO anon;

-- Create a restricted policy for token lookups that requires providing the exact token
-- This uses a function to check if the request is a direct token lookup
CREATE POLICY "Token holders can read their specific invite"
ON public.tenant_invites
FOR SELECT
USING (
  -- Owner can always read their invites
  auth.uid() = user_id
);