// src/components/forecasts/ForecastsFutureOutlook.tsx
// FishGate Design Constitution v1.0 - Section 2: Future Outlook (Max 4 Cards, Simple, Clear, Future-Focused)

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Building,
  FileText,
  Wrench,
  TrendingUp,
  Calendar,
  Compass,
} from 'lucide-react';
import { FutureOutlookIndicator } from './types';

interface ForecastsFutureOutlookProps {
  indicators?: FutureOutlookIndicator[];
}

export function ForecastsFutureOutlook({
  indicators,
}: ForecastsFutureOutlookProps) {
  const defaultIndicators: FutureOutlookIndicator[] = [
    {
      id: 'outlook-1',
      title: 'Revenue Outlook',
      forecastValue: 'RWF 33.2M',
      statusBadge: '+5.4% Projected',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      horizon: 'Q1 2027 Run-Rate',
      forwardTrajectory: 'Projected Monthly Rent Roll',
      context: 'Assumes 2 pending residential leases activate and scheduled commercial indexation holds.',
      secondaryNote: 'Expected cashflow coverage: 114%',
    },
    {
      id: 'outlook-2',
      title: 'Occupancy Outlook',
      forecastValue: '95.8%',
      statusBadge: 'Target 95%+',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      horizon: 'Next 90 Days',
      forwardTrajectory: 'Projected Portfolio Capacity',
      context: '46 of 48 active units expected occupied following upcoming December diplomatic arrivals.',
      secondaryNote: 'Vacancy exposure: 2 units',
    },
    {
      id: 'outlook-3',
      title: 'Lease Outlook',
      forecastValue: '8 Expirations',
      statusBadge: '87.5% Renewal Target',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      horizon: '60-Day Forward Horizon',
      forwardTrajectory: 'Upcoming Contract Maturities',
      context: '7 of 8 tenants have expressed preliminary intention to extend with 30-day notice terms.',
      secondaryNote: 'RWF 5.2M/mo renewal value',
    },
    {
      id: 'outlook-4',
      title: 'Operational Demand Outlook',
      forecastValue: '18 Work Orders',
      statusBadge: 'Capacity Balanced',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      horizon: 'December Planned Load',
      forwardTrajectory: 'Projected Facilities Demand',
      context: '12 routine preventive checks and 6 seasonal HVAC coil flushes assigned to certified trade partners.',
      secondaryNote: 'All vendors confirmed available',
    },
  ];

  const items = indicators || defaultIndicators;

  const getIcon = (id: string) => {
    switch (id) {
      case 'outlook-1':
        return DollarSign;
      case 'outlook-2':
        return Building;
      case 'outlook-3':
        return FileText;
      case 'outlook-4':
      default:
        return Wrench;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-0.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>Future Outlook (Forward Operational Projections)</span>
        </h2>
        <span className="text-[11px] text-slate-400">15-second planning comprehension</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((ind) => {
          const Icon = getIcon(ind.id);

          return (
            <Card
              key={ind.id}
              className="p-3.5 border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {ind.title}
                  </span>
                  <div className="p-1 rounded border border-slate-200 bg-slate-50 text-slate-600">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                    {ind.forecastValue}
                  </span>
                  <Badge variant="outline" className={`text-[9px] font-semibold ${ind.badgeClass}`}>
                    {ind.statusBadge}
                  </Badge>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-800">
                  {ind.forwardTrajectory}
                </p>

                <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                  {ind.context}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate">{ind.horizon}</span>
                <span className="font-mono font-bold text-slate-700 shrink-0 ml-1">
                  {ind.secondaryNote}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
