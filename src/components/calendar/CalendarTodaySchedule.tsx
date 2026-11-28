// src/components/calendar/CalendarTodaySchedule.tsx
// FishGate Design Constitution v1.0 - Section 2: Today's Schedule (Max 4 Immediate Operational Cards)

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  CheckSquare,
  ShieldCheck,
  ClipboardCheck,
  Clock,
} from 'lucide-react';
import { CalendarEvent } from './types';

interface CalendarTodayScheduleProps {
  events: CalendarEvent[];
  activeFilter?: string;
  onFilterSelect: (filterKey: string) => void;
}

export function CalendarTodaySchedule({
  events,
  activeFilter,
  onFilterSelect,
}: CalendarTodayScheduleProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Events Today
  const eventsToday = useMemo(() => {
    return events.filter(
      (e) =>
        e.status !== 'cancelled' &&
        (e.startDate === todayStr || (e.startDate <= todayStr && e.endDate >= todayStr))
    );
  }, [events, todayStr]);

  // 2. Tasks Due Today
  const tasksDueToday = useMemo(() => {
    return events.filter(
      (e) =>
        e.status !== 'cancelled' &&
        e.status !== 'completed' &&
        (e.eventType === 'task_deadline' || e.eventType === 'payment_due') &&
        e.startDate === todayStr
    );
  }, [events, todayStr]);

  // 3. Approvals Due
  const approvalsDue = useMemo(() => {
    return events.filter(
      (e) =>
        e.status !== 'cancelled' &&
        e.status !== 'completed' &&
        (e.eventType === 'approval_deadline' || e.eventType === 'lease_renewal') &&
        e.startDate <= todayStr
    );
  }, [events, todayStr]);

  // 4. Upcoming Inspections
  const upcomingInspections = useMemo(() => {
    return events.filter(
      (e) =>
        e.status !== 'cancelled' &&
        e.status !== 'completed' &&
        e.eventType === 'inspection' &&
        e.startDate >= todayStr
    );
  }, [events, todayStr]);

  const cards = [
    {
      id: 'events_today',
      title: 'Events Today',
      count: eventsToday.length,
      detail: eventsToday.length === 0 ? 'No operational events scheduled today' : `${eventsToday.length} bookings & site appointments`,
      icon: CalendarDays,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      badge: eventsToday.length > 0 ? 'Active Today' : 'Clear',
      badgeClass: eventsToday.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'tasks_due',
      title: 'Tasks Due Today',
      count: tasksDueToday.length,
      detail: tasksDueToday.length === 0 ? 'All scheduled deliverables up to date' : `${tasksDueToday.length} deadlines requiring completion`,
      icon: CheckSquare,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      badge: tasksDueToday.length > 0 ? 'Due By 23:59' : 'Zero',
      badgeClass: tasksDueToday.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'approvals_due',
      title: 'Approvals Due',
      count: approvalsDue.length,
      detail: approvalsDue.length === 0 ? 'No pending approval sign-offs' : `${approvalsDue.length} authorizations pending review`,
      icon: ShieldCheck,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      badge: approvalsDue.length > 0 ? 'Attention Needed' : 'Current',
      badgeClass: approvalsDue.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'inspections_upcoming',
      title: 'Upcoming Inspections',
      count: upcomingInspections.length,
      detail: upcomingInspections.length === 0 ? 'No upcoming inspections on record' : `${upcomingInspections.length} audits & condition checks planned`,
      icon: ClipboardCheck,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      badge: upcomingInspections.length > 0 ? 'Scheduled' : 'None',
      badgeClass: upcomingInspections.length > 0 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Today&apos;s Operational Schedule</span>
        </h2>
        <span className="text-[11px] text-slate-400">Real-time portfolio coordination</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const isSelected = activeFilter === c.id;

          return (
            <Card
              key={c.id}
              onClick={() => onFilterSelect(c.id)}
              className={`p-3.5 border transition-all duration-150 cursor-pointer hover:shadow-xs flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600 shadow-2xs'
                  : 'border-slate-200/90 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
                    {c.title}
                  </span>
                  <div className={`p-1 rounded border ${c.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {c.count}
                  </span>
                  <Badge variant="outline" className={`text-[9px] font-semibold ${c.badgeClass}`}>
                    {c.badge}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-500 line-clamp-1 border-t border-slate-100 pt-1.5">
                {c.detail}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
