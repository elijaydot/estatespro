
-- ============================================================
-- FIX: Convert ALL RLS policies from RESTRICTIVE to PERMISSIVE
-- Root cause: all policies were created as RESTRICTIVE (AND logic)
-- They need to be PERMISSIVE (OR logic) so any matching policy grants access
-- ============================================================

-- ==================== PROPERTIES ====================
DROP POLICY IF EXISTS "Landlords can manage company properties" ON public.properties;
DROP POLICY IF EXISTS "Landlords can view company properties" ON public.properties;
DROP POLICY IF EXISTS "Assigned PMs can view properties" ON public.properties;
DROP POLICY IF EXISTS "Assigned PMs can update properties" ON public.properties;
DROP POLICY IF EXISTS "Tenants can view their assigned property" ON public.properties;
DROP POLICY IF EXISTS "Tenants can view their property" ON public.properties;
DROP POLICY IF EXISTS "Users can create properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;

CREATE POLICY "Landlords can manage company properties" ON public.properties FOR ALL
USING (company_id IN (SELECT get_user_company_ids(auth.uid())))
WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Assigned PMs can view properties" ON public.properties FOR SELECT
USING (is_approved_pm(auth.uid(), id));

CREATE POLICY "Assigned PMs can update properties" ON public.properties FOR UPDATE
USING (is_approved_pm(auth.uid(), id));

CREATE POLICY "Tenants can view their assigned property" ON public.properties FOR SELECT
USING (id IN (SELECT tenants.property_id FROM tenants WHERE tenants.tenant_user_id = auth.uid()));

CREATE POLICY "Users can create properties" ON public.properties FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ==================== UNITS ====================
DROP POLICY IF EXISTS "Assigned PMs can manage units" ON public.units;
DROP POLICY IF EXISTS "Assigned PMs can view units" ON public.units;
DROP POLICY IF EXISTS "Landlords can view company units" ON public.units;
DROP POLICY IF EXISTS "Tenants can view their assigned unit" ON public.units;
DROP POLICY IF EXISTS "Users can create units" ON public.units;
DROP POLICY IF EXISTS "Users can delete their own units" ON public.units;
DROP POLICY IF EXISTS "Users can update their own units" ON public.units;
DROP POLICY IF EXISTS "Users can view their own units" ON public.units;

CREATE POLICY "Landlords can manage company units" ON public.units FOR ALL
USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "Assigned PMs can manage units" ON public.units FOR ALL
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants can view their assigned unit" ON public.units FOR SELECT
USING (id IN (SELECT tenants.unit_id FROM tenants WHERE tenants.tenant_user_id = auth.uid()));

CREATE POLICY "Users can create units" ON public.units FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ==================== TENANTS ====================
DROP POLICY IF EXISTS "Assigned PMs can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Assigned PMs can view tenants" ON public.tenants;
DROP POLICY IF EXISTS "Landlords can view company tenants" ON public.tenants;
DROP POLICY IF EXISTS "Link tenant account" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can view their own profile" ON public.tenants;
DROP POLICY IF EXISTS "Users can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own tenants" ON public.tenants;

CREATE POLICY "Landlords can manage company tenants" ON public.tenants FOR ALL
USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "Assigned PMs can manage tenants" ON public.tenants FOR ALL
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants can view their own profile" ON public.tenants FOR SELECT
USING (tenant_user_id = auth.uid());

CREATE POLICY "Link tenant account" ON public.tenants FOR UPDATE
USING (tenant_user_id = auth.uid())
WITH CHECK (tenant_user_id = auth.uid());

CREATE POLICY "Users can create tenants" ON public.tenants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ==================== LEASES ====================
DROP POLICY IF EXISTS "Landlords can view company leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can sign their own leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can create leases" ON public.leases;
DROP POLICY IF EXISTS "Users can delete their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can update their own leases" ON public.leases;
DROP POLICY IF EXISTS "Users can view their own leases" ON public.leases;

CREATE POLICY "Landlords can manage company leases" ON public.leases FOR ALL
USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "Assigned PMs can manage leases" ON public.leases FOR ALL
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants can view their own leases" ON public.leases FOR SELECT
USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = leases.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Tenants can sign their own leases" ON public.leases FOR UPDATE
USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = leases.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Users can create leases" ON public.leases FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ==================== INVOICES ====================
DROP POLICY IF EXISTS "Landlords can view company invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenants can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;

CREATE POLICY "Landlords can manage company invoices" ON public.invoices FOR ALL
USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "Assigned PMs can manage invoices" ON public.invoices FOR ALL
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants can view their own invoices" ON public.invoices FOR SELECT
USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = invoices.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Users can create invoices" ON public.invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ==================== PAYMENTS ====================
DROP POLICY IF EXISTS "Landlords can view company payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update payment notes only" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

CREATE POLICY "Landlords can view company payments" ON public.payments FOR SELECT
USING (tenant_id IN (SELECT t.id FROM tenants t WHERE t.property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid())))));

CREATE POLICY "Tenants can view their own payments" ON public.payments FOR SELECT
USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = payments.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Users can create payments" ON public.payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- ==================== MAINTENANCE_REQUESTS ====================
DROP POLICY IF EXISTS "Landlords can view company maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can view their maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can delete their own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can update their own maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can view their own maintenance requests" ON public.maintenance_requests;

CREATE POLICY "Landlords can manage company maintenance" ON public.maintenance_requests FOR ALL
USING (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))))
WITH CHECK (property_id IN (SELECT p.id FROM properties p WHERE p.company_id IN (SELECT get_user_company_ids(auth.uid()))));

CREATE POLICY "Assigned PMs can manage maintenance" ON public.maintenance_requests FOR ALL
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

CREATE POLICY "Tenants can create maintenance requests" ON public.maintenance_requests FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM tenants t WHERE t.id = maintenance_requests.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Tenants can view their maintenance requests" ON public.maintenance_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM tenants t WHERE t.id = maintenance_requests.tenant_id AND t.tenant_user_id = auth.uid()));

CREATE POLICY "Users can create maintenance requests" ON public.maintenance_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own maintenance" ON public.maintenance_requests FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================== MESSAGES ====================
DROP POLICY IF EXISTS "Recipients can update messages (mark as read)" ON public.messages;
DROP POLICY IF EXISTS "Senders can delete their messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Tenants can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;

CREATE POLICY "Users can view messages they sent or received" ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR auth.uid() = user_id);

CREATE POLICY "Users can create messages" ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update messages" ON public.messages FOR UPDATE
USING (auth.uid() = recipient_id);

CREATE POLICY "Senders can delete their messages" ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

CREATE POLICY "Tenants can send messages" ON public.messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM tenants t WHERE t.tenant_user_id = auth.uid() AND t.id::text = messages.sender_id::text));

CREATE POLICY "Tenants can view their messages" ON public.messages FOR SELECT
USING (EXISTS (SELECT 1 FROM tenants t WHERE t.tenant_user_id = auth.uid() AND (t.id::text = messages.sender_id::text OR t.id::text = messages.recipient_id::text)));

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Company owners can view member profiles" ON public.profiles;
DROP POLICY IF EXISTS "PMs can view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Company owners can view member profiles" ON public.profiles FOR SELECT
USING (user_id IN (SELECT cm.user_id FROM company_members cm JOIN companies c ON c.id = cm.company_id WHERE c.owner_id = auth.uid()));

CREATE POLICY "PMs can view tenant profiles" ON public.profiles FOR SELECT
USING (user_id IN (SELECT t.tenant_user_id FROM tenants t WHERE t.tenant_user_id IS NOT NULL AND is_approved_pm(auth.uid(), t.property_id)));

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- RESTRICTIVE: prevent role self-modification
CREATE POLICY "Prevent role self-modification" ON public.profiles AS RESTRICTIVE FOR UPDATE
USING (true)
WITH CHECK (role = (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()));

CREATE POLICY "Prevent profile deletion" ON public.profiles FOR DELETE
USING (false);

-- ==================== COMPANY_MEMBERS ====================
DROP POLICY IF EXISTS "Company owners can manage members" ON public.company_members;
DROP POLICY IF EXISTS "Users can apply to companies" ON public.company_members;
DROP POLICY IF EXISTS "Users can view own membership" ON public.company_members;

CREATE POLICY "Company owners can manage members" ON public.company_members FOR ALL
USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid()));

CREATE POLICY "Users can apply to companies" ON public.company_members FOR INSERT
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users can view own membership" ON public.company_members FOR SELECT
USING (user_id = auth.uid());

-- ==================== PM_INVITES ====================
DROP POLICY IF EXISTS "Anyone can read valid PM invite by token" ON public.pm_invites;
DROP POLICY IF EXISTS "Company owners can manage PM invites" ON public.pm_invites;

CREATE POLICY "Anyone can read valid PM invite by token" ON public.pm_invites FOR SELECT
USING (expires_at > now() AND used_at IS NULL);

CREATE POLICY "Company owners can manage PM invites" ON public.pm_invites FOR ALL
USING (invited_by = auth.uid())
WITH CHECK (invited_by = auth.uid());

-- ==================== PROPERTY_MANAGER_ASSIGNMENTS ====================
DROP POLICY IF EXISTS "Company owners can manage assignments" ON public.property_manager_assignments;
DROP POLICY IF EXISTS "PMs can view their assignments" ON public.property_manager_assignments;

CREATE POLICY "Company owners can manage assignments" ON public.property_manager_assignments FOR ALL
USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = property_manager_assignments.company_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = property_manager_assignments.company_id AND c.owner_id = auth.uid()));

CREATE POLICY "PMs can view their assignments" ON public.property_manager_assignments FOR SELECT
USING (manager_id = auth.uid());

-- ==================== NOTIFICATIONS ====================
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================== COMPANY_SETTINGS ====================
DROP POLICY IF EXISTS "Users can insert their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can view their own company settings" ON public.company_settings;

CREATE POLICY "Users can manage own company settings" ON public.company_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================== APP_SETTINGS ====================
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.app_settings;

CREATE POLICY "Users can manage own app settings" ON public.app_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================== REPORTS ====================
DROP POLICY IF EXISTS "Users can create their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;

CREATE POLICY "Users can manage own reports" ON public.reports FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================== RECURRING_BILLS ====================
DROP POLICY IF EXISTS "Tenants can view recurring bills for their property" ON public.recurring_bills;
DROP POLICY IF EXISTS "Users can create their own recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Users can delete their own recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Users can update their own recurring bills" ON public.recurring_bills;
DROP POLICY IF EXISTS "Users can view their own recurring bills" ON public.recurring_bills;

CREATE POLICY "Users can manage own recurring bills" ON public.recurring_bills FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tenants can view recurring bills" ON public.recurring_bills FOR SELECT
USING (EXISTS (SELECT 1 FROM tenants t JOIN properties p ON p.id = t.property_id WHERE t.tenant_user_id = auth.uid() AND p.user_id = recurring_bills.user_id AND (recurring_bills.tenant_id = t.id OR (recurring_bills.tenant_id IS NULL AND recurring_bills.property_id = t.property_id) OR (recurring_bills.tenant_id IS NULL AND recurring_bills.property_id IS NULL))));

-- ==================== TENANT_INVITES ====================
DROP POLICY IF EXISTS "Allow marking invite as used with valid token" ON public.tenant_invites;
DROP POLICY IF EXISTS "Service role can update invites" ON public.tenant_invites;
DROP POLICY IF EXISTS "Token holders can read their specific invite" ON public.tenant_invites;
DROP POLICY IF EXISTS "Users can create invites" ON public.tenant_invites;
DROP POLICY IF EXISTS "Users can delete their own invites" ON public.tenant_invites;
DROP POLICY IF EXISTS "Users can view their own invites" ON public.tenant_invites;

CREATE POLICY "Users can manage own invites" ON public.tenant_invites FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow marking invite as used" ON public.tenant_invites FOR UPDATE
USING (token IS NOT NULL AND expires_at > now() AND used_at IS NULL)
WITH CHECK (used_at IS NOT NULL);

-- ==================== LEASE_ATTACHMENTS ====================
DROP POLICY IF EXISTS "Users can create lease attachments" ON public.lease_attachments;
DROP POLICY IF EXISTS "Users can delete their own lease attachments" ON public.lease_attachments;
DROP POLICY IF EXISTS "Users can update their own lease attachments" ON public.lease_attachments;
DROP POLICY IF EXISTS "Users can view their own lease attachments" ON public.lease_attachments;

CREATE POLICY "Users can manage own lease attachments" ON public.lease_attachments FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================== LEASE_TEMPLATES ====================
DROP POLICY IF EXISTS "Users can create templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.lease_templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON public.lease_templates;

CREATE POLICY "Users can manage own lease templates" ON public.lease_templates FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==================== USER_ROLES ====================
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert roles" ON public.user_roles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ==================== COMPANIES ====================
DROP POLICY IF EXISTS "Authenticated users can view company names" ON public.companies;
DROP POLICY IF EXISTS "Owners can manage their companies" ON public.companies;

CREATE POLICY "Authenticated users can view company names" ON public.companies FOR SELECT
USING (true);

CREATE POLICY "Owners can manage their companies" ON public.companies FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ==================== RECREATE AUTH TRIGGER ====================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
