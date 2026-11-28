// src/components/analytics/AnalyticsWorkspaceCards.tsx
// FishGate Design Constitution v1.0 - Analytics Workspace Mode Architecture
// Large primary navigation cards (Portfolio, Residents, Finance, Operations, Team) + Single-Sentence Key Takeaway

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  Briefcase,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { AnalyticsWorkspaceMode } from './types';

interface AnalyticsWorkspaceCardsProps {
  activeMode: AnalyticsWorkspaceMode;
  onSelectMode: (mode: AnalyticsWorkspaceMode) => void;
}

export function AnalyticsWorkspaceCards({
  activeMode,
  onSelectMode,
}: AnalyticsWorkspaceCardsProps) {
  const modes: {
    id: AnalyticsWorkspaceMode;
    title: string;
    subItems: string[];
    icon: typeof Building2;
    metric: string;
    metricLabel: string;
    badge: string;
  }[] = [
    {
      id: 'portfolio',
      title: 'Portfolio',
      subItems: ['Properties', 'Occupancy', 'Asset Performance'],
      icon: Building2,
      metric: '94.2%',
      metricLabel: 'Occupancy Rate',
      badge: '48 Total Units',
    },
    {
      id: 'residents',
      title: 'Residents',
      subItems: ['Retention', 'Leasing', 'Engagement'],
      icon: Users,
      metric: '88.5%',
      metricLabel: 'Renewal Rate',
      badge: '92.4% Retention',
    },
    {
      id: 'finance',
      title: 'Finance',
      subItems: ['Revenue', 'Collections', 'Profitability'],
      icon: DollarSign,
      metric: '99.4%',
      metricLabel: 'Collection Rate',
      badge: '84.1% NOI Margin',
    },
    {
      id: 'operations',
      title: 'Operations',
      subItems: ['Maintenance', 'Inspections', 'Vendor Performance'],
      icon: Wrench,
      metric: '1.8 Days',
      metricLabel: 'Resolution SLA',
      badge: '100% Inspections',
    },
    {
      id: 'team',
      title: 'Team',
      subItems: ['Productivity', 'Workload', 'Execution'],
      icon: Briefcase,
      metric: '85.7%',
      metricLabel: 'Task Completion',
      badge: '94% On-Time SLA',
    },
  ];

  // Exactly one sentence key takeaway for each workspace mode
  const keyTakeaways: Record<AnalyticsWorkspaceMode, { sentence: string; context: string }> = {
    portfolio: {
      sentence: 'Portfolio occupancy remains optimal at 94.2%, led by 100% capacity and premium yields at Riverside Suites.',
      context: 'Asset Performance & Capacity Summary',
    },
    residents: {
      sentence: 'Resident retention remains robust at 92.4% with departures driven by corporate relocation rather than pricing friction.',
      context: 'Resident Stability & Tenure Summary',
    },
    finance: {
      sentence: 'Revenue growth is being driven primarily by occupancy gains at Kigali Heights and statutory indexation at Vision City.',
      context: 'Financial Performance Summary',
    },
    operations: {
      sentence: 'Maintenance performance improved 47% this quarter due to direct trade contractor dispatch and pre-approved thresholds.',
      context: 'Facilities & Field Operations Summary',
    },
    team: {
      sentence: 'Facilities and accounts teams maintained an 85.7% completion velocity with zero stalled tasks over 14 days.',
      context: 'Operational Workload & Execution Summary',
    },
  };

  const currentTakeaway = keyTakeaways[activeMode];

  return (
    <div className="space-y-4">
      {/* KEY TAKEAWAY BANNER (1 SENTENCE ONLY) */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1 rounded bg-blue-600 text-white shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-3.5 h-3.5" />
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
          {activeMode.toUpperCase()} MODE
        </Badge>
      </div>

      {/* 5 LARGE PRIMARY WORKSPACE MODE CARDS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Analytics Workspaces
          </span>
          <span className="text-[11px] text-slate-400">
            Select a mode to focus all analysis below
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

                  {/* 3 Sub-Items list */}
                  <div className="space-y-0.5 mb-3">
                    {mode.subItems.map((sub) => (
                      <div
                        key={sub}
                        className={`text-[11px] leading-snug flex items-center gap-1.5 ${
                          isSelected ? 'text-blue-950 font-medium' : 'text-slate-500'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        <span>{sub}</span>
                      </div>
                    ))}
                  </div>
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
