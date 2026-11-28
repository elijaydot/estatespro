// src/components/calendar/CalendarWeekView.tsx
// FishGate Design Constitution v1.0 - Calendar View: Week Grid with Hourly Time Slots & All-Day Header

import { useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addDays,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Building, User } from 'lucide-react';
import { CalendarEvent } from './types';
import { EVENT_TYPE_CONFIG } from './CalendarEventUtils';

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onDateClick: (date: Date, timeSlot?: string) => void;
}

export function CalendarWeekView({
  currentDate,
  events,
  onSelectEvent,
  onDateClick,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const today = new Date();

  // Hours: 08:00 through 18:00
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

  const getEventsForDayAndHour = (day: Date, hourStr: string) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const hourInt = parseInt(hourStr.split(':')[0], 10);

    return events.filter((ev) => {
      if (ev.status === 'cancelled') return false;
      const start = ev.startDate;
      const end = ev.endDate || ev.startDate;
      if (dayStr < start || dayStr > end) return false;

      if (!ev.startTime) return false; // Handled in all-day section
      const evHour = parseInt(ev.startTime.split(':')[0], 10);
      return evHour === hourInt;
    });
  };

  const getAllDayEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter((ev) => {
      if (ev.status === 'cancelled') return false;
      const start = ev.startDate;
      const end = ev.endDate || ev.startDate;
      return dayStr >= start && dayStr <= end && (ev.allDay || !ev.startTime);
    });
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
      <div className="min-w-[800px]">
        {/* Days Header */}
        <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/90 text-center sticky top-0 z-10">
          <div className="p-3 text-[11px] font-bold text-slate-500 uppercase border-r border-slate-200 flex items-center justify-center">
            Time
          </div>
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                className={`p-2.5 text-center border-r last:border-r-0 border-slate-200 ${
                  isToday ? 'bg-blue-50/50' : ''
                }`}
              >
                <span className="block text-[11px] font-bold text-slate-500 uppercase">
                  {format(day, 'EEE')}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-mono font-bold text-xs mt-0.5 ${
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-Day Events Bar */}
        <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/40">
          <div className="p-2 text-[10px] font-bold text-slate-400 uppercase text-center border-r border-slate-200 flex items-center justify-center">
            All-Day
          </div>
          {days.map((day) => {
            const allDayEvs = getAllDayEventsForDay(day);
            return (
              <div
                key={`allday-${day.toISOString()}`}
                className="p-1 border-r last:border-r-0 border-slate-200 min-h-[38px] space-y-1"
              >
                {allDayEvs.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.custom_event;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate cursor-pointer hover:shadow-xs flex items-center gap-1 ${cfg.pillClass}`}
                    >
                      <Icon className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Hourly Rows */}
        <div className="divide-y divide-slate-100">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 min-h-[56px]">
              {/* Hour Label */}
              <div className="p-2 border-r border-slate-200 text-right pr-3 font-mono text-[11px] text-slate-400 font-semibold bg-slate-50/30">
                {hour}
              </div>

              {/* 7 Days for this hour */}
              {days.map((day) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                const isToday = isSameDay(day, today);

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    onClick={() => onDateClick(day, hour)}
                    className={`p-1 border-r last:border-r-0 border-slate-100 relative group cursor-pointer hover:bg-slate-50/60 transition-colors ${
                      isToday ? 'bg-blue-50/10' : ''
                    }`}
                  >
                    {hourEvents.map((ev) => {
                      const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.custom_event;
                      const Icon = cfg.icon;

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          className={`p-1.5 rounded text-[11px] font-semibold border shadow-2xs cursor-pointer hover:shadow-xs mb-1 last:mb-0 transition-transform hover:scale-[1.01] ${cfg.pillClass}`}
                        >
                          <div className="flex items-center gap-1 mb-0.5 truncate">
                            <Icon className="w-3 h-3 shrink-0" />
                            <span className="truncate font-bold">{ev.title}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] opacity-80 font-mono">
                            <span>{ev.startTime} - {ev.endTime || ''}</span>
                            <span className="truncate max-w-[60px]">{ev.unitNumber ? `U-${ev.unitNumber}` : ''}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Plus sign on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 bottom-1 text-[9px] text-slate-400">
                      <Plus className="w-3 h-3 text-blue-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
