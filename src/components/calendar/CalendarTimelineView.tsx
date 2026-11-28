// src/components/calendar/CalendarTimelineView.tsx
// FishGate Design Constitution v1.0 - Calendar View: Resource & Property Lane Gantt-Style Timeline

import { useState, useMemo } from 'react';
import {
  format,
  addDays,
  startOfWeek,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Users, CalendarDays, Plus } from 'lucide-react';
import { CalendarEvent } from './types';
import { EVENT_TYPE_CONFIG } from './CalendarEventUtils';

interface CalendarTimelineViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

export function CalendarTimelineView({
  currentDate,
  events,
  onSelectEvent,
  onDateClick,
}: CalendarTimelineViewProps) {
  const [groupBy, setGroupBy] = useState<'property' | 'team'>('property');

  // Display a 14-day rolling window starting from start of current week
  const timelineStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const timelineEnd = addDays(timelineStart, 13);
  const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd });
  const today = new Date();

  // Extract distinct lanes
  const lanes = useMemo(() => {
    if (groupBy === 'property') {
      const map = new Map<string, CalendarEvent[]>();
      events.forEach((ev) => {
        if (ev.status === 'cancelled') return;
        const key = ev.propertyName || 'Portfolio-wide';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      });
      return Array.from(map.entries()).map(([name, laneEvents]) => ({
        id: name,
        title: name,
        events: laneEvents,
      }));
    } else {
      const map = new Map<string, CalendarEvent[]>();
      events.forEach((ev) => {
        if (ev.status === 'cancelled') return;
        const key = ev.owner.name;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      });
      return Array.from(map.entries()).map(([name, laneEvents]) => ({
        id: name,
        title: name,
        events: laneEvents,
      }));
    }
  }, [events, groupBy]);

  return (
    <div className="space-y-3">
      {/* View Switcher Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Lane Grouping:</span>
          <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setGroupBy('property')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                groupBy === 'property'
                  ? 'bg-white shadow-2xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-3 h-3 inline mr-1" />
              By Property
            </button>
            <button
              onClick={() => setGroupBy('team')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                groupBy === 'team'
                  ? 'bg-white shadow-2xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3 h-3 inline mr-1" />
              By Team Lead
            </button>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Showing 14-day operational trajectory ({format(timelineStart, 'MMM d')} – {format(timelineEnd, 'MMM d, yyyy')})
        </span>
      </div>

      {/* Gantt Timeline Grid */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
        <div className="min-w-[960px]">
          {/* Days Header */}
          <div className="grid grid-cols-[200px_repeat(14,1fr)] border-b border-slate-200 bg-slate-50/90 sticky top-0 z-10 text-center">
            <div className="p-2.5 text-left text-xs font-bold text-slate-600 uppercase border-r border-slate-200">
              {groupBy === 'property' ? 'Property Lane' : 'Team Member'}
            </div>
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={`p-1.5 border-r last:border-r-0 border-slate-200 text-center ${
                    isToday ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    {format(day, 'EEE')}
                  </span>
                  <span
                    className={`inline-block font-mono font-bold text-[11px] ${
                      isToday ? 'text-blue-700 font-black' : 'text-slate-800'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Lane Rows */}
          <div className="divide-y divide-slate-100">
            {lanes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active lanes found.
              </div>
            ) : (
              lanes.map((lane) => (
                <div
                  key={lane.id}
                  className="grid grid-cols-[200px_repeat(14,1fr)] min-h-[58px] hover:bg-slate-50/30 transition-colors"
                >
                  {/* Lane Title Header */}
                  <div className="p-3 border-r border-slate-200 bg-slate-50/20 flex flex-col justify-center">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {lane.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {lane.events.length} commitments
                    </span>
                  </div>

                  {/* 14 Day Cells for Lane */}
                  {days.map((day) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const isToday = isSameDay(day, today);
                    const matchingEvents = lane.events.filter((ev) => {
                      const start = ev.startDate;
                      const end = ev.endDate || ev.startDate;
                      return dayStr >= start && dayStr <= end;
                    });

                    return (
                      <div
                        key={`${lane.id}-${dayStr}`}
                        onClick={() => onDateClick(day)}
                        className={`p-1 border-r last:border-r-0 border-slate-100 relative group cursor-pointer hover:bg-slate-50/50 ${
                          isToday ? 'bg-blue-50/15' : ''
                        }`}
                      >
                        {matchingEvents.map((ev) => {
                          const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.custom_event;
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectEvent(ev);
                              }}
                              className={`p-1 rounded text-[9px] font-semibold border shadow-2xs truncate cursor-pointer hover:scale-[1.02] transition-transform mb-1 last:mb-0 ${cfg.pillClass}`}
                              title={`${ev.title} (${ev.startTime || 'All Day'})`}
                            >
                              <span className="truncate block">{ev.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
