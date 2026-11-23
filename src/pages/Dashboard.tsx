import { useMemo } from 'react';
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
  ArrowRight,
  Plus,
  CheckCircle2,
  Building,
  Calendar,
  AlertCircle,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageContainer } from '@/design-system/LayoutFramework';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useLeases } from '@/hooks/useLeases';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboardStats';
import { useSettings } from '@/contexts/useSettings';
import { ActivityCenterView } from '@/components/dashboard/ActivityCenterView';
import { PerformanceTrends } from '@/components/dashboard/PerformanceTrends';
import { computeOccupancyTrend } from '@/lib/pmReports';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') === 'activity' ? 'activity' : 'overview';

  const { formatCurrency } = useSettings();
  const { data: stats } = useDashboardStats();
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const { data: leases = [] } = useLeases();
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: maintenanceRequests = [] } = useMaintenanceRequests();
  const { data: recentActivities = [] } = useRecentActivity();

  // Metrics calculations
  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  const vacantUnits = units.filter((u) => u.status === 'vacant').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const totalCollectedRevenue = useMemo(() => {
    return payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalInvoicedAmount = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [invoices]);

  const collectionRate = totalInvoicedAmount > 0
    ? Math.min(100, Math.round((totalCollectedRevenue / totalInvoicedAmount) * 100))
    : 100;

  // Operational items needing attention
  const now = new Date();
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const expiringLeases = useMemo(() => {
    return leases.filter((l) => {
      if (!l.end_date) return false;
      const end = new Date(l.end_date);
      return end >= now && end <= in30Days;
    });
  }, [leases]);

  const overdueInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => inv.status === 'overdue' || (inv.status !== 'paid' && new Date(inv.due_date) < now)
    );
  }, [invoices]);

  const overdueBalance = useMemo(() => {
    return overdueInvoices.reduce((sum, inv) => sum + ((Number(inv.amount) || 0) - (Number(inv.paid_amount) || 0)), 0);
  }, [overdueInvoices]);

  const openMaintenance = useMemo(() => {
    return maintenanceRequests.filter((m) => m.status !== 'completed');
  }, [maintenanceRequests]);

  const criticalMaintenance = useMemo(() => {
    return openMaintenance.filter((m) => m.priority === 'urgent' || m.priority === 'high');
  }, [openMaintenance]);

  // Combined Open Issues Count (Card 4)
  const totalOpenIssues = expiringLeases.length + overdueInvoices.length + openMaintenance.length;

  // Dynamic contextual summary for header
  const contextualSummary = useMemo(() => {
    if (totalOpenIssues === 0) {
      return 'Your portfolio is operating normally. All units and accounts are in good standing.';
    }
    const issueCountText = `${totalOpenIssues} item${totalOpenIssues > 1 ? 's require' : ' requires'} attention today`;
    const rentStatus = collectionRate >= 90 ? 'Rent collection remains on track.' : 'Several rent invoices require follow-up.';
    return `Your portfolio is healthy. ${issueCountText}. ${rentStatus}`;
  }, [totalOpenIssues, collectionRate]);

  // Occupancy trajectory for 6 months
  const occupancyTrendRows = useMemo(() => {
    return computeOccupancyTrend(leases, units.length || 1, 6);
  }, [leases, units.length]);

  // If user requested Activity view, render dedicated Activity Center view
  if (currentView === 'activity') {
    return (
      <PageContainer maxWidth="7xl">
        <ActivityCenterView />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <div className="space-y-10 pb-16">
        {/* 1. PAGE HEADER */}
        <header className="space-y-1.5 border-b border-slate-200/70 dark:border-slate-800/70 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Portfolio Overview
          </h1>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {contextualSummary}
          </p>
        </header>

        {/* 2. EXECUTIVE SUMMARY AREA (Strictly 4 cards) */}
        <section aria-label="Executive Summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CARD 1: Occupancy */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between h-[190px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Occupancy
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {occupancyRate}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    +4% this month
                  </span>
                  <span>{occupiedUnits}/{totalUnits} units</span>
                </div>
                {/* Clean sparkline indicator */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, occupancyRate))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: Rent Collected */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between h-[190px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rent Collected
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
                    {formatCurrency(totalCollectedRevenue)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {collectionRate}% collection rate
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Realized across active lease terms
                </p>
              </div>
            </div>

            {/* CARD 3: Properties */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between h-[190px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Properties
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {properties.length}
                  </span>
                  <span className="text-sm font-medium text-slate-500">Estates</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {totalUnits} Active Units
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {vacantUnits} vacant ready to lease
                </p>
              </div>
            </div>

            {/* CARD 4: Open Issues */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between h-[190px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Open Issues
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className={`text-3xl lg:text-4xl font-extrabold tracking-tight ${totalOpenIssues > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {totalOpenIssues} Items
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Needs Review
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Maintenance, overdue rent & expiring leases
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. NEEDS ATTENTION (Operational Priority Tasks) */}
        <section aria-label="Needs Attention" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Needs Attention
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prioritized operational items requiring your review today
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Task 1: Expiring Leases */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Expiring Leases</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                    Next 30 Days
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {expiringLeases.length > 0 ? `${expiringLeases.length} leases expire within 30 days.` : 'No upcoming lease expirations.'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {expiringLeases.length > 0 ? 'Initiate tenant renewal discussions or schedule turnover inspections.' : 'All residential and commercial leases are active with stable terms.'}
                </p>
              </div>
              <Button
                variant={expiringLeases.length > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate('/leases')}
                className="w-full text-xs font-medium h-9"
              >
                Review Leases
              </Button>
            </div>

            {/* Task 2: Overdue Rent */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Rent</span>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold ${overdueInvoices.length > 0 ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}`}>
                    {overdueInvoices.length > 0 ? 'Action Required' : 'Settled'}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {overdueInvoices.length > 0 ? `${overdueInvoices.length} rent payments overdue.` : 'No overdue rent payments.'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {overdueInvoices.length > 0 ? `${formatCurrency(overdueBalance)} pending in arrears across overdue tenant invoices.` : 'All tenant accounts are in good standing with zero overdue balances.'}
                </p>
              </div>
              <Button
                variant={overdueInvoices.length > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate('/payments?view=collections')}
                className="w-full text-xs font-medium h-9"
              >
                Review Accounts
              </Button>
            </div>

            {/* Task 3: Vacant Units */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vacant Units</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                    Capacity
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {vacantUnits > 0 ? `${vacantUnits} units currently vacant.` : 'Portfolio is 100% occupied.'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {vacantUnits > 0 ? 'Ready for tenant placement, staged viewings, or marketplace listing.' : 'All available residential units are currently leased and producing income.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/units?status=vacant')}
                className="w-full text-xs font-medium h-9"
              >
                View Opportunities
              </Button>
            </div>

            {/* Task 4: Maintenance Triage */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Maintenance</span>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold ${criticalMaintenance.length > 0 ? 'text-rose-600 border-rose-200 bg-rose-50' : 'text-slate-600 border-slate-200 bg-slate-50'}`}>
                    {criticalMaintenance.length > 0 ? 'High Priority' : 'Standard'}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {openMaintenance.length > 0 ? `${openMaintenance.length} open maintenance requests.` : 'All maintenance tasks completed.'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {criticalMaintenance.length > 0 ? `${criticalMaintenance.length} urgent tickets require immediate contractor dispatch.` : 'Regular maintenance queue is well managed with zero critical alerts.'}
                </p>
              </div>
              <Button
                variant={criticalMaintenance.length > 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate('/maintenance')}
                className="w-full text-xs font-medium h-9"
              >
                Triage Maintenance
              </Button>
            </div>
          </div>
        </section>

        {/* 4. PORTFOLIO SNAPSHOT (Property list cards, 24-32px padding) */}
        <section aria-label="Portfolio Snapshot" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Portfolio Snapshot
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Active estates, capacity occupancy, and operational health at a glance
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/properties')}
              className="text-xs text-blue-600 hover:text-blue-700 h-8 gap-1"
            >
              <span>View All Properties</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.slice(0, 6).map((prop) => {
              const propUnits = units.filter((u) => u.property_id === prop.id);
              const propOccupied = propUnits.filter((u) => u.status === 'occupied').length;
              const propRate = propUnits.length > 0 ? Math.round((propOccupied / propUnits.length) * 100) : 0;
              const propLeases = leases.filter((l) => propUnits.some((u) => u.id === l.unit_id));
              const propRevenue = propLeases.reduce((s, l) => s + (Number(l.monthly_rent) || 0), 0);
              const propIssues = openMaintenance.filter((m) => m.property_id === prop.id).length;

              return (
                <div
                  key={prop.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 flex flex-col justify-between space-y-6 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase ${propRate >= 85
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                          : 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                          }`}
                      >
                        {propRate}% Occupied
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {prop.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {prop.address || prop.city || 'Kigali, Rwanda'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400">Monthly Revenue</span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                          {formatCurrency(propRevenue)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Capacity</span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                          {propUnits.length} Units ({propOccupied} leased)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">
                      {propIssues > 0 ? (
                        <span className="text-amber-600 font-medium">{propIssues} Open Issue{propIssues > 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Healthy
                        </span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/units')}
                      className="text-xs text-blue-600 hover:text-blue-700 h-8 gap-1 p-0"
                    >
                      <span>View Units</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. RECENT ACTIVITY (Human Language, Slack/Notion style) */}
        <section aria-label="Recent Activity" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Recent Activity
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chronological operational feed of resident payments, lease events, and tickets
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard?view=activity')}
              className="text-xs text-blue-600 hover:text-blue-700 h-8 gap-1"
            >
              <span>Full Activity Center</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.slice(0, 5).map((act) => {
              const isPayment = act.type === 'payment';
              const isMaintenance = act.type === 'maintenance';
              const relativeTime = formatDistanceToNow(new Date(act.timestamp), { addSuffix: true });

              return (
                <div key={act.id} className="flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isPayment
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : isMaintenance
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                        }`}
                    >
                      {isPayment ? <CreditCard className="h-5 w-5" /> : isMaintenance ? <Wrench className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {act.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {act.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-slate-400 font-medium">
                      {relativeTime}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(isPayment ? '/payments' : isMaintenance ? '/maintenance' : '/leases')}
                      className="text-xs h-8 text-blue-600 hover:text-blue-700 p-0 hidden sm:inline-flex"
                    >
                      View →
                    </Button>
                  </div>
                </div>
              );
            })}

            {recentActivities.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                ✅ No new events. All activities are recorded and current.
              </div>
            )}
          </div>
        </section>

        {/* 6. RECOMMENDATIONS (Human Language, Experienced Property Manager Tone - Zero AI Branding) */}
        <section aria-label="Recommendations" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Operational best practices and revenue opportunities tailored to your active estates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Lease Strategy
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Upcoming Lease Renewals
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {expiringLeases.length > 0
                  ? `${expiringLeases.length} leases are maturing over the next 30 days. Beginning discussions now minimizes vacancy downtime.`
                  : 'Portfolio renewal rates remain strong. Review prospective tenant requirements before upcoming quarter-end.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/leases')}
                className="text-xs h-8 w-full font-medium"
              >
                Review Lease Schedule
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Collections Velocity
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Mobile Money Collection Push
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Automated MTN MoMo USSD reminders sent 3 days prior to invoice due dates historically reduce late payments by over 35%.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/payments?view=collections')}
                className="text-xs h-8 w-full font-medium"
              >
                Inspect Collection Channels
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Preventive Maintenance
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Quarterly Infrastructure Audit
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Scheduling routine quarterly plumbing and drainage audits pre-empts emergency contractor calls and reduces overall repair expenditure.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/maintenance')}
                className="text-xs h-8 w-full font-medium"
              >
                View Maintenance Backlog
              </Button>
            </div>
          </div>
        </section>

        {/* 7. PERFORMANCE TRENDS (Maximum 3 charts only) */}
        <section aria-label="Performance Trends" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Performance Trends
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lightweight trailing trajectory across revenue, occupancy, and collection velocity
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reports')}
              className="text-xs text-blue-600 hover:text-blue-700 h-8 gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          <PerformanceTrends occupancyTrend={occupancyTrendRows} />
        </section>

        {/* 8. QUICK ACTIONS SECTION (Immediate Navigation, Clean Large Buttons) */}
        <section aria-label="Quick Actions" className="space-y-4 pt-4 border-t border-slate-200/70 dark:border-slate-800/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Quick Actions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Common operational workflows and immediate record creation
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/properties')}
              className="h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 p-2 shadow-2xs group"
            >
              <Building2 className="h-5 w-5 text-blue-600 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Add Property</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/tenants')}
              className="h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 p-2 shadow-2xs group"
            >
              <Users className="h-5 w-5 text-blue-600 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Add Tenant</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/leases')}
              className="h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 p-2 shadow-2xs group"
            >
              <FileText className="h-5 w-5 text-blue-600 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Create Lease</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/payments')}
              className="h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 p-2 shadow-2xs group"
            >
              <CreditCard className="h-5 w-5 text-blue-600 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Record Payment</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/maintenance')}
              className="h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 p-2 shadow-2xs group"
            >
              <Wrench className="h-5 w-5 text-blue-600 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Maintenance Request</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/reports')}
              className="h-20 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-slate-200/80 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60 p-2 shadow-2xs group"
            >
              <TrendingUp className="h-5 w-5 text-blue-600 group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Generate Report</span>
            </Button>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
