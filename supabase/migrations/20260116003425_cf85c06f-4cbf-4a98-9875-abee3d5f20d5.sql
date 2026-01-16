-- Create lease_attachments table for document attachments
CREATE TABLE public.lease_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lease_attachments
ALTER TABLE public.lease_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for lease_attachments
CREATE POLICY "Users can view their own lease attachments"
ON public.lease_attachments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create lease attachments"
ON public.lease_attachments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lease attachments"
ON public.lease_attachments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lease attachments"
ON public.lease_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_lease_attachments_updated_at
BEFORE UPDATE ON public.lease_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for lease attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-attachments', 'lease-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lease-attachments bucket
CREATE POLICY "Users can upload their own lease attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lease-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own lease attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'lease-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own lease attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'lease-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add tenant_user_id column to tenants table for linking tenant accounts
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_user_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_user_id ON public.tenants(tenant_user_id);

-- Update leases RLS to allow tenants to view their own leases
CREATE POLICY "Tenants can view their own leases"
ON public.leases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_id AND t.tenant_user_id = auth.uid()
  )
);

-- Allow tenants to update leases (for signing)
CREATE POLICY "Tenants can sign their own leases"
ON public.leases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_id AND t.tenant_user_id = auth.uid()
  )
);

-- Update tenants RLS to allow tenants to view their own profile
CREATE POLICY "Tenants can view their own tenant profile"
ON public.tenants FOR SELECT
USING (tenant_user_id = auth.uid());

-- Update units RLS to allow tenants to view their assigned unit
CREATE POLICY "Tenants can view their assigned unit"
ON public.units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.unit_id = id AND t.tenant_user_id = auth.uid()
  )
);

-- Update properties RLS to allow tenants to view their property
CREATE POLICY "Tenants can view their property"
ON public.properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.property_id = id AND t.tenant_user_id = auth.uid()
  )
);

-- Update invoices RLS to allow tenants to view their invoices
CREATE POLICY "Tenants can view their own invoices"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_id AND t.tenant_user_id = auth.uid()
  )
);

-- Update maintenance_requests RLS for tenants
CREATE POLICY "Tenants can view their maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_id AND t.tenant_user_id = auth.uid()
  )
);

CREATE POLICY "Tenants can create maintenance requests"
ON public.maintenance_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_id AND t.tenant_user_id = auth.uid()
  )
);

-- Update messages RLS for tenant access
CREATE POLICY "Tenants can view their messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.tenant_user_id = auth.uid() AND (t.id::text = sender_id::text OR t.id::text = recipient_id::text)
  )
);

-- Allow tenants to upload signatures
CREATE POLICY "Tenants can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tenants can view signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable pg_cron and pg_net extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;