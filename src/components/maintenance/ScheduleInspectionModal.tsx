// src/components/maintenance/ScheduleInspectionModal.tsx
// FishGate Design Constitution v1.0 - Schedule Inspection Audit Modal

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Calendar, ClipboardList } from 'lucide-react';
import { InspectionRecord, InspectionType } from './types';
import { Property } from '@/hooks/useProperties';

interface ScheduleInspectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  onScheduleInspection: (inspection: InspectionRecord) => void;
}

export function ScheduleInspectionModal({
  open,
  onOpenChange,
  properties,
  onScheduleInspection,
}: ScheduleInspectionModalProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [type, setType] = useState<InspectionType>('routine');
  const [inspector, setInspector] = useState('Chief Quality Inspector');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const handleSchedule = () => {
    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    const ref = `INSP-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newInsp: InspectionRecord = {
      id: `insp-${Date.now()}`,
      reference: ref,
      propertyId: prop?.id || 'prop-1',
      propertyName: prop?.name || 'Vision City Commercial & Residential Hub',
      unitNumber: unitNumber.trim() || null,
      type,
      inspector: inspector.trim() || 'Quality Inspector',
      inspectionDate,
      conditionScore: 92,
      conditionRating: 'good',
      outcome: 'passed',
      issuesFound: [],
      notes: notes.trim() || undefined,
      attachments: [],
      createdAt: new Date().toISOString(),
    };

    onScheduleInspection(newInsp);
    onOpenChange(false);
    toast({
      title: 'Inspection Scheduled',
      description: `${ref} booked for ${newInsp.propertyName} on ${inspectionDate}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Schedule Condition Inspection
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Book physical property audit, move-in/out check or safety inspection.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Premises / Property *</Label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Unit Number (Optional)</Label>
              <Input
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g. Unit B-202"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Inspection Type *</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InspectionType)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="move_in">Move-In Baseline</option>
                <option value="move_out">Move-Out Exit</option>
                <option value="routine">Routine Quarterly</option>
                <option value="safety">Safety & Fire Check</option>
                <option value="preventive">Preventive Systems</option>
                <option value="compliance">RRA Statutory Audit</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Audit Date *</Label>
              <Input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Assigned Inspector</Label>
            <Input
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              placeholder="e.g. Chief Quality Inspector"
              className="h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Audit Instructions & Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Areas to pay close attention to (e.g. Balcony waterproofing)..."
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs" onClick={handleSchedule}>
            Confirm Inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
