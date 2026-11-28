// src/components/forecasts/modes/RevenueOutlookMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Outlook Mode: Revenue Outlook
// Structure: Future Outlook Context, Revenue Forecast, Collection Forecast, Revenue Risks, Revenue Opportunities, Scenario Planning, Planning Observations

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
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

export function RevenueOutlookMode() {
  const navigate = useNavigate();

  const monthlyCollections = [
    { month: 'Dec 2026', projected: 31.8, baseline: 31.5, indexation: '+RWF 300K', driver: 'Initial holiday intake' },
    { month: 'Jan 2027', projected: 32.5, baseline: 31.5, indexation: '+RWF 1,000K', driver: 'Vision City annual 8% indexation' },
    { month: 'Feb 2027', projected: 33.2, baseline: 31.5, indexation: '+RWF 1,700K', driver: 'Full absorption of 2 new residential units' },
    { month: 'Mar 2027', projected: 33.6, baseline: 31.5, indexation: '+RWF 2,100K', driver: 'Stabilized Q1 cashflow trajectory' },
  ];

  const handleExport = () => {
    const data = monthlyCollections.map((m) => ({
      Month: m.month,
      'Baseline (RWF M)': m.baseline,
      'Projected Collections (RWF M)': m.projected,
      'Incremental Gain': m.indexation,
      'Planning Driver': m.driver,
    }));
    downloadCsv(data, `FishGate_Revenue_Forecast_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Revenue Forecast Exported',
      description: 'Downloaded monthly revenue & collections trajectory CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. FUTURE OUTLOOK CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Projected Monthly Rent Roll
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">RWF 33.2M</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              +5.4% Forward
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Projected Q1 monthly run-rate based on confirmed contracts.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Scheduled Indexation
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">+RWF 950K</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              Jan 01 Effective
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Vision City commercial annual statutory 8% rate increase.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Revenue at Risk
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">RWF 1.6M</span>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
              1 Commercial Lease
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Kigali Tech Innovations renewal pending final signature.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Expected Collection Rate
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">99.2%</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              Automated Billing
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Bank debit and mobile money recurring mandates active.
          </p>
        </Card>
      </div>

      {/* 2. REVENUE & COLLECTION FORECAST TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Forward Collections Trajectory (Q1 2027)</h4>
            <p className="text-[11px] text-slate-500">Compares expected gross rent against current contractual baseline.</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Trajectory</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Forecast Horizon</th>
                <th className="py-2.5 px-3">Contractual Baseline</th>
                <th className="py-2.5 px-3">Projected Invoiced Collections</th>
                <th className="py-2.5 px-3">Incremental Delta</th>
                <th className="py-2.5 px-3 text-right">Planning Driver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyCollections.map((m) => (
                <tr key={m.month} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{m.month}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">RWF {m.baseline}M</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">RWF {m.projected}M</td>
                  <td className="py-3 px-3">
                    <span className="text-emerald-700 font-mono font-semibold">{m.indexation}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">{m.driver}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. REVENUE RISKS & REVENUE OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <h4 className="font-bold text-xs text-slate-900">Revenue Risk: Concentrated Commercial Expirations</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Three commercial leases expire in January. A failure to renew would lower monthly collections by RWF 3.2M.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Action: Dispatch renewal riders</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/leases')}
            >
              <span>Manage Leases</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">Revenue Opportunity: Prime Vacancy Placement</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Placing corporate tenants into the 2 remaining Kigali Heights suites will add RWF 2.4M in monthly collections.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Capture RWF 28.8M/yr</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50/50"
              onClick={() => navigate('/units')}
            >
              <span>Market Units</span>
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
          Revenue Planning Observation
        </span>
        <p className="text-slate-700 leading-relaxed font-medium">
          Revenue outlook remains positive through Q1 2027, though locking the three January commercial lease maturities is critical to sustaining the RWF 33.2M run-rate.
        </p>
      </div>
    </div>
  );
}
