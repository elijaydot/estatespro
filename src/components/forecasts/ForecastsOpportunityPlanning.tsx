// src/components/forecasts/ForecastsOpportunityPlanning.tsx
// FishGate Design Constitution v1.0 - Section 5: Opportunity Planning
// Examples: Vacant units represent potential revenue; Lease renewals improve occupancy; Property upgrades increase rent potential.

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Building,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OpportunityPlanningItem } from './types';

interface ForecastsOpportunityPlanningProps {
  opportunities?: OpportunityPlanningItem[];
}

export function ForecastsOpportunityPlanning({
  opportunities,
}: ForecastsOpportunityPlanningProps) {
  const navigate = useNavigate();

  const defaultOpportunities: OpportunityPlanningItem[] = [
    {
      id: 'fopp-1',
      title: 'Vacant Unit Absorption (RWF 3.5M Potential)',
      category: 'vacancy',
      projectedGain: '+RWF 3,500,000 / mo',
      horizon: 'Next 30-45 Days',
      requiredEnabler: '2 high-intent expat inquiries for Apt B-204 at Kigali Heights and Unit C-302 at Vision City.',
      actionPlan: 'Finalize make-ready walkthrough and dispatch digital lease contracts to capture seasonal relocations.',
      actionUrl: '/units',
      actionLabel: 'Market Vacant Units',
    },
    {
      id: 'fopp-2',
      title: 'Proactive Lease Renewals (> 95% Occupancy Lock)',
      category: 'renewal',
      projectedGain: 'RWF 5,200,000 / mo secured',
      horizon: 'Next 60 Days',
      requiredEnabler: 'Pre-negotiated 2-year extensions with multi-year tenancy discounts for diplomatic tenants.',
      actionPlan: 'Issue statutory renewal letters with 45-day lead time to eliminate inter-tenancy vacancy loss.',
      actionUrl: '/leases',
      actionLabel: 'Lock Renewals',
    },
    {
      id: 'fopp-3',
      title: 'Common-Area Energy Efficiency Retrofit',
      category: 'upgrade',
      projectedGain: 'RWF 1,200,000 / mo OPEX saving',
      horizon: 'Q1 2027 Implementation',
      requiredEnabler: 'Board approval for Solar PV installation powering common-area daytime chillers and water pumps.',
      actionPlan: 'Authorize pre-vetted contractor tender to lower operating expense ratio from 15.9% to 12.1%.',
      actionUrl: '/approvals',
      actionLabel: 'Review Energy Tender',
    },
  ];

  const items = opportunities || defaultOpportunities;

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'vacancy':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">Vacancy Capture</Badge>;
      case 'renewal':
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">Retention Upside</Badge>;
      case 'upgrade':
      default:
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">Asset Upgrade</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Opportunity Planning (Strategic Forward Upside)</span>
        </h2>
        <p className="text-xs text-slate-500">
          Identifies actionable steps to boost rent potential, improve occupancy, and capture operational efficiencies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((opp) => (
          <Card
            key={opp.id}
            className="p-4 border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  {getCategoryBadge(opp.category)}
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    {opp.projectedGain}
                  </span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 leading-snug">{opp.title}</h3>
              </div>

              <div className="p-2.5 bg-emerald-50/50 border border-emerald-200/60 rounded text-xs space-y-1">
                <span className="text-[10px] font-bold text-emerald-900 uppercase">Strategic Enabler:</span>
                <p className="text-emerald-950 text-[11px] leading-relaxed">
                  {opp.requiredEnabler}
                </p>
              </div>

              <div className="text-xs space-y-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Operational Action Plan:</span>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  {opp.actionPlan}
                </p>
              </div>
            </div>

            {opp.actionUrl && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-semibold gap-1 text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200"
                  onClick={() => navigate(opp.actionUrl!)}
                >
                  <span>{opp.actionLabel || 'Capture Upside'}</span>
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
