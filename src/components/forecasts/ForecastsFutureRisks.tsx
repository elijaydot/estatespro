// src/components/forecasts/ForecastsFutureRisks.tsx
// FishGate Design Constitution v1.0 - Section 4: Future Risks (Early Warning)
// Purpose: Early warning identifying forward operational, revenue, and lease bottlenecks.

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Building,
  Wrench,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ForecastRiskItem } from './types';

interface ForecastsFutureRisksProps {
  risks?: ForecastRiskItem[];
}

export function ForecastsFutureRisks({
  risks,
}: ForecastsFutureRisksProps) {
  const navigate = useNavigate();

  const defaultRisks: ForecastRiskItem[] = [
    {
      id: 'frisk-1',
      title: 'Upcoming Cluster of Lease Expirations',
      category: 'lease',
      horizon: 'Next Quarter (Q1 2027)',
      severity: 'high',
      impactDescription: '8 leases expire next quarter, representing RWF 5,200,000 monthly rent exposure across Riverside and Vision City.',
      earlyWarningTrigger: '60-day notice horizon countdown initiates on December 1st.',
      preparednessAction: 'Dispatch pre-approved renewal terms and indexation schedules immediately.',
      actionUrl: '/leases',
      actionLabel: 'Initiate Early Renewals',
    },
    {
      id: 'frisk-2',
      title: 'Revenue Concentration in Premier Properties',
      category: 'revenue',
      horizon: 'Ongoing Forward Horizon',
      severity: 'medium',
      impactDescription: 'Over 82% of gross rental income is concentrated across 3 premier assets, magnifying financial impact if commercial leases churn.',
      earlyWarningTrigger: 'Commercial lease renewal window opens in January.',
      preparednessAction: 'Execute multi-year extension riders with 5% indexation caps to lock tenancy.',
      actionUrl: '/properties',
      actionLabel: 'Review Portfolio Spread',
    },
    {
      id: 'frisk-3',
      title: 'Vendor Availability Constraint During Seasonal Rush',
      category: 'vendor',
      horizon: 'December 15 - January 10',
      severity: 'medium',
      impactDescription: 'Certified electrical and HVAC vendors face holiday contractor capacity bottlenecks, risking delayed routine maintenance.',
      earlyWarningTrigger: 'Contractor holiday roster cutoffs scheduled for Dec 10.',
      preparednessAction: 'Pre-book December maintenance slots with ElectroPower and Schindler before Dec 5.',
      actionUrl: '/maintenance',
      actionLabel: 'Pre-Book Contractors',
    },
  ];

  const items = risks || defaultRisks;

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'lease':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Lease Risk</Badge>;
      case 'revenue':
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-[10px]">Revenue Concentration</Badge>;
      case 'vendor':
      default:
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">Vendor Capacity</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Future Risks (Early Warning System)</span>
        </h2>
        <p className="text-xs text-slate-500">
          Proactive alerts highlighting forward vulnerabilities before they impact operations or cashflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((risk) => (
          <Card
            key={risk.id}
            className="p-4 border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  {getCategoryBadge(risk.category)}
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">
                    {risk.horizon}
                  </span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 leading-snug">{risk.title}</h3>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Impact Potential:</span>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {risk.impactDescription}
                </p>
              </div>

              <div className="text-xs space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Early Warning Trigger:</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {risk.earlyWarningTrigger}
                </p>
              </div>

              <div className="p-2 bg-amber-50/60 border border-amber-200/70 rounded text-xs space-y-0.5">
                <span className="text-[10px] font-bold text-amber-900 uppercase">Preparedness Action:</span>
                <p className="text-amber-950 text-[11px] font-medium leading-relaxed">
                  {risk.preparednessAction}
                </p>
              </div>
            </div>

            {risk.actionUrl && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-semibold gap-1 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
                  onClick={() => navigate(risk.actionUrl!)}
                >
                  <span>{risk.actionLabel || 'Prepare Now'}</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
