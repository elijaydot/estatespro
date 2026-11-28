// src/components/analytics/AnalyticsWorkspaceCards.tsx
// FishGate Design Constitution v1.0 - Controlled Workspace Expansion
// Supports null selection (default state) and click-again-to-collapse toggle behavior.
// Visual design: subtle elevation, left accent border, soft colored background, calm executive styling.

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  Briefcase,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { AnalyticsWorkspaceMode } from './types';

interface AnalyticsWorkspaceCardsProps {
  activeMode: AnalyticsWorkspaceMode | null;
  onSelectMode: (mode: AnalyticsWorkspaceMode | null) => void;
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
      title: 'Team & Workload',
      subItems: ['Productivity', 'Workload', 'Execution'],
      icon: Briefcase,
      metric: '85.7%',
      metricLabel: 'Task Completion',
      badge: '94% On-Time SLA',
    },
  ];

  // Exactly one sentence key takeaway for each workspace mode and default overview
  const keyTakeaways: Record<string, { sentence: string; context: string }> = {
    overview: {
      sentence: 'Revenue growth continues to be driven by stronger occupancy at Kigali Heights and Riverside Suites.',
      context: 'Executive Takeaway',
    },
    portfolio: {
      sentence: 'Portfolio occupancy remains optimal at 94.2%, led by 100% capacity and premium yields at Riverside Suites.',
      context: 'Portfolio Focus',
    },
    residents: {
      sentence: 'Resident retention remains robust at 92.4% with departures driven by corporate relocation rather than pricing friction.',
      context: 'Residents Focus',
    },
    finance: {
      sentence: 'Revenue growth is being driven primarily by occupancy gains at Kigali Heights and statutory indexation at Vision City.',
      context: 'Finance Focus',
    },
    operations: {
      sentence: 'Maintenance performance improved 47% this quarter due to direct trade contractor dispatch and pre-approved thresholds.',
      context: 'Operations Focus',
    },
    team: {
      sentence: 'Facilities and accounts teams maintained an 85.7% completion velocity with zero stalled tasks over 14 days.',
      context: 'Team & Workload Focus',
    },
  };

  const currentTakeaway = activeMode ? keyTakeaways[activeMode] : keyTakeaways.overview;

  const handleCardClick = (id: AnalyticsWorkspaceMode) => {
    // Toggle behavior: if already selected, collapse everything back to null
    if (activeMode === id) {
      onSelectMode(null);
    } else {
      onSelectMode(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* KEY TAKEAWAY BANNER (MAXIMUM ONE SENTENCE) */}
      <div className="p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs transition-all duration-200">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-1 rounded bg-blue-600 text-white shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-3.5 h-3.5" />
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
            Collapse Workspace
          </button>
        )}
      </div>

      {/* 5 WORKSPACE MODE CARDS (GATEWAY TO DETAILED EXPERIENCE) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Performance Workspaces
          </span>
          <span className="text-[11px] text-slate-400">
            {activeMode ? 'Click active workspace to collapse' : 'Select a focus area to reveal detailed analysis'}
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

                  {/* Sub-Items list */}
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
