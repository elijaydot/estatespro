import { ArrowRight, CalendarDays, Store } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useAuth } from '@/contexts/useAuth';
import { useSettings } from '@/contexts/useSettings';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { summarizeVendorPayments, useVendorPayments } from '@/hooks/useVendorPayments';
import { useVendors } from '@/hooks/useVendors';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useDashboardStats();
  const { entitlements, isLoading: saasLoading } = useSaasAccess();
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: vendors = [] } = useVendors();
  const { data: vendorPayments = [] } = useVendorPayments();
  const { formatCurrency } = useSettings();
  const { profile, user } = useAuth();
  const { companies, activeCompanyId } = useActiveCompany();

  const activeCompanyName = companies.find((company) => company.id === activeCompanyId)?.name || 'Your portfolio';
  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const activeVendors = vendors.filter((vendor) => vendor.status === 'active').length;
  const vendorPaymentTotals = summarizeVendorPayments(vendorPayments);
  const aiEnabled = entitlements['ai.assistant.enabled'];
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-6">
      <section className="relative overflow-hidden rounded-2xl bg-[#111827] px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.28),transparent_68%)]" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">{activeCompanyName}</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Good to see you, {displayName}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">{dateLabel}. Here is the operational picture across your properties, tenants, collections, and upcoming work.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/reports')}>View reports</Button>
            <Button size="sm" onClick={() => navigate('/invoices?add=true')}>Create invoice</Button>
          </div>
        </div>
      </section>

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

      <RecentActivity />
    </div>
  );
}