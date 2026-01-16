import { 
  Building2, 
  Home, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  Wrench,
  Calendar,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { UpcomingRenewals } from '@/components/dashboard/UpcomingRenewals';
import { LeaseExpirationWidget } from '@/components/dashboard/LeaseExpirationWidget';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { formatCurrency } = useSettings();

  const statCards = stats ? [
    {
      title: 'Total Properties',
      value: String(stats.totalProperties),
      change: `${stats.totalUnits} total units`,
      changeType: 'neutral' as const,
      icon: Building2,
      iconBg: 'bg-primary/10',
    },
    {
      title: 'Total Units',
      value: String(stats.totalUnits),
      change: `${stats.occupancyRate}% occupied`,
      changeType: 'neutral' as const,
      icon: Home,
      iconBg: 'bg-info/10',
    },
    {
      title: 'Active Tenants',
      value: String(stats.activeTenants),
      change: `${stats.occupiedUnits} units occupied`,
      changeType: 'positive' as const,
      icon: Users,
      iconBg: 'bg-success/10',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      change: 'This month',
      changeType: 'positive' as const,
      icon: DollarSign,
      iconBg: 'bg-accent/10',
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(stats.pendingPayments),
      change: `${stats.pendingPaymentsCount} invoices pending`,
      changeType: 'neutral' as const,
      icon: TrendingUp,
      iconBg: 'bg-warning/10',
    },
    {
      title: 'Overdue Payments',
      value: formatCurrency(stats.overduePayments),
      change: `${stats.overduePaymentsCount} overdue invoices`,
      changeType: stats.overduePaymentsCount > 0 ? 'negative' as const : 'neutral' as const,
      icon: AlertCircle,
      iconBg: 'bg-destructive/10',
    },
    {
      title: 'Maintenance Requests',
      value: String(stats.maintenanceRequests),
      change: `${stats.maintenanceInProgress} in progress`,
      changeType: 'neutral' as const,
      icon: Wrench,
      iconBg: 'bg-muted',
    },
    {
      title: 'Upcoming Renewals',
      value: String(stats.upcomingRenewals),
      change: 'Next 30 days',
      changeType: 'neutral' as const,
      icon: Calendar,
      iconBg: 'bg-secondary',
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your properties today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))
        ) : (
          statCards.map((stat, index) => (
            <div
              key={stat.title}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <StatCard {...stat} />
            </div>
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <OccupancyChart />
        </div>
      </div>

      {/* Activity & Renewals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <LeaseExpirationWidget />
      </div>

      {/* Additional Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingRenewals />
      </div>
    </div>
  );
}
