// src/components/calendar/CalendarAgendaView.tsx
// FishGate Design Constitution v1.0 - Calendar View: Chronological Agenda Stream Grouped by Date

import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Clock,
  Building,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { CalendarEvent, CalendarEventStatus } from './types';
import { EVENT_TYPE_CONFIG } from './CalendarEventUtils';

interface CalendarAgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onUpdateStatus?: (eventId: string, newStatus: CalendarEventStatus) => void;
}

export function CalendarAgendaView({
  events,
  onSelectEvent,
  onUpdateStatus,
}: CalendarAgendaViewProps) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Group events chronologically by startDate
  const groupedEvents = useMemo(() => {
    const active = events.filter((e) => e.status !== 'cancelled');
    const sorted = [...active].sort((a, b) => {
      const dateCmp = a.startDate.localeCompare(b.startDate);
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

    const groups: { dateStr: string; items: CalendarEvent[] }[] = [];
    const map = new Map<string, CalendarEvent[]>();

    for (const ev of sorted) {
      const d = ev.startDate;
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(ev);
    }

    for (const [dateStr, items] of map.entries()) {
      groups.push({ dateStr, items });
    }

    return groups;
  }, [events]);

  const getStatusBadge = (status: CalendarEventStatus) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px]">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px]">In Progress</Badge>;
      case 'rescheduled':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px]">Rescheduled</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[9px]">Cancelled</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[9px]">Scheduled</Badge>;
    }
  };

  if (groupedEvents.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-200 rounded-lg bg-white">
        <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">No scheduled activities found</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          There are no operational commitments matching your active property and event filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map(({ dateStr, items }) => {
        const isDateToday = dateStr === todayStr;
        const isDatePast = dateStr < todayStr;

        return (
          <div key={dateStr} className="space-y-2">
            {/* Date Separator Header */}
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                  isDateToday
                    ? 'bg-blue-600 text-white'
                    : isDatePast
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {dateStr}
              </span>
              <span className="font-semibold text-xs text-slate-800">
                {format(new Date(`${dateStr}T00:00:00`), 'EEEE, MMMM d, yyyy')}
              </span>
              {isDateToday && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold">
                  TODAY
                </Badge>
              )}
              <span className="text-[11px] text-slate-400 ml-auto font-mono">
                {items.length} {items.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {/* Event Cards */}
            <div className="space-y-2">
              {items.map((ev) => {
                const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.custom_event;
                const Icon = cfg.icon;
                const isCompleted = ev.status === 'completed';

                return (
                  <Card
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className={`p-3.5 border shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                      cfg.pillClass
                    } ${isCompleted ? 'opacity-60 bg-slate-50/60' : ''}`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded border bg-white ${cfg.badgeClass} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-[9px] font-bold uppercase ${cfg.badgeClass}`}>
                            {cfg.label}
                          </Badge>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {ev.startTime ? `${ev.startTime} - ${ev.endTime || ''}` : 'All Day'}
                          </span>
                          {getStatusBadge(ev.status)}
                          {ev.eventNumber && (
                            <span className="font-mono text-[9px] text-slate-400 bg-white px-1 py-0.2 rounded border border-slate-200">
                              {ev.eventNumber}
                            </span>
                          )}
                        </div>

                        <h4 className={`font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {ev.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {ev.propertyName} {ev.unitNumber ? `• Unit ${ev.unitNumber}` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {ev.owner.name}
                          </span>
                          {ev.tenantName && (
                            <span className="text-slate-400">
                              Resident: <strong className="text-slate-600">{ev.tenantName}</strong>
                            </span>
                          )}
                          {ev.vendorName && (
                            <span className="text-slate-400">
                              Vendor: <strong className="text-slate-600">{ev.vendorName}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200">
                      {onUpdateStatus && !isCompleted && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(ev.id, 'completed');
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Done
                        </Button>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
