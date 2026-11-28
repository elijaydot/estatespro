// src/components/calendar/types.ts
// FishGate Design Constitution v1.0 - Calendar Module: Planning, Coordination & Operational Scheduling Layer

export type CalendarEventType =
  | 'maintenance'
  | 'inspection'
  | 'lease_renewal'
  | 'move_in'
  | 'move_out'
  | 'payment_due'
  | 'approval_deadline'
  | 'task_deadline'
  | 'vendor_visit'
  | 'meeting'
  | 'custom_event'
  | 'block_time';

export type CalendarEventStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type CalendarEventPriority = 'low' | 'medium' | 'high' | 'critical';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda' | 'timeline';

export type CalendarRecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual';

export interface CalendarParticipant {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface CalendarAttachment {
  id: string;
  name: string;
  url?: string;
  size?: string;
  type?: string;
}

export interface CalendarRecurrenceRule {
  frequency: CalendarRecurrenceFrequency;
  interval?: number;
  untilDate?: string;
}

export interface CalendarEvent {
  id: string;
  eventNumber: string; // e.g. CAL-2026-081
  title: string;
  description: string;
  eventType: CalendarEventType;
  startDate: string; // yyyy-MM-dd
  startTime?: string; // HH:mm
  endDate: string; // yyyy-MM-dd
  endTime?: string; // HH:mm
  allDay: boolean;
  propertyId?: string;
  propertyName: string;
  unitId?: string;
  unitNumber?: string;
  tenantName?: string;
  vendorName?: string;
  location?: string;
  owner: {
    id: string;
    name: string;
    role: string;
    department?: string;
  };
  participants: CalendarParticipant[];
  attachments: CalendarAttachment[];
  notes?: string;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  recurrence?: CalendarRecurrenceRule;
  reminders?: string[]; // e.g. ['15_min_before', '1_day_before']
  dependencies?: string[]; // e.g. ['WO-2026-081', 'INSP-2026-042']
  sourceEntityRef?: string;
  targetUrl?: string;
  isBlockedTime?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictWarning {
  eventId?: string;
  conflictingEventTitle: string;
  conflictingEventNumber: string;
  timeSlot: string;
  ownerName: string;
  reason: string;
}

export interface UpcomingMilestone {
  id: string;
  title: string;
  date: string;
  daysRemaining: number;
  category: 'compliance' | 'leasing' | 'maintenance' | 'executive';
  propertyName: string;
  responsibleLead: string;
  criticality: 'normal' | 'high' | 'critical';
  description: string;
}

export interface CalendarObservation {
  id: string;
  title: string;
  insight: string;
  metric?: string;
  impact: 'operational' | 'coordination' | 'advisory';
}
