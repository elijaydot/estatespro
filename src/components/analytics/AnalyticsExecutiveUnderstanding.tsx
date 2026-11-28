// src/components/analytics/AnalyticsExecutiveUnderstanding.tsx
// FishGate Design Constitution v1.0 - Section 2: Executive Understanding (Max 4 Summary Indicators, Not Dashboards)

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  DollarSign,
  Wrench,
  Users,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ExecutiveIndicator } from './types';

interface AnalyticsExecutiveUnderstandingProps {
  indicators?: ExecutiveIndicator[];
}

export function AnalyticsExecutiveUnderstanding({
  indicators,
}: AnalyticsExecutiveUnderstandingProps) {
  const defaultIndicators: ExecutiveIndicator[] = [
    {
      id: 'exec-1',
      title: 'Portfolio Health',
      headlineValue: '94.2%',
      statusBadge: 'Optimal Capacity',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      primaryContext: '45 of 48 active units occupied',
      secondaryExplanation: '+1.8% expansion vs. Q3 benchmark',
      trend: 'up',
      trendText: '+1.8% QoQ',
    },
    {
      id: 'exec-2',
      title: 'Financial Health',
      headlineValue: '99.4%',
      statusBadge: 'Strong Realization',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      primaryContext: 'RWF 31.5M Nov collections realized',
      secondaryExplanation: '84% Net Operating Margin maintained',
      trend: 'up',
      trendText: '101% of Target',
    },
    {
      id: 'exec-3',
      title: 'Operational Health',
      headlineValue: '1.8 Days',
      statusBadge: 'Healthy SLA',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      primaryContext: 'Average maintenance ticket resolution',
      secondaryExplanation: '96% first-time fix; zero statutory violations',
      trend: 'up',
      trendText: '-47% turnaround time',
    },
    {
      id: 'exec-4',
      title: 'Productivity Health',
      headlineValue: '85.7%',
      statusBadge: 'Disciplined Execution',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      primaryContext: '126 operational actions concluded',
      secondaryExplanation: '94% delivered within SLA target date',
      trend: 'up',
      trendText: '+6.4% completion rate',
    },
  ];

  const items = indicators || defaultIndicators;

  const getIcon = (id: string) => {
    switch (id) {
      case 'exec-1':
        return Building2;
      case 'exec-2':
        return DollarSign;
      case 'exec-3':
        return Wrench;
      case 'exec-4':
      default:
        return Users;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-0.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Executive Understanding (Portfolio Vital Signs)</span>
        </h2>
        <span className="text-[11px] text-slate-400">15-second executive comprehension</span>
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
                    {ind.headlineValue}
                  </span>
                  <Badge variant="outline" className={`text-[9px] font-semibold ${ind.badgeClass}`}>
                    {ind.statusBadge}
                  </Badge>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-800">
                  {ind.primaryContext}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="truncate">{ind.secondaryExplanation}</span>
                <span className="font-mono font-bold text-emerald-700 shrink-0 ml-1">
                  {ind.trendText}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
