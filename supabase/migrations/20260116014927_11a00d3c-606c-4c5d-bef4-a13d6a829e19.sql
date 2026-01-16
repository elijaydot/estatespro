-- Add image_url column to maintenance_requests for tenant photo uploads
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create tenant_invites table for the invite system
CREATE TABLE public.tenant_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable RLS on tenant_invites
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- Policies for tenant_invites
CREATE POLICY "Users can create invites" ON public.tenant_invites
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own invites" ON public.tenant_invites
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invites" ON public.tenant_invites
FOR DELETE USING (auth.uid() = user_id);

-- Anyone can check invite tokens for signup (no auth required)
CREATE POLICY "Anyone can view valid invite tokens" ON public.tenant_invites
FOR SELECT USING (expires_at > now() AND used_at IS NULL);

-- Create storage bucket for maintenance photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for maintenance photos
CREATE POLICY "Anyone can view maintenance photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'maintenance-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own maintenance photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);