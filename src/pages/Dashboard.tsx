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
  Receipt,
  FileText,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function StatCard({ 
  title, value, subtitle, icon: Icon, iconColor, trend, href, className
}: { 
  title: string; value: string; subtitle: string; icon: LucideIcon; iconColor: string; trend?: 'up' | 'down' | 'neutral'; href?: string; className?: string;
}) {
  const navigate = useNavigate();
  return (
    <div 
      className={cn(
        "group relative bg-card rounded-xl p-5 border border-border/60 hover:border-primary/20 transition-all duration-300 hover:shadow-md",
        'hover:-translate-y-0.5',
        className,
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
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {href && (
        <ArrowUpRight className="absolute top-4 right-4 h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-[1600px]">
      <div className="md:hidden space-y-4 animate-fade-in">
        <div className="rounded-2xl border border-border/60 bg-card/95 p-4 card-shadow-md">
          <p className="text-sm font-semibold text-foreground">Welcome back {stats ? '' : ''}</p>
          <p className="text-xs text-muted-foreground mt-1">Here is your organization overview</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 card-shadow-md">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            <Button variant="secondary" className="h-auto py-3 flex-col gap-1 rounded-xl" onClick={() => navigate('/invoices?add=true')}>
              <Receipt className="h-4 w-4" />
              <span className="text-[11px]">Invoice</span>
            </Button>
            <Button variant="secondary" className="h-auto py-3 flex-col gap-1 rounded-xl" onClick={() => navigate('/tenants?add=true')}>
              <Users className="h-4 w-4" />
              <span className="text-[11px]">Customer</span>
            </Button>
            <Button variant="secondary" className="h-auto py-3 flex-col gap-1 rounded-xl" onClick={() => navigate('/maintenance')}>
              <FileText className="h-4 w-4" />
              <span className="text-[11px]">Expense</span>
            </Button>
            <Button variant="secondary" className="h-auto py-3 flex-col gap-1 rounded-xl" onClick={() => navigate('/reports')}>
              <TrendingUp className="h-4 w-4" />
              <span className="text-[11px]">Analytics</span>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 card-shadow-md">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Receivables Summary</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {isLoading || !stats ? '--' : formatCurrency(stats.pendingPayments + stats.overduePayments)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="font-semibold text-foreground mt-1">{isLoading || !stats ? '--' : formatCurrency(stats.pendingPayments)}</p>
            </div>
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="font-semibold text-foreground mt-1">{isLoading || !stats ? '--' : formatCurrency(stats.overduePayments)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="animate-fade-in hidden md:block">
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 sm:p-5 card-shadow-md overflow-hidden relative">
          <div className="absolute -top-16 -right-10 h-44 w-44 rounded-full bg-accent/20 blur-2xl" aria-hidden />
          <div className="absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                FishGate Command Center
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-1">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Welcome back. Your portfolio pulse is updated live.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/reports')}>
                Open Reports
              </Button>
              <Button size="sm" className="rounded-full gap-1.5" onClick={() => navigate('/messages')}>
                <WandSparkles className="h-3.5 w-3.5" />
                Team Pulse
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!isLoading && !stats && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-base font-semibold text-foreground">We could not load your portfolio stats</p>
            <p className="text-sm text-muted-foreground">Please refresh or continue with core operations from the sections below.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Dashboard
              </Button>
              <Button onClick={() => navigate('/reports')}>
                Open Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              className="animate-enter stagger-1"
              href="/properties"
            />
            <StatCard
              title="Occupancy"
              value={`${stats.occupancyRate}%`}
              subtitle={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
              icon={Home}
              iconColor="bg-info/10 text-info"
              className="animate-enter stagger-2"
              href="/units"
            />
            <StatCard
              title="Active Tenants"
              value={String(stats.activeTenants)}
              subtitle={`${stats.occupiedUnits} units occupied`}
              icon={Users}
              iconColor="bg-success/10 text-success"
              trend="up"
              className="animate-enter stagger-3"
              href="/tenants"
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats.monthlyRevenue)}
              subtitle="This month"
              icon={DollarSign}
              iconColor="bg-accent/10 text-accent"
              trend="up"
              className="animate-enter stagger-4"
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
              className="animate-enter stagger-1"
              href="/reports"
            />
            <StatCard
              title="Shortlet Acceptance"
              value={`${stats.shortletAcceptanceRate}%`}
              subtitle="Guest acceptance rate"
              icon={Users}
              iconColor="bg-info/10 text-info"
              className="animate-enter stagger-2"
              href="/reports"
            />
            <StatCard
              title="Avg Time To Pay"
              value={`${stats.shortletAvgTimeToPayHours}h`}
              subtitle="From booking to first payment"
              icon={DollarSign}
              iconColor="bg-warning/10 text-warning"
              className="animate-enter stagger-3"
              href="/reports"
            />
          </>
        ) : null}
      </div>

      {/* Financial alerts — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              className="animate-enter stagger-1"
              href="/invoices"
            />
            <StatCard
              title="Overdue"
              value={formatCurrency(stats.overduePayments)}
              subtitle={`${stats.overduePaymentsCount} overdue invoices`}
              icon={AlertCircle}
              iconColor="bg-destructive/10 text-destructive"
              trend={stats.overduePaymentsCount > 0 ? 'down' : 'neutral'}
              className="animate-enter stagger-2"
              href="/invoices"
            />
            <StatCard
              title="Maintenance"
              value={String(stats.maintenanceRequests)}
              subtitle={`${stats.maintenanceInProgress} in progress`}
              icon={Wrench}
              iconColor="bg-muted text-muted-foreground"
              className="animate-enter stagger-3"
              href="/maintenance"
            />
            <StatCard
              title="Renewals"
              value={String(stats.upcomingRenewals)}
              subtitle="Next 30 days"
              icon={Calendar}
              iconColor="bg-secondary text-foreground"
              className="animate-enter stagger-4"
              href="/leases"
            />
          </>
        ) : null}
      </div>

      {/* Charts — Revenue wider, Occupancy compact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-h-0 animate-enter stagger-1">
          <RevenueChart />
        </div>
        <div className="min-h-0 animate-enter stagger-2">
          <OccupancyChart />
        </div>
      </div>

      {/* Activity + Lease Expirations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="animate-enter stagger-1">
          <RecentActivity />
        </div>
        <div className="animate-enter stagger-2">
          <LeaseExpirationWidget />
        </div>
      </div>

      {/* Rent Alerts + Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="animate-enter stagger-1">
          <RentExpiryWidget />
        </div>
        <div className="animate-enter stagger-2">
          <UpcomingRenewals />
        </div>
      </div>

      {/* Smart Search & Insights */}
      <div className="animate-enter stagger-2">
        <SmartSearchInsights />
      </div>

      {/* Financial Intelligence */}
      <div className="animate-enter stagger-3">
        <FinancialIntelligence />
      </div>

      {/* Predictive Analytics */}
      <div className="animate-enter stagger-4">
        <PredictiveAnalytics />
      </div>

      <div className="animate-enter stagger-5">
        <AIAssistant />
      </div>
    </div>
  );
}
