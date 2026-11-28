// src/components/forecasts/ForecastsWorkspaceCards.tsx
// FishGate Design Constitution v1.0 - Forecasts Controlled Workspace Expansion
// Supports null selection (default state) and click-again-to-collapse toggle behavior.
// Visual design: subtle elevation, left accent border, soft colored background, calm executive styling.

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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ForecastWorkspaceMode } from './types';

interface ForecastsWorkspaceCardsProps {
  activeMode: ForecastWorkspaceMode | null;
  onSelectMode: (mode: ForecastWorkspaceMode | null) => void;
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

  // Exactly one planning takeaway sentence for each workspace mode and default overview
  const planningTakeaways: Record<string, { sentence: string; context: string }> = {
    overview: {
      sentence: 'Revenue outlook remains positive, though lease expirations require action within sixty days.',
      context: 'Forward Planning Takeaway',
    },
    revenue: {
      sentence: 'Revenue outlook remains positive, though lease expirations require action within sixty days.',
      context: 'Revenue Outlook Focus',
    },
    occupancy: {
      sentence: 'Occupancy is expected to remain stable if current renewal activity continues.',
      context: 'Occupancy Outlook Focus',
    },
    lease: {
      sentence: 'Upcoming contract maturities concentrated in January require standardized renewal incentives.',
      context: 'Lease Outlook Focus',
    },
    maintenance: {
      sentence: 'Maintenance demand is expected to increase during statutory inspection season.',
      context: 'Maintenance Outlook Focus',
    },
    workload: {
      sentence: 'Operational capacity remains balanced with dedicated vendor coverage scheduled across all departments.',
      context: 'Workload Outlook Focus',
    },
  };

  const currentTakeaway = activeMode ? planningTakeaways[activeMode] : planningTakeaways.overview;

  const handleCardClick = (id: ForecastWorkspaceMode) => {
    // Toggle behavior: if already selected, collapse back to null
    if (activeMode === id) {
      onSelectMode(null);
    } else {
      onSelectMode(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* FORWARD PLANNING TAKEAWAY BANNER (MAXIMUM ONE SENTENCE) */}
      <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs transition-all duration-200">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1 rounded bg-blue-600 text-white shrink-0 mt-0.5 sm:mt-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block sm:inline sm:mr-2">
              {currentTakeaway.context}:
            </span>
            <span className="text-xs font-semibold text-slate-900 leading-relaxed">
              {currentTakeaway.sentence}
            </span>
          </div>
        </div>

        {activeMode && (
          <button
            type="button"
            onClick={() => onSelectMode(null)}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 underline self-start sm:self-auto shrink-0 transition-colors"
          >
            Collapse Outlook
          </button>
        )}
      </div>

      {/* 5 FORECAST WORKSPACE CARDS (PRIMARY SELECTION GATEWAY) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Forecast Workspace Modes
          </span>
          <span className="text-[11px] text-slate-400">
            {activeMode ? 'Click active outlook to collapse' : 'Select an outlook above to reveal forward projections'}
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
                onClick={() => handleCardClick(mode.id)}
                className={`text-left p-3.5 rounded-lg border transition-all duration-200 flex flex-col justify-between group relative ${
                  isSelected
                    ? 'bg-blue-50/40 border-slate-300 border-l-4 border-l-blue-600 shadow-xs'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isSelected ? 'text-blue-900' : 'text-slate-800'
                    }`}>
                      {mode.title}
                    </span>
                    <div className={`p-1 rounded transition-colors ${
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

                <div className={`pt-2.5 border-t flex items-baseline justify-between transition-colors ${
                  isSelected ? 'border-blue-200' : 'border-slate-100'
                }`}>
                  <span className={`text-base font-bold font-mono ${
                    isSelected ? 'text-blue-900' : 'text-slate-800'
                  }`}>
                    {mode.metric}
                  </span>
                  <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                    isSelected ? 'text-blue-700' : 'text-slate-400'
                  }`}>
                    <span>{mode.badge}</span>
                    {isSelected ? <ChevronDown className="w-3 h-3 text-blue-600 ml-0.5" /> : <ChevronRight className="w-3 h-3 text-slate-300 ml-0.5 group-hover:text-slate-500" />}
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
