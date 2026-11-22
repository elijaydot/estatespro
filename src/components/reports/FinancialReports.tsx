import React from 'react';
import {
  Download,
  Receipt,
  FileText,
  Clock,
  CreditCard,
  LineChart,
  PieChart,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';

interface FinancialReportsProps {
  reportId: string;
  revenueData: any[];
  paymentStatusData: any[];
  rentRollRows: any[];
  agingRows: any[];
  vendorPaymentRows: any[];
  vendorPaymentTotals: { paid: number; pending: number };
  rraTaxSummary: any;
  payments: any[];
  invoices: any[];
  formatCurrency: (amount: number) => string;
  onExport: () => void;
}

export function FinancialReports({
  reportId,
  revenueData,
  paymentStatusData,
  rentRollRows,
  agingRows,
  vendorPaymentRows,
  vendorPaymentTotals,
  rraTaxSummary,
  payments,
  invoices,
  formatCurrency,
  onExport,
}: FinancialReportsProps) {
  // 1. REVENUE OVERVIEW
  if (reportId === 'revenue') {
    const totalCollected = revenueData.reduce((s, r) => s + (r.revenue || 0), 0);
    const totalInvoiced = revenueData.reduce((s, r) => s + (r.invoiced || 0), 0);
    const netVariance = totalCollected - totalInvoiced;

    return (
      <div className="space-y-6">
        {/* Executive Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Realized</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 font-mono">{formatCurrency(totalCollected)}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Settled receipts
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Scheduled</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 font-mono">{formatCurrency(totalInvoiced)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Invoiced across term</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Realization Variance</p>
            <p className={`text-2xl font-extrabold mt-1 font-mono ${netVariance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {formatCurrency(netVariance)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Difference between collected & invoiced</p>
          </div>
        </div>

        {/* Large Visualization First (Stripe Standard) */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Revenue Realization Inflow</h3>
              <p className="text-xs text-muted-foreground">Monthly collected receipts compared to scheduled invoices</p>
            </div>
            <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>

          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="financialRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Collected Receipts"
                  stroke="hsl(var(--primary))"
                  fill="url(#financialRevenueGradient)"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="invoiced"
                  name="Invoiced Schedule"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Breakdown Table (Detailed Data Later) */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-border/60">
            <h4 className="text-sm font-semibold text-foreground">Monthly Inflow Ledger</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Invoiced Scheduled</th>
                  <th className="py-3 px-4 text-right">Collected Settled</th>
                  <th className="py-3 px-4 text-right">Recovery Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {revenueData.map((row) => {
                  const rate = row.invoiced > 0 ? Math.min(100, Math.round((row.revenue / row.invoiced) * 100)) : 100;
                  return (
                    <tr key={row.month} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium text-foreground">{row.month}</td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">{formatCurrency(row.invoiced)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{formatCurrency(row.revenue)}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={rate >= 90 ? 'default' : rate >= 70 ? 'outline' : 'secondary'}>
                          {rate}%
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

  // 2. COLLECTIONS & PAYMENTS
  if (reportId === 'collections') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Collections & Payment Distribution</h3>
            <p className="text-xs text-muted-foreground">Invoice settlement state and payment status volume</p>
          </div>
          <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Invoice Settlement Distribution</h4>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Payment Summary</h4>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Settled Invoices</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {invoices.filter((i) => i.status === 'paid').length} records
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Pending Settlement</span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {invoices.filter((i) => i.status === 'pending').length} records
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Overdue In Arrears</span>
                <span className="text-base font-bold text-rose-700 dark:text-rose-400 font-mono">
                  {invoices.filter((i) => i.status === 'overdue').length} records
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Payments Table */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-border/60">
            <h4 className="text-sm font-semibold text-foreground">Recent Completed Payments</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payments.slice(0, 10).map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium text-foreground">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                    <td className="py-3 px-4 text-muted-foreground uppercase text-xs">{p.method || 'Bank / MoMo'}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.receipt_number || p.reference || p.id.slice(0, 8)}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] uppercase font-bold">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 3. RENT ROLL
  if (reportId === 'rent-roll') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Audited Portfolio Rent Roll</h3>
            <p className="text-xs text-muted-foreground">Active lease agreements, monthly obligations, and tenant schedule</p>
          </div>
          <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Property / Unit</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Lease Ref</th>
                  <th className="py-3 px-4">Lease Term</th>
                  <th className="py-3 px-4 text-right">Monthly Rent</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rentRollRows.map((row) => (
                  <tr key={row.leaseNumber} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium text-foreground">{row.property} / {row.unit}</td>
                    <td className="py-3 px-4 text-foreground">{row.tenant}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{row.leaseNumber}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{row.startDate} to {row.endDate}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{formatCurrency(row.monthlyRent)}</td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {rentRollRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No active lease records available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 4. AGING & ACCOUNTS RECEIVABLE
  if (reportId === 'aging') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Aging Accounts Receivable</h3>
            <p className="text-xs text-muted-foreground">Unpaid invoices bucketed by days overdue</p>
          </div>
          <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Overdue Days</th>
                  <th className="py-3 px-4">Bucket</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {agingRows.map((row) => (
                  <tr key={row.invoiceNumber} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-foreground">{row.invoiceNumber}</td>
                    <td className="py-3 px-4 text-foreground">{row.tenant}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{row.dueDate}</td>
                    <td className="py-3 px-4 text-xs font-medium text-rose-600 dark:text-rose-400">{row.daysOverdue} days</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {row.bucket}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
                {agingRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No overdue accounts receivable recorded. All accounts in good standing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 5. VENDOR PAYMENTS
  if (reportId === 'vendor-payments') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Vendor & Contractor Disbursements</h3>
            <p className="text-xs text-muted-foreground">Outflow ledger connected to work orders and maintenance</p>
          </div>
          <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Settled Payouts</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {formatCurrency(vendorPaymentTotals.paid)}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Approvals</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatCurrency(vendorPaymentTotals.pending)}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Disbursement Entries</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 font-mono">{vendorPaymentRows.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method / Ref</th>
                  <th className="py-3 px-4">Work Order</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {vendorPaymentRows.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-semibold text-foreground">{payment.vendorName}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {format(new Date(payment.paid_at ?? payment.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {payment.payment_method || '-'}{payment.reference_number ? ` / ${payment.reference_number}` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {payment.maintenance_request_id || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
                {vendorPaymentRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No vendor disbursement entries recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 6. RRA RENTAL TAX DECLARATION
  if (reportId === 'rra-tax') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🇷🇼</span>
              <h3 className="text-base font-bold text-foreground">
                Rwanda Revenue Authority (RRA) — Annual Rental Income Tax Declaration
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Compliant with Law N° 016/2018 on Direct Taxes on Income (Article 49). Annual returns due by <strong>January 31st</strong>.
            </p>
          </div>
          <Button
            onClick={onExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs shrink-0"
          >
            <Download className="h-4 w-4" />
            Export RRA E-Tax CSV
          </Button>
        </div>

        {/* Statutory Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">1. Gross Rental Income</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">
              {rraTaxSummary.totalGrossRent.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">RWF</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Total rent collected across all properties</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-medium">2. Statutory 50% Allowance</p>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-bold">Article 49</Badge>
            </div>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              - {rraTaxSummary.totalStatutoryDeductions.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">RWF</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Automatic flat deduction for maintenance & depreciation</p>
          </div>

          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <p className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400 font-medium">3. Net Taxable Income</p>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {rraTaxSummary.totalTaxableRent.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">RWF</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Gross income less statutory allowance</p>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-medium">4. Est. Tax Payable</p>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">Progressive</Badge>
            </div>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {rraTaxSummary.estimatedTaxPayable.toLocaleString()} <span className="text-xs font-semibold text-muted-foreground">RWF</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Progressive rate (0%, 20%, 30%)</p>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Property & Lease Schedule for Declaration ({rraTaxSummary.records.length} Units)</h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Tenant TIN</th>
                  <th className="py-3 px-4 text-right">Gross Rent</th>
                  <th className="py-3 px-4 text-right">50% Deduction</th>
                  <th className="py-3 px-4 text-right">Net Taxable</th>
                  <th className="py-3 px-4 text-right">Est. Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rraTaxSummary.records.map((rec: any, i: number) => (
                  <tr key={`${rec.propertyId}-${rec.unitId || i}`} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium text-foreground">{rec.propertyName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{rec.unitNumber || '-'}</td>
                    <td className="py-3 px-4 text-foreground">{rec.tenantName || 'N/A'}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{rec.tenantTin || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium">{rec.grossRentCollected.toLocaleString()} RWF</td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      - {rec.statutoryDeduction.toLocaleString()} RWF
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {rec.netTaxableRent.toLocaleString()} RWF
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                      {rec.estimatedTax.toLocaleString()} RWF
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
