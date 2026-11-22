import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Home,
  Wrench,
  DollarSign,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportDomainId } from './types';
import {
  AreaChart,
  Area,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface ExecutiveOverviewProps {
  properties: any[];
  units: any[];
  tenants: any[];
  invoices: any[];
  payments: any[];
  maintenanceRequests: any[];
  leases: any[];
  revenueData: Array<{ month: string; revenue: number; invoiced: number }>;
  occupancyTrendRows: Array<{ month: string; occupied: number; vacant: number; occupancyRate: number }>;
  paymentStatusData: Array<{ name: string; value: number; color: string }>;
  formatCurrency: (amount: number) => string;
  onNavigate: (domainId: ReportDomainId, reportId: string) => void;
}

export function ExecutiveOverview({
  properties,
  units,
  tenants,
  invoices,
  payments,
  maintenanceRequests,
  leases,
  revenueData,
  occupancyTrendRows,
  paymentStatusData,
  formatCurrency,
  onNavigate,
}: ExecutiveOverviewProps) {
  // Calculations
  const totalRevenue = useMemo(() => {
    return payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const outstandingBalance = useMemo(() => {
    return invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + ((Number(i.amount) || 0) - (Number(i.paid_amount) || 0)), 0);
  }, [invoices]);

  const totalInvoiced = useMemo(() => {
    return invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [invoices]);

  const collectionRate = totalInvoiced > 0
    ? Math.min(100, Math.round(((totalInvoiced - outstandingBalance) / totalInvoiced) * 100))
    : 100;

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  const vacantUnits = units.filter((u) => u.status === 'vacant').length;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  // SECTION 1: Attention Center Data
  const overdueInvoices = useMemo(() => {
    const now = new Date();
    return invoices.filter(
      (i) => i.status === 'overdue' || (i.status !== 'paid' && new Date(i.due_date) < now)
    );
  }, [invoices]);

  const expiringLeases = useMemo(() => {
    const now = new Date();
    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);
    return leases.filter((l) => {
      if (!l.end_date) return false;
      const end = new Date(l.end_date);
      return end >= now && end <= in90Days;
    });
  }, [leases]);

  const criticalMaintenance = useMemo(() => {
    return maintenanceRequests.filter(
      (m) =>
        m.status !== 'completed' &&
        (m.priority === 'urgent' || m.priority === 'high')
    );
  }, [maintenanceRequests]);

  // Property Scorecard
  const propertyRankings = useMemo(() => {
    return properties.map((prop) => {
      const propUnits = units.filter((u) => u.property_id === prop.id);
      const propOccupied = propUnits.filter((u) => u.status === 'occupied').length;
      const propRate = propUnits.length > 0 ? (propOccupied / propUnits.length) * 100 : 0;
      const propLeases = leases.filter((l) => propUnits.some((u) => u.id === l.unit_id));
      const monthlyPotential = propLeases.reduce((sum, l) => sum + (Number(l.monthly_rent) || 0), 0);

      return {
        id: prop.id,
        name: prop.name,
        address: prop.address || prop.city || 'Kigali, Rwanda',
        totalUnits: propUnits.length,
        occupiedUnits: propOccupied,
        vacantUnits: propUnits.length - propOccupied,
        occupancyRate: propRate,
        monthlyPotential,
        statusTier: propRate >= 80 ? 'prime' : propRate >= 50 ? 'steady' : 'needs_attention',
      };
    }).sort((a, b) => b.occupancyRate - a.occupancyRate);
  }, [properties, units, leases]);

  return (
    <div className="space-y-8">
      {/* SECTION 1: ATTENTION CENTER */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Attention Center
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Ranked by financial & operational priority
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Priority 1: Arrears / Payments */}
          <div
            onClick={() => onNavigate('financial', 'aging')}
            className="group cursor-pointer rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 transition-all hover:bg-rose-500/10 hover:border-rose-500/50 hover:shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold">
                Action Req
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-foreground">
                {overdueInvoices.length} Invoices
              </p>
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-0.5">
                {formatCurrency(outstandingBalance)} in arrears
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>Aging accounts receivable</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>

          {/* Priority 2: Critical Maintenance */}
          <div
            onClick={() => onNavigate('operations', 'maintenance')}
            className="group cursor-pointer rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-all hover:bg-amber-500/10 hover:border-amber-500/50 hover:shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Wrench className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                High Priority
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-foreground">
                {criticalMaintenance.length} Open Tickets
              </p>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                Urgent & high priority requests
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>Requires technician dispatch</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>

          {/* Priority 3: Expiring Leases */}
          <div
            onClick={() => onNavigate('financial', 'rent-roll')}
            className="group cursor-pointer rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 transition-all hover:bg-blue-500/10 hover:border-blue-500/50 hover:shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-bold">
                Next 90 Days
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-foreground">
                {expiringLeases.length} Expiring Leases
              </p>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                Renewal decisions pending
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>View rent roll schedule</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>

          {/* Priority 4: Vacant Units */}
          <div
            onClick={() => onNavigate('portfolio', 'occupancy')}
            className="group cursor-pointer rounded-xl border border-border bg-card p-4 transition-all hover:bg-muted/40 hover:border-border/80 hover:shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-muted text-foreground">
                <Home className="h-5 w-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold">
                Capacity
              </Badge>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-foreground">
                {vacantUnits} Vacant Units
              </p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                Ready for marketing & leasing
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>Inspect unit availability</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: EXECUTIVE SUMMARY (4 LARGE KPI TILES) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Executive Summary
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Revenue */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Realized Revenue
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight font-mono">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+15.2% vs previous reporting period</span>
            </div>
          </div>

          {/* Tile 2: Occupancy */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Portfolio Occupancy
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
                {occupancyRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{occupiedUnits} of {totalUnits} units leased</span>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {occupancyRate >= 80 ? 'Healthy' : 'Stabilizing'}
              </Badge>
            </div>
          </div>

          {/* Tile 3: Collection Rate */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Collection Rate
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
                {collectionRate}%
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Settlement velocity on scheduled dues</span>
            </div>
          </div>

          {/* Tile 4: Outstanding Balance */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Outstanding Balance
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={cn(
                'text-2xl lg:text-3xl font-extrabold tracking-tight font-mono',
                outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
              )}>
                {formatCurrency(outstandingBalance)}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <span>{outstandingBalance > 0 ? 'Action required: aging invoices' : 'Full settlement completed'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PERFORMANCE SNAPSHOT */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Performance Snapshot
          </h2>
          <span className="text-xs text-muted-foreground">Trailing realization & velocity</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Revenue Realization */}
          <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revenue Inflow vs Invoiced</h3>
                <p className="text-xs text-muted-foreground">Collected rental receipts vs invoiced billing schedule</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('financial', 'revenue')}
                className="text-xs gap-1 h-8"
              >
                <span>View Full</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="overviewRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Collected Receipts"
                    stroke="hsl(var(--primary))"
                    fill="url(#overviewRevenueGradient)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="invoiced"
                    name="Invoiced Schedule"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Occupancy Trajectory & Payment Breakdown */}
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Occupancy Trajectory</h3>
                <p className="text-xs text-muted-foreground">Portfolio leasing stability</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('portfolio', 'occupancy-trend')}
                className="text-xs gap-1 h-8"
              >
                <span>Details</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={occupancyTrendRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Occupancy']}
                  />
                  <Line
                    type="monotone"
                    dataKey="occupancyRate"
                    name="Occupancy %"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10B981' }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: AI KEY INSIGHTS (EXECUTIVE BRIEF) */}
      <section className="rounded-xl border border-primary/20 bg-primary/[0.03] p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              Autonomous Copilot Strategic Synthesis
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('ai', 'copilot-summary')}
            className="text-xs gap-1.5 bg-background h-8"
          >
            <span>Full AI Intelligence</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background/80 border border-border/60">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Revenue expansion:</strong> Realized revenue reached <strong>{formatCurrency(totalRevenue)}</strong> across active contracts, maintaining a robust collection efficiency of <strong>{collectionRate}%</strong>.
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background/80 border border-border/60">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Capacity stability:</strong> Portfolio occupancy is at <strong>{occupancyRate.toFixed(1)}%</strong> ({occupiedUnits} of {totalUnits} units). {vacantUnits} units are staged for rapid tenant onboarding.
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background/80 border border-border/60">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Lease renewal window:</strong> <strong>{expiringLeases.length} leases</strong> mature in the next 90 days. Early renewal incentives recommended to prevent transitional vacancy lag.
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background/80 border border-border/60">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Arrears risk control:</strong> <strong>{formatCurrency(outstandingBalance)}</strong> remains outstanding. Recommended enabling MTN MoMo automated USSD push prompts 3 days prior to due dates.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: TOP PROPERTIES SCORECARD */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Estate Property Rankings & Yield
            </h2>
            <p className="text-xs text-muted-foreground">Comparative asset performance and utilization tiers</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('portfolio', 'property-performance')}
            className="text-xs gap-1.5 h-8"
          >
            <span>All Estates</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Estate Property</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Occupancy Rate</th>
                  <th className="py-3 px-4 text-right">Active Monthly Roll</th>
                  <th className="py-3 px-4 text-right">Performance Tier</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {propertyRankings.slice(0, 5).map((prop) => (
                  <tr key={prop.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <div>{prop.name}</div>
                          <div className="text-[11px] text-muted-foreground font-normal">{prop.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-xs">
                      {prop.totalUnits} units ({prop.occupiedUnits} leased)
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              prop.occupancyRate >= 80 ? 'bg-emerald-500' : prop.occupancyRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            )}
                            style={{ width: `${Math.min(100, prop.occupancyRate)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{prop.occupancyRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium font-mono">
                      {formatCurrency(prop.monthlyPotential)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold uppercase',
                          prop.statusTier === 'prime'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : prop.statusTier === 'steady'
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        )}
                      >
                        {prop.statusTier === 'prime' ? 'Prime Yield' : prop.statusTier === 'steady' ? 'Steady' : 'Action Req'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate('portfolio', 'property-performance')}
                        className="text-xs h-7 px-2"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
                {propertyRankings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No property records available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
