import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  activeTenants: number;
  monthlyRevenue: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
  overduePayments: number;
  overduePaymentsCount: number;
  maintenanceRequests: number;
  maintenanceInProgress: number;
  upcomingRenewals: number;
  shortletConversionRate: number;
  shortletAcceptanceRate: number;
  shortletAvgTimeToPayHours: number;
  shortletTotalBookings: number;
}

type BookingMetricRow = {
  id: string;
  guest_response_status: string | null;
  payment_status: string | null;
  created_at: string;
};

type PaymentMetricRow = {
  amount: number;
  status: string | null;
  created_at: string;
  booking_id: string | null;
};

type RecentPaymentRow = {
  id: string;
  amount: number;
  created_at: string;
  tenants?: { name?: string } | null;
};

type RecentMaintenanceRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type RecentInvoiceRow = {
  id: string;
  invoice_number: string;
  created_at: string;
  tenants?: { name?: string } | null;
};

type UpcomingRenewalRow = {
  id: string;
  name: string;
  lease_end_date: string | null;
  units?: { unit_number?: string } | null;
  properties?: { name?: string } | null;
};

export function useDashboardStats() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['dashboard-stats', activeCompanyId],
    queryFn: async (): Promise<DashboardStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let propertiesQuery = supabase.from('properties').select('id, total_units, occupied_units, company_id');
      if (activeCompanyId) {
        propertiesQuery = propertiesQuery.eq('company_id', activeCompanyId);
      }

      const { data: propertiesData, error: propertiesError } = await propertiesQuery;
      if (propertiesError) throw propertiesError;

      const propertyIds = (propertiesData || []).map((property) => property.id);

      if (propertyIds.length === 0) {
        return {
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          occupancyRate: 0,
          activeTenants: 0,
          monthlyRevenue: 0,
          pendingPayments: 0,
          pendingPaymentsCount: 0,
          overduePayments: 0,
          overduePaymentsCount: 0,
          maintenanceRequests: 0,
          maintenanceInProgress: 0,
          upcomingRenewals: 0,
          shortletConversionRate: 0,
          shortletAcceptanceRate: 0,
          shortletAvgTimeToPayHours: 0,
          shortletTotalBookings: 0,
        };
      }

      // Fetch scoped data in parallel
      const [
        unitsRes,
        tenantsRes,
        bookingsRes,
        invoicesRes,
        maintenanceRes,
      ] = await Promise.all([
        supabase.from('units').select('id, status').in('property_id', propertyIds),
        supabase.from('tenants').select('id, status, lease_end_date').in('property_id', propertyIds),
        supabase.from('bookings').select('id, status, payment_status, created_at, guest_response_status').in('property_id', propertyIds),
        supabase.from('invoices').select('id, amount, paid_amount, status, due_date').in('property_id', propertyIds),
        supabase.from('maintenance_requests').select('id, status').in('property_id', propertyIds),
      ]);

      if (unitsRes.error) throw unitsRes.error;
      if (tenantsRes.error) throw tenantsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;

      const invoiceIds = (invoicesRes.data || []).map((invoice) => invoice.id);
      const paymentsResScoped = invoiceIds.length > 0
        ? await supabase.from('payments').select('id, amount, status, created_at, booking_id').in('invoice_id', invoiceIds)
        : { data: [], error: null };

      if (paymentsResScoped.error) throw paymentsResScoped.error;

      const properties = propertiesData || [];
      const units = unitsRes.data || [];
      const tenants = tenantsRes.data || [];
      const bookings = bookingsRes.data || [];
      const invoices = invoicesRes.data || [];
      const payments = paymentsResScoped.data || [];
      const maintenance = maintenanceRes.data || [];

      // Calculate stats
      const totalProperties = properties.length;
      const totalUnits = units.length;
      const occupiedUnits = units.filter(u => u.status === 'occupied').length;
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
      const activeTenants = tenants.filter(t => t.status === 'active').length;

      // Revenue from completed payments this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyPayments = payments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return p.status === 'completed' && paymentDate >= startOfMonth;
      });
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      // Pending invoices
      const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'partial');
      const pendingPayments = pendingInvoices.reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount)), 0);
      const pendingPaymentsCount = pendingInvoices.length;

      // Overdue invoices
      const today = new Date().toISOString().split('T')[0];
      const overdueInvoices = invoices.filter(i => 
        (i.status === 'pending' || i.status === 'partial') && i.due_date < today
      );
      const overduePayments = overdueInvoices.reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount)), 0);
      const overduePaymentsCount = overdueInvoices.length;

      // Maintenance
      const maintenanceRequests = maintenance.length;
      const maintenanceInProgress = maintenance.filter(m => m.status === 'in_progress').length;

      // Upcoming renewals (leases ending in next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const upcomingRenewals = tenants.filter(t => {
        if (!t.lease_end_date || t.status !== 'active') return false;
        const leaseEnd = new Date(t.lease_end_date);
        return leaseEnd >= now && leaseEnd <= thirtyDaysFromNow;
      }).length;

      // Shortlet metrics
      const shortletTotalBookings = bookings.length;
      const bookingRows = bookings as BookingMetricRow[];
      const paymentRows = payments as PaymentMetricRow[];
      const shortletAcceptedCount = bookingRows.filter((b) => b.guest_response_status === 'accepted').length;
      const shortletPaidCount = bookingRows.filter((b) => b.payment_status === 'paid').length;

      const shortletAcceptanceRate = shortletTotalBookings > 0
        ? Math.round((shortletAcceptedCount / shortletTotalBookings) * 100)
        : 0;

      const shortletConversionRate = shortletTotalBookings > 0
        ? Math.round((shortletPaidCount / shortletTotalBookings) * 100)
        : 0;

      const paymentByBookingId = new Map<string, Date>();
      paymentRows
        .filter((p) => p.status === 'completed' && p.booking_id)
        .forEach((p) => {
          const bookingId = p.booking_id as string;
          const paymentDate = new Date(p.created_at);
          const existing = paymentByBookingId.get(bookingId);
          if (!existing || paymentDate < existing) {
            paymentByBookingId.set(bookingId, paymentDate);
          }
        });

      const timeToPayHours: number[] = [];
      bookingRows.forEach((b) => {
        const firstPaymentDate = paymentByBookingId.get(b.id);
        if (!firstPaymentDate) return;
        const bookingCreated = new Date(b.created_at);
        const diffMs = firstPaymentDate.getTime() - bookingCreated.getTime();
        if (diffMs >= 0) {
          timeToPayHours.push(diffMs / (1000 * 60 * 60));
        }
      });

      const shortletAvgTimeToPayHours = timeToPayHours.length > 0
        ? Math.round((timeToPayHours.reduce((sum, h) => sum + h, 0) / timeToPayHours.length) * 10) / 10
        : 0;

      return {
        totalProperties,
        totalUnits,
        occupiedUnits,
        occupancyRate,
        activeTenants,
        monthlyRevenue,
        pendingPayments,
        pendingPaymentsCount,
        overduePayments,
        overduePaymentsCount,
        maintenanceRequests,
        maintenanceInProgress,
        upcomingRenewals,
        shortletConversionRate,
        shortletAcceptanceRate,
        shortletAvgTimeToPayHours,
        shortletTotalBookings,
      };
    },
  });
}

export function useRecentActivity() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['recent-activity', activeCompanyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let propertiesQuery = supabase.from('properties').select('id, company_id');
      if (activeCompanyId) {
        propertiesQuery = propertiesQuery.eq('company_id', activeCompanyId);
      }

      const { data: scopedProperties, error: scopedPropertiesError } = await propertiesQuery;
      if (scopedPropertiesError) throw scopedPropertiesError;

      const propertyIds = (scopedProperties || []).map((property) => property.id);
      if (propertyIds.length === 0) return [];

      const { data: scopedTenants } = await supabase
        .from('tenants')
        .select('id')
        .in('property_id', propertyIds);
      const tenantIds = (scopedTenants || []).map((tenant) => tenant.id);

      const { data: scopedInvoices } = await supabase
        .from('invoices')
        .select('id')
        .in('property_id', propertyIds);
      const invoiceIds = (scopedInvoices || []).map((invoice) => invoice.id);

      let paymentsData: RecentPaymentRow[] = [];
      if (invoiceIds.length > 0) {
        const { data, error } = await supabase
          .from('payments')
          .select('id, amount, created_at, tenants:tenant_id(name)')
          .in('invoice_id', invoiceIds)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        paymentsData = (data || []) as RecentPaymentRow[];
      }

      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select('id, title, status, created_at, updated_at')
        .in('property_id', propertyIds)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (maintenanceError) throw maintenanceError;

      let invoicesData: RecentInvoiceRow[] = [];
      if (tenantIds.length > 0) {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, created_at, tenants:tenant_id(name)')
          .in('property_id', propertyIds)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        invoicesData = (data || []) as RecentInvoiceRow[];
      }

      const activities: Array<{
        id: string;
        type: 'payment' | 'maintenance' | 'invoice';
        title: string;
        description: string;
        timestamp: string;
      }> = [];

      // Add payments
      paymentsData.forEach((payment) => {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: 'Payment Received',
          description: `${payment.tenants?.name || 'Unknown tenant'} made a payment`,
          timestamp: payment.created_at,
        });
      });

      // Add maintenance updates
      ((maintenanceData || []) as RecentMaintenanceRow[]).forEach((maintenanceItem) => {
        activities.push({
          id: `maintenance-${maintenanceItem.id}`,
          type: 'maintenance',
          title: maintenanceItem.status === 'completed' ? 'Maintenance Completed' : 'Maintenance Update',
          description: maintenanceItem.title,
          timestamp: maintenanceItem.updated_at || maintenanceItem.created_at,
        });
      });

      // Add invoices
      invoicesData.forEach((invoice) => {
        activities.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          title: 'Invoice Created',
          description: `Invoice #${invoice.invoice_number} for ${invoice.tenants?.name || 'Unknown tenant'}`,
          timestamp: invoice.created_at,
        });
      });

      // Sort by timestamp and return top 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
  });
}

export function useUpcomingRenewals() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['upcoming-renewals', activeCompanyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      let query = supabase
        .from('tenants')
        .select('id, name, lease_end_date, units:unit_id(unit_number), properties:property_id(name, company_id)')
        .eq('status', 'active')
        .gte('lease_end_date', now.toISOString().split('T')[0])
        .lte('lease_end_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('lease_end_date', { ascending: true })
        .limit(10);

      if (activeCompanyId) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as UpcomingRenewalRow[] | null)?.map((t) => {
        const unit = t.units;
        const property = t.properties;
        const daysRemaining = Math.ceil(
          (new Date(t.lease_end_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: t.id,
          tenantName: t.name,
          unitNumber: unit?.unit_number || 'N/A',
          propertyName: property?.name || 'N/A',
          leaseEnd: t.lease_end_date,
          daysRemaining,
        };
      }) || [];
    },
  });
}

export function useRevenueData() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['revenue-chart-data', activeCompanyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let propertiesQuery = supabase.from('properties').select('id, company_id');
      if (activeCompanyId) {
        propertiesQuery = propertiesQuery.eq('company_id', activeCompanyId);
      }

      const { data: scopedProperties, error: scopedPropertiesError } = await propertiesQuery;
      if (scopedPropertiesError) throw scopedPropertiesError;

      const propertyIds = (scopedProperties || []).map((property) => property.id);
      if (propertyIds.length === 0) return [];

      const { data: scopedInvoices, error: scopedInvoicesError } = await supabase
        .from('invoices')
        .select('id')
        .in('property_id', propertyIds);

      if (scopedInvoicesError) throw scopedInvoicesError;

      const invoiceIds = (scopedInvoices || []).map((invoice) => invoice.id);
      if (invoiceIds.length === 0) return [];

      // Get payments from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at, status')
        .in('invoice_id', invoiceIds)
        .gte('created_at', sixMonthsAgo.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, number> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
        monthlyData[key] = 0;
      }

      // Aggregate payments
      data?.forEach(p => {
        const date = new Date(p.created_at);
        const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
        if (monthlyData[key] !== undefined) {
          monthlyData[key] += Number(p.amount);
        }
      });

      return Object.entries(monthlyData).map(([month, revenue]) => ({
        month: month.split(' ')[0], // Just the month name
        revenue,
      }));
    },
  });
}

export function useOccupancyData() {
  return useQuery({
    queryKey: ['occupancy-chart-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('units')
        .select('status');

      if (error) throw error;

      const statusCounts: Record<string, number> = {
        occupied: 0,
        vacant: 0,
        maintenance: 0,
      };

      data?.forEach(u => {
        const status = u.status || 'vacant';
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        } else {
          statusCounts['vacant']++;
        }
      });

      return [
        { name: 'Occupied', value: statusCounts.occupied, fill: 'hsl(var(--success))' },
        { name: 'Vacant', value: statusCounts.vacant, fill: 'hsl(var(--warning))' },
        { name: 'Maintenance', value: statusCounts.maintenance, fill: 'hsl(var(--muted))' },
      ];
    },
  });
}
