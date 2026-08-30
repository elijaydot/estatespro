-- Unconditional Platform Super Admin RLS Policies across all PM, CRM, and SaaS tables
-- Guarantees that the Super Admin has full, unhindered "Bird's Eye View" visibility
-- across all properties, units, tenants, leases, invoices, payments, maintenance, bills, bookings, and alerts.

CREATE OR REPLACE FUNCTION public.ensure_super_admin_rls_policy(_tbl text, _pol text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = _tbl) THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', _pol, _tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_platform_super_admin(auth.uid())) WITH CHECK (public.is_platform_super_admin(auth.uid()));', _pol, _tbl);
  END IF;
END;
$$;

-- Apply to all core PM tables
SELECT public.ensure_super_admin_rls_policy('properties', 'Super admins manage all properties');
SELECT public.ensure_super_admin_rls_policy('units', 'Super admins manage all units');
SELECT public.ensure_super_admin_rls_policy('tenants', 'Super admins manage all tenants');
SELECT public.ensure_super_admin_rls_policy('leases', 'Super admins manage all leases');
SELECT public.ensure_super_admin_rls_policy('invoices', 'Super admins manage all invoices');
SELECT public.ensure_super_admin_rls_policy('payments', 'Super admins manage all payments');
SELECT public.ensure_super_admin_rls_policy('maintenance_requests', 'Super admins manage all maintenance requests');
SELECT public.ensure_super_admin_rls_policy('recurring_bills', 'Super admins manage all recurring bills');
SELECT public.ensure_super_admin_rls_policy('bookings', 'Super admins manage all bookings');
SELECT public.ensure_super_admin_rls_policy('broadcasts', 'Super admins manage all broadcasts');
SELECT public.ensure_super_admin_rls_policy('broadcast_announcements', 'Super admins manage all broadcast announcements');
SELECT public.ensure_super_admin_rls_policy('operational_alerts', 'Super admins manage all operational alerts');
SELECT public.ensure_super_admin_rls_policy('vendors', 'Super admins manage all vendors');
SELECT public.ensure_super_admin_rls_policy('vendor_payments', 'Super admins manage all vendor payments');
SELECT public.ensure_super_admin_rls_policy('vendor_documents', 'Super admins manage all vendor documents');
SELECT public.ensure_super_admin_rls_policy('tenant_invites', 'Super admins manage all tenant invites');
SELECT public.ensure_super_admin_rls_policy('landlord_payment_settings', 'Super admins manage all landlord payment settings');
SELECT public.ensure_super_admin_rls_policy('documents', 'Super admins manage all documents');

DROP FUNCTION IF EXISTS public.ensure_super_admin_rls_policy(text, text);
