// src/components/calendar/CreateEventModal.tsx
// FishGate Design Constitution v1.0 - Calendar Event Creation Wizard with Live Conflict Detection & Recurrence

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import {
  CalendarDays,
  Clock,
  Building,
  User,
  AlertTriangle,
  Repeat,
  Bell,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventPriority,
  CalendarRecurrenceFrequency,
  ConflictWarning,
} from './types';
import { EVENT_TYPE_CONFIG, detectConflicts } from './CalendarEventUtils';

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTime?: string;
  defaultEventType?: CalendarEventType;
  properties: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string; role: string; department?: string }>;
  existingEvents: CalendarEvent[];
  onCreateEvent: (newEvent: CalendarEvent) => void;
}

export function CreateEventModal({
  open,
  onOpenChange,
  defaultDate,
  defaultTime,
  defaultEventType = 'maintenance',
  properties,
  teamMembers,
  existingEvents,
  onCreateEvent,
}: CreateEventModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>(defaultEventType);
  const [startDate, setStartDate] = useState(defaultDate || todayStr);
  const [startTime, setStartTime] = useState(defaultTime || '09:00');
  const [endDate, setEndDate] = useState(defaultDate || todayStr);
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [location, setLocation] = useState('');
  const [ownerId, setOwnerId] = useState(teamMembers[0]?.id || '');
  const [priority, setPriority] = useState<CalendarEventPriority>('medium');
  const [recurrence, setRecurrence] = useState<CalendarRecurrenceFrequency>('none');
  const [reminder, setReminder] = useState<string>('1_hour_before');
  const [notes, setNotes] = useState('');

  // Sync props when opening
  useEffect(() => {
    if (open) {
      if (defaultDate) {
        setStartDate(defaultDate);
        setEndDate(defaultDate);
      }
      if (defaultTime) {
        setStartTime(defaultTime);
        const [h, m] = defaultTime.split(':').map(Number);
        const endHour = String((h + 1) % 24).padStart(2, '0');
        setEndTime(`${endHour}:${String(m).padStart(2, '0')}`);
      }
      if (defaultEventType) {
        setEventType(defaultEventType);
      }
    }
  }, [open, defaultDate, defaultTime, defaultEventType]);

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const selectedOwner = teamMembers.find((m) => m.id === ownerId) || teamMembers[0];

  // Live Conflict Detection
  const liveConflicts = useMemo<ConflictWarning[]>(() => {
    if (!startDate || allDay) return [];
    return detectConflicts(
      {
        startDate,
        endDate,
        startTime,
        endTime,
        ownerId,
        propertyName: selectedProperty?.name,
        unitNumber,
      },
      existingEvents
    );
  }, [
    startDate,
    endDate,
    startTime,
    endTime,
    allDay,
    ownerId,
    selectedProperty?.name,
    unitNumber,
    existingEvents,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Title Required', description: 'Please enter a title for the event.', variant: 'destructive' });
      return;
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const eventNumber = `CAL-2026-${randomSuffix}`;

    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      eventNumber,
      title: title.trim(),
      description: description.trim(),
      eventType,
      startDate,
      startTime: allDay ? undefined : startTime,
      endDate: endDate || startDate,
      endTime: allDay ? undefined : endTime,
      allDay,
      propertyId,
      propertyName: selectedProperty?.name || 'All Properties',
      unitNumber: unitNumber.trim() || undefined,
      tenantName: tenantName.trim() || undefined,
      vendorName: vendorName.trim() || undefined,
      location: location.trim() || selectedProperty?.name || undefined,
      owner: {
        id: selectedOwner.id,
        name: selectedOwner.name,
        role: selectedOwner.role,
        department: selectedOwner.department,
      },
      participants: [],
      attachments: [],
      notes: notes.trim() || undefined,
      status: 'scheduled',
      priority,
      recurrence: recurrence !== 'none' ? { frequency: recurrence } : undefined,
      reminders: reminder !== 'none' ? [reminder] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateEvent(newEvent);
    toast({
      title: 'Activity Scheduled',
      description: `"${newEvent.title}" scheduled on ${newEvent.startDate} (${newEvent.eventNumber}).`,
    });

    onOpenChange(false);
    // Reset form
    setTitle('');
    setDescription('');
    setNotes('');
  };

  const eventTypeEntries = Object.entries(EVENT_TYPE_CONFIG) as [CalendarEventType, (typeof EVENT_TYPE_CONFIG)[CalendarEventType]][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <span>Schedule Operational Activity</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Plan, coordinate and allocate portfolio work without conflicts.
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-4 text-xs">
            {/* Live Conflict Alert Banner */}
            {liveConflicts.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs">Scheduling Warning: </span>
                  {liveConflicts.map((c, i) => (
                    <div key={i} className="text-[11px] mt-0.5 text-amber-800">
                      • {c.reason} ({c.timeSlot})
                    </div>
                  ))}
                  <p className="text-[10px] text-amber-600 mt-1 italic">
                    You may adjust the start/end window or assign another team member.
                  </p>
                </div>
              </div>
            )}

            {/* Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Event Title *</Label>
                <Input
                  placeholder="e.g. Semi-Annual Elevator Safety Audit & Recertification"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Event Type *</Label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  {eventTypeEntries.map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date and Time Grid */}
            <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Date & Time Schedule
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="all-day-toggle" className="text-xs text-slate-600 font-medium">
                    All-Day Block
                  </Label>
                  <Switch
                    id="all-day-toggle"
                    checked={allDay}
                    onCheckedChange={setAllDay}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
                {!allDay && (
                  <div>
                    <Label className="text-[10px] text-slate-500">Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-[10px] text-slate-500">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                {!allDay && (
                  <div>
                    <Label className="text-[10px] text-slate-500">End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Property, Space & Lead Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Property</Label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
                >
                  <option value="">Portfolio-wide / All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Unit / Space</Label>
                <Input
                  placeholder="e.g. Unit C-301 or Main Lift"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Assignee Lead *</Label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700"
                  required
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tenant, Vendor & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Resident / Tenant (Optional)</Label>
                <Input
                  placeholder="e.g. Kigali Tech Innovations"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Vendor / Contractor (Optional)</Label>
                <Input
                  placeholder="e.g. Schindler Lift Services"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Operational Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CalendarEventPriority)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 capitalize"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical / Urgent</option>
                </select>
              </div>
            </div>

            {/* Recurrence & Automation Readiness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/70 border border-slate-200 rounded-lg">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Repeat className="w-3 h-3 text-purple-600" />
                  Recurrence (Automation)
                </Label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as CalendarRecurrenceFrequency)}
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="none">Does not repeat (One-time)</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly Recurring</option>
                  <option value="quarterly">Quarterly Preventive Cycle</option>
                  <option value="annual">Annual Recertification</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Bell className="w-3 h-3 text-blue-600" />
                  Operational Reminder
                </Label>
                <select
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="none">No reminder</option>
                  <option value="15_min_before">15 minutes before</option>
                  <option value="1_hour_before">1 hour before</option>
                  <option value="1_day_before">1 day before event</option>
                </select>
              </div>
            </div>

            {/* Scope / Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Operational Notes & Context</Label>
              <Textarea
                placeholder="Include access instructions, checklist reminders, gate codes or safety protocols..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-16 text-xs resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
            >
              <CheckCircle2 className="w-4 h-4" />
              Schedule Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
