// src/components/maintenance/MaintenanceCalendarView.tsx
// FishGate Design Constitution v1.0 - Section 4.5: Operational Scheduling Calendar

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  Wrench,
  ClipboardList,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { MaintenanceCalendarItem } from './types';

interface MaintenanceCalendarViewProps {
  items: MaintenanceCalendarItem[];
  onSelectItem?: (item: MaintenanceCalendarItem) => void;
  onScheduleNew?: () => void;
}

export function MaintenanceCalendarView({
  items,
  onSelectItem,
  onScheduleNew,
}: MaintenanceCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Month days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const nextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getItemBadgeClass = (type: MaintenanceCalendarItem['type']) => {
    switch (type) {
      case 'repair':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'inspection':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'recurring':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'compliance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Card className="border-slate-200 shadow-xs">
      {/* Calendar Header */}
      <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold text-sm text-slate-900 min-w-[140px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-slate-600" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded capitalize transition-all ${
                  viewMode === mode ? 'bg-white shadow-xs text-blue-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode} View
              </button>
            ))}
          </div>

          <Button size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={onScheduleNew}>
            <Plus className="w-3.5 h-3.5" /> Book Activity
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Month Grid */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-2 border-b border-slate-100 pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayItems = items.filter((it) => isSameDay(new Date(it.date), day));
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  isToday
                    ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold ${
                      isToday ? 'text-blue-700' : 'text-slate-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayItems.length > 0 && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">
                      {dayItems.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[85px]">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem?.(item)}
                      className={`p-1.5 rounded text-[10px] border leading-tight cursor-pointer hover:opacity-90 ${getItemBadgeClass(
                        item.type
                      )}`}
                      title={`${item.title} (${item.propertyName})`}
                    >
                      <div className="font-semibold truncate">{item.title}</div>
                      <div className="text-[9px] opacity-75 truncate">{item.propertyName}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
