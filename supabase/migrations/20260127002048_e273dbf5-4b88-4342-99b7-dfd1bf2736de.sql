-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS public.validate_invite_token(text);

-- Recreate with tenant info included (bypasses RLS with SECURITY DEFINER)
CREATE FUNCTION public.validate_invite_token(lookup_token text)
RETURNS TABLE(
  id uuid, 
  tenant_id uuid, 
  email text, 
  expires_at timestamp with time zone, 
  used_at timestamp with time zone,
  created_at timestamp with time zone,
  tenant_name text,
  tenant_email text,
  tenant_phone text,
  tenant_property_id uuid,
  tenant_unit_id uuid
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
    ti.created_at,
    t.name as tenant_name,
    t.email as tenant_email,
    t.phone as tenant_phone,
    t.property_id as tenant_property_id,
    t.unit_id as tenant_unit_id
  FROM public.tenant_invites ti
  LEFT JOIN public.tenants t ON t.id = ti.tenant_id
  WHERE ti.token = lookup_token
    AND ti.expires_at > now()
    AND ti.used_at IS NULL;
$$;

-- Allow anonymous users to mark invites as used (needed during signup)
DROP POLICY IF EXISTS "Service role can update invites" ON public.tenant_invites;

CREATE POLICY "Allow marking invite as used with valid token"
ON public.tenant_invites
FOR UPDATE
USING (
  token IS NOT NULL 
  AND expires_at > now() 
  AND used_at IS NULL
)
WITH CHECK (used_at IS NOT NULL);

-- Allow linking tenant to user during signup (when user just registered)
DROP POLICY IF EXISTS "Allow linking tenant during signup" ON public.tenants;

CREATE POLICY "Allow linking tenant during signup"
ON public.tenants
FOR UPDATE
USING (tenant_user_id IS NULL)
WITH CHECK (tenant_user_id IS NOT NULL);

-- Create storage bucket for property/unit/tenant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property images
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;

CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own property images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own property images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Add image columns to properties, units, and tenants tables
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add accent_color to app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#f59e0b';