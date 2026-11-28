// src/components/calendar/CalendarMonthView.tsx
// FishGate Design Constitution v1.0 - Calendar View: Month Grid with Rich Event Chips & Overflow Cockpit

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Clock, Plus, AlertTriangle } from 'lucide-react';
import { CalendarEvent } from './types';
import { EVENT_TYPE_CONFIG } from './CalendarEventUtils';

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function CalendarMonthView({
  currentDate,
  events,
  onSelectEvent,
  onDateClick,
}: CalendarMonthViewProps) {
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    date: Date;
    events: CalendarEvent[];
  } | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const today = new Date();

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter((ev) => {
      if (ev.status === 'cancelled') return false;
      const start = ev.startDate;
      const end = ev.endDate || ev.startDate;
      return dayStr >= start && dayStr <= end;
    });
  };

  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
      {/* Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center py-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
        {weekDayLabels.map((wd) => (
          <div key={wd}>{wd}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
        {calendarDays.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const dayEvents = getEventsForDay(day);
          const displayLimit = 3;
          const overflowCount = dayEvents.length - displayLimit;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={`min-h-[110px] p-1.5 transition-colors group relative cursor-pointer flex flex-col justify-between ${
                !isCurrentMonth
                  ? 'bg-slate-50/50 text-slate-300'
                  : isToday
                  ? 'bg-blue-50/20'
                  : 'bg-white hover:bg-slate-50/70'
              }`}
            >
              {/* Day Cell Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday
                      ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                      : !isCurrentMonth
                      ? 'text-slate-300'
                      : 'text-slate-800'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {dayEvents.length > 0 && isCurrentMonth && (
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Chips List */}
              <div className="space-y-1 flex-1 min-w-0">
                {dayEvents.slice(0, displayLimit).map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.custom_event;
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border truncate shadow-2xs transition-transform hover:scale-[1.01] ${cfg.pillClass}`}
                    >
                      <Icon className="w-2.5 h-2.5 shrink-0 opacity-80" />
                      {ev.startTime && (
                        <span className="font-mono text-[9px] opacity-75 shrink-0">
                          {ev.startTime}
                        </span>
                      )}
                      <span className="truncate flex-1 font-semibold">
                        {ev.title}
                      </span>
                    </div>
                  );
                })}

                {/* Overflow trigger */}
                {overflowCount > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        +{overflowCount} more events
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-72 p-2.5 shadow-md border-slate-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
                        <span className="font-bold text-xs text-slate-900">
                          {format(day, 'EEEE, MMM d')}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {dayEvents.length} Events
                        </Badge>
                      </div>
                      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                        {dayEvents.map((ev) => {
                          const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.custom_event;
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={ev.id}
                              onClick={() => onSelectEvent(ev)}
                              className={`p-1.5 rounded text-xs border cursor-pointer hover:shadow-2xs flex items-center justify-between gap-1.5 ${cfg.pillClass}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Icon className="w-3 h-3 shrink-0" />
                                <span className="font-semibold truncate">{ev.title}</span>
                              </div>
                              <span className="font-mono text-[10px] shrink-0 opacity-80">
                                {ev.startTime || 'All Day'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Quick schedule subtle indicator on hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex justify-end">
                <span className="text-[9px] text-blue-600 font-semibold flex items-center gap-0.5">
                  <Plus className="w-2.5 h-2.5" /> Book
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
