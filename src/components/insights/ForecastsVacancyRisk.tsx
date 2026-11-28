// src/components/insights/ForecastsVacancyRisk.tsx
// FishGate Design Constitution v1.0 - Forecasts: Occupancy & Vacancy Risk Modeling ("What is Likely to Happen Next?")

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Calendar, Home, ArrowRight, Info } from 'lucide-react';

export function ForecastsVacancyRisk() {
  const vacancyRiskItems = [
    {
      unit: 'Unit A-201',
      propertyName: 'Riverside Luxury Suites',
      status: 'Move-out completed',
      downtimeBufferDays: 14,
      releasingStatus: '3 qualified viewing inquiries in pipeline',
      expectedInflowDate: '2026-12-10',
      lossExposure: 'RWF 320,000 turnover buffer',
    },
    {
      unit: 'Unit B-301',
      propertyName: 'Riverside Luxury Suites',
      status: 'Notice period pending Q1 renewal',
      downtimeBufferDays: 21,
      releasingStatus: 'Corporate listing drafted for marketing',
      expectedInflowDate: '2027-04-15',
      lossExposure: 'RWF 600,000 potential gap',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            Vacancy Exposure & Turnover Modeling (Next 120 Days)
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Portfolio vacancy rate is modeled to remain under <strong>5.8%</strong> through Q1 2027. Immediate exposure is isolated to Unit A-201 (remediation turnover in progress, expected re-tenancy Dec 10) with minimal net revenue disruption.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vacancyRiskItems.map((v) => (
          <Card key={v.unit} className="p-4 border-slate-200 bg-white shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900">{v.unit} • {v.propertyName}</span>
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">{v.status}</Badge>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Turnover Buffer: <strong>{v.downtimeBufferDays} days</strong></span>
              <span className="font-mono font-bold text-red-700">{v.lossExposure}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Next Tenancy Target: <strong>{v.expectedInflowDate}</strong></span>
              <span className="text-blue-700 font-medium">{v.releasingStatus}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
