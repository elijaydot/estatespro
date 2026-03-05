
-- ============================================
-- FIX: Create security definer functions to break circular RLS chains
-- The problem: properties policies query tenants, tenants policies query properties = infinite recursion
-- ============================================

-- Function: Get property IDs belonging to user's companies (avoids querying properties table in RLS)
CREATE OR REPLACE FUNCTION public.get_company_property_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id FROM public.properties p
  WHERE p.company_id IN (SELECT id FROM public.companies WHERE owner_id = _user_id)
$$;

-- Function: Get tenant's property_id (avoids querying tenants table in properties RLS)
CREATE OR REPLACE FUNCTION public.get_tenant_property_id(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT property_id FROM public.tenants WHERE tenant_user_id = _user_id AND property_id IS NOT NULL
$$;

-- Function: Get tenant's unit_id (avoids querying tenants table in units RLS)
CREATE OR REPLACE FUNCTION public.get_tenant_unit_id(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT unit_id FROM public.tenants WHERE tenant_user_id = _user_id AND unit_id IS NOT NULL
$$;

-- Function: Get tenant's id by user_id (for invoices/payments/maintenance lookups)
CREATE OR REPLACE FUNCTION public.get_tenant_id_by_user(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE tenant_user_id = _user_id
$$;

-- Function: Get user's current role from profiles (avoids self-ref in profiles UPDATE)
CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================
-- Now rebuild ALL policies using these functions to break every cycle
-- ============================================

-- === PROPERTIES ===
DROP POLICY IF EXISTS "Landlords manage company properties" ON public.properties;
DROP POLICY IF EXISTS "PMs view assigned properties" ON public.properties;
DROP POLICY IF EXISTS "PMs update assigned properties" ON public.properties;
DROP POLICY IF EXISTS "Tenants view their property" ON public.properties;
DROP POLICY IF EXISTS "Users create properties" ON public.properties;

CREATE POLICY "Landlords manage company properties" ON public.properties FOR ALL TO authenticated
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "PMs view assigned properties" ON public.properties FOR SELECT TO authenticated
  USING (is_approved_pm(auth.uid(), id));

CREATE POLICY "PMs update assigned properties" ON public.properties FOR UPDATE TO authenticated
  USING (is_approved_pm(auth.uid(), id));

-- FIXED: Use security definer function instead of querying tenants directly
CREATE POLICY "Tenants view their property" ON public.properties FOR SELECT TO authenticated
  USING (id IN (SELECT get_tenant_property_id(auth.uid())));

CREATE POLICY "Users create properties" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- === UNITS ===
DROP POLICY IF EXISTS "Landlords manage company units" ON public.units;
DROP POLICY IF EXISTS "PMs manage assigned units" ON public.units;
DROP POLICY IF EXISTS "Tenants view their unit" ON public.units;
DROP POLICY IF EXISTS "Users create units" ON public.units;

-- FIXED: Use security definer function instead of querying properties (which queries tenants)
CREATE POLICY "Landlords manage company units" ON public.units FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned units" ON public.units FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

-- FIXED: Use security definer function
CREATE POLICY "Tenants view their unit" ON public.units FOR SELECT TO authenticated
  USING (id IN (SELECT get_tenant_unit_id(auth.uid())));

CREATE POLICY "Users create units" ON public.units FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- === TENANTS ===
DROP POLICY IF EXISTS "Landlords manage company tenants" ON public.tenants;
DROP POLICY IF EXISTS "PMs manage assigned tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants view own profile" ON public.tenants;
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;
DROP POLICY IF EXISTS "Users create tenants" ON public.tenants;

-- FIXED: Use security definer function instead of querying properties
CREATE POLICY "Landlords manage company tenants" ON public.tenants FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned tenants" ON public.tenants FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own profile" ON public.tenants FOR SELECT TO authenticated
  USING (tenant_user_id = auth.uid());

CREATE POLICY "Link tenant account" ON public.tenants FOR UPDATE TO authenticated
  USING (tenant_user_id = auth.uid())
  WITH CHECK (tenant_user_id = auth.uid());

CREATE POLICY "Users create tenants" ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- === LEASES ===
DROP POLICY IF EXISTS "Landlords manage company leases" ON public.leases;
DROP POLICY IF EXISTS "PMs manage assigned leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants view own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants sign own leases" ON public.leases;
DROP POLICY IF EXISTS "Users create leases" ON public.leases;

CREATE POLICY "Landlords manage company leases" ON public.leases FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned leases" ON public.leases FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

-- FIXED: Use security definer function
CREATE POLICY "Tenants view own leases" ON public.leases FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Tenants sign own leases" ON public.leases FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Users create leases" ON public.leases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- === INVOICES ===
DROP POLICY IF EXISTS "Landlords manage company invoices" ON public.invoices;
DROP POLICY IF EXISTS "PMs manage assigned invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenants view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users create invoices" ON public.invoices;

CREATE POLICY "Landlords manage company invoices" ON public.invoices FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned invoices" ON public.invoices FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Users create invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- === MAINTENANCE_REQUESTS ===
DROP POLICY IF EXISTS "Landlords manage company maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "PMs manage assigned maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants view own maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants create maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users create maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users manage own maintenance" ON public.maintenance_requests;

CREATE POLICY "Landlords manage company maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own maintenance" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Tenants create maintenance" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Users create maintenance" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- === PAYMENTS ===
DROP POLICY IF EXISTS "Users manage own payments" ON public.payments;
DROP POLICY IF EXISTS "Landlords view company payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants view own payments" ON public.payments;

CREATE POLICY "Users manage own payments" ON public.payments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FIXED: Use security definer functions to avoid properties→tenants→properties chain
CREATE POLICY "Landlords view company payments" ON public.payments FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT t.id FROM public.tenants t 
    WHERE t.property_id IN (SELECT get_company_property_ids(auth.uid()))
  ));

CREATE POLICY "Tenants view own payments" ON public.payments FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

-- === MESSAGES ===
DROP POLICY IF EXISTS "Users view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users create messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients update messages" ON public.messages;
DROP POLICY IF EXISTS "Senders delete messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants view their messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants send messages" ON public.messages;

CREATE POLICY "Users view own messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR auth.uid() = user_id);

CREATE POLICY "Users create messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients update messages" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Senders delete messages" ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- FIXED: Use security definer
CREATE POLICY "Tenants view their messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM (SELECT get_tenant_id_by_user(auth.uid()) AS tid) x 
    WHERE x.tid::text = messages.sender_id::text OR x.tid::text = messages.recipient_id::text));

CREATE POLICY "Tenants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM (SELECT get_tenant_id_by_user(auth.uid()) AS tid) x 
    WHERE x.tid::text = messages.sender_id::text));

-- === PROFILES (fix self-referencing UPDATE) ===
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Company owners view member profiles" ON public.profiles;
DROP POLICY IF EXISTS "PMs view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Company owners view member profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id IN (SELECT cm.user_id FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE c.owner_id = auth.uid()));

CREATE POLICY "PMs view tenant profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id IN (SELECT t.tenant_user_id FROM tenants t WHERE t.tenant_user_id IS NOT NULL AND is_approved_pm(auth.uid(), t.property_id)));

CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- FIXED: Use security definer function instead of self-referencing subquery
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (role = get_profile_role(auth.uid()));

CREATE POLICY "Prevent profile deletion" ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- === RECURRING BILLS ===
DROP POLICY IF EXISTS "Users manage own recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Tenants view recurring bills" ON public.recurring_bills;

CREATE POLICY "Users manage own recurring bills" ON public.recurring_bills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FIXED: Use security definer functions
CREATE POLICY "Tenants view recurring bills" ON public.recurring_bills FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid()))
    OR (tenant_id IS NULL AND property_id IN (SELECT get_tenant_property_id(auth.uid())))
    OR (tenant_id IS NULL AND property_id IS NULL AND user_id IN (
      SELECT t.user_id FROM tenants t WHERE t.tenant_user_id = auth.uid()
    )));
