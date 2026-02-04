-- Add RLS policy for tenants to send messages
CREATE POLICY "Tenants can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM tenants t
  WHERE t.tenant_user_id = auth.uid() 
  AND t.id::text = messages.sender_id::text
));