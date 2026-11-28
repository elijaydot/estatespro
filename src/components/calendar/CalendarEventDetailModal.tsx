// src/components/calendar/CalendarEventDetailModal.tsx
// FishGate Design Constitution v1.0 - Calendar Event Cockpit Detail & Rescheduling Modal

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  Clock,
  Calendar,
  Building,
  User,
  Users,
  MapPin,
  FileText,
  Paperclip,
  CheckCircle2,
  XCircle,
  CalendarDays,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { CalendarEvent, CalendarEventStatus } from './types';
import { EVENT_TYPE_CONFIG } from './CalendarEventUtils';

interface CalendarEventDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent;
  onUpdateEvent: (updated: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function CalendarEventDetailModal({
  open,
  onOpenChange,
  event,
  onUpdateEvent,
  onDeleteEvent,
}: CalendarEventDetailModalProps) {
  const navigate = useNavigate();
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(event.startDate);
  const [newStartTime, setNewStartTime] = useState(event.startTime || '09:00');
  const [newEndTime, setNewEndTime] = useState(event.endTime || '10:00');

  const cfg = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.custom_event;
  const Icon = cfg.icon;

  const handleStatusChange = (status: CalendarEventStatus) => {
    onUpdateEvent({
      ...event,
      status,
      updatedAt: new Date().toISOString(),
    });
    toast({
      title: 'Status Updated',
      description: `Event marked as ${status.replace('_', ' ')}.`,
    });
  };

  const handleSaveReschedule = () => {
    if (!newDate) {
      toast({ title: 'Invalid Date', description: 'Please select a valid date.', variant: 'destructive' });
      return;
    }
    onUpdateEvent({
      ...event,
      startDate: newDate,
      endDate: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'rescheduled',
      updatedAt: new Date().toISOString(),
    });
    setIsRescheduling(false);
    toast({
      title: 'Event Rescheduled',
      description: `Updated schedule to ${newDate} (${newStartTime} - ${newEndTime}).`,
    });
  };

  const handleNavigateSource = () => {
    if (event.targetUrl) {
      onOpenChange(false);
      navigate(event.targetUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header Bar */}
        <div className={`p-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3`}>
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded border bg-white ${cfg.badgeClass} shrink-0 mt-0.5`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`text-[10px] font-bold uppercase ${cfg.badgeClass}`}>
                  {cfg.label}
                </Badge>
                {event.eventNumber && (
                  <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                    {event.eventNumber}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize font-semibold ${
                    event.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : event.status === 'rescheduled'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {event.status.replace('_', ' ')}
                </Badge>
              </div>

              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                {event.title}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Schedule Window */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Scheduled Window
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-blue-600 font-semibold hover:text-blue-700"
                onClick={() => setIsRescheduling(!isRescheduling)}
              >
                {isRescheduling ? 'Cancel' : 'Reschedule'}
              </Button>
            </div>

            {!isRescheduling ? (
              <div className="flex items-center justify-between text-slate-800">
                <span className="font-medium text-xs">
                  {event.startDate} {event.endDate && event.endDate !== event.startDate ? `→ ${event.endDate}` : ''}
                </span>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {event.startTime ? `${event.startTime} - ${event.endTime || 'End'}` : 'All-Day Operational Block'}
                </span>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Date</Label>
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Start Time</Label>
                    <Input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">End Time</Label>
                    <Input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    onClick={handleSaveReschedule}
                  >
                    Confirm Reschedule
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <Label className="text-[10px] uppercase font-bold text-slate-500">
                Operational Scope
              </Label>
              <p className="mt-1 text-slate-700 text-xs leading-relaxed bg-white p-2.5 rounded border border-slate-100">
                {event.description}
              </p>
            </div>
          )}

          {/* Location & Property Context */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Property & Space
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{event.propertyName}</span>
              </div>
              {event.unitNumber && (
                <span className="text-[11px] text-slate-500 ml-5 block">
                  Unit {event.unitNumber}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Assignee / Lead
              </span>
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{event.owner.name}</span>
              </div>
              <span className="text-[11px] text-slate-500 ml-5 block truncate">
                {event.owner.role}
              </span>
            </div>
          </div>

          {/* Tenant / Vendor / Participants */}
          {(event.tenantName || event.vendorName || (event.participants && event.participants.length > 0)) && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500">
                Stakeholders & Participants
              </Label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {event.tenantName && (
                  <div className="p-2 border border-slate-200 rounded bg-white">
                    <span className="text-[10px] text-slate-400 block">Resident / Tenant</span>
                    <span className="font-semibold text-slate-800">{event.tenantName}</span>
                  </div>
                )}
                {event.vendorName && (
                  <div className="p-2 border border-slate-200 rounded bg-white">
                    <span className="text-[10px] text-slate-400 block">Contractor / Vendor</span>
                    <span className="font-semibold text-slate-800">{event.vendorName}</span>
                  </div>
                )}
              </div>

              {event.participants && event.participants.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {event.participants.map((p) => (
                    <Badge key={p.id} variant="outline" className="text-[10px] bg-white gap-1 py-0.5">
                      <User className="w-2.5 h-2.5 text-slate-400" />
                      {p.name} ({p.role})
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dependencies & Source Entity */}
          {event.sourceEntityRef && (
            <div className="p-2.5 bg-blue-50/40 border border-blue-200 rounded flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 block uppercase">
                  Connected Record
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {event.sourceEntityRef}
                </span>
              </div>
              {event.targetUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-white text-blue-700 font-semibold gap-1 hover:bg-blue-50 border-blue-200"
                  onClick={handleNavigateSource}
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Work Order / Record
                </Button>
              )}
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <Label className="text-[10px] uppercase font-bold text-slate-500">
                Operational Notes
              </Label>
              <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200/80 text-[11px]">
                {event.notes}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {event.status !== 'completed' && (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                onClick={() => handleStatusChange('completed')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
              </Button>
            )}
            {event.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 font-semibold gap-1"
                onClick={() => handleStatusChange('cancelled')}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Event
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onDeleteEvent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-400 hover:text-red-600"
                onClick={() => {
                  onDeleteEvent(event.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-slate-700"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
