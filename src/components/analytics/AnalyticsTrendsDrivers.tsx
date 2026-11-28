// src/components/analytics/AnalyticsTrendsDrivers.tsx
// FishGate Design Constitution v1.0 - Section 4: Trends & Drivers (Explaining Underlying Causes)
// Answers: "Why did a trend exist?" Never show numbers without clear root-cause explanation.

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Wrench,
  Users,
  Building,
  ArrowRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { TrendDriverItem } from './types';

interface AnalyticsTrendsDriversProps {
  drivers?: TrendDriverItem[];
}

export function AnalyticsTrendsDrivers({
  drivers,
}: AnalyticsTrendsDriversProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const defaultDrivers: TrendDriverItem[] = [
    {
      id: 'driver-1',
      title: 'Gross Revenue Acceleration (+4.8% QoQ)',
      category: 'revenue',
      trendOutcome: 'Net collections expanded to RWF 31.35M this month.',
      primaryCause: 'Occupancy expansion at Kigali Heights coupled with 8% indexation renewal on Vision City commercial leases.',
      supportingDetail: 'Kigali Heights added 2 long-term residential leases (+RWF 1.2M/mo), while Vision City absorbed scheduled statutory annual indexation without lease churn.',
      affectedProperties: ['Kigali Heights Residences', 'Vision City Commercial & Residential'],
      impactMagnitude: '+RWF 1,450,000 / mo recurring',
      actionableNextStep: 'Lock multi-year extensions for remaining 2 vacant units.',
    },
    {
      id: 'driver-2',
      title: 'Maintenance Spend Surge (+14.2% Variance)',
      category: 'maintenance',
      trendOutcome: 'Facilities expenditure totaled RWF 5.0M vs RWF 4.4M budget.',
      primaryCause: 'HVAC chiller compressor rebuild and mandatory elevator hoist overhaul clustered in the same operational cycle.',
      supportingDetail: 'Kigali Heights required an emergency hoist replacement (RWF 1.95M) and Vision City serviced aged rooftop condensers ahead of seasonal dry heat.',
      affectedProperties: ['Kigali Heights Residences', 'Vision City Commercial & Residential'],
      impactMagnitude: 'RWF 1,950,000 one-time CAPEX',
      actionableNextStep: 'Execute preventative quarterly SLA with Schindler to eliminate reactive premiums.',
    },
    {
      id: 'driver-3',
      title: 'Collection Speed Improvement (-3.4 Days Delay)',
      category: 'collections',
      trendOutcome: '99.4% of November rental invoices cleared by the 5th business day.',
      primaryCause: 'Migration of 38 tenant accounts to direct Mobile Money & bank auto-debit reconciliation.',
      supportingDetail: 'Automated SMS invoices sent 7 days prior to due dates eliminated manual check-clearing delays and banking friction.',
      affectedProperties: ['Riverside Luxury Suites', 'Kigali Heights Residences'],
      impactMagnitude: 'Zero arrears > 30 days',
      actionableNextStep: 'Onboard remaining 7 residential tenants to direct debit mandate.',
    },
    {
      id: 'driver-4',
      title: 'Rapid Work Order Turnaround (Averaging 1.8 Days)',
      category: 'team',
      trendOutcome: 'Operational ticket resolution speed improved 47% compared to Q3.',
      primaryCause: 'Direct contractor dispatch integration and pre-approved RWF 200,000 maintenance delegation thresholds.',
      supportingDetail: 'Property managers now dispatch certified trade vendors directly without waiting for board authorization on minor plumbing and electrical repairs.',
      affectedProperties: ['All Properties'],
      impactMagnitude: '96% tenant satisfaction rating',
      actionableNextStep: 'Extend pre-approved dispatch protocol to HVAC filter maintenance.',
    },
  ];

  const items = drivers || defaultDrivers;
  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((item) => item.category === selectedCategory);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'revenue':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">Revenue Driver</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">Cost Driver</Badge>;
      case 'collections':
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">Cashflow Driver</Badge>;
      case 'team':
      default:
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px]">Operations Driver</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Trends & Drivers (Causal Explanations)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Explains the underlying reasons and real-world forces driving performance changes across FishGate.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2.5 text-xs font-semibold rounded-md ${
              selectedCategory === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setSelectedCategory('all')}
          >
            All Causes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2.5 text-xs font-semibold rounded-md ${
              selectedCategory === 'revenue' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setSelectedCategory('revenue')}
          >
            Revenue
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2.5 text-xs font-semibold rounded-md ${
              selectedCategory === 'maintenance' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setSelectedCategory('maintenance')}
          >
            Costs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2.5 text-xs font-semibold rounded-md ${
              selectedCategory === 'collections' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setSelectedCategory('collections')}
          >
            Collections
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className="p-4 border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryBadge(item.category)}
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {item.impactMagnitude}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900">{item.title}</h3>
                </div>
              </div>

              {/* WHY DID IT HAPPEN (Causal Box) */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-md space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 uppercase tracking-wide">
                  <Info className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Why It Happened:</span>
                </div>
                <p className="text-xs text-blue-950 font-medium leading-relaxed pl-5">
                  {item.primaryCause}
                </p>
              </div>

              {/* Supporting context */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.supportingDetail}
              </p>

              {/* Affected Properties */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Premises:</span>
                {item.affectedProperties.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Actionable next step */}
            {item.actionableNextStep && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Executive Next Step:</span>
                <span className="font-semibold text-blue-700 flex items-center gap-1">
                  <span>{item.actionableNextStep}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
