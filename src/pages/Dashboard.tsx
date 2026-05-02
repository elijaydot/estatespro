import { 
  Building2, 
  Home, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  Wrench,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { UpcomingRenewals } from '@/components/dashboard/UpcomingRenewals';
import { LeaseExpirationWidget } from '@/components/dashboard/LeaseExpirationWidget';
import { RentExpiryWidget } from '@/components/dashboard/RentExpiryWidget';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/contexts/SettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AIAssistant } from '@/components/dashboard/AIAssistant';
import { FinancialIntelligence } from '@/components/dashboard/FinancialIntelligence';
import { SmartSearchInsights } from '@/components/ai/SmartSearchInsights';
import { PredictiveAnalytics } from '@/components/ai/PredictiveAnalytics';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

function StatCard({ 
  title, value, subtitle, icon: Icon, iconColor, trend, href 
}: { 
  title: string; value: string; subtitle: string; icon: any; iconColor: string; trend?: 'up' | 'down' | 'neutral'; href?: string;
}) {
  const navigate = useNavigate();
  return (
    <div 
      className={cn(
        "group relative bg-card rounded-xl p-5 border border-border/60 hover:border-primary/20 transition-all duration-300 hover:shadow-md",
        href && "cursor-pointer"
      )}
      onClick={() => href && navigate(href)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tracking-tight">{value}</p>
          <p className={cn(
            "mt-1 text-xs font-medium",
            trend === 'up' && "text-success",
            trend === 'down' && "text-destructive",
            (!trend || trend === 'neutral') && "text-muted-foreground"
          )}>{subtitle}</p>
        </div>
        <div className={cn("shrink-0 p-2.5 rounded-lg", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {href && (
        <ArrowUpRight className="absolute top-4 right-4 h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { formatCurrency } = useSettings();

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back — here's your portfolio overview.
        </p>
      </div>

      {/* KPI Cards — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))
        ) : stats ? (
          <>
            <StatCard
              title="Properties"
              value={String(stats.totalProperties)}
              subtitle={`${stats.totalUnits} total units`}
              icon={Building2}
              iconColor="bg-primary/10 text-primary"
              href="/properties"
            />
            <StatCard
              title="Occupancy"
              value={`${stats.occupancyRate}%`}
              subtitle={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
              icon={Home}
              iconColor="bg-info/10 text-info"
              href="/units"
            />
            <StatCard
              title="Active Tenants"
              value={String(stats.activeTenants)}
              subtitle={`${stats.occupiedUnits} units occupied`}
              icon={Users}
              iconColor="bg-success/10 text-success"
              trend="up"
              href="/tenants"
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats.monthlyRevenue)}
              subtitle="This month"
              icon={DollarSign}
              iconColor="bg-accent/10 text-accent"
              trend="up"
              href="/payments"
            />
          </>
        ) : null}
      </div>

      {/* Shortlet KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))
        ) : stats ? (
          <>
            <StatCard
              title="Shortlet Conversion"
              value={`${stats.shortletConversionRate}%`}
              subtitle={`${stats.shortletTotalBookings} bookings total`}
              icon={TrendingUp}
              iconColor="bg-success/10 text-success"
              href="/reports"
            />
            <StatCard
              title="Shortlet Acceptance"
              value={`${stats.shortletAcceptanceRate}%`}
              subtitle="Guest acceptance rate"
              icon={Users}
              iconColor="bg-info/10 text-info"
              href="/reports"
            />
            <StatCard
              title="Avg Time To Pay"
              value={`${stats.shortletAvgTimeToPayHours}h`}
              subtitle="From booking to first payment"
              icon={DollarSign}
              iconColor="bg-warning/10 text-warning"
              href="/reports"
            />
          </>
        ) : null}
      </div>

      {/* Financial alerts — 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))
        ) : stats ? (
          <>
            <StatCard
              title="Pending Payments"
              value={formatCurrency(stats.pendingPayments)}
              subtitle={`${stats.pendingPaymentsCount} invoices pending`}
              icon={TrendingUp}
              iconColor="bg-warning/10 text-warning"
              href="/invoices"
            />
            <StatCard
              title="Overdue"
              value={formatCurrency(stats.overduePayments)}
              subtitle={`${stats.overduePaymentsCount} overdue invoices`}
              icon={AlertCircle}
              iconColor="bg-destructive/10 text-destructive"
              trend={stats.overduePaymentsCount > 0 ? 'down' : 'neutral'}
              href="/invoices"
            />
            <StatCard
              title="Maintenance"
              value={String(stats.maintenanceRequests)}
              subtitle={`${stats.maintenanceInProgress} in progress`}
              icon={Wrench}
              iconColor="bg-muted text-muted-foreground"
              href="/maintenance"
            />
            <StatCard
              title="Renewals"
              value={String(stats.upcomingRenewals)}
              subtitle="Next 30 days"
              icon={Calendar}
              iconColor="bg-secondary text-foreground"
              href="/leases"
            />
          </>
        ) : null}
      </div>

      {/* Charts — Revenue wider, Occupancy compact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-h-0">
          <RevenueChart />
        </div>
        <div className="min-h-0">
          <OccupancyChart />
        </div>
      </div>

      {/* Activity + Lease Expirations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivity />
        <LeaseExpirationWidget />
      </div>

      {/* Rent Alerts + Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RentExpiryWidget />
        <UpcomingRenewals />
      </div>

      {/* Smart Search & Insights */}
      <SmartSearchInsights />

      {/* Financial Intelligence */}
      <FinancialIntelligence />

      {/* Predictive Analytics */}
      <PredictiveAnalytics />

      <AIAssistant />
    </div>
  );
}
