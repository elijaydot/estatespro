
-- Fix invoices RLS to PERMISSIVE
DROP POLICY IF EXISTS "Landlords manage company invoices" ON public.invoices;
DROP POLICY IF EXISTS "PMs manage assigned invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenants view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users create invoices" ON public.invoices;

CREATE POLICY "Landlords manage company invoices"
ON public.invoices FOR ALL TO authenticated
USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned invoices"
ON public.invoices FOR ALL TO authenticated
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Users create invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix payments RLS to PERMISSIVE
DROP POLICY IF EXISTS "Landlords view company payments" ON public.payments;
DROP POLICY IF EXISTS "PMs view assigned payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users manage own payments" ON public.payments;

CREATE POLICY "Landlords view company payments"
ON public.payments FOR SELECT TO authenticated
USING (tenant_id IN (SELECT t.id FROM tenants t WHERE t.property_id IN (SELECT get_company_property_ids(auth.uid()))));

CREATE POLICY "PMs view assigned payments"
ON public.payments FOR SELECT TO authenticated
USING (tenant_id IN (SELECT t.id FROM tenants t WHERE is_approved_pm(auth.uid(), t.property_id)));

CREATE POLICY "Tenants view own payments"
ON public.payments FOR SELECT TO authenticated
USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Users manage own payments"
ON public.payments FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix tenants RLS to PERMISSIVE
DROP POLICY IF EXISTS "Landlords manage company tenants" ON public.tenants;
DROP POLICY IF EXISTS "PMs manage assigned tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants view own profile" ON public.tenants;
DROP POLICY IF EXISTS "Users create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;

CREATE POLICY "Landlords manage company tenants"
ON public.tenants FOR ALL TO authenticated
USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned tenants"
ON public.tenants FOR ALL TO authenticated
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own profile"
ON public.tenants FOR SELECT TO authenticated
USING (tenant_user_id = auth.uid());

CREATE POLICY "Link tenant account"
ON public.tenants FOR UPDATE TO authenticated
USING (tenant_user_id = auth.uid())
WITH CHECK (tenant_user_id = auth.uid());

CREATE POLICY "Users create tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
