import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch all data in parallel
      const [
        propertiesRes,
        unitsRes,
        tenantsRes,
        bookingsRes,
        invoicesRes,
        paymentsRes,
        maintenanceRes,
      ] = await Promise.all([
        supabase.from('properties').select('id, total_units, occupied_units'),
        supabase.from('units').select('id, status'),
        supabase.from('tenants').select('id, status, lease_end_date'),
        supabase.from('bookings').select('id, status, payment_status, created_at, guest_response_status'),
        supabase.from('invoices').select('id, amount, paid_amount, status, due_date'),
        supabase.from('payments').select('id, amount, status, created_at, booking_id'),
        supabase.from('maintenance_requests').select('id, status'),
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (unitsRes.error) throw unitsRes.error;
      if (tenantsRes.error) throw tenantsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (maintenanceRes.error) throw maintenanceRes.error;

      const properties = propertiesRes.data || [];
      const units = unitsRes.data || [];
      const tenants = tenantsRes.data || [];
      const bookings = bookingsRes.data || [];
      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
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
      const shortletAcceptedCount = bookings.filter((b: any) => b.guest_response_status === 'accepted').length;
      const shortletPaidCount = bookings.filter((b: any) => b.payment_status === 'paid').length;

      const shortletAcceptanceRate = shortletTotalBookings > 0
        ? Math.round((shortletAcceptedCount / shortletTotalBookings) * 100)
        : 0;

      const shortletConversionRate = shortletTotalBookings > 0
        ? Math.round((shortletPaidCount / shortletTotalBookings) * 100)
        : 0;

      const paymentByBookingId = new Map<string, Date>();
      payments
        .filter((p: any) => p.status === 'completed' && p.booking_id)
        .forEach((p: any) => {
          const bookingId = p.booking_id as string;
          const paymentDate = new Date(p.created_at);
          const existing = paymentByBookingId.get(bookingId);
          if (!existing || paymentDate < existing) {
            paymentByBookingId.set(bookingId, paymentDate);
          }
        });

      const timeToPayHours: number[] = [];
      bookings.forEach((b: any) => {
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
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch recent payments, maintenance requests, and invoices
      const [paymentsRes, maintenanceRes, invoicesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, created_at, tenants:tenant_id(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('maintenance_requests')
          .select('id, title, status, created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('invoices')
          .select('id, invoice_number, status, created_at, tenants:tenant_id(name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const activities: Array<{
        id: string;
        type: 'payment' | 'maintenance' | 'invoice';
        title: string;
        description: string;
        timestamp: string;
      }> = [];

      // Add payments
      if (paymentsRes.data) {
        paymentsRes.data.forEach(p => {
          const tenant = (p as any).tenants;
          activities.push({
            id: `payment-${p.id}`,
            type: 'payment',
            title: 'Payment Received',
            description: `${tenant?.name || 'Unknown tenant'} made a payment`,
            timestamp: p.created_at,
          });
        });
      }

      // Add maintenance updates
      if (maintenanceRes.data) {
        maintenanceRes.data.forEach(m => {
          activities.push({
            id: `maintenance-${m.id}`,
            type: 'maintenance',
            title: m.status === 'completed' ? 'Maintenance Completed' : 'Maintenance Update',
            description: m.title,
            timestamp: m.updated_at || m.created_at,
          });
        });
      }

      // Add invoices
      if (invoicesRes.data) {
        invoicesRes.data.forEach(i => {
          const tenant = (i as any).tenants;
          activities.push({
            id: `invoice-${i.id}`,
            type: 'invoice',
            title: 'Invoice Created',
            description: `Invoice #${i.invoice_number} for ${tenant?.name || 'Unknown tenant'}`,
            timestamp: i.created_at,
          });
        });
      }

      // Sort by timestamp and return top 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
  });
}

export function useUpcomingRenewals() {
  return useQuery({
    queryKey: ['upcoming-renewals'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, lease_end_date, units:unit_id(unit_number), properties:property_id(name)')
        .eq('status', 'active')
        .gte('lease_end_date', now.toISOString().split('T')[0])
        .lte('lease_end_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('lease_end_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      return data?.map(t => {
        const unit = (t as any).units;
        const property = (t as any).properties;
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
  return useQuery({
    queryKey: ['revenue-chart-data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get payments from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const { data, error } = await supabase
        .from('payments')
        .select('amount, created_at, status')
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
