// src/components/calendar/CalendarDayView.tsx
// FishGate Design Constitution v1.0 - Calendar View: Single Day Hourly Schedule, Availability Checks & Conflict Detection

import { useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Plus,
  Building,
  User,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { CalendarEvent } from './types';
import { EVENT_TYPE_CONFIG, detectConflicts } from './CalendarEventUtils';

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onDateClick: (date: Date, timeSlot?: string) => void;
}

export function CalendarDayView({
  currentDate,
  events,
  onSelectEvent,
  onDateClick,
}: CalendarDayViewProps) {
  const dayStr = format(currentDate, 'yyyy-MM-dd');
  const isToday = isSameDay(currentDate, new Date());

  // Filter events active on this day
  const dayEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.status === 'cancelled') return false;
      const start = ev.startDate;
      const end = ev.endDate || ev.startDate;
      return dayStr >= start && dayStr <= end;
    });
  }, [events, dayStr]);

  // Check conflicts among day events
  const dayConflicts = useMemo(() => {
    const list: { title1: string; title2: string; time: string; reason: string }[] = [];
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const e1 = dayEvents[i];
        const e2 = dayEvents[j];
        if (e1.startTime && e2.startTime) {
          const e1End = e1.endTime || e1.startTime;
          const e2End = e2.endTime || e2.startTime;
          const overlap = e1.startTime < e2End && e1End > e2.startTime;
          if (overlap && e1.owner.id === e2.owner.id) {
            list.push({
              title1: e1.title,
              title2: e2.title,
              time: `${e1.startTime} - ${e1End}`,
              reason: `${e1.owner.name} has overlapping commitments`,
            });
          }
        }
      }
    }
    return list;
  }, [dayEvents]);

  // Working hours 08:00 - 18:00
  const hours = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  return (
    <div className="space-y-4">
      {/* Day Overview Banner */}
      <div className="p-3.5 border border-slate-200 rounded-lg bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-900">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </span>
            {isToday && (
              <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                TODAY
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {dayEvents.length === 0
              ? 'No operational activities scheduled for this date.'
              : `${dayEvents.length} operational commitments booked.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onDateClick(currentDate, '09:00')}
          >
            <Plus className="w-3.5 h-3.5" /> Book Slot on This Day
          </Button>
        </div>
      </div>

      {/* Conflict Warning Alert if any */}
      {dayConflicts.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Scheduling Conflict Notice: </span>
            {dayConflicts.map((c, idx) => (
              <div key={idx} className="mt-0.5">
                • {c.reason} between &ldquo;{c.title1}&rdquo; and &ldquo;{c.title2}&rdquo; ({c.time}).
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly Schedule Timeline */}
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-2xs">
        {hours.map((hour) => {
          const hourInt = parseInt(hour.split(':')[0], 10);
          const eventsInHour = dayEvents.filter((ev) => {
            if (!ev.startTime) return false;
            const evHour = parseInt(ev.startTime.split(':')[0], 10);
            return evHour === hourInt;
          });

          return (
            <div
              key={hour}
              className="flex flex-col sm:flex-row items-stretch min-h-[64px] hover:bg-slate-50/50 transition-colors group"
            >
              {/* Hour Column */}
              <div className="w-24 p-3 border-r border-slate-100 bg-slate-50/40 text-right pr-4 font-mono text-xs font-bold text-slate-500 shrink-0 flex sm:flex-col justify-between items-center sm:items-end">
                <span>{hour}</span>
                <span className="text-[10px] text-slate-300 font-normal">
                  {eventsInHour.length > 0 ? 'Busy' : 'Open'}
                </span>
              </div>

              {/* Events in this hour */}
              <div className="flex-1 p-2 space-y-2">
                {eventsInHour.length === 0 ? (
                  <div
                    onClick={() => onDateClick(currentDate, hour)}
                    className="h-full min-h-[44px] rounded border border-dashed border-transparent group-hover:border-slate-200 flex items-center justify-between px-3 text-xs text-slate-400 cursor-pointer hover:bg-blue-50/30 transition-all"
                  >
                    <span className="text-[11px] text-slate-300 italic group-hover:text-slate-500">
                      Open operational window
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 font-bold flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Schedule at {hour}
                    </span>
                  </div>
                ) : (
                  eventsInHour.map((ev) => {
                    const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.custom_event;
                    const Icon = cfg.icon;

                    return (
                      <Card
                        key={ev.id}
                        onClick={() => onSelectEvent(ev)}
                        className={`p-3 border shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cfg.pillClass}`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className={`p-2 rounded border bg-white ${cfg.badgeClass} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge className={`text-[9px] font-bold uppercase ${cfg.badgeClass}`}>
                                {cfg.label}
                              </Badge>
                              <span className="font-mono text-xs font-bold text-slate-700">
                                {ev.startTime} - {ev.endTime || 'End'}
                              </span>
                            </div>

                            <h4 className="font-bold text-xs text-slate-900 hover:text-blue-600 transition-colors">
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
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-white text-slate-700 hover:bg-slate-50"
                          >
                            Details
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
