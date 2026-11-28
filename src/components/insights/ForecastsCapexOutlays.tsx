// src/components/insights/ForecastsCapexOutlays.tsx
// FishGate Design Constitution v1.0 - Forecasts: Capital Outlay & CAPEX Forecast ("What is Likely to Happen Next?")

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, ShieldAlert, Calendar, Building, DollarSign, Info } from 'lucide-react';
import { CapexForecastItem } from './types';

export function ForecastsCapexOutlays() {
  const capexItems: CapexForecastItem[] = [
    {
      id: 'cap-1',
      equipmentOrProject: 'Secondary Elevator Hydraulic Pack & Drive Servicing',
      propertyName: 'Kigali Heights Residences',
      projectedQuarter: 'Q1 2027',
      estimatedCost: 2200000,
      statutoryMandate: true,
      justification: 'Statutory 5-year heavy lift overhaul mandated by Rwanda Housing Authority building regulations.',
    },
    {
      id: 'cap-2',
      equipmentOrProject: 'Central Solar Inverter & Battery Bank Recalibration',
      propertyName: 'Vision City Commercial Hub',
      projectedQuarter: 'Q2 2027',
      estimatedCost: 3500000,
      statutoryMandate: false,
      justification: 'Preventative lithium bank capacity rejuvenation to maintain 99.9% uptime during grid outages.',
    },
    {
      id: 'cap-3',
      equipmentOrProject: 'Rooftop Elastomeric Waterproofing Membrane Renewal',
      propertyName: 'Riverside Luxury Suites',
      projectedQuarter: 'Q2 2027',
      estimatedCost: 1800000,
      statutoryMandate: false,
      justification: 'Pre-rainy season preventative waterproofing on north elevation parapet wall.',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            2027 Capital Asset Outlay & Reserve Allocation Horizon
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Projected CAPEX for FY2027 totals <strong>RWF 7,500,000</strong> across three major asset preservation events. RWF 2.2M is designated for mandatory Q1 lift hydraulic certification, which is already 85% funded through accumulated sinking fund reserves.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {capexItems.map((item) => (
          <Card
            key={item.id}
            className="p-3.5 border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-mono">
                  {item.projectedQuarter}
                </Badge>
                {item.statutoryMandate && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] uppercase font-bold">
                    Statutory Mandate
                  </Badge>
                )}
              </div>

              <h4 className="font-bold text-xs text-slate-900 mb-1 leading-snug">
                {item.equipmentOrProject}
              </h4>

              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                {item.justification}
              </p>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400 truncate">{item.propertyName}</span>
              <span className="font-mono font-black text-slate-900 shrink-0">
                RWF {item.estimatedCost.toLocaleString()}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
