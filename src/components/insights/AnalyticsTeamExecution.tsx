// src/components/insights/AnalyticsTeamExecution.tsx
// FishGate Design Constitution v1.0 - Analytics: Operational Workload & Department Performance ("Why Did It Happen?")
// Relocated from Tasks per Task Page Simplification Directive

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  Users,
  Building,
  TrendingUp,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function AnalyticsTeamExecution() {
  const departmentWorkload = [
    { department: 'Facilities & Maint.', active: 8, completed: 34, completionRate: 81, avgResolutionDays: 1.8 },
    { department: 'Leasing & Residents', active: 5, completed: 28, completionRate: 85, avgResolutionDays: 2.1 },
    { department: 'Finance & Accounts', active: 4, completed: 31, completionRate: 89, avgResolutionDays: 1.4 },
    { department: 'Executive & Legal', active: 2, completed: 14, completionRate: 88, avgResolutionDays: 2.8 },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            Operational Workload & Department Turnaround Analysis
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Across 126 operational tasks tracked this month, portfolio team members maintained an aggregate <strong>85.7% completion rate</strong>. Facilities turnaround averaged <strong>1.8 days</strong> per work order, reflecting rapid vendor dispatch on critical maintenance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Completion Rate Chart */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="mb-3">
            <h4 className="font-bold text-xs text-slate-900">Task Completion Rate by Department (%)</h4>
            <p className="text-[11px] text-slate-500">Explains operational velocity across operational units.</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentWorkload} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  unit="%"
                />
                <Tooltip
                  formatter={(value: any) => [`${value}% completed`, 'Completion Rate']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="completionRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Target completion SLA threshold: &gt; 80%</span>
            <span className="font-semibold text-emerald-700">All Departments Compliant</span>
          </div>
        </Card>

        {/* Workload Distribution and Turnaround Table */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-3">
              <h4 className="font-bold text-xs text-slate-900">Workload Volume & Turnaround Times</h4>
              <p className="text-[11px] text-slate-500">Identifies resource bottlenecks and execution capacity.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {departmentWorkload.map((d) => (
                <div key={d.department} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block">{d.department}</span>
                    <span className="text-[11px] text-slate-500">
                      {d.active} in-flight • {d.completed} completed
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-800 block">
                      {d.avgResolutionDays} days
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">avg turnaround</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Zero tasks stalled over 14 consecutive days</span>
            <span className="font-semibold text-blue-700">High Execution Discipline</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
