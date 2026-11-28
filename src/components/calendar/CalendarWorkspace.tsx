// src/components/calendar/CalendarWorkspace.tsx
// FishGate Design Constitution v1.0 - Section 3: Calendar Workspace (Primary Experience with 5 Views & Persistent Preferences)

import { useState, useMemo, useEffect } from 'react';
import {
  format,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CalendarDays,
  Calendar as CalendarIcon,
  Columns,
  List,
  Milestone,
  Clock,
  Building,
  Users,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarViewMode,
  CalendarEventType,
  CalendarEventStatus,
} from './types';
import { EVENT_TYPE_CONFIG, detectConflicts } from './CalendarEventUtils';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarDayView } from './CalendarDayView';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarTimelineView } from './CalendarTimelineView';

const VIEW_PREF_KEY = 'fishgate_calendar_view_pref_v1';

interface CalendarWorkspaceProps {
  events: CalendarEvent[];
  properties: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string; role: string; department?: string }>;
  currentUserName?: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onQuickBook: (date: Date, hourStr?: string) => void;
  onUpdateStatus?: (eventId: string, newStatus: CalendarEventStatus) => void;
}

export function CalendarWorkspace({
  events,
  properties,
  teamMembers,
  currentUserName = 'Operator',
  onSelectEvent,
  onQuickBook,
  onUpdateStatus,
}: CalendarWorkspaceProps) {
  // 1. View Mode with LocalStorage persistence
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_PREF_KEY);
      if (stored && ['day', 'week', 'month', 'agenda', 'timeline'].includes(stored)) {
        return stored as CalendarViewMode;
      }
    }
    return 'month';
  });

  const handleViewChange = (mode: CalendarViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_PREF_KEY, mode);
    }
  };

  // 2. Current Navigation Date
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrev = () => {
    setCurrentDate((d) => {
      switch (viewMode) {
        case 'day':
          return subDays(d, 1);
        case 'week':
          return subWeeks(d, 1);
        case 'month':
          return subMonths(d, 1);
        case 'timeline':
          return subWeeks(d, 2);
        default:
          return subMonths(d, 1);
      }
    });
  };

  const handleNext = () => {
    setCurrentDate((d) => {
      switch (viewMode) {
        case 'day':
          return addDays(d, 1);
        case 'week':
          return addWeeks(d, 1);
        case 'month':
          return addMonths(d, 1);
        case 'timeline':
          return addWeeks(d, 2);
        default:
          return addMonths(d, 1);
      }
    });
  };

  const handleToday = () => setCurrentDate(new Date());

  // 3. Filters State
  const [search, setSearch] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [selectedTeamScope, setSelectedTeamScope] = useState<string>('all');

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Property filter
      if (selectedPropertyId !== 'all') {
        const prop = properties.find((p) => p.id === selectedPropertyId);
        if (ev.propertyName !== prop?.name && ev.propertyId !== selectedPropertyId) {
          return false;
        }
      }

      // Event Type filter
      if (selectedEventType !== 'all' && ev.eventType !== selectedEventType) {
        return false;
      }

      // Team Scope filter
      if (selectedTeamScope === 'personal') {
        if (!ev.owner.name.toLowerCase().includes(currentUserName.toLowerCase())) {
          return false;
        }
      } else if (selectedTeamScope.startsWith('dept:')) {
        const dept = selectedTeamScope.replace('dept:', '');
        if (ev.owner.department !== dept) {
          return false;
        }
      } else if (selectedTeamScope !== 'all') {
        if (ev.owner.id !== selectedTeamScope && ev.owner.name !== selectedTeamScope) {
          return false;
        }
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchProp = ev.propertyName.toLowerCase().includes(q);
        const matchUnit = ev.unitNumber?.toLowerCase().includes(q) || false;
        const matchTenant = ev.tenantName?.toLowerCase().includes(q) || false;
        const matchVendor = ev.vendorName?.toLowerCase().includes(q) || false;
        const matchOwner = ev.owner.name.toLowerCase().includes(q);
        const matchNum = ev.eventNumber.toLowerCase().includes(q);
        if (!matchTitle && !matchProp && !matchUnit && !matchTenant && !matchVendor && !matchOwner && !matchNum) {
          return false;
        }
      }

      return true;
    });
  }, [
    events,
    selectedPropertyId,
    selectedEventType,
    selectedTeamScope,
    search,
    properties,
    currentUserName,
  ]);

  // Date Range Label calculation
  const dateRangeLabel = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week': {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = endOfWeek(currentDate, { weekStartsOn: 0 });
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'timeline': {
        const start = startOfWeek(currentDate, { weekStartsOn: 0 });
        const end = addDays(start, 13);
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
      }
      case 'agenda':
        return `Agenda • ${format(currentDate, 'MMMM yyyy')}`;
    }
  }, [viewMode, currentDate]);

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedPropertyId !== 'all' ||
    selectedEventType !== 'all' ||
    selectedTeamScope !== 'all';

  const resetFilters = () => {
    setSearch('');
    setSelectedPropertyId('all');
    setSelectedEventType('all');
    setSelectedTeamScope('all');
  };

  const eventTypeEntries = Object.entries(EVENT_TYPE_CONFIG) as [CalendarEventType, (typeof EVENT_TYPE_CONFIG)[CalendarEventType]][];

  return (
    <Card className="border-slate-200 shadow-xs overflow-hidden bg-white">
      {/* 1. Workspace Top Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-200 bg-white"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-bold text-sm text-slate-900 min-w-[190px] text-center">
              {dateRangeLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-200 bg-white"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900"
              onClick={handleToday}
            >
              Today
            </Button>
          </div>

          {/* 5-View Mode Switcher */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-200/60 self-start lg:self-center">
            <button
              onClick={() => handleViewChange('day')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'day'
                  ? 'bg-white shadow-xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => handleViewChange('week')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-white shadow-xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleViewChange('month')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-white shadow-xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => handleViewChange('agenda')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white shadow-xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => handleViewChange('timeline')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white shadow-xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>

        {/* 2. Search & Context Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1 border-t border-slate-200/70">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search title, premises, tenant, vendor, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>

          {/* Property Selector */}
          <div>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Selector */}
          <div>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">All Event Types ({eventTypeEntries.length})</option>
              {eventTypeEntries.map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Team / Scope Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedTeamScope}
              onChange={(e) => setSelectedTeamScope(e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">All Team Calendar</option>
              <option value="personal">My Personal Calendar</option>
              <option value="dept:Facilities & Maintenance">Facilities & Maintenance</option>
              <option value="dept:Leasing & Residents">Leasing & Residents</option>
              <option value="dept:Finance & Accounts">Finance & Accounts</option>
              <option value="dept:Executive & Legal">Executive & Legal</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-500 hover:text-slate-900 shrink-0 px-2"
                onClick={resetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Primary Workspace Views */}
      <div className="p-4">
        {viewMode === 'month' && (
          <CalendarMonthView
            currentDate={currentDate}
            events={filteredEvents}
            onSelectEvent={onSelectEvent}
            onDateClick={(d) => onQuickBook(d)}
          />
        )}

        {viewMode === 'week' && (
          <CalendarWeekView
            currentDate={currentDate}
            events={filteredEvents}
            onSelectEvent={onSelectEvent}
            onDateClick={(d, h) => onQuickBook(d, h)}
          />
        )}

        {viewMode === 'day' && (
          <CalendarDayView
            currentDate={currentDate}
            events={filteredEvents}
            onSelectEvent={onSelectEvent}
            onDateClick={(d, h) => onQuickBook(d, h)}
          />
        )}

        {viewMode === 'agenda' && (
          <CalendarAgendaView
            events={filteredEvents}
            onSelectEvent={onSelectEvent}
            onUpdateStatus={onUpdateStatus}
          />
        )}

        {viewMode === 'timeline' && (
          <CalendarTimelineView
            currentDate={currentDate}
            events={filteredEvents}
            onSelectEvent={onSelectEvent}
            onDateClick={(d) => onQuickBook(d)}
          />
        )}
      </div>
    </Card>
  );
}
