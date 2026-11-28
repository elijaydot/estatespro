// src/components/calendar/CalendarEventUtils.ts
// FishGate Design Constitution v1.0 - Calendar Utilities, Event Type Visual Registry & Conflict Detection

import React from 'react';
import {
  Wrench,
  ClipboardCheck,
  FileText,
  LogIn,
  LogOut,
  CreditCard,
  ShieldAlert,
  CheckSquare,
  Truck,
  Users,
  CalendarDays,
  Clock,
  Ban,
  LucideIcon,
} from 'lucide-react';
import { CalendarEvent, CalendarEventType, ConflictWarning } from './types';

export interface EventTypeVisualConfig {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  pillClass: string;
  borderClass: string;
  dotClass: string;
}

export const EVENT_TYPE_CONFIG: Record<CalendarEventType, EventTypeVisualConfig> = {
  maintenance: {
    label: 'Maintenance',
    icon: Wrench,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    pillClass: 'bg-orange-50 text-orange-800 border-l-2 border-l-orange-500 border-orange-200 hover:bg-orange-100',
    borderClass: 'border-orange-500',
    dotClass: 'bg-orange-500',
  },
  inspection: {
    label: 'Inspection',
    icon: ClipboardCheck,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    pillClass: 'bg-purple-50 text-purple-800 border-l-2 border-l-purple-500 border-purple-200 hover:bg-purple-100',
    borderClass: 'border-purple-500',
    dotClass: 'bg-purple-500',
  },
  lease_renewal: {
    label: 'Lease Renewal',
    icon: FileText,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    pillClass: 'bg-blue-50 text-blue-800 border-l-2 border-l-blue-500 border-blue-200 hover:bg-blue-100',
    borderClass: 'border-blue-500',
    dotClass: 'bg-blue-500',
  },
  move_in: {
    label: 'Move-In',
    icon: LogIn,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pillClass: 'bg-emerald-50 text-emerald-800 border-l-2 border-l-emerald-500 border-emerald-200 hover:bg-emerald-100',
    borderClass: 'border-emerald-500',
    dotClass: 'bg-emerald-500',
  },
  move_out: {
    label: 'Move-Out',
    icon: LogOut,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    pillClass: 'bg-rose-50 text-rose-800 border-l-2 border-l-rose-500 border-rose-200 hover:bg-rose-100',
    borderClass: 'border-rose-500',
    dotClass: 'bg-rose-500',
  },
  payment_due: {
    label: 'Payment Due',
    icon: CreditCard,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    pillClass: 'bg-teal-50 text-teal-800 border-l-2 border-l-teal-500 border-teal-200 hover:bg-teal-100',
    borderClass: 'border-teal-500',
    dotClass: 'bg-teal-500',
  },
  approval_deadline: {
    label: 'Approval Deadline',
    icon: ShieldAlert,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    pillClass: 'bg-indigo-50 text-indigo-800 border-l-2 border-l-indigo-500 border-indigo-200 hover:bg-indigo-100',
    borderClass: 'border-indigo-500',
    dotClass: 'bg-indigo-500',
  },
  task_deadline: {
    label: 'Task Deadline',
    icon: CheckSquare,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    pillClass: 'bg-sky-50 text-sky-800 border-l-2 border-l-sky-500 border-sky-200 hover:bg-sky-100',
    borderClass: 'border-sky-500',
    dotClass: 'bg-sky-500',
  },
  vendor_visit: {
    label: 'Vendor Visit',
    icon: Truck,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    pillClass: 'bg-amber-50 text-amber-800 border-l-2 border-l-amber-500 border-amber-200 hover:bg-amber-100',
    borderClass: 'border-amber-500',
    dotClass: 'bg-amber-500',
  },
  meeting: {
    label: 'Meeting',
    icon: Users,
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    pillClass: 'bg-violet-50 text-violet-800 border-l-2 border-l-violet-500 border-violet-200 hover:bg-violet-100',
    borderClass: 'border-violet-500',
    dotClass: 'bg-violet-500',
  },
  custom_event: {
    label: 'Custom Event',
    icon: CalendarDays,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    pillClass: 'bg-slate-50 text-slate-800 border-l-2 border-l-slate-500 border-slate-200 hover:bg-slate-100',
    borderClass: 'border-slate-500',
    dotClass: 'bg-slate-500',
  },
  block_time: {
    label: 'Block Time',
    icon: Ban,
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    pillClass: 'bg-zinc-100 text-zinc-800 border-l-2 border-l-zinc-500 border-zinc-200 hover:bg-zinc-200',
    borderClass: 'border-zinc-500',
    dotClass: 'bg-zinc-500',
  },
};

/**
 * Detect scheduling conflicts (e.g. same owner or same unit booked during overlapping times)
 */
export function detectConflicts(
  target: {
    id?: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    ownerId?: string;
    propertyName?: string;
    unitNumber?: string;
  },
  events: CalendarEvent[]
): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];
  if (!target.startDate) return warnings;

  const targetStart = target.startTime || '00:00';
  const targetEnd = target.endTime || '23:59';
  const targetDate = target.startDate;

  for (const ev of events) {
    if (ev.status === 'cancelled') continue;
    if (target.id && ev.id === target.id) continue;

    // Check date overlap
    const evStart = ev.startDate;
    const evEnd = ev.endDate || ev.startDate;
    const dateOverlaps = targetDate >= evStart && targetDate <= evEnd;

    if (!dateOverlaps) continue;

    // Check time overlap if both have times
    const evStartTime = ev.startTime || '00:00';
    const evEndTime = ev.endTime || '23:59';

    const timesOverlap = targetStart < evEndTime && targetEnd > evStartTime;

    if (timesOverlap) {
      // 1. Same owner conflict
      if (target.ownerId && ev.owner?.id && target.ownerId === ev.owner.id) {
        warnings.push({
          eventId: ev.id,
          conflictingEventTitle: ev.title,
          conflictingEventNumber: ev.eventNumber,
          timeSlot: `${ev.startTime || 'All Day'} - ${ev.endTime || ''}`,
          ownerName: ev.owner.name,
          reason: `${ev.owner.name} is already booked for "${ev.title}" during this slot.`,
        });
      }

      // 2. Same unit physical conflict (e.g. two maintenance/inspections in same unit)
      if (
        target.propertyName &&
        target.unitNumber &&
        ev.propertyName === target.propertyName &&
        ev.unitNumber === target.unitNumber &&
        target.unitNumber !== ''
      ) {
        warnings.push({
          eventId: ev.id,
          conflictingEventTitle: ev.title,
          conflictingEventNumber: ev.eventNumber,
          timeSlot: `${ev.startTime || 'All Day'} - ${ev.endTime || ''}`,
          ownerName: ev.owner.name,
          reason: `Unit ${target.unitNumber} at ${target.propertyName} is already reserved for "${ev.title}".`,
        });
      }
    }
  }

  return warnings;
}
