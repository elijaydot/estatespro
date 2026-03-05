
-- Fix properties: drop all RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Assigned PMs can update properties" ON public.properties;
DROP POLICY IF EXISTS "Assigned PMs can view properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can manage company properties" ON public.properties;
DROP POLICY IF EXISTS "Tenants can view their assigned property" ON public.properties;
DROP POLICY IF EXISTS "Users can create properties" ON public.properties;

CREATE POLICY "Landlords manage company properties" ON public.properties FOR ALL TO authenticated
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "PMs view assigned properties" ON public.properties FOR SELECT TO authenticated
  USING (is_approved_pm(auth.uid(), id));

CREATE POLICY "PMs update assigned properties" ON public.properties FOR UPDATE TO authenticated
  USING (is_approved_pm(auth.uid(), id));

CREATE POLICY "Tenants view their property" ON public.properties FOR SELECT TO authenticated
  USING (id IN (SELECT property_id FROM tenants WHERE tenant_user_id = auth.uid()));

CREATE POLICY "Users create properties" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix company_settings: recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can manage own company settings" ON public.company_settings;

CREATE POLICY "Users manage own company settings" ON public.company_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix units
DROP POLICY IF EXISTS "Assigned PMs can manage units" ON public.units;
DROP POLICY IF EXISTS "Landlords can manage company units" ON public.units;
DROP POLICY IF EXISTS "Tenants can view their assigned unit" ON public.units;
DROP POLICY IF EXISTS "Users can create units" ON public.units;

CREATE POLICY "Landlords manage company units" ON public.units FOR ALL TO authenticated
  USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
  WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "PMs manage assigned units" ON public.units FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view their unit" ON public.units FOR SELECT TO authenticated
  USING (id IN (SELECT unit_id FROM tenants WHERE tenant_user_id = auth.uid()));

CREATE POLICY "Users create units" ON public.units FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix tenants
DROP POLICY IF EXISTS "Assigned PMs can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can manage company tenants" ON public.tenants;
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can view their own profile" ON public.tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON public.tenants;

CREATE POLICY "Landlords manage company tenants" ON public.tenants FOR ALL TO authenticated
  USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
  WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

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

-- Fix leases
DROP POLICY IF EXISTS "Assigned PMs can manage leases" ON public.leases;
DROP POLICY IF EXISTS "Landlords can manage company leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can sign their own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can create leases" ON public.leases;

CREATE POLICY "Landlords manage company leases" ON public.leases FOR ALL TO authenticated
  USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
  WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "PMs manage assigned leases" ON public.leases FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own leases" ON public.leases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = leases.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Tenants sign own leases" ON public.leases FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = leases.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Users create leases" ON public.leases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix invoices
DROP POLICY IF EXISTS "Assigned PMs can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Landlords can manage company invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenants can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;

CREATE POLICY "Landlords manage company invoices" ON public.invoices FOR ALL TO authenticated
  USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
  WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "PMs manage assigned invoices" ON public.invoices FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = invoices.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Users create invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix maintenance_requests
DROP POLICY IF EXISTS "Assigned PMs can manage maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Landlords can manage company maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can view their maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can manage own maintenance" ON public.maintenance_requests;

CREATE POLICY "Landlords manage company maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
  WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "PMs manage assigned maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (is_approved_pm(auth.uid(), property_id))
  WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants view own maintenance" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = maintenance_requests.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Tenants create maintenance" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tenants t WHERE t.id = maintenance_requests.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Users create maintenance" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix remaining tables with RESTRICTIVE policies
DROP POLICY IF EXISTS "Users can manage own app settings" ON public.app_settings;
CREATE POLICY "Users manage own app settings" ON public.app_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own reports" ON public.reports;
CREATE POLICY "Users manage own reports" ON public.reports FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Tenants can view recurring bills" ON public.recurring_bills;
CREATE POLICY "Users manage own recurring bills" ON public.recurring_bills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tenants view recurring bills" ON public.recurring_bills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants t JOIN properties p ON p.id = t.property_id
    WHERE t.tenant_user_id = auth.uid() AND p.user_id = recurring_bills.user_id
    AND (recurring_bills.tenant_id = t.id OR (recurring_bills.tenant_id IS NULL AND recurring_bills.property_id = t.property_id)
    OR (recurring_bills.tenant_id IS NULL AND recurring_bills.property_id IS NULL))));

DROP POLICY IF EXISTS "Users can manage own lease attachments" ON public.lease_attachments;
CREATE POLICY "Users manage own lease attachments" ON public.lease_attachments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own lease templates" ON public.lease_templates;
CREATE POLICY "Users manage own lease templates" ON public.lease_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fix payments
DROP POLICY IF EXISTS "Landlords can view company payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

CREATE POLICY "Users manage own payments" ON public.payments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Landlords view company payments" ON public.payments FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT t.id FROM tenants t WHERE t.property_id IN
    (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid())))));
CREATE POLICY "Tenants view own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = payments.tenant_id AND t.tenant_user_id = auth.uid()));

-- Fix messages
DROP POLICY IF EXISTS "Recipients can update messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can delete their messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;

CREATE POLICY "Users view own messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR auth.uid() = user_id);
CREATE POLICY "Users create messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipients update messages" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);
CREATE POLICY "Senders delete messages" ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
CREATE POLICY "Tenants view their messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenants t WHERE t.tenant_user_id = auth.uid()
    AND (t.id::text = messages.sender_id::text OR t.id::text = messages.recipient_id::text)));
CREATE POLICY "Tenants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tenants t WHERE t.tenant_user_id = auth.uid()
    AND t.id::text = messages.sender_id::text));

-- Fix profiles
DROP POLICY IF EXISTS "Company owners can view member profiles" ON public.profiles;
DROP POLICY IF EXISTS "PMs can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
DROP POLICY IF EXISTS "Prevent role self-modification" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Company owners view member profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id IN (SELECT cm.user_id FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE c.owner_id = auth.uid()));
CREATE POLICY "PMs view tenant profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id IN (SELECT t.tenant_user_id FROM tenants t WHERE t.tenant_user_id IS NOT NULL AND is_approved_pm(auth.uid(), t.property_id)));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (role = (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Prevent profile deletion" ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- Fix tenant_invites
DROP POLICY IF EXISTS "Allow marking invite as used" ON public.tenant_invites;
DROP POLICY IF EXISTS "Users can manage own invites" ON public.tenant_invites;

CREATE POLICY "Users manage own invites" ON public.tenant_invites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow marking invite as used" ON public.tenant_invites FOR UPDATE TO authenticated
  USING (token IS NOT NULL AND expires_at > now() AND used_at IS NULL)
  WITH CHECK (used_at IS NOT NULL);

-- Fix user_roles
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "System insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix company_members
DROP POLICY IF EXISTS "Company owners can manage members" ON public.company_members;
DROP POLICY IF EXISTS "Users can apply to companies" ON public.company_members;
DROP POLICY IF EXISTS "Users can view own membership" ON public.company_members;

CREATE POLICY "Company owners manage members" ON public.company_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "Users view own membership" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users apply to companies" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Fix pm_invites
DROP POLICY IF EXISTS "Anyone can read valid PM invite by token" ON public.pm_invites;
DROP POLICY IF EXISTS "Company owners can manage PM invites" ON public.pm_invites;

CREATE POLICY "Read valid PM invites" ON public.pm_invites FOR SELECT TO authenticated
  USING (expires_at > now() AND used_at IS NULL);
CREATE POLICY "Company owners manage PM invites" ON public.pm_invites FOR ALL TO authenticated
  USING (invited_by = auth.uid()) WITH CHECK (invited_by = auth.uid());

-- Fix companies
DROP POLICY IF EXISTS "Authenticated users can view company names" ON public.companies;
DROP POLICY IF EXISTS "Owners can manage their companies" ON public.companies;

CREATE POLICY "Authenticated view companies" ON public.companies FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Owners manage companies" ON public.companies FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Fix property_manager_assignments
DROP POLICY IF EXISTS "Company owners can manage assignments" ON public.property_manager_assignments;
DROP POLICY IF EXISTS "PMs can view their assignments" ON public.property_manager_assignments;

CREATE POLICY "Company owners manage assignments" ON public.property_manager_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = property_manager_assignments.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = property_manager_assignments.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "PMs view their assignments" ON public.property_manager_assignments FOR SELECT TO authenticated
  USING (manager_id = auth.uid());
