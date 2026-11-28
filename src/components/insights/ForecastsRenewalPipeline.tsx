// src/components/insights/ForecastsRenewalPipeline.tsx
// FishGate Design Constitution v1.0 - Forecasts: Lease Expirations & Renewal Pipeline ("What is Likely to Happen Next?")

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, AlertTriangle, CheckCircle2, ArrowRight, Building, Info } from 'lucide-react';
import { LeaseRenewalForecastItem } from './types';

export function ForecastsRenewalPipeline() {
  const pipeline: LeaseRenewalForecastItem[] = [
    {
      id: 'pipe-1',
      tenantName: 'Kigali Tech Innovations Ltd',
      propertyName: 'Vision City Commercial Hub',
      unitNumber: 'C-301',
      expiryDate: '2026-12-25',
      currentRentMonthly: 2400000,
      renewalProbability: 'high',
      riskFactor: '8% escalation rate agreed in preliminary briefing',
      projectedEscalation: '+8.0% (RWF 2,592,000/mo)',
    },
    {
      id: 'pipe-2',
      tenantName: 'East Africa Logistics Corp',
      propertyName: 'Vision City Commercial Hub',
      unitNumber: 'B-104',
      expiryDate: '2027-01-31',
      currentRentMonthly: 3100000,
      renewalProbability: 'medium',
      riskFactor: 'Requesting warehouse flex annex before signing',
      projectedEscalation: '+5.0% (RWF 3,255,000/mo)',
    },
    {
      id: 'pipe-3',
      tenantName: 'Dr. Emmanuel Gasana',
      propertyName: 'Kigali Heights Residences',
      unitNumber: 'A-502',
      expiryDate: '2027-02-15',
      currentRentMonthly: 1200000,
      renewalProbability: 'high',
      riskFactor: 'Tenancy renewal standard rolling term',
      projectedEscalation: '+4.5% (RWF 1,254,000/mo)',
    },
    {
      id: 'pipe-4',
      tenantName: 'Global Horizon NGO Representative',
      propertyName: 'Riverside Luxury Suites',
      unitNumber: 'B-301',
      expiryDate: '2027-03-31',
      currentRentMonthly: 1800000,
      renewalProbability: 'at_risk',
      riskFactor: 'Program donor grant funding renewal contingent in Q1',
      projectedEscalation: 'Pending grant confirmation',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            Forward Lease Expiry & Retention Pipeline (Q1 2027 Horizon)
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Four critical leases represent <strong>RWF 8,500,000</strong> in monthly gross rent expiring across the next 120 days. <strong>78%</strong> of this expiring value is classified as high renewal probability, with only one residential lease (Unit B-301) carrying donor contingent renewal risk.
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
        <div className="p-3 bg-slate-50/80 grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Tenant & Space</div>
          <div className="col-span-2">Expiry Date</div>
          <div className="col-span-2 text-right">Current Rent</div>
          <div className="col-span-2 text-center">Probability</div>
          <div className="col-span-2 text-right">Indexation Projection</div>
        </div>

        {pipeline.map((item) => (
          <div
            key={item.id}
            className="p-3.5 grid grid-cols-12 items-center text-xs hover:bg-slate-50/50 transition-colors"
          >
            <div className="col-span-4 min-w-0 pr-2">
              <span className="font-bold text-slate-900 block truncate">{item.tenantName}</span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <Building className="w-3 h-3 text-slate-400 shrink-0" />
                {item.propertyName} • Unit {item.unitNumber}
              </span>
            </div>

            <div className="col-span-2 font-mono text-[11px] text-slate-700">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {item.expiryDate}
              </span>
            </div>

            <div className="col-span-2 font-mono font-bold text-slate-800 text-right">
              RWF {item.currentRentMonthly.toLocaleString()}
            </div>

            <div className="col-span-2 text-center">
              <Badge
                className={`text-[9px] uppercase font-bold ${
                  item.renewalProbability === 'high'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : item.renewalProbability === 'medium'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {item.renewalProbability.replace('_', ' ')}
              </Badge>
            </div>

            <div className="col-span-2 text-right">
              <span className="font-mono text-[11px] font-semibold text-slate-900 block">
                {item.projectedEscalation}
              </span>
              <span className="text-[10px] text-slate-400 block truncate" title={item.riskFactor}>
                {item.riskFactor}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
