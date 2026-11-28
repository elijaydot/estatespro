// src/components/forecasts/ForecastsWorkspaceCards.tsx
// FishGate Design Constitution v1.0 - Forecasts Workspace Mode Architecture
// Large primary planning navigation cards + Single-Sentence Planning Takeaway

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Building,
  FileText,
  Wrench,
  Briefcase,
  Compass,
  Sparkles,
} from 'lucide-react';
import { ForecastWorkspaceMode } from './types';

interface ForecastsWorkspaceCardsProps {
  activeMode: ForecastWorkspaceMode;
  onSelectMode: (mode: ForecastWorkspaceMode) => void;
}

export function ForecastsWorkspaceCards({
  activeMode,
  onSelectMode,
}: ForecastsWorkspaceCardsProps) {
  const modes: {
    id: ForecastWorkspaceMode;
    title: string;
    description: string;
    icon: typeof DollarSign;
    metric: string;
    metricLabel: string;
    badge: string;
  }[] = [
    {
      id: 'revenue',
      title: 'Revenue Outlook',
      description: 'Forecast future revenue and collections.',
      icon: DollarSign,
      metric: 'RWF 33.2M',
      metricLabel: 'Projected Monthly',
      badge: '+5.4% Forward Growth',
    },
    {
      id: 'occupancy',
      title: 'Occupancy Outlook',
      description: 'Forecast vacancy and utilization trends.',
      icon: Building,
      metric: '95.8%',
      metricLabel: 'Projected Capacity',
      badge: '46 of 48 Units',
    },
    {
      id: 'lease',
      title: 'Lease Outlook',
      description: 'Forecast lease renewals and expirations.',
      icon: FileText,
      metric: '8 Leases',
      metricLabel: 'Expiring in 60-90d',
      badge: '87.5% Target Retention',
    },
    {
      id: 'maintenance',
      title: 'Maintenance Outlook',
      description: 'Forecast maintenance demand and costs.',
      icon: Wrench,
      metric: '18 Work Orders',
      metricLabel: 'December Planned Load',
      badge: 'RWF 4.2M Budgeted',
    },
    {
      id: 'workload',
      title: 'Workload Outlook',
      description: 'Forecast operational workload and staffing needs.',
      icon: Briefcase,
      metric: '31 Tasks',
      metricLabel: 'Planned Staff Allocation',
      badge: 'Capacity Balanced',
    },
  ];

  // Exactly one planning takeaway sentence for each workspace mode
  const planningTakeaways: Record<ForecastWorkspaceMode, { sentence: string; context: string }> = {
    revenue: {
      sentence: 'Revenue outlook remains positive, though lease expirations require action within sixty days.',
      context: 'Forward Cashflow Plan',
    },
    occupancy: {
      sentence: 'Occupancy is expected to remain stable if current renewal activity continues.',
      context: 'Forward Capacity Plan',
    },
    lease: {
      sentence: 'Upcoming contract maturities concentrated in January require standardized renewal incentives.',
      context: 'Contract Pipeline Plan',
    },
    maintenance: {
      sentence: 'Maintenance demand is expected to increase during statutory inspection season.',
      context: 'Facilities Readiness Plan',
    },
    workload: {
      sentence: 'Operational capacity remains balanced with dedicated vendor coverage scheduled across all departments.',
      context: 'Team Execution Plan',
    },
  };

  const currentTakeaway = planningTakeaways[activeMode];

  return (
    <div className="space-y-4">
      {/* PLANNING TAKEAWAY BANNER (1 SENTENCE ONLY) */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1 rounded bg-blue-600 text-white shrink-0 mt-0.5 sm:mt-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block sm:inline sm:mr-2">
              {currentTakeaway.context}:
            </span>
            <span className="text-xs font-semibold text-blue-950 leading-relaxed">
              {currentTakeaway.sentence}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 text-[10px] shrink-0 self-start sm:self-auto font-mono">
          {activeMode.toUpperCase()} OUTLOOK
        </Badge>
      </div>

      {/* 5 LARGE PRIMARY FORECAST WORKSPACE CARDS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Forecast Workspace Modes
          </span>
          <span className="text-[11px] text-slate-400">
            Select an outlook to focus all forward planning below
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                className={`text-left p-3.5 rounded-lg border transition-all flex flex-col justify-between group relative ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-600 shadow-xs ring-1 ring-blue-600'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isSelected ? 'text-blue-900' : 'text-slate-800'
                    }`}>
                      {mode.title}
                    </span>
                    <div className={`p-1 rounded ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <p className={`text-[11px] leading-snug mb-3 ${
                    isSelected ? 'text-blue-950 font-medium' : 'text-slate-500'
                  }`}>
                    {mode.description}
                  </p>
                </div>

                <div className={`pt-2.5 border-t flex items-baseline justify-between ${
                  isSelected ? 'border-blue-200' : 'border-slate-100'
                }`}>
                  <span className={`text-base font-bold font-mono ${
                    isSelected ? 'text-blue-900' : 'text-slate-800'
                  }`}>
                    {mode.metric}
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    isSelected ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    {mode.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
