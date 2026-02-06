-- Allow tenants to view recurring bills configured by their property owner
-- Recurring bills can be scoped to a tenant, a property, or global (null property_id + null tenant_id)

CREATE POLICY "Tenants can view recurring bills for their property"
ON public.recurring_bills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants t
    JOIN public.properties p ON p.id = t.property_id
    WHERE t.tenant_user_id = auth.uid()
      AND p.user_id = recurring_bills.user_id
      AND (
        recurring_bills.tenant_id = t.id
        OR (recurring_bills.tenant_id IS NULL AND recurring_bills.property_id = t.property_id)
        OR (recurring_bills.tenant_id IS NULL AND recurring_bills.property_id IS NULL)
      )
  )
);
