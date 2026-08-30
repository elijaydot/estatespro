-- Unconditional Platform Super Admin RLS Policies across all PM, CRM, and SaaS tables
-- Guarantees that the Super Admin has full, unhindered "Bird's Eye View" visibility
-- across all properties, units, tenants, leases, invoices, payments, maintenance, bills, bookings, and alerts.

-- 1. PROPERTIES
DROP POLICY IF EXISTS "Super admins manage all properties" ON public.properties;
CREATE POLICY "Super admins manage all properties"
ON public.properties FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 2. UNITS
DROP POLICY IF EXISTS "Super admins manage all units" ON public.units;
CREATE POLICY "Super admins manage all units"
ON public.units FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 3. TENANTS
DROP POLICY IF EXISTS "Super admins manage all tenants" ON public.tenants;
CREATE POLICY "Super admins manage all tenants"
ON public.tenants FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 4. LEASES
DROP POLICY IF EXISTS "Super admins manage all leases" ON public.leases;
CREATE POLICY "Super admins manage all leases"
ON public.leases FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 5. INVOICES
DROP POLICY IF EXISTS "Super admins manage all invoices" ON public.invoices;
CREATE POLICY "Super admins manage all invoices"
ON public.invoices FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 6. PAYMENTS
DROP POLICY IF EXISTS "Super admins manage all payments" ON public.payments;
CREATE POLICY "Super admins manage all payments"
ON public.payments FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 7. MAINTENANCE REQUESTS
DROP POLICY IF EXISTS "Super admins manage all maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Super admins manage all maintenance requests"
ON public.maintenance_requests FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 8. RECURRING BILLS
DROP POLICY IF EXISTS "Super admins manage all recurring bills" ON public.recurring_bills;
CREATE POLICY "Super admins manage all recurring bills"
ON public.recurring_bills FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 9. BOOKINGS
DROP POLICY IF EXISTS "Super admins manage all bookings" ON public.bookings;
CREATE POLICY "Super admins manage all bookings"
ON public.bookings FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 10. DOCUMENTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Super admins manage all documents" ON public.documents;';
    EXECUTE 'CREATE POLICY "Super admins manage all documents" ON public.documents FOR ALL TO authenticated USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()));';
  END IF;
END $$;

-- 11. BROADCAST ANNOUNCEMENTS
DROP POLICY IF EXISTS "Super admins manage all broadcasts" ON public.broadcast_announcements;
CREATE POLICY "Super admins manage all broadcasts"
ON public.broadcast_announcements FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 12. OPERATIONAL ALERTS
DROP POLICY IF EXISTS "Super admins manage all operational alerts" ON public.operational_alerts;
CREATE POLICY "Super admins manage all operational alerts"
ON public.operational_alerts FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 13. VENDORS & VENDOR PAYMENTS
DROP POLICY IF EXISTS "Super admins manage all vendors" ON public.vendors;
CREATE POLICY "Super admins manage all vendors"
ON public.vendors FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins manage all vendor payments" ON public.vendor_payments;
CREATE POLICY "Super admins manage all vendor payments"
ON public.vendor_payments FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins manage all vendor documents" ON public.vendor_documents;
CREATE POLICY "Super admins manage all vendor documents"
ON public.vendor_documents FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- 14. TENANT INVITES & PAYMENT SETTINGS
DROP POLICY IF EXISTS "Super admins manage all tenant invites" ON public.tenant_invites;
CREATE POLICY "Super admins manage all tenant invites"
ON public.tenant_invites FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins manage all landlord payment settings" ON public.landlord_payment_settings;
CREATE POLICY "Super admins manage all landlord payment settings"
ON public.landlord_payment_settings FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));
