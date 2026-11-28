// src/components/forecasts/modes/OccupancyOutlookMode.tsx
// FishGate Design Constitution v1.0 - Dedicated Outlook Mode: Occupancy Outlook
// Structure: Future Outlook Context, Occupancy Forecast, Vacancy Forecast, Lease Expiration Impact, Occupancy Risks, Occupancy Opportunities, Scenario Planning, Planning Observations

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv } from '@/lib/download';
import { toast } from '@/components/ui/use-toast';
import { ForecastsScenarioModeling } from '../ForecastsScenarioModeling';

export function OccupancyOutlookMode() {
  const navigate = useNavigate();

  const occupancyForecast = [
    { property: 'Riverside Luxury Suites', units: 14, currentOccupied: 14, currentRate: 100, projectedRate: 100, vacantUnits: 0, outlook: 'Full Capacity' },
    { property: 'Kigali Heights Residences', units: 20, currentOccupied: 19, currentRate: 95, projectedRate: 100, vacantUnits: 1, outlook: 'Final Lease Pending' },
    { property: 'Vision City Commercial & Residential', units: 14, currentOccupied: 12, currentRate: 85.7, projectedRate: 92.8, vacantUnits: 2, outlook: '1 Space Reserved' },
  ];

  const handleExport = () => {
    const data = occupancyForecast.map((o) => ({
      Property: o.property,
      'Total Units': o.units,
      'Current Occupied': o.currentOccupied,
      'Current Rate (%)': o.currentRate,
      'Projected Rate (%)': o.projectedRate,
      'Vacant Units': o.vacantUnits,
      Outlook: o.outlook,
    }));
    downloadCsv(data, `FishGate_Occupancy_Forecast_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Occupancy Forecast Exported',
      description: 'Downloaded property occupancy and vacancy projections CSV.',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. FUTURE OUTLOOK CONTEXT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Projected Occupancy
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">95.8%</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              +1.6% Forward
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            46 of 48 units expected occupied following upcoming intakes.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Vacancy Pipeline
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">2 Inquiries</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
              High Intent
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Unit B-204 at Kigali Heights has lease contracts dispatched.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Stress-Tested Floor
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">91.6%</span>
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
              Worst-Case
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Minimum occupancy if two expiring leases choose not to renew.
          </p>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Expirations (60 Days)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">8 Units</span>
            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">
              87.5% Target
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Active renewal discussions underway across all 8 accounts.
          </p>
        </Card>
      </div>

      {/* 2. OCCUPANCY & VACANCY FORECAST TABLE */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="font-bold text-xs text-slate-900">Property Capacity & Vacancy Absorption Trajectory</h4>
            <p className="text-[11px] text-slate-500">Forward occupancy outlook per property asset through Q1 2027.</p>
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
                <th className="py-2.5 px-3">Premises Asset</th>
                <th className="py-2.5 px-3 font-mono">Units</th>
                <th className="py-2.5 px-3">Current Occupancy</th>
                <th className="py-2.5 px-3 font-mono">Q1 Projected</th>
                <th className="py-2.5 px-3">Vacant Units</th>
                <th className="py-2.5 px-3 text-right">Forward Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {occupancyForecast.map((o) => (
                <tr key={o.property} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">{o.property}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{o.units}</td>
                  <td className="py-3 px-3 font-mono text-slate-800">{o.currentRate}%</td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">{o.projectedRate}%</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{o.vacantUnits} vacant</td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                      {o.outlook}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. OCCUPANCY RISKS & OPPORTUNITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="font-bold text-xs text-slate-900">Occupancy Risk: December Turnaround Friction</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            If outgoing residents delay unit handover, incoming tenants may experience intake slippage past Jan 1st.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Mitigation: Pre-inspection 14 days ahead</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-slate-700 hover:text-slate-900"
              onClick={() => navigate('/maintenance')}
            >
              <span>Schedule Inspection</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-xs text-slate-900">Occupancy Opportunity: 100% Portfolio Push</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            Closing 2 pending applications at Kigali Heights and Vision City achieves 100% portfolio capacity across all 48 units.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">Target: Zero vacant units</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-semibold gap-1 text-emerald-700 hover:text-emerald-900 border-emerald-200 bg-emerald-50/50"
              onClick={() => navigate('/units')}
            >
              <span>View Vacant Units</span>
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
          Occupancy Planning Observation
        </span>
        <p className="text-slate-700 leading-relaxed font-medium">
          Occupancy is expected to remain stable above 95% if current renewal activity continues, with the worst-case floor holding safely at 91.6%.
        </p>
      </div>
    </div>
  );
}
