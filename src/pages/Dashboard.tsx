import { ArrowRight, CalendarDays, Store, Building2, Users, ShieldCheck, Activity, Layers, ExternalLink, Sparkles, AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SmartSearchInsights } from '@/components/ai/SmartSearchInsights';
import { PredictiveAnalytics } from '@/components/ai/PredictiveAnalytics';
import { DashboardAIInsightsPanel } from '@/components/dashboard/DashboardAIInsightsPanel';
import { DashboardKpiStrip } from '@/components/dashboard/DashboardOverview';
import { FinancialIntelligence } from '@/components/dashboard/FinancialIntelligence';
import { OccupancyChart } from '@/components/dashboard/OccupancyChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { RentExpiryWidget } from '@/components/dashboard/RentExpiryWidget';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { UpcomingRenewals } from '@/components/dashboard/UpcomingRenewals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, isSuperAdmin } = useUserRole();
  const { data: stats, isLoading } = useDashboardStats();
  const { entitlements, isLoading: saasLoading } = useSaasAccess();
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: vendors = [] } = useVendors();
  const { data: vendorPayments = [] } = useVendorPayments();
  const { data: adminSnapshot } = useAdministrationSnapshot();
  const { data: companiesList = [] } = useMyCompanies();
  const { data: companyDirectory } = useCompanyDirectory(1, 10);
  const { formatCurrency } = useSettings();
  const { profile, user } = useAuth();
  const { companies, activeCompanyId } = useActiveCompany();

  const activeCompanyName = isSuperAdmin
    ? 'FishGate SaaS • Global Monitor'
    : (companies.find((company) => company.id === activeCompanyId)?.name || 'Your portfolio');
  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const activeVendors = vendors.filter((vendor) => vendor.status === 'active').length;
  const vendorPaymentTotals = summarizeVendorPayments(vendorPayments);
  const aiEnabled = entitlements['ai.assistant.enabled'];
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-6">
      {/* Hero Banner: Global Command Center for Super Admin vs Standard Portfolio for Landlords */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0f172a] px-5 py-6 text-white sm:px-7 sm:py-7 border border-slate-800 shadow-xl">
        <div className="absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.32),transparent_68%)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {isSuperAdmin ? (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Global Platform Monitor • All Tenants Active
                </span>
              </div>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">{activeCompanyName}</p>
            )}
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl text-white">
              {isSuperAdmin ? 'FishGate Global SaaS Command Center' : `Good to see you, ${displayName}`}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300 leading-relaxed">
              {isSuperAdmin
                ? `${dateLabel}. Real-time monitoring across all customer organizations, properties, tenants, invoices, leases, and system operations.`
                : `${dateLabel}. Here is the operational picture across your properties, tenants, collections, and upcoming work.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSuperAdmin ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => navigate('/super-admin/control-plane')} className="gap-1.5 shadow-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Control Plane
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/reports')} className="gap-1.5 bg-white/10 hover:bg-white/20 border-white/20 text-white">
                  Platform Reports
                </Button>
                <Button size="sm" onClick={() => navigate('/marketplace/crm')} className="gap-1.5 shadow-sm">
                  CRM Pipeline
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => navigate('/reports')}>View reports</Button>
                <Button size="sm" onClick={() => navigate('/invoices?add=true')}>Create invoice</Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Super Admin Global Fleet Metrics Strip */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 animate-fade-in">
          <Card className="card-shadow-sm border-border/70 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Customer Companies
              </p>
              <p className="text-2xl font-bold text-foreground">
                {adminSnapshot?.total_companies || companiesList.length || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {adminSnapshot?.verified_companies || 0} verified orgs
              </p>
            </CardContent>
          </Card>
          <Card className="card-shadow-sm border-border/70 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                Total Platform Users
              </p>
              <p className="text-2xl font-bold text-foreground">
                {adminSnapshot?.total_users || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {adminSnapshot?.total_landlords || 0} landlords · {adminSnapshot?.total_property_managers || 0} PMs
              </p>
            </CardContent>
          </Card>
          <Card className="card-shadow-sm border-border/70 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                Managed Units
              </p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.totalUnits || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {stats?.occupiedUnits || 0} occupied ({stats?.totalUnits ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) : 0}%)
              </p>
            </CardContent>
          </Card>
          <Card className="card-shadow-sm border-border/70 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Platform Collections
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Total settled across all orgs
              </p>
            </CardContent>
          </Card>
          <Card className="card-shadow-sm border-border/70 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                Platform Arrears
              </p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(stats?.overduePayments || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {stats?.overduePaymentsCount || 0} overdue invoices
              </p>
            </CardContent>
          </Card>
          <Card className="card-shadow-sm border-border/70 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-500" />
                Active Work Orders
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {(stats?.maintenanceRequests || 0) + (stats?.maintenanceInProgress || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {stats?.maintenanceInProgress || 0} currently in progress
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !stats ? (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-semibold">We could not load your portfolio stats</p>
            <p className="text-sm text-muted-foreground">Refresh the dashboard or continue to reports.</p>
            <div className="flex justify-center gap-2"><Button variant="outline" onClick={() => window.location.reload()}>Reload</Button><Button onClick={() => navigate('/reports')}>Open reports</Button></div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
      ) : stats ? (
        <DashboardKpiStrip
          data={{
            overdueAmount: stats.overduePayments,
            overdueCount: stats.overduePaymentsCount,
            occupiedUnits: stats.occupiedUnits,
            totalUnits: stats.totalUnits,
            maintenanceOpen: stats.maintenanceRequests,
            maintenanceInProgress: stats.maintenanceInProgress,
            renewals30d: stats.upcomingRenewals,
            activeVendors,
            pendingPayables: vendorPaymentTotals.pending,
            alerts: openAlertCount,
          }}
          formatCurrency={formatCurrency}
        />
      ) : null}

      <section aria-label="Portfolio performance charts" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <RevenueChart />
        <OccupancyChart />
      </section>

      {!saasLoading && (aiEnabled ? (
        <DashboardAIInsightsPanel
          smartSearch={<SmartSearchInsights embedded />}
          financial={<FinancialIntelligence embedded />}
          predictive={<PredictiveAnalytics embedded />}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">AI Insights is not included in this plan</p><p className="mt-1 text-sm text-muted-foreground">Upgrade to unlock financial intelligence and portfolio forecasts.</p></div>
            <Button onClick={() => navigate('/settings?tab=billing')}>Explore AI add-on</Button>
          </CardContent>
        </Card>
      ))}

      <section aria-labelledby="portfolio-operations-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Daily control</p><h2 id="portfolio-operations-title" className="mt-1 text-lg font-semibold">Portfolio operations</h2></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <RentExpiryWidget compact />
          <UpcomingRenewals compact />
          <Card className="min-h-64 border-0 shadow-[var(--shadow-card)]">
            <CardContent className="flex h-full flex-col p-4">
              <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-primary" />Vendor analytics</h3><Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/vendors')}>View all<ArrowRight className="h-3.5 w-3.5" /></Button></div>
              <div className="mt-4 divide-y divide-border/60">
                <div className="flex items-center justify-between py-3"><span className="text-sm text-muted-foreground">Active vendors</span><span className="font-semibold">{activeVendors}</span></div>
                <div className="flex items-center justify-between py-3"><span className="text-sm text-muted-foreground">Pending payables</span><span className="font-semibold text-warning">{formatCurrency(vendorPaymentTotals.pending)}</span></div>
                <div className="flex items-center justify-between py-3"><span className="text-sm text-muted-foreground">Paid to vendors</span><span className="font-semibold text-success">{formatCurrency(vendorPaymentTotals.paid)}</span></div>
              </div>
              <Button variant="outline" size="sm" className="mt-auto gap-2 self-start" onClick={() => navigate('/maintenance')}><CalendarDays className="h-4 w-4" />Open work orders</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Super Admin: Subscribed Customer Organizations & Fleets */}
      {isSuperAdmin && (
        <section aria-labelledby="customer-orgs-title" className="space-y-3 animate-fade-in">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tenant Directory</p>
              <h2 id="customer-orgs-title" className="mt-1 text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Customer Organizations & Fleets
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/super-admin/control-plane')} className="gap-1.5">
              Open Control Plane Directory
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Card className="card-shadow-sm border-border/70 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Plan / Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(companyDirectory?.items || companiesList.slice(0, 8)).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No customer organizations registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (companyDirectory?.items || companiesList.slice(0, 8)).map((org) => (
                      <TableRow key={org.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {org.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{org.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{org.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{(org as { owner_email?: string; email?: string }).owner_email || (org as { email?: string }).email || 'Platform Owner'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">
                            {org.created_at ? new Date(org.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-medium">
                            {(org as { subscription_status?: string }).subscription_status || 'Active Tenant'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/control-plane?companyId=${org.id}`)}
                            className="h-8 gap-1 text-xs"
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
            </div>
          </Card>
        </section>
      )}

      <RecentActivity />
    </div>
  );
}