import { 
  Building2, 
  Home, 
  Users, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  Wrench,
  Calendar,
  Receipt,
  FileText,
  Store,
  BriefcaseBusiness,
  Radar,
  ArrowRight,
} from 'lucide-react';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { UpcomingRenewals } from '@/components/dashboard/UpcomingRenewals';
import { LeaseExpirationWidget } from '@/components/dashboard/LeaseExpirationWidget';
import { RentExpiryWidget } from '@/components/dashboard/RentExpiryWidget';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useSettings } from '@/contexts/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { AIAssistant } from '@/components/dashboard/AIAssistant';
import { FinancialIntelligence } from '@/components/dashboard/FinancialIntelligence';
import { SmartSearchInsights } from '@/components/ai/SmartSearchInsights';
import { PredictiveAnalytics } from '@/components/ai/PredictiveAnalytics';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';
import { summarizeVendorPayments, useVendorPayments } from '@/hooks/useVendorPayments';
import { useVendors } from '@/hooks/useVendors';
import { MetricCard } from '@/components/shared/MetricCard';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { entitlements, quotas, isLoading: saasLoading } = useSaasAccess();
  const { formatCurrency } = useSettings();
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: vendors = [] } = useVendors();
  const { data: vendorPayments = [] } = useVendorPayments();
  const vendorPaymentTotals = summarizeVendorPayments(vendorPayments);
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { companies, activeCompanyId } = useActiveCompany();
  const { isSuperAdmin } = useUserRole();

  const quotaLabels: Record<string, string> = {
    properties_managed: 'Properties',
    units_managed: 'Units',
    active_tenants: 'Active Tenants',
    property_manager_seats: 'Manager Seats',
    ai_credits_monthly: 'AI Credits',
  };

  const aiEnabled = entitlements['ai.assistant.enabled'];
  const activeCompanyName = companies.find((company) => company.id === activeCompanyId)?.name;
  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const workspaces = [
    {
      name: 'Property Management',
      description: 'Portfolio, tenancy, and finance',
      path: '/dashboard',
      icon: Building2,
      iconClassName: 'bg-primary/10 text-primary',
      available: true,
    },
    {
      name: 'Marketplace',
      description: 'Listings and verification',
      path: '/marketplace/manage',
      icon: Store,
      iconClassName: 'bg-warning/10 text-warning',
      available: entitlements['marketplace.listings.manage'] || entitlements['marketplace.moderation.view'],
    },
    {
      name: 'CRM',
      description: 'Leads, deals, and activity',
      path: '/marketplace/crm',
      icon: BriefcaseBusiness,
      iconClassName: 'bg-success/10 text-success',
      available: entitlements['crm.leads.manage'] || entitlements['crm.deals.manage'],
    },
    {
      name: 'Control Plane',
      description: 'Platform health and governance',
      path: '/super-admin/control-plane',
      icon: Radar,
      iconClassName: 'bg-info/10 text-info',
      available: isSuperAdmin,
    },
  ].filter((workspace) => workspace.available);

  const attentionItems = stats
    ? [
        {
          label: 'Operational alerts',
          value: openAlertCount,
          tone: openAlertCount > 0 ? 'destructive' : 'muted',
          actionLabel: 'Open Alerts',
          action: () => navigate('/alerts'),
        },
        {
          label: 'Overdue invoices',
          value: stats.overduePaymentsCount,
          tone: stats.overduePaymentsCount > 0 ? 'destructive' : 'muted',
          actionLabel: 'Open Invoices',
          action: () => navigate('/invoices'),
        },
        {
          label: 'Maintenance in progress',
          value: stats.maintenanceInProgress,
          tone: stats.maintenanceInProgress > 0 ? 'warning' : 'muted',
          actionLabel: 'Open Maintenance',
          action: () => navigate('/maintenance'),
        },
        {
          label: 'Renewals in 30 days',
          value: stats.upcomingRenewals,
          tone: stats.upcomingRenewals > 0 ? 'info' : 'muted',
          actionLabel: 'Open Leases',
          action: () => navigate('/leases'),
        },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-[1600px] pb-2">
      <div className="md:hidden space-y-4 animate-fade-in">
        <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-foreground">Welcome back, {displayName}</p>
          <p className="mt-1 text-xs text-muted-foreground">{activeCompanyName || 'Your organization'} · {dateLabel}</p>
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
              <span className="text-[11px]">Tenant</span>
            </Button>
            <Button variant="secondary" className="h-auto py-3 flex-col gap-1 rounded-xl" onClick={() => navigate('/maintenance')}>
              <FileText className="h-4 w-4" />
              <span className="text-[11px]">Request</span>
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
        <div className="border-b border-border pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Welcome back, {displayName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {dateLabel}{activeCompanyName ? ` · ${activeCompanyName}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/reports')}>
                Open Reports
              </Button>
              <Button size="sm" onClick={() => navigate('/messages')}>
                Messages
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!saasLoading && (
        <section aria-labelledby="workspace-launcher-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 id="workspace-launcher-title" className="text-base font-semibold text-foreground">Your active modules</h2>
              <p className="text-sm text-muted-foreground">Move between the workspaces available to your role and plan.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {workspaces.map((workspace) => (
              <button
                key={workspace.name}
                type="button"
                onClick={() => navigate(workspace.path)}
                className="group flex min-h-24 items-center gap-4 rounded-lg border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-primary/25 hover:bg-muted/20"
              >
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', workspace.iconClassName)}>
                  <workspace.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{workspace.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{workspace.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </section>
      )}

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

      {!isLoading && stats && (
        <Card className="border border-border/70 bg-card/85 backdrop-blur-sm card-shadow-md overflow-hidden animate-enter stagger-1">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Needs Attention</p>
                <p className="text-sm font-medium text-foreground mt-1">Exception-first operations board for today.</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/reports')}>
                Open Performance Reports
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {attentionItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p
                    className={cn(
                      'text-xl font-bold mt-1',
                      item.tone === 'destructive' && 'text-destructive',
                      item.tone === 'warning' && 'text-warning',
                      item.tone === 'info' && 'text-info',
                      item.tone === 'muted' && 'text-foreground'
                    )}
                  >
                    {item.value}
                  </p>
                  <Button size="sm" variant="ghost" className="mt-1.5 h-7 px-2.5 rounded-full" onClick={item.action}>
                    {item.actionLabel}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <p className="text-xs text-primary">
                Receivables exposure today: {formatCurrency(stats.pendingPayments + stats.overduePayments)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!saasLoading && quotas.length > 0 && (
        <Card className="border border-border/70 bg-card/90 backdrop-blur-sm card-shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Plan Usage Snapshot</p>
                <p className="text-sm font-medium text-foreground mt-1">Current quota usage for your active company.</p>
              </div>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/settings?tab=billing')}>
                View Plan
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quotas.map((quota) => {
                const hardLimitText = quota.hard_limit > 0 ? String(quota.hard_limit) : 'Unlimited';
                return (
                  <div key={quota.quota_code} className="rounded-xl border border-border/70 bg-background/70 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">{quotaLabels[quota.quota_code] || quota.quota_code}</p>
                      <p className="text-xs font-semibold text-foreground">
                        {quota.used_value} / {hardLimitText}
                      </p>
                    </div>
                    <Progress value={quota.usage_percent} className="h-2" />
                    <p className="text-[11px] text-muted-foreground">
                      {quota.remaining > 0 ? `${quota.remaining} remaining` : 'At or above limit'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards — 4 columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))
        ) : stats ? (
          <>
            <MetricCard
              title="Properties"
              value={String(stats.totalProperties)}
              subtitle={`${stats.totalUnits} total units`}
              icon={Building2}
              iconColor="bg-primary/10 text-primary"
              className="animate-enter stagger-1"
              href="/properties"
            />
            <MetricCard
              title="Occupancy"
              value={`${stats.occupancyRate}%`}
              subtitle={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
              icon={Home}
              iconColor="bg-info/10 text-info"
              className="animate-enter stagger-2"
              href="/units"
            />
            <MetricCard
              title="Active Tenants"
              value={String(stats.activeTenants)}
              subtitle={`${stats.occupiedUnits} units occupied`}
              icon={Users}
              iconColor="bg-success/10 text-success"
              trend="up"
              className="animate-enter stagger-3"
              href="/tenants"
            />
            <MetricCard
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

      <Card className="border border-border/70 bg-card/90 card-shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Vendor Analytics</p><p className="mt-1 text-sm font-medium">Contractor capacity and payment exposure.</p></div>
            <Button size="sm" variant="outline" onClick={() => navigate('/vendors')}>Open Vendors</Button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Active vendors</p><p className="mt-1 text-xl font-bold">{vendors.filter((vendor) => vendor.status === 'active').length}</p></div>
            <div className="rounded-lg border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Paid to vendors</p><p className="mt-1 text-xl font-bold text-success">{formatCurrency(vendorPaymentTotals.paid)}</p></div>
            <div className="rounded-lg border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Pending payables</p><p className="mt-1 text-xl font-bold text-warning">{formatCurrency(vendorPaymentTotals.pending)}</p></div>
            <div className="rounded-lg border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Ledger entries</p><p className="mt-1 text-xl font-bold">{vendorPayments.length}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Shortlet KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))
        ) : stats ? (
          <>
            <MetricCard
              title="Shortlet Conversion"
              value={`${stats.shortletConversionRate}%`}
              subtitle={`${stats.shortletTotalBookings} bookings total`}
              icon={TrendingUp}
              iconColor="bg-success/10 text-success"
              className="animate-enter stagger-1"
              href="/reports"
            />
            <MetricCard
              title="Shortlet Acceptance"
              value={`${stats.shortletAcceptanceRate}%`}
              subtitle="Guest acceptance rate"
              icon={Users}
              iconColor="bg-info/10 text-info"
              className="animate-enter stagger-2"
              href="/reports"
            />
            <MetricCard
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))
        ) : stats ? (
          <>
            <MetricCard
              title="Pending Payments"
              value={formatCurrency(stats.pendingPayments)}
              subtitle={`${stats.pendingPaymentsCount} invoices pending`}
              icon={TrendingUp}
              iconColor="bg-warning/10 text-warning"
              className="animate-enter stagger-1"
              href="/invoices"
            />
            <MetricCard
              title="Overdue"
              value={formatCurrency(stats.overduePayments)}
              subtitle={`${stats.overduePaymentsCount} overdue invoices`}
              icon={AlertCircle}
              iconColor="bg-destructive/10 text-destructive"
              trend={stats.overduePaymentsCount > 0 ? 'down' : 'neutral'}
              className="animate-enter stagger-2"
              href="/invoices"
            />
            <MetricCard
              title="Maintenance"
              value={String(stats.maintenanceRequests)}
              subtitle={`${stats.maintenanceInProgress} in progress`}
              icon={Wrench}
              iconColor="bg-muted text-muted-foreground"
              className="animate-enter stagger-3"
              href="/maintenance"
            />
            <MetricCard
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
      {aiEnabled ? (
        <>
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
        </>
      ) : (
        <Card className="border-dashed border-border/70 animate-enter stagger-2">
          <CardContent className="p-6 text-center space-y-2">
            <p className="text-base font-semibold text-foreground">AI Intelligence Add-on Locked</p>
            <p className="text-sm text-muted-foreground">Upgrade your plan to unlock AI insights, predictive analytics, and assistant workflows.</p>
            <div className="flex justify-center">
              <Button onClick={() => navigate('/settings?tab=billing')}>Explore AI Add-on</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
