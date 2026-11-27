// src/components/maintenance/RequestDetailModal.tsx
// FishGate Design Constitution v1.0 - Request Detail & Operational Triage Workspace

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  Wrench,
  Flame,
  ShieldAlert,
  Building2,
  Home,
  User,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Paperclip,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { MaintenanceRequestRecord } from './types';

interface RequestDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequestRecord | null;
  currency?: string;
  onConvertToWorkOrder: (request: MaintenanceRequestRecord) => void;
  onAssignRequest: (request: MaintenanceRequestRecord) => void;
}

export function RequestDetailModal({
  open,
  onOpenChange,
  request,
  currency = 'RWF',
  onConvertToWorkOrder,
  onAssignRequest,
}: RequestDetailModalProps) {
  // All hooks declared unconditionally at the very top
  const [activeTab, setActiveTab] = useState<'overview' | 'impact' | 'media' | 'communication'>('overview');

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 bg-blue-50">
                {request.reference}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {request.category}
              </Badge>
              <Badge
                className={`text-[10px] capitalize font-semibold ${
                  request.priority === 'emergency'
                    ? 'bg-red-600 text-white'
                    : request.priority === 'high'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {request.priority}
              </Badge>
            </div>
            <span className="text-[10px] text-slate-400">
              Reported {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2">
            {request.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {request.propertyName} {request.unitNumber ? `• Unit ${request.unitNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-2">
          <TabsList className="grid grid-cols-4 bg-slate-100 p-1">
            <TabsTrigger value="overview" className="text-xs font-semibold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="impact" className="text-xs font-semibold">
              Risk & SLA
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs font-semibold">
              Evidence ({request.media.length})
            </TabsTrigger>
            <TabsTrigger value="communication" className="text-xs font-semibold">
              Reporter
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-3 pt-2 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-slate-800 leading-relaxed">
              <span className="font-bold text-slate-900 block mb-1">Issue Description</span>
              {request.description}
            </div>

            <div className="grid grid-cols-2 gap-3 border border-slate-200 rounded-lg p-3 bg-white">
              <div>
                <span className="text-slate-400 block text-[10px]">Location Scope</span>
                <span className="font-semibold text-slate-900">
                  {request.propertyName} {request.unitNumber ? `(Unit ${request.unitNumber})` : ''}
                </span>
                {request.areaAffected && (
                  <span className="text-[10px] text-slate-500 block">Area: {request.areaAffected}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Current Status</span>
                <span className="font-semibold text-slate-900 capitalize">
                  {request.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[10px]">Assigned Dispatch</span>
                <span className="font-semibold text-slate-900">
                  {request.assignment?.vendorName || request.assignment?.assignedTo || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Target Completion</span>
                <span className="font-semibold text-slate-900">
                  {request.assignment?.dueDate || 'Pending Assignment'}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: RISK & SLA */}
          <TabsContent value="impact" className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Occupancy Threat</span>
                <span className={`font-bold ${request.impact.occupancyImpact ? 'text-red-600' : 'text-slate-700'}`}>
                  {request.impact.occupancyImpact ? 'CRITICAL RISK' : 'None'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Revenue Risk</span>
                <span className={`font-bold ${request.impact.revenueImpact ? 'text-amber-600' : 'text-slate-700'}`}>
                  {request.impact.revenueImpact ? 'REVENUE AT RISK' : 'None'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Safety Hazard</span>
                <span className={`font-bold ${request.impact.safetyRisk ? 'text-red-600' : 'text-emerald-700'}`}>
                  {request.impact.safetyRisk ? 'HAZARD PRESENT' : 'Safe'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
              <span className="font-bold text-slate-900 block">SLA Commitment</span>
              <p className="text-slate-600">
                Target resolution window: <strong className="text-slate-900">{request.assignment?.slaHours || 24} Hours</strong> from initial ticket triage.
              </p>
            </div>
          </TabsContent>

          {/* TAB 3: MEDIA */}
          <TabsContent value="media" className="space-y-3 pt-2 text-xs">
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {request.media.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  No visual evidence or photos attached to this incident.
                </div>
              ) : (
                request.media.map((m) => (
                  <div key={m.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="font-semibold text-slate-900 block">{m.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{m.type} • {m.size}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600">
                      View File
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 4: REPORTER */}
          <TabsContent value="communication" className="space-y-3 pt-2 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <User className="w-4 h-4 text-blue-600" />
                <span>{request.reportedBy.name}</span>
                <Badge variant="outline" className="text-[9px] capitalize">{request.reportedBy.role}</Badge>
              </div>

              <div className="space-y-1 text-slate-600 pt-1 border-t border-slate-100">
                {request.reportedBy.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{request.reportedBy.phone}</span>
                  </div>
                )}
                {request.reportedBy.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{request.reportedBy.email}</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 pt-1">
                  Preferred Contact: <strong className="text-slate-800 capitalize">{request.reportedBy.preferredContact.replace('_', ' ')}</strong>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5 text-slate-700"
              onClick={() => {
                onAssignRequest(request);
                onOpenChange(false);
              }}
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Dispatch Vendor
            </Button>
            {request.status !== 'converted_to_work_order' && request.status !== 'closed' && (
              <Button
                size="sm"
                className="text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  onConvertToWorkOrder(request);
                  onOpenChange(false);
                }}
              >
                Convert to Work Order <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
