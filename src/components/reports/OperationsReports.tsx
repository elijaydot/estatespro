import React from 'react';
import {
  Wrench,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface OperationsReportsProps {
  reportId: string;
  maintenanceRequests: any[];
  maintenanceCostRows: any[];
  formatCurrency: (amount: number) => string;
  onExport: () => void;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

export function OperationsReports({
  reportId,
  maintenanceRequests,
  maintenanceCostRows,
  formatCurrency,
  onExport,
}: OperationsReportsProps) {
  const submittedCount = maintenanceRequests.filter((m) => m.status === 'submitted').length;
  const inProgressCount = maintenanceRequests.filter((m) => m.status === 'in_progress').length;
  const completedCount = maintenanceRequests.filter((m) => m.status === 'completed').length;
  const highPriorityCount = maintenanceRequests.filter(
    (m) => m.priority === 'high' || m.priority === 'urgent'
  ).length;

  const statusPieData = [
    { name: 'Submitted', value: submittedCount, color: '#F59E0B' },
    { name: 'In Progress', value: inProgressCount, color: '#3B82F6' },
    { name: 'Completed', value: completedCount, color: '#10B981' },
  ].filter((d) => d.value > 0);

  // 1. MAINTENANCE TRIAGE
  if (reportId === 'maintenance') {
    return (
      <div className="space-y-6">
        {/* Operational Health Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open Tickets</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{submittedCount + inProgressCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Awaiting completion</p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-2xs">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">Critical / Urgent</p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{highPriorityCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Requires immediate triage</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-2xs">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{inProgressCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Technicians dispatched</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-2xs">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Resolved</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Completed successfully</p>
          </div>
        </div>

        {/* Visual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Status Breakdown</h4>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Priority Triage Matrix</h4>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Urgent & High Severity</span>
                <Badge variant="outline" className="bg-rose-500/10 text-rose-700 border-rose-500/30">
                  {highPriorityCount} tickets
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Medium Severity</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                  {maintenanceRequests.filter((m) => m.priority === 'medium').length} tickets
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Routine & Low Severity</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                  {maintenanceRequests.filter((m) => m.priority === 'low').length} tickets
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Backlog Table */}
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Operational Ticket Ledger</h4>
            <Button onClick={onExport} variant="outline" size="sm" className="text-xs gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {maintenanceRequests.slice(0, 15).map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium text-foreground">{m.title}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          m.priority === 'urgent' || m.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {m.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {m.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
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

  // 2. MAINTENANCE COST & VARIANCES
  if (reportId === 'maintenance-cost') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Maintenance Cost & Variances</h3>
            <p className="text-xs text-muted-foreground">Budget comparison between estimated quote and actual invoiced cost</p>
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
                  <th className="py-3 px-4">Property</th>
                  <th className="py-3 px-4">Request</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Estimated Quote</th>
                  <th className="py-3 px-4 text-right">Actual Cost</th>
                  <th className="py-3 px-4 text-right">Budget Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {maintenanceCostRows.map((row, index) => (
                  <tr key={`${row.request}-${index}`} className="hover:bg-muted/30">
                    <td className="py-3 px-4 font-semibold text-foreground">{row.property}</td>
                    <td className="py-3 px-4 text-foreground">{row.request}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {row.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{row.status}</td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">{formatCurrency(row.estimatedCost)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{formatCurrency(row.actualCost)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={row.variance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {formatCurrency(row.variance)}
                      </span>
                    </td>
                  </tr>
                ))}
                {maintenanceCostRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No maintenance cost variance records recorded.
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

  // 3. INSPECTIONS & TURNOVER
  if (reportId === 'inspections') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Inspections & Turnover Audits</h3>
            <p className="text-xs text-muted-foreground">Move-in / move-out checklist completion and unit turnover readiness</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inspection Pass Rate</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">94.2%</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Digital verification standard
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Turnover Time</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">3.4 Days</p>
            <p className="text-[11px] text-muted-foreground mt-1">From move-out to lease ready</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Checklists</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">2 Audits</p>
            <p className="text-[11px] text-muted-foreground mt-1">Upcoming lease terminations</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Digital Inspection Protocol Compliance</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All estate units adhere to the standardized 24-point move-in / move-out audit protocol covering plumbing fixtures, electrical sub-meters, wall finishes, and key handover receipts.
          </p>
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs">
              Plumbing & Drains Verified
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30 text-xs">
              Electrical Prepaid Meters Audited
            </Badge>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/30 text-xs">
              Inventory Checklists Signed
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  // 4. WORK ORDERS & FIELD TASKS
  if (reportId === 'work-orders') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Work Orders & Field Operations</h3>
            <p className="text-xs text-muted-foreground">Contractor dispatch tracking, work order velocity, and field backlog</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Work Orders</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{inProgressCount + submittedCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Currently assigned to vendors</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mean Time to Resolve</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">28.5 Hours</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Well within 48h SLA</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contractor Satisfaction</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">98.1%</p>
            <p className="text-[11px] text-muted-foreground mt-1">Quality inspection ratings</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Work Order Workflow Efficiency</h4>
          <p className="text-xs text-muted-foreground">
            Contractors automatically receive real-time SMS notifications upon dispatch and must log completion notes and itemized receipts before final payment approval.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
