import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useTenantPortalData() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tenant_portal_data', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;

      // Get tenant data linked to this user
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          *,
          properties:property_id(id, name, address, city, state, zip_code, user_id),
          units:unit_id(id, unit_number, bedrooms, bathrooms, sqft, rent_amount)
        `)
        .eq('tenant_user_id', profile.user_id)
        .maybeSingle();

      if (tenantError) throw tenantError;
      if (!tenant) return null;

      // Get active lease for this tenant
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select(`
          *,
          properties:property_id(id, name, address, city, state, zip_code),
          units:unit_id(id, unit_number, bedrooms, bathrooms, sqft)
        `)
        .eq('tenant_id', tenant.id)
        .in('status', ['active', 'pending_signature'])
        .order('created_at', { ascending: false });

      if (leasesError) throw leasesError;

      const activeLease = leases?.find(l => l.status === 'active');
      const pendingLease = leases?.find(l => l.status === 'pending_signature');

      // Get invoices for this tenant
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('due_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Get maintenance requests for this tenant
      const { data: maintenanceRequests, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (maintenanceError) throw maintenanceError;

      // Get payments for this tenant
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          invoices:invoice_id(description, due_date)
        `)
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get recurring bills for this tenant - RLS handles visibility
      // Fetch all active bills the tenant can see, then filter client-side
      const { data: recurringBills, error: billsError } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('is_active', true);

      if (billsError) {
        console.error('Error fetching recurring bills:', billsError);
      }

      // Client-side filter: bills assigned to this tenant, or to their property (global), or global (no property)
      const filteredBills = (recurringBills || []).filter((bill: any) => 
        bill.tenant_id === tenant.id || 
        (bill.tenant_id === null && bill.property_id === tenant.property_id) ||
        (bill.tenant_id === null && bill.property_id === null)
      );

      const activeBills = filteredBills;
      const totalRecurringAmount = activeBills.reduce((sum: number, b: any) => sum + Number(b.amount), 0);

      // Calculate stats
      const pendingInvoices = invoices?.filter(i => i.status === 'pending') || [];
      const nextPayment = pendingInvoices[0];
      const openMaintenanceRequests = maintenanceRequests?.filter(m => m.status !== 'completed') || [];
      const completedMaintenanceRequests = maintenanceRequests?.filter(m => m.status === 'completed') || [];

      return {
        tenant,
        property: tenant.properties,
        unit: tenant.units,
        activeLease,
        pendingLease,
        currentLease: activeLease || pendingLease,
        invoices: invoices || [],
        pendingInvoices,
        nextPayment,
        payments: payments || [],
        maintenanceRequests: maintenanceRequests || [],
        openMaintenanceRequests,
        completedMaintenanceRequests,
        recurringBills: activeBills,
        totalRecurringAmount,
        stats: {
          balance: tenant.balance || 0,
          openMaintenance: openMaintenanceRequests.length,
          completedMaintenance: completedMaintenanceRequests.length,
          monthlyRent: tenant.monthly_rent || 0,
          totalMonthlyDue: (tenant.monthly_rent || 0) + totalRecurringAmount,
        }
      };
    },
    enabled: !!profile?.user_id,
  });
}
