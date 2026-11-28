// src/components/forecasts/modes/WorkloadOutlookMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Outlook Mode: Workload Outlook
// Structure: Future Outlook Context, Future Tasks, Future Approvals, Future Resource Demand, Operational Capacity, Workload Risks, Workload Opportunities, Scenario Planning

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';
import { ForecastsScenarioModeling } from '../ForecastsScenarioModeling';

export function WorkloadOutlookMode() {
  const navigate = useNavigate();

  const workloadPlan = [
    { department: 'Facilities & Maintenance', plannedTasks: 14, forwardApprovals: 2, capacityLoad: '78% Load', lead: 'Alexandre Nshimiyimana', status: 'Balanced' },
    { department: 'Leasing & Resident Relations', plannedTasks: 8, forwardApprovals: 1, capacityLoad: '62% Load', lead: 'Diane Uwase', status: 'Available' },
    { department: 'Finance & Collections', plannedTasks: 6, forwardApprovals: 1, capacityLoad: '55% Load', lead: 'Eric Habimana', status: 'Optimal' },
    { department: 'Executive Management & Legal', plannedTasks: 3, forwardApprovals: 3, capacityLoad: '45% Load', lead: 'Jean Claude Bizimana', status: 'Available' },
  ];

  const handleExport = () => {
    const data = workloadPlan.map((w) => ({
      Department: w.department,
      'Planned Tasks': w.plannedTasks,
      'Forward Approvals': w.forwardApprovals,
      'Capacity Load': w.capacityLoad,
      Lead: w.lead,
      Status: w.status,
    }));
    downloadCsv(data, `FishGate_Workload_Forecast_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Workload Forecast Exported',
      description: 'Downloaded department operational capacity and staffing forecast CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. FUTURE OUTLOOK CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Forward Tasks (30d)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">31 Tasks</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              Within Quota
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Total scheduled operational actions across 4 departments.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Executive Approvals
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">4 Decisions</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              Queued
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Schindler agreement, solar tender, and commercial riders.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Peak Department Load
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">78%</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              Facilities
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Facilities team absorbs highest forward volume in December.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Resource Readiness
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">100%</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              SLA Compliant
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Staff capacity verified sufficient for all Q1 commitments.
          </p>
        </Card>
      </div>

      {/* 2. FORWARD TASKS & DEPARTMENT CAPACITY TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Department Forward Task Allocation & Capacity</h4>
            <p className="text-[11px] text-slate-500">Projected workload volume and supervisory assignment across operational units.</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Workload</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Operational Department</th>
                <th className="py-2.5 px-3">Supervisory Lead</th>
                <th className="py-2.5 px-3 font-mono">Planned Tasks</th>
                <th className="py-2.5 px-3 font-mono">Forward Approvals</th>
                <th className="py-2.5 px-3">Projected Load</th>
                <th className="py-2.5 px-3 text-right">Capacity State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workloadPlan.map((w) => (
                <tr key={w.department} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="p-1 rounded bg-slate-100 text-slate-700">
                      <Users className="w-3.5 h-3.5" />
                    </span>
                    <span>{w.department}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{w.lead}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{w.plannedTasks} tasks</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{w.forwardApprovals} queued</td>
                  <td className="py-3 px-3 font-mono text-blue-700 font-semibold">{w.capacityLoad}</td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                      {w.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. WORKLOAD RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-xs text-slate-900">Workload Risk: Year-End Approval Concentration</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Multiple vendor contracts and financial reconciliations mature in the last 10 days of December, risking executive bottlenecking.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Action: Pre-authorize decisions</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/approvals')}
            >
              <span>View Approvals</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs text-slate-900">Workload Opportunity: Cross-Department Load Balancing</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Leasing assistants can assist with move-in check-in walk-throughs to relieve facilities staff during peak intake weeks.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Smooth peak workload</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-blue-700 hover:text-blue-900 border-blue-200 bg-blue-50/50"
              onClick={() => navigate('/tasks')}
            >
              <span>Balance Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. COLLAPSIBLE SCENARIO PLANNING */}
      <ForecastsScenarioModeling />

      {/* 5. PLANNING OBSERVATIONS */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
          Workload Planning Observation
        </span>
        <p className="text-slate-700 leading-relaxed font-medium">
          Operational capacity remains balanced with dedicated vendor coverage scheduled across all departments, ensuring smooth year-end execution.
        </p>
      </div>
    </div>
  );
}
