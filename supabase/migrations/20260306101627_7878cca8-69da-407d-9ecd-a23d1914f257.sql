
-- ============================================================
-- FIX: Convert ALL policies from RESTRICTIVE to PERMISSIVE
-- Root cause: every policy was created with RESTRICTIVE (AND logic)
-- meaning ALL policies must pass. We need PERMISSIVE (OR logic).
-- ============================================================

-- =================== PROPERTIES ===================
DROP POLICY IF EXISTS "Landlords manage company properties" ON public.properties;
DROP POLICY IF EXISTS "PMs update assigned properties" ON public.properties;
DROP POLICY IF EXISTS "PMs view assigned properties" ON public.properties;
DROP POLICY IF EXISTS "Tenants view their property" ON public.properties;
DROP POLICY IF EXISTS "Users create properties" ON public.properties;

CREATE POLICY "Landlords manage company properties" ON public.properties FOR ALL TO authenticated
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "PMs view assigned properties" ON public.properties FOR SELECT TO authenticated
  USING (is_approved_pm(auth.uid(), id));

CREATE POLICY "PMs update assigned properties" ON public.properties FOR UPDATE TO authenticated
  USING (is_approved_pm(auth.uid(), id));

CREATE POLICY "Tenants view their property" ON public.properties FOR SELECT TO authenticated
  USING (id IN (SELECT get_tenant_property_id(auth.uid())));

CREATE POLICY "Users create properties" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =================== UNITS ===================
DROP POLICY IF EXISTS "Landlords manage company units" ON public.units;
DROP POLICY IF EXISTS "PMs manage assigned units" ON public.units;
DROP POLICY IF EXISTS "Tenants view their unit" ON public.units;
DROP POLICY IF EXISTS "Users create units" ON public.units;

CREATE POLICY "Landlords manage company units" ON public.units FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned units" ON public.units FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view their unit" ON public.units FOR SELECT TO authenticated
  USING (id IN (SELECT get_tenant_unit_id(auth.uid())));

CREATE POLICY "Users create units" ON public.units FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =================== TENANTS ===================
DROP POLICY IF EXISTS "Landlords manage company tenants" ON public.tenants;
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;
DROP POLICY IF EXISTS "PMs manage assigned tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants view own profile" ON public.tenants;
DROP POLICY IF EXISTS "Users create tenants" ON public.tenants;

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

-- =================== LEASES ===================
DROP POLICY IF EXISTS "Landlords manage company leases" ON public.leases;
DROP POLICY IF EXISTS "PMs manage assigned leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants sign own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants view own leases" ON public.leases;
DROP POLICY IF EXISTS "Users create leases" ON public.leases;

CREATE POLICY "Landlords manage company leases" ON public.leases FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

CREATE POLICY "PMs manage assigned leases" ON public.leases FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own leases" ON public.leases FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Tenants sign own leases" ON public.leases FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

CREATE POLICY "Users create leases" ON public.leases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =================== INVOICES ===================
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

-- =================== PAYMENTS ===================
DROP POLICY IF EXISTS "Landlords view company payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users manage own payments" ON public.payments;

CREATE POLICY "Users manage own payments" ON public.payments FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Landlords view company payments" ON public.payments FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT t.id FROM tenants t WHERE t.property_id IN (SELECT get_company_property_ids(auth.uid()))
  ));

CREATE POLICY "Tenants view own payments" ON public.payments FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_tenant_id_by_user(auth.uid())));

-- =================== MAINTENANCE_REQUESTS ===================
DROP POLICY IF EXISTS "Landlords manage company maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "PMs manage assigned maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants create maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants view own maintenance" ON public.maintenance_requests;
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

CREATE POLICY "Users manage own maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================== MESSAGES ===================
DROP POLICY IF EXISTS "Recipients update messages" ON public.messages;
DROP POLICY IF EXISTS "Senders delete messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants send messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users create messages" ON public.messages;
DROP POLICY IF EXISTS "Users view own messages" ON public.messages;

CREATE POLICY "Users view own messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR auth.uid() = user_id);

CREATE POLICY "Users create messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Tenants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM (SELECT get_tenant_id_by_user(auth.uid()) AS tid) x
    WHERE x.tid::text = messages.sender_id::text
  ));

CREATE POLICY "Tenants view their messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM (SELECT get_tenant_id_by_user(auth.uid()) AS tid) x
    WHERE x.tid::text = messages.sender_id::text OR x.tid::text = messages.recipient_id::text
  ));

CREATE POLICY "Recipients update messages" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

CREATE POLICY "Senders delete messages" ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- =================== PROFILES ===================
DROP POLICY IF EXISTS "Company owners view member profiles" ON public.profiles;
DROP POLICY IF EXISTS "PMs view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (role = get_profile_role(auth.uid()));

CREATE POLICY "Company owners view member profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT cm.user_id FROM company_members cm
    JOIN companies c ON c.id = cm.company_id
    WHERE c.owner_id = auth.uid()
  ));

CREATE POLICY "PMs view tenant profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT t.tenant_user_id FROM tenants t
    WHERE t.tenant_user_id IS NOT NULL AND is_approved_pm(auth.uid(), t.property_id)
  ));

CREATE POLICY "Prevent profile deletion" ON public.profiles FOR DELETE TO authenticated
  USING (false);

-- =================== COMPANIES ===================
DROP POLICY IF EXISTS "Authenticated view companies" ON public.companies;
DROP POLICY IF EXISTS "Owners manage companies" ON public.companies;

CREATE POLICY "Authenticated view companies" ON public.companies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners manage companies" ON public.companies FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- =================== COMPANY_MEMBERS ===================
DROP POLICY IF EXISTS "Company owners manage members" ON public.company_members;
DROP POLICY IF EXISTS "Users apply to companies" ON public.company_members;
DROP POLICY IF EXISTS "Users view own membership" ON public.company_members;

CREATE POLICY "Company owners manage members" ON public.company_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid()));

CREATE POLICY "Users view own membership" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users apply to companies" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- =================== PM_INVITES ===================
DROP POLICY IF EXISTS "Company owners manage PM invites" ON public.pm_invites;
DROP POLICY IF EXISTS "Read valid PM invites" ON public.pm_invites;

CREATE POLICY "Company owners manage PM invites" ON public.pm_invites FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Read valid PM invites" ON public.pm_invites FOR SELECT TO authenticated
  USING (expires_at > now() AND used_at IS NULL);

-- =================== NOTIFICATIONS ===================
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;

CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================== COMPANY_SETTINGS ===================
DROP POLICY IF EXISTS "Users manage own company settings" ON public.company_settings;

CREATE POLICY "Users manage own company settings" ON public.company_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================== APP_SETTINGS ===================
DROP POLICY IF EXISTS "Users manage own app settings" ON public.app_settings;

CREATE POLICY "Users manage own app settings" ON public.app_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================== REPORTS ===================
DROP POLICY IF EXISTS "Users manage own reports" ON public.reports;

CREATE POLICY "Users manage own reports" ON public.reports FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================== RECURRING_BILLS ===================
DROP POLICY IF EXISTS "Users manage own recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Tenants view recurring bills" ON public.recurring_bills;

CREATE POLICY "Users manage own recurring bills" ON public.recurring_bills FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Landlords can also manage recurring bills for their company properties
CREATE POLICY "Landlords manage company recurring bills" ON public.recurring_bills FOR ALL TO authenticated
  USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
  WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

-- PMs can manage recurring bills for assigned properties
CREATE POLICY "PMs manage assigned recurring bills" ON public.recurring_bills FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

-- Tenants can view bills: targeted to them, targeted to their property, or global (no property/tenant)
CREATE POLICY "Tenants view recurring bills" ON public.recurring_bills FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT get_tenant_id_by_user(auth.uid()))
    OR (tenant_id IS NULL AND property_id IN (SELECT get_tenant_property_id(auth.uid())))
    OR (tenant_id IS NULL AND property_id IS NULL AND user_id IN (
      SELECT t.user_id FROM tenants t WHERE t.tenant_user_id = auth.uid()
    ))
  );

-- =================== TENANT_INVITES ===================
DROP POLICY IF EXISTS "Allow marking invite as used" ON public.tenant_invites;
DROP POLICY IF EXISTS "Users manage own invites" ON public.tenant_invites;

CREATE POLICY "Users manage own invites" ON public.tenant_invites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow marking invite as used" ON public.tenant_invites FOR UPDATE TO authenticated
  USING (token IS NOT NULL AND expires_at > now() AND used_at IS NULL)
  WITH CHECK (used_at IS NOT NULL);

-- =================== LEASE_ATTACHMENTS ===================
DROP POLICY IF EXISTS "Users manage own lease attachments" ON public.lease_attachments;

CREATE POLICY "Users manage own lease attachments" ON public.lease_attachments FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================== LEASE_TEMPLATES ===================
DROP POLICY IF EXISTS "Users manage own lease templates" ON public.lease_templates;

CREATE POLICY "Users manage own lease templates" ON public.lease_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================== USER_ROLES ===================
DROP POLICY IF EXISTS "System insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =================== PROPERTY_MANAGER_ASSIGNMENTS ===================
DROP POLICY IF EXISTS "Company owners manage assignments" ON public.property_manager_assignments;
DROP POLICY IF EXISTS "PMs view their assignments" ON public.property_manager_assignments;

CREATE POLICY "Company owners manage assignments" ON public.property_manager_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = property_manager_assignments.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = property_manager_assignments.company_id AND c.owner_id = auth.uid()));

CREATE POLICY "PMs view their assignments" ON public.property_manager_assignments FOR SELECT TO authenticated
  USING (manager_id = auth.uid());
