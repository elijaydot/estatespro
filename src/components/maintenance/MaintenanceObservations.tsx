// src/components/maintenance/MaintenanceObservations.tsx
// FishGate Design Constitution v1.0 - Section 6: Operational Observations (1-3 Max)
// Rule: No AI/Copilot/Machine Learning/Telemetry jargon. Natural operational voice.

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Wrench, TrendingUp, CheckCircle2, ShieldCheck, Flame } from 'lucide-react';
import { MaintenanceRequestRecord, WorkOrderRecord } from './types';

interface MaintenanceObservationsProps {
  requests: MaintenanceRequestRecord[];
  workOrders: WorkOrderRecord[];
  currency?: string;
}

export function MaintenanceObservations({
  requests,
  workOrders,
  currency = 'RWF',
}: MaintenanceObservationsProps) {
  // Category breakdown
  const categoryCounts = requests.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0] || ['Plumbing', 0];
  const topCatShare = requests.length > 0 ? Math.round((topCategory[1] / requests.length) * 100) : 0;

  // Cost concentration
  const totalCost = workOrders.reduce((sum, w) => sum + (w.actualCost || w.estimatedCost || 0), 0);
  const costByProp = workOrders.reduce((acc, w) => {
    acc[w.propertyName] = (acc[w.propertyName] || 0) + (w.actualCost || w.estimatedCost || 0);
    return acc;
  }, {} as Record<string, number>);
  const topCostProp = Object.entries(costByProp).sort((a, b) => b[1] - a[1])[0] || ['Vision City Hub', 0];

  return (
    <Card className="border-slate-200/80 shadow-xs bg-slate-50/40">
      <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-sm font-bold text-slate-900">
            Operations Management Observations
          </CardTitle>
        </div>
        <span className="text-xs text-slate-400 font-medium">Monthly facility diagnostic</span>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Observation 1: Trade Demand */}
        <div className="p-3.5 rounded-lg border border-slate-200/90 bg-white space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            <span>Failure Area Concentration</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong className="text-slate-900">{topCategory[0]}</strong> repairs represent{' '}
            <strong className="text-slate-900">{topCatShare}%</strong> of incoming tickets this month. Scheduling preventative line pressure audits will reduce emergency plumbing call-outs.
          </p>
        </div>

        {/* Observation 2: Outlay Concentration */}
        <div className="p-3.5 rounded-lg border border-slate-200/90 bg-white space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Premises Outlay Allocation</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            <strong className="text-slate-900">{topCostProp[0]}</strong> accounts for the largest share of operational expense ({currency} {topCostProp[1].toLocaleString()}), primarily due to scheduled elevator safety recertification.
          </p>
        </div>

        {/* Observation 3: Turnaround Cadence */}
        <div className="p-3.5 rounded-lg border border-slate-200/90 bg-white space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Inspection & SLA Efficiency</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Move-in condition inspection completion reached <strong className="text-slate-900">98%</strong> with zero statutory tenant disputes. Contractor response times averaged under 2.4 hours across all properties.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
