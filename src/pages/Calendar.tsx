// src/pages/Calendar.tsx
// FishGate Design Constitution v1.0 - Calendar Module: Planning, Coordination & Operational Scheduling Workspace
// 5-Part Structure: Header -> Today's Schedule -> Calendar Workspace -> Upcoming Milestones -> Calendar Observations

import { useState, useMemo, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { PageContainer } from '@/design-system/LayoutFramework';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { downloadCsv } from '@/lib/download';

import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
} from '@/components/calendar/types';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarTodaySchedule } from '@/components/calendar/CalendarTodaySchedule';
import { CalendarWorkspace } from '@/components/calendar/CalendarWorkspace';
import { CalendarMilestones } from '@/components/calendar/CalendarMilestones';
import { CalendarObservations } from '@/components/calendar/CalendarObservations';
import { CalendarEventDetailModal } from '@/components/calendar/CalendarEventDetailModal';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';

const CALENDAR_STORAGE_KEY = 'fishgate_calendar_events_v1';

export default function CalendarPage() {
  const { user } = useAuth();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [presetEventType, setPresetEventType] = useState<CalendarEventType>('maintenance');
  const [presetDate, setPresetDate] = useState<string | undefined>(undefined);
  const [presetTime, setPresetTime] = useState<string | undefined>(undefined);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Today Schedule filter
  const [todayFilter, setTodayFilter] = useState<string>('all');

  // Team roster
  const teamMembers = useMemo(() => {
    return [
      { id: 'usr-1', name: 'Aimable Nkurunziza', role: 'Operations Lead', department: 'Facilities & Maintenance' },
      { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing Specialist', department: 'Leasing & Residents' },
      { id: 'usr-3', name: 'Eric Habimana', role: 'Finance Specialist', department: 'Finance & Accounts' },
      { id: 'usr-4', name: 'Alexandre Nshimiyimana', role: 'Technical Services Lead', department: 'Facilities & Maintenance' },
      { id: 'usr-5', name: 'Jean Claude Bizimana', role: 'Commercial Portfolio Lead', department: 'Property Operations' },
      { id: 'usr-6', name: 'Aline Mukagasana', role: 'Executive Officer', department: 'Executive & Legal' },
    ];
  }, []);

  // Primary Calendar Events State (persisted to LocalStorage)
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CALENDAR_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const dayAfterStr = format(addDays(new Date(), 2), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const inThreeDaysStr = format(addDays(new Date(), 3), 'yyyy-MM-dd');
    const inFiveDaysStr = format(addDays(new Date(), 5), 'yyyy-MM-dd');
    const nextWeekStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    // Default Seed Events across Physical Portfolio
    return [
      {
        id: 'cal-seed-1',
        eventNumber: 'CAL-2026-081',
        title: 'Master AC Compressor Refill & Coil Chemical Flush',
        description: 'Scheduled preventive HVAC servicing with Kigali Premier Electrical & HVAC Services Ltd. Includes coolant top-up and filter replacement for Common Bay.',
        eventType: 'maintenance',
        startDate: todayStr,
        startTime: '10:00',
        endDate: todayStr,
        endTime: '12:30',
        allDay: false,
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'Common Bay A',
        vendorName: 'Kigali Premier Electrical & HVAC Services Ltd',
        location: 'Rooftop Plant Room A',
        owner: { id: 'usr-1', name: 'Aimable Nkurunziza', role: 'Operations Lead', department: 'Facilities & Maintenance' },
        participants: [
          { id: 'v1', name: 'Alexandre Nshimiyimana', role: 'Lead Technician' },
        ],
        attachments: [],
        notes: 'Security gate pass authorized. Power isolation scheduled for 10:15 - 10:45.',
        status: 'scheduled',
        priority: 'high',
        sourceEntityRef: 'WO-2026-081',
        targetUrl: '/maintenance?tab=work-orders',
        createdAt: '2026-11-20T08:00:00Z',
        updatedAt: '2026-11-20T08:00:00Z',
      },
      {
        id: 'cal-seed-2',
        eventNumber: 'CAL-2026-082',
        title: 'Move-Out Physical Handover & Inventory Audit',
        description: 'Comprehensive walkthrough and baseline condition sign-off following tenancy termination. Inspect sanitary fittings, flooring, and paintwork.',
        eventType: 'inspection',
        startDate: todayStr,
        startTime: '14:00',
        endDate: todayStr,
        endTime: '15:30',
        allDay: false,
        propertyName: 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        tenantName: 'Jean Paul Habineza',
        location: 'Apartment A-201',
        owner: { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing Specialist', department: 'Leasing & Residents' },
        participants: [
          { id: 't1', name: 'Jean Paul Habineza', role: 'Outgoing Resident' },
        ],
        attachments: [],
        notes: 'Deposit refund checklist and key return protocol to be completed in-app.',
        status: 'scheduled',
        priority: 'high',
        sourceEntityRef: 'INSP-2026-042',
        targetUrl: '/maintenance?tab=inspections',
        createdAt: '2026-11-22T09:00:00Z',
        updatedAt: '2026-11-22T09:00:00Z',
      },
      {
        id: 'cal-seed-3',
        eventNumber: 'CAL-2026-083',
        title: 'Commercial Tenancy Renewal & Escalation Negotiation',
        description: 'Meet with CFO Patrick to sign updated 2-year lease agreement with approved 8% rent indexation.',
        eventType: 'lease_renewal',
        startDate: tomorrowStr,
        startTime: '11:00',
        endDate: tomorrowStr,
        endTime: '12:00',
        allDay: false,
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'C-301',
        tenantName: 'Kigali Tech Innovations Ltd',
        location: 'Executive Boardroom 2B',
        owner: { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing Specialist', department: 'Leasing & Residents' },
        participants: [],
        attachments: [],
        status: 'scheduled',
        priority: 'high',
        sourceEntityRef: 'LEAS-2026-084',
        targetUrl: '/leases',
        createdAt: '2026-11-24T10:00:00Z',
        updatedAt: '2026-11-24T10:00:00Z',
      },
      {
        id: 'cal-seed-4',
        eventNumber: 'CAL-2026-084',
        title: 'Executive Authorization Deadline: Elevator Modernization',
        description: 'Quarterly statutory overhaul outlays of RWF 1,950,000 exceed operational threshold. Requires Managing Director sign-off.',
        eventType: 'approval_deadline',
        startDate: todayStr,
        startTime: '17:00',
        endDate: todayStr,
        endTime: '17:30',
        allDay: false,
        propertyName: 'Kigali Heights Residences',
        unitNumber: 'Main Lift A',
        owner: { id: 'usr-6', name: 'Aline Mukagasana', role: 'Executive Officer', department: 'Executive & Legal' },
        participants: [],
        attachments: [],
        status: 'scheduled',
        priority: 'critical',
        sourceEntityRef: 'EXP-2026-084',
        targetUrl: '/expenses',
        createdAt: '2026-11-25T11:00:00Z',
        updatedAt: '2026-11-25T11:00:00Z',
      },
      {
        id: 'cal-seed-5',
        eventNumber: 'CAL-2026-085',
        title: 'Move-In Key Orientation & Smart RFID Programming',
        description: 'New tenant signed residential lease for Unit B-102. Issue key fob, program garage access, and conduct initial walkthrough.',
        eventType: 'move_in',
        startDate: dayAfterStr,
        startTime: '09:30',
        endDate: dayAfterStr,
        endTime: '10:30',
        allDay: false,
        propertyName: 'Kigali Heights Residences',
        unitNumber: 'B-102',
        tenantName: 'David Mugisha',
        owner: { id: 'usr-2', name: 'Diane Uwase', role: 'Leasing Specialist', department: 'Leasing & Residents' },
        participants: [],
        attachments: [],
        status: 'scheduled',
        priority: 'medium',
        createdAt: '2026-11-25T14:00:00Z',
        updatedAt: '2026-11-25T14:00:00Z',
      },
      {
        id: 'cal-seed-6',
        eventNumber: 'CAL-2026-086',
        title: 'Perimeter CCTV & Access Control Security Recalibration',
        description: 'Routine quarterly maintenance of security cameras, speed gates, and optical sensors with Intersec Rwanda Security Ltd.',
        eventType: 'vendor_visit',
        startDate: inThreeDaysStr,
        startTime: '13:00',
        endDate: inThreeDaysStr,
        endTime: '16:00',
        allDay: false,
        propertyName: 'Vision City Commercial & Residential Hub',
        vendorName: 'Intersec Rwanda Security Ltd',
        owner: { id: 'usr-4', name: 'Alexandre Nshimiyimana', role: 'Technical Services Lead', department: 'Facilities & Maintenance' },
        participants: [],
        attachments: [],
        status: 'scheduled',
        priority: 'medium',
        createdAt: '2026-11-25T16:00:00Z',
        updatedAt: '2026-11-25T16:00:00Z',
      },
      {
        id: 'cal-seed-7',
        eventNumber: 'CAL-2026-087',
        title: 'Scheduled Water Riser Maintenance Shutdown',
        description: 'Planned plumbing shutoff for level 3 riser valve replacement. Advance notice issued to all tenants 48 hours prior.',
        eventType: 'block_time',
        startDate: inFiveDaysStr,
        startTime: '10:00',
        endDate: inFiveDaysStr,
        endTime: '13:00',
        allDay: false,
        propertyName: 'Riverside Luxury Suites & Apartments',
        location: 'Main Water Manifold B',
        owner: { id: 'usr-1', name: 'Aimable Nkurunziza', role: 'Operations Lead', department: 'Facilities & Maintenance' },
        participants: [],
        attachments: [],
        isBlockedTime: true,
        status: 'scheduled',
        priority: 'high',
        createdAt: '2026-11-26T08:00:00Z',
        updatedAt: '2026-11-26T08:00:00Z',
      },
      {
        id: 'cal-seed-8',
        eventNumber: 'CAL-2026-088',
        title: 'Regulatory Joint Fire Safety Inspection with City of Kigali',
        description: 'Annual mandatory audit with Rwanda Fire & Safety Authority across Common Bay A emergency exits, hydrants, and dry risers.',
        eventType: 'inspection',
        startDate: nextWeekStr,
        startTime: '10:00',
        endDate: nextWeekStr,
        endTime: '13:00',
        allDay: false,
        propertyName: 'Vision City Commercial & Residential Hub',
        unitNumber: 'Common Bay A',
        owner: { id: 'usr-4', name: 'Alexandre Nshimiyimana', role: 'Technical Services Lead', department: 'Facilities & Maintenance' },
        participants: [],
        attachments: [],
        status: 'scheduled',
        priority: 'critical',
        sourceEntityRef: 'INSP-2026-043',
        targetUrl: '/maintenance?tab=inspections',
        createdAt: '2026-11-26T09:00:00Z',
        updatedAt: '2026-11-26T09:00:00Z',
      },
    ];
  });

  // Persist events to LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
    }
  }, [events]);

  // Handlers
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailModalOpen(true);
  };

  const handleUpdateEvent = (updated: CalendarEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (selectedEvent?.id === updated.id) {
      setSelectedEvent(updated);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    toast({ title: 'Event Deleted', description: 'Calendar event removed.' });
  };

  const handleCreateEvent = (newEvent: CalendarEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleUpdateStatus = (eventId: string, newStatus: CalendarEventStatus) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus, updatedAt: new Date().toISOString() } : e))
    );
    toast({ title: 'Status Updated', description: `Event transitioned to ${newStatus.replace('_', ' ')}.` });
  };

  const handleOpenCreatePreset = (type: CalendarEventType, date?: string, time?: string) => {
    setPresetEventType(type);
    setPresetDate(date || new Date().toISOString().slice(0, 10));
    setPresetTime(time || '09:00');
    setCreateModalOpen(true);
  };

  // Export Calendar as standard .ics (iCalendar) and CSV
  const handleExportCalendar = () => {
    // 1. Generate standard iCalendar (.ics) string
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FishGate//Operational Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach((ev) => {
      const startClean = ev.startDate.replace(/-/g, '');
      const startTimeClean = (ev.startTime || '00:00').replace(':', '') + '00';
      const endClean = (ev.endDate || ev.startDate).replace(/-/g, '');
      const endTimeClean = (ev.endTime || '23:59').replace(':', '') + '00';

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@fishgate.internal`,
        `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
        `DTSTART:${startClean}T${startTimeClean}`,
        `DTEND:${endClean}T${endTimeClean}`,
        `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:${(ev.description || '').replace(/\n/g, ' ')}`,
        `LOCATION:${(ev.propertyName + (ev.unitNumber ? ` Unit ${ev.unitNumber}` : '')).replace(/[,;]/g, ' ')}`,
        `STATUS:${ev.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `fishgate-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also download CSV
    const rows = events.map((e) => ({
      EventNumber: e.eventNumber,
      Title: e.title,
      Type: e.eventType,
      StartDate: e.startDate,
      StartTime: e.startTime || 'All Day',
      EndDate: e.endDate,
      EndTime: e.endTime || '',
      Property: e.propertyName,
      Unit: e.unitNumber || '',
      Tenant: e.tenantName || '',
      Vendor: e.vendorName || '',
      Owner: e.owner.name,
      Status: e.status,
      Priority: e.priority,
    }));
    downloadCsv(`fishgate-calendar-schedule-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);

    toast({
      title: 'Calendar Exported',
      description: 'Downloaded iCalendar (.ics) and CSV schedule files.',
    });
  };

  const currentUserName = user?.name || user?.email?.split('@')[0] || 'Operator';

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* =========================================================================
            SECTION 1: HEADER
            ========================================================================= */}
        <CalendarHeader
          onCreateEvent={() => handleOpenCreatePreset('meeting')}
          onScheduleInspection={() => handleOpenCreatePreset('inspection')}
          onScheduleMaintenance={() => handleOpenCreatePreset('maintenance')}
          onBlockTime={() => handleOpenCreatePreset('block_time')}
          onExportCalendar={handleExportCalendar}
        />

        {/* =========================================================================
            SECTION 2: TODAY'S SCHEDULE (MAX 4 OPERATIONAL CARDS)
            ========================================================================= */}
        <CalendarTodaySchedule
          events={events}
          activeFilter={todayFilter}
          onFilterSelect={(k) => setTodayFilter(todayFilter === k ? 'all' : k)}
        />

        {/* =========================================================================
            SECTION 3: CALENDAR WORKSPACE (PRIMARY EXPERIENCE: DAY, WEEK, MONTH, AGENDA, TIMELINE)
            ========================================================================= */}
        <CalendarWorkspace
          events={events}
          properties={properties}
          teamMembers={teamMembers}
          currentUserName={currentUserName}
          onSelectEvent={handleSelectEvent}
          onQuickBook={(date, hour) => {
            handleOpenCreatePreset(
              'maintenance',
              format(date, 'yyyy-MM-dd'),
              hour || '09:00'
            );
          }}
          onUpdateStatus={handleUpdateStatus}
        />

        {/* =========================================================================
            SECTION 4: UPCOMING MILESTONES (14-30 DAY PORTFOLIO HORIZON)
            ========================================================================= */}
        <CalendarMilestones />

        {/* =========================================================================
            SECTION 5: CALENDAR OBSERVATIONS (MAX 3, STRICTLY ZERO AI/ALGORITHM JARGON)
            ========================================================================= */}
        <CalendarObservations />
      </div>

      {/* =========================================================================
          MODALS & SCHEDULING WIZARDS
          ========================================================================= */}

      {/* Event Details Cockpit & Rescheduling Modal */}
      {selectedEvent && (
        <CalendarEventDetailModal
          open={detailModalOpen}
          onOpenChange={(open) => {
            setDetailModalOpen(open);
            if (!open) setTimeout(() => setSelectedEvent(null), 200);
          }}
          event={selectedEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      {/* Event Creation Wizard with Conflict Detection */}
      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultEventType={presetEventType}
        defaultDate={presetDate}
        defaultTime={presetTime}
        properties={properties}
        teamMembers={teamMembers}
        existingEvents={events}
        onCreateEvent={handleCreateEvent}
      />
    </PageContainer>
  );
}
