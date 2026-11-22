import React, { useState } from 'react';
import {
  Building2,
  TrendingUp,
  BarChart3,
  Building,
  Download,
  Printer,
  ChevronDown,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart as RechartsLineChart,
  Line,
} from 'recharts';
import { type CompanyExecutiveReportRow } from '@/hooks/useCompanyExecutiveReport';

interface PortfolioReportsProps {
  reportId: string;
  properties: any[];
  units: any[];
  leases: any[];
  occupancyByProperty: any[];
  occupancyTrendRows: any[];
  executiveRows: CompanyExecutiveReportRow[];
  executiveLoading: boolean;
  formatCurrency: (amount: number) => string;
  onExport: () => void;
  onExecutivePdf: () => void;
}

export function PortfolioReports({
  reportId,
  properties,
  units,
  leases,
  occupancyByProperty,
  occupancyTrendRows,
  executiveRows,
  executiveLoading,
  formatCurrency,
  onExport,
  onExecutivePdf,
}: PortfolioReportsProps) {
  const [selectedExecutiveCompanyId, setSelectedExecutiveCompanyId] = useState<string | null>(null);
  const selectedExecutiveCompany = executiveRows.find((r) => r.company_id === selectedExecutiveCompanyId) ?? null;

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  const overallRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  // 1. OCCUPANCY BY PROPERTY
  if (reportId === 'occupancy') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Occupancy by Estate Property</h3>
            <p className="text-xs text-muted-foreground">Comparative capacity and occupied vs vacant units</p>
          </div>
          <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyByProperty} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="occupied" name="Occupied Units" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="vacant" name="Vacant Units" fill="#94A3B8" stackId="a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // 2. OCCUPANCY TRAJECTORY
  if (reportId === 'occupancy-trend') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Occupancy Historical Trajectory</h3>
            <p className="text-xs text-muted-foreground">Portfolio-wide leasing percentage across reporting periods</p>
          </div>
          <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={occupancyTrendRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Occupancy']}
                />
                <Line type="monotone" dataKey="occupancyRate" name="Occupancy %" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: '#10B981' }} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // 3. PROPERTY PERFORMANCE & ASSET UTILIZATION
  if (reportId === 'property-performance') {
    const totalPotential = leases.reduce((s, l) => s + (Number(l.monthly_rent) || 0), 0);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Managed Estates</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{properties.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Cross-regional assets</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Units</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{totalUnits}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{occupiedUnits} occupied ({overallRate.toFixed(1)}%)</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Potential</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 font-mono">{formatCurrency(totalPotential)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Active rent roll sum</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Annual Gross Potential</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(totalPotential * 12)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Projected annual gross</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-border/60">
            <h4 className="text-sm font-semibold text-foreground">Estate Performance Schedule</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Estate Property</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Occupancy Rate</th>
                  <th className="py-3 px-4">Active Leases</th>
                  <th className="py-3 px-4 text-right">Yield Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {properties.map((prop) => {
                  const propUnits = units.filter((u) => u.property_id === prop.id);
                  const propOccupied = propUnits.filter((u) => u.status === 'occupied').length;
                  const propRate = propUnits.length > 0 ? (propOccupied / propUnits.length) * 100 : 0;
                  return (
                    <tr key={prop.id} className="hover:bg-muted/30">
                      <td className="py-3.5 px-4 font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {prop.name}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">{propUnits.length}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold">{propRate.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({propOccupied}/{propUnits.length})</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {leases.filter((l) => l.unit_id && propUnits.some((u) => u.id === l.unit_id)).length}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            propRate >= 80
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                              : propRate >= 50
                              ? 'bg-blue-500/10 text-blue-700 border-blue-500/30'
                              : 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                          }`}
                        >
                          {propRate >= 80 ? 'Prime' : propRate >= 50 ? 'Steady' : 'Action Req'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 4. ALL COMPANIES EXECUTIVE BENCHMARK
  if (reportId === 'executive') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">All Companies Executive Enterprise Benchmark</h3>
            <p className="text-xs text-muted-foreground">Multi-organization consolidated performance & compliance scorecard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button onClick={onExecutivePdf} variant="outline" size="sm" className="text-xs gap-1.5 h-8" disabled={executiveRows.length === 0}>
              <Printer className="h-3.5 w-3.5" />
              <span>Print PDF</span>
            </Button>
          </div>
        </div>

        {executiveLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : executiveRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No accessible enterprise companies found.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organizations</p>
                <p className="text-2xl font-bold text-foreground mt-1">{executiveRows.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Properties</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {executiveRows.reduce((sum, row) => sum + Number(row.property_count), 0)}
                </p>
              </div>
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Collected</p>
                <p className="text-2xl font-bold text-foreground mt-1 font-mono">
                  {formatCurrency(executiveRows.reduce((sum, row) => sum + Number(row.total_collected), 0))}
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Arrears</p>
                <p className="text-2xl font-bold text-foreground mt-1 font-mono">
                  {formatCurrency(executiveRows.reduce((sum, row) => sum + Number(row.outstanding_balance), 0))}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Access Role</th>
                      <th className="py-3 px-4 text-right">Properties</th>
                      <th className="py-3 px-4 text-right">Units</th>
                      <th className="py-3 px-4 text-right">Occupancy</th>
                      <th className="py-3 px-4 text-right">Collected</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {executiveRows.map((row) => (
                      <tr key={row.company_id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div>{row.company_name}</div>
                          <div className="text-xs text-muted-foreground font-normal">{row.company_email || 'No email recorded'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {row.access_role.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{row.property_count}</td>
                        <td className="py-3 px-4 text-right font-medium">{row.unit_count}</td>
                        <td className="py-3 px-4 text-right font-semibold">{row.occupancy_rate}%</td>
                        <td className="py-3 px-4 text-right font-mono font-medium">{formatCurrency(Number(row.total_collected))}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                          {formatCurrency(Number(row.outstanding_balance))}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedExecutiveCompanyId(selectedExecutiveCompanyId === row.company_id ? null : row.company_id)}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${selectedExecutiveCompanyId === row.company_id ? 'rotate-180' : ''}`} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
