// src/components/analytics/modes/TeamAnalyticsMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Workspace Mode: Team Analytics
// Relocated completely from Tasks per managerial separation directive.
// Structure: Executive Context, Completion Rate, Department Performance, Workload Distribution, Productivity Analysis, SLA Performance, Bottlenecks, Work Risks, Team Opportunities, Team Analysis Table

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
  Users,
  Award,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';

export function TeamAnalyticsMode() {
  const navigate = useNavigate();

  const departmentWorkload = [
    { department: 'Facilities & Maintenance', active: 8, completed: 34, completionRate: 81, avgTurnaroundDays: 1.8, onTimeSla: '92%', lead: 'Alexandre Nshimiyimana' },
    { department: 'Leasing & Resident Relations', active: 5, completed: 28, completionRate: 85, avgTurnaroundDays: 2.1, onTimeSla: '96%', lead: 'Diane Uwase' },
    { department: 'Finance & Collections', active: 4, completed: 31, completionRate: 89, avgTurnaroundDays: 1.4, onTimeSla: '98%', lead: 'Eric Habimana' },
    { department: 'Executive Management & Legal', active: 2, completed: 14, completionRate: 88, avgTurnaroundDays: 2.8, onTimeSla: '91%', lead: 'Jean Claude Bizimana' },
  ];

  const teamRoster = [
    { name: 'Alexandre Nshimiyimana', role: 'Facilities Operations Lead', department: 'Facilities', closedTasks: 24, onTimeRate: '96%', efficiencyRating: 'High Velocity', status: 'Optimal Load' },
    { name: 'Diane Uwase', role: 'Resident Experience Lead', department: 'Leasing', closedTasks: 19, onTimeRate: '98%', efficiencyRating: 'Superior', status: 'Balanced' },
    { name: 'Eric Habimana', role: 'Property Accountant', department: 'Finance', closedTasks: 22, onTimeRate: '95%', efficiencyRating: 'High Velocity', status: 'Balanced' },
    { name: 'Jean Claude Bizimana', role: 'Senior Property Manager', department: 'Executive', closedTasks: 16, onTimeRate: '94%', efficiencyRating: 'High Velocity', status: 'Available Capacity' },
  ];

  const handleExport = () => {
    const data = teamRoster.map((t) => ({
      Staff: t.name,
      Role: t.role,
      Department: t.department,
      'Closed Tasks': t.closedTasks,
      'On-Time SLA': t.onTimeRate,
      'Efficiency Rating': t.efficiencyRating,
      Status: t.status,
    }));
    downloadCsv(data, `FishGate_Team_Analytics_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Team Analytics Exported',
      description: 'Downloaded staff productivity and completion metrics CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. EXECUTIVE CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Overall Completion Rate
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">85.7%</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              +6.4% MoM
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            107 of 126 operational work items successfully concluded this cycle.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            SLA Delivery Rate
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">94.3%</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              Target &gt; 90%
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            94 out of every 100 assignments completed prior to deadline date.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Active Work Items
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">19 Items</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              Balanced Load
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Current in-flight tickets distributed evenly across 4 departments.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Stalled Tasks
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">0 Stalled</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              Zero Delay &gt; 14d
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Strict task velocity maintained with zero dormant blockers.
          </p>
        </Card>
      </div>

      {/* 2. COMPLETION RATE, WORKLOAD DISTRIBUTION & BOTTLENECKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <h4 className="font-bold text-xs text-slate-900 mb-1">Department Completion Rate & Velocity</h4>
          <p className="text-[11px] text-slate-500 mb-3">
            Explains task closure percentage and average turnaround speed by operational team.
          </p>
          <div className="space-y-3">
            {departmentWorkload.map((dept) => (
              <div key={dept.department} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{dept.department}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">{dept.avgTurnaroundDays}d turnaround</span>
                    <span className="font-mono font-bold text-slate-900">{dept.completionRate}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${dept.completionRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Lead: {dept.lead}</span>
                  <span className="font-mono text-emerald-700 font-semibold">{dept.onTimeSla} on-time SLA</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-900 mb-1">Operational Capacity & Bottleneck Diagnosis</h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Identifies resource constraints and execution friction points.
            </p>
            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Facilities Throughput Bottleneck</span>
                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-200">
                    Monitoring
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Facilities staff currently handles 8 concurrent tickets. Peak load occurs on Mondays following weekend resident maintenance submissions.
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-950">Finance & Collections Velocity</span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-300">
                    Peak Performance
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Accounting turnaround averaged 1.4 days, the fastest across the business, due to direct automated bank reconciliation.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Overall Team Productivity Health</span>
            <span className="font-semibold text-purple-700 font-mono">Disciplined Execution</span>
          </div>
        </Card>
      </div>

      {/* 3. WORK RISKS & TEAM OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-xs text-slate-900">Work Risk: Seasonal Turnover Workload Concentration</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Concurrent lease moves in late December could strain facilities technicians during holiday leave rotations.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Mitigation: Pre-assign contractor trade support</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/tasks')}
            >
              <span>View Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h4 className="font-bold text-xs text-slate-900">Team Opportunity: Field Checklist Digitization</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Deploying mobile unit check-in forms accelerates make-ready turnaround by 1.2 days, allowing incoming tenants earlier intake.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Save 25 staff hours/mo</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-purple-700 hover:text-purple-900 border-purple-200 bg-purple-50/50"
              onClick={() => navigate('/maintenance')}
            >
              <span>Configure Protocols</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. TEAM ANALYSIS TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Team Member Execution & Delivery Scorecard</h4>
            <p className="text-[11px] text-slate-500">Closed assignments, on-time delivery rate, and execution efficiency index.</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Table</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Team Member</th>
                <th className="py-2.5 px-3">Role & Responsibility</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3 font-mono">Closed Items</th>
                <th className="py-2.5 px-3">On-Time SLA</th>
                <th className="py-2.5 px-3">Efficiency Index</th>
                <th className="py-2.5 px-3 text-right">Capacity State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamRoster.map((t) => (
                <tr key={t.name} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="p-1 rounded bg-slate-100 text-slate-700">
                      <Users className="w-3.5 h-3.5" />
                    </span>
                    <span>{t.name}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{t.role}</td>
                  <td className="py-3 px-3 text-slate-500">{t.department}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{t.closedTasks} closed</td>
                  <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">{t.onTimeRate}</td>
                  <td className="py-3 px-3 font-medium text-purple-700">{t.efficiencyRating}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-600">
                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
