// src/components/forecasts/modes/MaintenanceOutlookMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Outlook Mode: Maintenance Outlook
// Structure: Future Outlook Context, Maintenance Demand, Cost Forecast, Recurring Problem Analysis, Vendor Capacity, Maintenance Risks, Maintenance Opportunities, Scenario Planning

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  Clock,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';
import { ForecastsScenarioModeling } from '../ForecastsScenarioModeling';

export function MaintenanceOutlookMode() {
  const navigate = useNavigate();

  const maintenanceSchedule = [
    { category: 'HVAC Seasonal Servicing', scheduledDate: 'Dec 05, 2026', premises: 'All Properties', estimatedCost: 'RWF 850,000', vendor: 'ElectroPower Rwanda', priority: 'Preventative' },
    { category: 'Elevator Safety Recertification', scheduledDate: 'Dec 12, 2026', premises: 'Kigali Heights & Riverside', estimatedCost: 'RWF 1,200,000', vendor: 'Schindler & Otis Engineering', priority: 'Statutory' },
    { category: 'Water Pressure Booster Overhaul', scheduledDate: 'Dec 19, 2026', premises: 'Vision City Common Bay', estimatedCost: 'RWF 650,000', vendor: 'Wasac Certified Plumbing', priority: 'Routine' },
    { category: 'Rooftop Drainage Waterproofing', scheduledDate: 'Dec 22, 2026', premises: 'Riverside Luxury Suites', estimatedCost: 'RWF 450,000', vendor: 'Kigali Clean & Green Sanitation', priority: 'Preventative' },
  ];

  const handleExport = () => {
    const data = maintenanceSchedule.map((m) => ({
      Category: m.category,
      'Scheduled Date': m.scheduledDate,
      Premises: m.premises,
      'Budgeted Cost': m.estimatedCost,
      'Certified Vendor': m.vendor,
      Priority: m.priority,
    }));
    downloadCsv(data, `FishGate_Maintenance_Forecast_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Maintenance Forecast Exported',
      description: 'Downloaded December preventative maintenance schedule CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. FUTURE OUTLOOK CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            December Planned Load
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">18 Orders</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              Within Capacity
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            18 routine preventative visits assigned to certified contractors.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Projected Facilities Budget
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">RWF 4.2M</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              On-Budget
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Total expected facilities spend contained within OPEX limits.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Statutory Recertification
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">2 Audits</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              Mandatory
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Elevator hoist safety inspection scheduled with Rwanda Fire Authority.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Recurring Problem Focus
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold text-slate-900 truncate">Apt C-301 Chiller</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
              Rebuild
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Scheduled for complete valve rebuild to prevent summer failures.
          </p>
        </Card>
      </div>

      {/* 2. MAINTENANCE DEMAND & COST FORECAST TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Forward Preventative Maintenance & Cost Schedule</h4>
            <p className="text-[11px] text-slate-500">Planned work orders, allocated budget, certified partners, and execution dates.</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Schedule</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Maintenance Work Order</th>
                <th className="py-2.5 px-3">Scheduled Date</th>
                <th className="py-2.5 px-3">Premises</th>
                <th className="py-2.5 px-3">Estimated Cost</th>
                <th className="py-2.5 px-3">Certified Partner</th>
                <th className="py-2.5 px-3 text-right">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenanceSchedule.map((m) => (
                <tr key={m.category} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    <span>{m.category}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">{m.scheduledDate}</td>
                  <td className="py-3 px-3 text-slate-600">{m.premises}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">{m.estimatedCost}</td>
                  <td className="py-3 px-3 text-slate-700">{m.vendor}</td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                      {m.priority}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. MAINTENANCE RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <h4 className="font-bold text-xs text-slate-900">Maintenance Risk: Holiday Vendor Bottleneck</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Certified contractors face holiday scheduling slowdowns past Dec 15. Emergency response times could expand without advance booking.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Action: Pre-confirm December calendar</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/maintenance')}
            >
              <span>Manage Vendors</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">Maintenance Opportunity: Comprehensive Lift SLA</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Consolidating elevator maintenance across all 3 properties under an annual Schindler agreement cuts repair costs by 18%.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Eliminate reactive overruns</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50/50"
              onClick={() => navigate('/approvals')}
            >
              <span>Review Tender</span>
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
          Maintenance Planning Observation
        </span>
        <p className="text-slate-700 leading-relaxed font-medium">
          Maintenance demand is expected to increase during statutory inspection season, requiring advance vendor reservation to avoid turnaround delays.
        </p>
      </div>
    </div>
  );
}
