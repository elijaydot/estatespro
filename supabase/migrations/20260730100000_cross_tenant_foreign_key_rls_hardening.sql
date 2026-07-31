-- Prevent authenticated users from combining their own user_id with another
-- company's property, tenant, lease, or invoice foreign keys.

DROP POLICY IF EXISTS "Users create tenants" ON public.tenants;
CREATE POLICY "Users create tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND property_id IN (SELECT public.get_company_property_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Users create leases" ON public.leases;
CREATE POLICY "Users create leases"
ON public.leases FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND property_id IN (SELECT public.get_company_property_ids(auth.uid()))
  AND tenant_id IN (
    SELECT t.id FROM public.tenants t WHERE t.property_id = leases.property_id
  )
  AND unit_id IN (
    SELECT u.id FROM public.units u WHERE u.property_id = leases.property_id
  )
);

DROP POLICY IF EXISTS "Users create invoices" ON public.invoices;
CREATE POLICY "Users create invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND property_id IN (SELECT public.get_company_property_ids(auth.uid()))
  AND tenant_id IN (
    SELECT t.id FROM public.tenants t WHERE t.property_id = invoices.property_id
  )
  AND (
    unit_id IS NULL
    OR unit_id IN (SELECT u.id FROM public.units u WHERE u.property_id = invoices.property_id)
  )
);

DROP POLICY IF EXISTS "Users manage own payments" ON public.payments;
CREATE POLICY "Users manage own payments"
ON public.payments FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  AND tenant_id IN (
    SELECT t.id
    FROM public.tenants t
    WHERE t.property_id IN (SELECT public.get_company_property_ids(auth.uid()))
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.invoices i
    JOIN public.tenants t ON t.id = payments.tenant_id
    WHERE i.id = payments.invoice_id
      AND i.tenant_id = payments.tenant_id
      AND t.property_id IN (SELECT public.get_company_property_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Users create maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users manage own maintenance" ON public.maintenance_requests;
CREATE POLICY "Users manage own maintenance"
ON public.maintenance_requests FOR ALL TO authenticated
USING (
  auth.uid() = user_id
  AND property_id IN (SELECT public.get_company_property_ids(auth.uid()))
)
WITH CHECK (
  auth.uid() = user_id
  AND property_id IN (SELECT public.get_company_property_ids(auth.uid()))
  AND unit_id IN (
    SELECT u.id FROM public.units u WHERE u.property_id = maintenance_requests.property_id
  )
  AND (
    tenant_id IS NULL
    OR tenant_id IN (
      SELECT t.id FROM public.tenants t WHERE t.property_id = maintenance_requests.property_id
    )
  )
);

DROP POLICY IF EXISTS "Users can create lease attachments" ON public.lease_attachments;
CREATE POLICY "Users can create lease attachments"
ON public.lease_attachments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.leases l
    WHERE l.id = lease_attachments.lease_id
      AND (
        l.property_id IN (SELECT public.get_company_property_ids(auth.uid()))
        OR public.is_approved_pm(auth.uid(), l.property_id)
      )
  )
);

DROP POLICY IF EXISTS "Users create messages" ON public.messages;
CREATE POLICY "Users create messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND auth.uid() = user_id
  AND (
    property_id IS NULL
    OR property_id IN (SELECT public.get_company_property_ids(auth.uid()))
    OR property_id IN (SELECT public.get_tenant_property_id(auth.uid()))
    OR public.is_approved_pm(auth.uid(), property_id)
  )
);