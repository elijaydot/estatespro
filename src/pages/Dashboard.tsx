import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertTriangle,
  Clock,
  Home,
  FileText,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Plus,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Activity,
  Layers,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PageContainer,
  PageHeader,
  PageActions,
  PageSection,
} from '@/design-system/LayoutFramework';
import { AttentionCenter, type AttentionItem } from '@/design-system/components/AttentionCenter';
import { StandardCard } from '@/design-system/components/StandardCard';
import { StandardTable } from '@/design-system/components/StandardTable';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ActivityCenterView } from '@/components/dashboard/ActivityCenterView';
import { DashboardAIInsightsPanel } from '@/components/dashboard/DashboardAIInsightsPanel';
import { SmartSearchInsights } from '@/components/ai/SmartSearchInsights';
import { FinancialIntelligence } from '@/components/dashboard/FinancialIntelligence';
import { PredictiveAnalytics } from '@/components/ai/PredictiveAnalytics';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useAuth } from '@/contexts/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSettings } from '@/contexts/useSettings';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { summarizeVendorPayments, useVendorPayments } from '@/hooks/useVendorPayments';
import { useVendors } from '@/hooks/useVendors';
import { useAdministrationSnapshot, useCompanyDirectory } from '@/hooks/useControlPlane';
import { useMyCompanies } from '@/hooks/useCompanies';
import { useI18n } from '@/contexts/useI18n';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') === 'activity' ? 'activity' : 'command';
  const { role, isSuperAdmin } = useUserRole();
  const { data: stats, isLoading } = useDashboardStats();
  const { entitlements, isTrialing, isTrialExpired, trialDaysRemaining, isLoading: saasLoading } = useSaasAccess();
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: vendors = [] } = useVendors();
  const { data: vendorPayments = [] } = useVendorPayments();
  const { data: adminSnapshot } = useAdministrationSnapshot();
  const { data: companiesList = [] } = useMyCompanies();
  const { data: companyDirectory } = useCompanyDirectory(1, 10);
  const { formatCurrency } = useSettings();
  const { profile, user } = useAuth();
  const { companies, activeCompanyId } = useActiveCompany();
  const { t, language } = useI18n();

  const activeCompanyName = isSuperAdmin
    ? 'FishGate • Global Platform'
    : (companies.find((c) => c.id === activeCompanyId)?.name || 'Executive Portfolio');

  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Leader';
  const activeVendors = vendors.filter((vendor) => vendor.status === 'active').length;
  const vendorPaymentTotals = summarizeVendorPayments(vendorPayments);
  const aiEnabled = entitlements['ai.assistant.enabled'];

  const localeMap: Record<string, string> = { rw: 'rw-RW', fr: 'fr-FR', sw: 'sw-KE', en: 'en-US' };
  const dateLabel = new Date().toLocaleDateString(localeMap[language] || 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate metrics for Section 2: Business Health
  const totalUnits = stats?.totalUnits || 0;
  const occupiedUnits = stats?.occupiedUnits || 0;
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRevenue = stats?.monthlyRevenue || 0;
  const overduePayments = stats?.overduePayments || 0;
  const totalBilled = monthlyRevenue + overduePayments;
  const collectionRate = totalBilled > 0 ? Math.min(100, Math.round((monthlyRevenue / totalBilled) * 100)) : 100;
  const estimatedNOI = Math.round(monthlyRevenue * 0.72); // Net Operating Income estimate
  const estimatedPortfolioValue = totalUnits * 125000; // Benchmark portfolio asset value

  // Section 1: Attention Center Items (Exception-First Priority)
  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];

    // Overdue Payments
    if (stats && stats.overduePayments > 0) {
      items.push({
        id: 'att-overdue',
        category: 'payment',
        title: `${stats.overduePaymentsCount || 1} Rent Balances Overdue`,
        detail: `${formatCurrency(stats.overduePayments)} outstanding beyond grace period. Immediate follow-up required.`,
        metric: formatCurrency(stats.overduePayments),
        severity: 'critical',
        actionLabel: 'Resolve In Arrears',
        actionHref: '/payments?view=collections',
      });
    }

    // Critical Maintenance
    if (stats && stats.maintenanceRequests > 0) {
      items.push({
        id: 'att-maintenance',
        category: 'maintenance',
        title: `${stats.maintenanceRequests} Open Maintenance Requests`,
        detail: `${stats.maintenanceInProgress || 0} in progress with technicians. Prioritize unresolved plumbing & electrical.`,
        metric: `${stats.maintenanceRequests} open`,
        severity: 'high',
        actionLabel: 'Triage Tickets',
        actionHref: '/maintenance',
      });
    }

    // Vacant Units
    if (vacantUnits > 0) {
      items.push({
        id: 'att-vacancy',
        category: 'vacancy',
        title: `${vacantUnits} Vacant Rentable Units`,
        detail: `Occupancy is at ${occupancyRate}%. Publish listings or verify tenant move-in readiness.`,
        metric: `${vacantUnits} vacant`,
        severity: 'warning',
        actionLabel: 'View Vacancies',
        actionHref: '/units?status=vacant',
      });
    }

    // Expiring Leases
    if (stats && (stats.upcomingRenewals || 0) > 0) {
      items.push({
        id: 'att-leases',
        category: 'lease',
        title: `${stats.upcomingRenewals} Leases Expiring in 30 Days`,
        detail: 'Initiate renewal offers or dispatch inspection checklists before term expiry.',
        metric: `${stats.upcomingRenewals} expiring`,
        severity: 'warning',
        actionLabel: 'Review Leases',
        actionHref: '/leases',
      });
    }

    // Open Operational Alerts
    if (openAlertCount > 0) {
      items.push({
        id: 'att-alerts',
        category: 'approval',
        title: `${openAlertCount} Operational SLA Alerts`,
        detail: 'Inbound message delays or payment confirmation flags require team review.',
        metric: `${openAlertCount} alerts`,
        severity: 'high',
        actionLabel: 'Check Triggers',
        actionHref: '/alerts',
      });
    }

    return items;
  }, [stats, vacantUnits, occupancyRate, openAlertCount, formatCurrency]);

  return (
    <PageContainer maxWidth="7xl">
      {/* Page Header */}
      <PageHeader
        title={
          currentView === 'activity'
            ? 'Portfolio Activity Center'
            : isSuperAdmin
            ? 'Platform Command Center'
            : `${t('greeting_good_day', 'Good day')}, ${displayName}`
        }
        description={
          currentView === 'activity'
            ? 'Real-time chronological timeline of rental collections, lease events, maintenance updates, and operational audit events across your portfolio.'
            : `${dateLabel} • ${activeCompanyName}. Real-time operational picture across portfolio assets, collections, and work orders.`
        }
        actions={
          <PageActions>
            {currentView === 'activity' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParams({}, { replace: true })}
                className="gap-1.5 text-xs h-9 rounded-lg"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
                Command Center
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/reports')}
                className="gap-1.5 text-xs h-9 rounded-lg"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Financial Reports
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => navigate('/invoices?add=true')}
              className="gap-1.5 text-xs h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              New Invoice
            </Button>
          </PageActions>
        }
      />

      {/* Top View Selector: Command Center vs Activity Center */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-3 mb-6 overflow-x-auto no-scrollbar">
        <Button
          variant={currentView === 'command' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSearchParams({}, { replace: true })}
          className="gap-2 text-xs h-9 rounded-lg font-medium"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Command Center</span>
        </Button>
        <Button
          variant={currentView === 'activity' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSearchParams({ view: 'activity' }, { replace: true })}
          className="gap-2 text-xs h-9 rounded-lg font-medium"
        >
          <Activity className="h-4 w-4" />
          <span>Activity Center</span>
        </Button>
      </div>

      {currentView === 'activity' ? (
        <ActivityCenterView />
      ) : (
        <>
          {/* SECTION 1: ATTENTION CENTER (Always first. Dominates attention.) */}
          <AttentionCenter
            items={attentionItems}
            title="Attention Center"
            subtitle="Exceptions and action items requiring immediate executive decision"
          />

      {/* SECTION 2: BUSINESS HEALTH (Simple, Executive, Highly Scannable) */}
      <PageSection
        title="Business Health"
        description="Key executive performance indicators across portfolio operations"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* Portfolio Value */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 transition-colors">
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Portfolio Value (Est.)
            </p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(estimatedPortfolioValue)}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {totalUnits} rentable units asset base
            </p>
          </div>

          {/* Revenue */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 transition-colors">
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Monthly Revenue
            </p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(monthlyRevenue)}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Settled rent collections this cycle
            </p>
          </div>

          {/* Occupancy */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 transition-colors">
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Portfolio Occupancy
            </p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isLoading ? <Skeleton className="h-8 w-16" /> : `${occupancyRate}%`}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {occupiedUnits} of {totalUnits} units occupied
            </p>
          </div>

          {/* Collection Rate */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 transition-colors">
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Collection Rate
            </p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {isLoading ? <Skeleton className="h-8 w-16" /> : `${collectionRate}%`}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {formatCurrency(overduePayments)} outstanding
            </p>
          </div>

          {/* Net Operating Income (NOI) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 transition-colors col-span-2 sm:col-span-1">
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Net Operating Income (NOI)
            </p>
            <p className="mt-1 text-[24px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(estimatedNOI)}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Operating margin approx 72%
            </p>
          </div>
        </div>
      </PageSection>

      {/* SECTION 3: FINANCIAL PERFORMANCE (Revenue Trends, Collections, Forecasts) */}
      <PageSection
        title="Financial Performance"
        description="Cash flow trajectories, revenue velocity, and forward collection targets"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <StandardCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                  Revenue & Collections Trend
                </h3>
                <p className="text-[12px] text-slate-400">
                  Historical settled rent receipts vs monthly targets
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/reports?tab=forecasts')}
                className="text-xs h-8 text-blue-600 hover:text-blue-700 p-0"
              >
                Forecast Models →
              </Button>
            </div>
            <RevenueChart embedded />
          </StandardCard>

          <StandardCard className="p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                  Occupancy & Unit Distribution
                </h3>
                <p className="text-[12px] text-slate-400">
                  Physical unit occupancy yield
                </p>
              </div>
              <OccupancyChart embedded />
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Target: 95% Occupancy</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/units')}
                className="text-xs h-7 p-0 text-blue-600 hover:text-blue-700"
              >
                Inspect Units →
              </Button>
            </div>
          </StandardCard>
        </div>
      </PageSection>

      {/* SECTION 4: OPERATIONS OVERVIEW (Maintenance, Work Orders, Inspections, Tasks) */}
      <PageSection
        title="Operations Overview"
        description="Physical asset health, technician dispatching, and vendor allocations"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Maintenance Status */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Maintenance Tickets</span>
                <Wrench className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-[28px] font-bold text-slate-900 dark:text-slate-100">
                {(stats?.maintenanceRequests || 0) + (stats?.maintenanceInProgress || 0)}
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                {stats?.maintenanceRequests || 0} open · {stats?.maintenanceInProgress || 0} in progress
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/maintenance')}
              className="mt-4 text-xs h-8 text-blue-600 justify-start p-0 hover:bg-transparent"
            >
              Open Maintenance Desk →
            </Button>
          </div>

          {/* Open Work Orders */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Open Work Orders</span>
                <Layers className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-[28px] font-bold text-slate-900 dark:text-slate-100">
                {stats?.maintenanceInProgress || 0}
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                Dispatched to licensed technicians
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/maintenance?tab=work-orders')}
              className="mt-4 text-xs h-8 text-blue-600 justify-start p-0 hover:bg-transparent"
            >
              View Work Orders →
            </Button>
          </div>

          {/* Upcoming Inspections & Expirations */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Upcoming Renewals</span>
                <Clock className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-[28px] font-bold text-slate-900 dark:text-slate-100">
                {stats?.upcomingRenewals || 0}
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                Leases expiring in the next 30 days
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/leases')}
              className="mt-4 text-xs h-8 text-blue-600 justify-start p-0 hover:bg-transparent"
            >
              Review Leases →
            </Button>
          </div>

          {/* Vendor Payables */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-slate-500">Vendor Operations</span>
                <Building2 className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-[28px] font-bold text-slate-900 dark:text-slate-100">
                {activeVendors}
              </p>
              <p className="text-[12px] text-slate-400 mt-1">
                {formatCurrency(vendorPaymentTotals.pending)} pending payables
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/vendors')}
              className="mt-4 text-xs h-8 text-blue-600 justify-start p-0 hover:bg-transparent"
            >
              Vendor Directory →
            </Button>
          </div>
        </div>
      </PageSection>

      {/* SECTION 5: RECENT ACTIVITY (Timeline-driven, human-friendly, not table-heavy) */}
      <PageSection
        title="Recent Activity"
        description="Human-friendly chronological feed of rent payments, lease events, and work updates"
      >
        <StandardCard className="p-5">
          <RecentActivity />
        </StandardCard>
      </PageSection>

      {/* SECTION 6: DETAILED PORTFOLIO VIEW (Data Grids, Companies, Properties with Drill-Down) */}
      {isSuperAdmin && (
        <PageSection
          title="Super Admin Portfolio Fleets"
          description="Customer organization directories, fleet health, and multi-tenant security"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/super-admin/control-plane')}
              className="gap-1.5 text-xs h-8"
            >
              Open Safety Control Plane
              <ExternalLink className="h-3 w-3" />
            </Button>
          }
        >
          <StandardTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">Organization</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">Platform Owner</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">Created</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-500">Plan Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(companyDirectory?.rows || companiesList.slice(0, 8)).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                      No customer organizations registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (companyDirectory?.rows || companiesList.slice(0, 8)).map((org) => (
                    <TableRow key={org.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">{org.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{org.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {(org as any).owner_email || (org as any).email || 'Platform Owner'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-500">
                          {org.created_at
                            ? new Date(org.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-medium"
                        >
                          {(org as any).subscription_status || 'Active Tenant'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/super-admin/control-plane?companyId=${org.id}`)}
                          className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Inspect Fleet
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </StandardTable>
        </PageSection>
      )}

      {/* AI Intelligence Insights (Assistant, not domination) */}
      {!saasLoading && aiEnabled && (
        <PageSection
          title="Intelligent Insights"
          description="Actionable predictions, lease anomaly alerts, and automated cash flow forecasting"
        >
          <StandardCard className="p-5">
            <DashboardAIInsightsPanel
              smartSearch={<SmartSearchInsights embedded />}
              financial={<FinancialIntelligence embedded />}
              predictive={<PredictiveAnalytics embedded />}
            />
          </StandardCard>
        </PageSection>
      )}
        </>
      )}
    </PageContainer>
  );
}
