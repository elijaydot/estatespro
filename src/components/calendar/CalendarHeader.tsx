// src/components/calendar/CalendarHeader.tsx
// FishGate Design Constitution v1.0 - Section 1: Calendar Header & Primary Operational Actions

import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  Plus,
  ClipboardCheck,
  Wrench,
  Clock,
  Download,
} from 'lucide-react';

interface CalendarHeaderProps {
  onCreateEvent: () => void;
  onScheduleInspection: () => void;
  onScheduleMaintenance: () => void;
  onBlockTime: () => void;
  onExportCalendar: () => void;
}

export function CalendarHeader({
  onCreateEvent,
  onScheduleInspection,
  onScheduleMaintenance,
  onBlockTime,
  onExportCalendar,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <span>Calendar</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Plan, coordinate and manage operational schedules across your portfolio.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
          onClick={onCreateEvent}
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-semibold gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
          onClick={onScheduleInspection}
        >
          <ClipboardCheck className="w-4 h-4 text-purple-600" />
          Schedule Inspection
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-semibold gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200"
          onClick={onScheduleMaintenance}
        >
          <Wrench className="w-4 h-4 text-orange-600" />
          Schedule Maintenance
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-medium gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-slate-100"
          onClick={onBlockTime}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          Block Time
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-medium gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-slate-100"
          onClick={onExportCalendar}
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Calendar
        </Button>
      </div>
    </div>
  );
}
