
-- Fix recurring_bills: Drop all existing policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Landlords manage company recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "PMs manage assigned recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Tenants view recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Users manage own recurring bills" ON public.recurring_bills;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Landlords manage company recurring bills"
ON public.recurring_bills FOR ALL TO authenticated
USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned recurring bills"
ON public.recurring_bills FOR ALL TO authenticated
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view recurring bills"
ON public.recurring_bills FOR SELECT TO authenticated
USING (
  tenant_id IN (SELECT get_tenant_id_by_user(auth.uid()))
  OR (tenant_id IS NULL AND property_id IN (SELECT get_tenant_property_id(auth.uid())))
  OR (tenant_id IS NULL AND property_id IS NULL AND user_id IN (
    SELECT t.user_id FROM tenants t WHERE t.tenant_user_id = auth.uid()
  ))
);

CREATE POLICY "Users manage own recurring bills"
ON public.recurring_bills FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
