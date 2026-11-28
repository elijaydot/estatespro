// src/components/calendar/CalendarMilestones.tsx
// FishGate Design Constitution v1.0 - Section 4: Upcoming Milestones (14-30 Day Strategic Portfolio Horizon)

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Milestone,
  Calendar,
  AlertCircle,
  Building,
  User,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';
import { UpcomingMilestone } from './types';

interface CalendarMilestonesProps {
  milestones?: UpcomingMilestone[];
  onSelectMilestone?: (milestone: UpcomingMilestone) => void;
}

export function CalendarMilestones({
  milestones,
  onSelectMilestone,
}: CalendarMilestonesProps) {
  const defaultMilestones: UpcomingMilestone[] = useMemo(() => {
    return [
      {
        id: 'ms-1',
        title: 'Statutory Annual Fire Safety & Emergency Recertification',
        date: '2026-12-15',
        daysRemaining: 17,
        category: 'compliance',
        propertyName: 'Vision City Commercial & Residential Hub',
        responsibleLead: 'Alexandre Nshimiyimana',
        criticality: 'critical',
        description: 'Mandatory joint inspection with City of Kigali Fire Department for central bay dry risers and exit paths.',
      },
      {
        id: 'ms-2',
        title: 'Quarterly Executive Facilities Budget Review & Allocation',
        date: '2026-12-20',
        daysRemaining: 22,
        category: 'executive',
        propertyName: 'Kigali Heights Residences',
        responsibleLead: 'Aline Mukagasana',
        criticality: 'high',
        description: 'Review preventative maintenance expenditure and approve CAPEX allocations for lift modernizations.',
      },
      {
        id: 'ms-3',
        title: 'Year-End Commercial Tenancy Lease Escalation Audits',
        date: '2026-12-28',
        daysRemaining: 30,
        category: 'leasing',
        propertyName: 'Riverside Luxury Suites & Apartments',
        responsibleLead: 'Diane Uwase',
        criticality: 'normal',
        description: 'Reconcile 8 statutory commercial leases expiring in Q1 2027 and deliver statutory indexation addenda.',
      },
    ];
  }, []);

  const items = milestones || defaultMilestones;

  const getCategoryBadge = (category: UpcomingMilestone['category']) => {
    switch (category) {
      case 'compliance':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] uppercase font-bold">Safety & Audit</Badge>;
      case 'executive':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] uppercase font-bold">Executive Review</Badge>;
      case 'leasing':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] uppercase font-bold">Lease Renewal</Badge>;
      case 'maintenance':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[9px] uppercase font-bold">Engineering</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Milestone className="w-3.5 h-3.5 text-blue-600" />
            <span>Upcoming Portfolio Milestones</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Critical operational deadlines and statutory cycles over the next 14–30 days
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-500">
          {items.length} Active Milestones
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((ms) => {
          const isCritical = ms.criticality === 'critical';

          return (
            <Card
              key={ms.id}
              onClick={() => onSelectMilestone && onSelectMilestone(ms)}
              className={`p-3.5 border transition-all duration-150 cursor-pointer hover:shadow-xs flex flex-col justify-between group ${
                isCritical
                  ? 'border-red-200 bg-red-50/15 hover:border-red-300'
                  : 'border-slate-200/90 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  {getCategoryBadge(ms.category)}
                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 font-semibold">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>In {ms.daysRemaining} days</span>
                  </div>
                </div>

                <h4 className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {ms.title}
                </h4>

                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {ms.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="min-w-0">
                  <span className="font-medium text-slate-800 block truncate">
                    {ms.propertyName}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Lead: {ms.responsibleLead}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-[10px] font-bold text-slate-600 block">
                    {ms.date}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 ml-auto mt-0.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
