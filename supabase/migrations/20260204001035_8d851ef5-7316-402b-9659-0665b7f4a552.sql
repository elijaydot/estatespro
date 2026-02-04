-- Add RLS policy for tenants to view their own payments
CREATE POLICY "Tenants can view their own payments" 
ON public.payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tenants t
  WHERE t.id = payments.tenant_id 
  AND t.tenant_user_id = auth.uid()
));