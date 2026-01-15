-- Create leases table for lease management
CREATE TABLE public.leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  property_id UUID NOT NULL,
  unit_id UUID NOT NULL,
  lease_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  security_deposit NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  terms TEXT,
  special_conditions TEXT,
  -- Signature tracking
  landlord_signature_url TEXT,
  landlord_signed_at TIMESTAMP WITH TIME ZONE,
  tenant_signature_url TEXT,
  tenant_signed_at TIMESTAMP WITH TIME ZONE,
  -- Document
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on leases
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- RLS policies for leases
CREATE POLICY "Users can view their own leases" ON public.leases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create leases" ON public.leases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leases" ON public.leases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leases" ON public.leases FOR DELETE USING (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Create lease_templates table for reusable lease templates
CREATE TABLE public.lease_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lease_templates
ALTER TABLE public.lease_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for lease_templates
CREATE POLICY "Users can view their own templates" ON public.lease_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create templates" ON public.lease_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.lease_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.lease_templates FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at on leases
CREATE TRIGGER update_leases_updated_at
BEFORE UPDATE ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on lease_templates
CREATE TRIGGER update_lease_templates_updated_at
BEFORE UPDATE ON public.lease_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for lease documents and signatures
INSERT INTO storage.buckets (id, name, public) VALUES ('lease-documents', 'lease-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- Storage policies for lease documents
CREATE POLICY "Users can view their own lease documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own lease documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own lease documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own lease documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for signatures
CREATE POLICY "Users can view their own signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own signatures"
ON storage.objects FOR UPDATE
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own signatures"
ON storage.objects FOR DELETE
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);