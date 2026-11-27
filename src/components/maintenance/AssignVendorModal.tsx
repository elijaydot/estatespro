// src/components/maintenance/AssignVendorModal.tsx
// FishGate Design Constitution v1.0 - Section 4.4: Contractor Assignment & Dispatch Workflow

import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  Building,
  UserCheck,
  Calendar,
  CheckSquare,
  Wrench,
  AlertTriangle,
  Clock,
  Star,
  CheckCircle2,
} from 'lucide-react';
import {
  VendorOperationalProfile,
  WorkOrderRecord,
  MaintenanceRequestRecord,
} from './types';

interface AssignVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: VendorOperationalProfile[];
  workOrders: WorkOrderRecord[];
  requests: MaintenanceRequestRecord[];
  preselectedVendorId?: string | null;
  preselectedWorkOrderId?: string | null;
  preselectedRequestId?: string | null;
  onAssignConfirm: (payload: {
    targetType: 'work_order' | 'request';
    targetId: string;
    vendor: VendorOperationalProfile;
    technician: string;
    scheduledDate: string;
    instructions: string;
  }) => void;
}

export function AssignVendorModal({
  open,
  onOpenChange,
  vendors,
  workOrders,
  requests,
  preselectedVendorId,
  preselectedWorkOrderId,
  preselectedRequestId,
  onAssignConfirm,
}: AssignVendorModalProps) {
  // Determine initial target type and IDs
  const initialType = preselectedRequestId ? 'request' : 'work_order';
  const [targetType, setTargetType] = useState<'work_order' | 'request'>(initialType);

  const activeWorkOrders = useMemo(
    () => workOrders.filter((w) => w.status !== 'completed' && w.status !== 'closed'),
    [workOrders]
  );

  const activeRequests = useMemo(
    () => requests.filter((r) => r.status !== 'closed' && r.status !== 'converted_to_work_order'),
    [requests]
  );

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>(
    preselectedWorkOrderId || (activeWorkOrders[0]?.id ?? '')
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    preselectedRequestId || (activeRequests[0]?.id ?? '')
  );
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    preselectedVendorId || (vendors[0]?.id ?? '')
  );

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === selectedVendorId) || vendors[0],
    [vendors, selectedVendorId]
  );

  const [technician, setTechnician] = useState(selectedVendor?.contactPerson || '');
  const [scheduledDate, setScheduledDate] = useState(
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [instructions, setInstructions] = useState('');

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    const v = vendors.find((vend) => vend.id === vendorId);
    if (v) {
      setTechnician(v.contactPerson);
    }
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVendor) {
      toast({ title: 'Validation Error', description: 'Please select a contractor partner.', variant: 'destructive' });
      return;
    }

    const targetId = targetType === 'work_order' ? selectedWorkOrderId : selectedRequestId;
    if (!targetId) {
      toast({
        title: 'Validation Error',
        description: `Please select an active ${targetType === 'work_order' ? 'work order' : 'maintenance request'}.`,
        variant: 'destructive',
      });
      return;
    }

    onAssignConfirm({
      targetType,
      targetId,
      vendor: selectedVendor,
      technician: technician.trim() || selectedVendor.contactPerson,
      scheduledDate,
      instructions: instructions.trim(),
    });

    onOpenChange(false);

    toast({
      title: 'Contractor Assigned & Dispatched',
      description: `${selectedVendor.name} assigned to ${targetType === 'work_order' ? 'Work Order' : 'Maintenance Request'}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Dispatch & Assign Contractor Partner</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Allocate an active work order or repair request to a certified trade contractor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAssignSubmit} className="space-y-4 py-2 text-xs">
          {/* Target Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Assignment Target</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('work_order')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  targetType === 'work_order'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Existing Work Order ({activeWorkOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('request')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  targetType === 'request'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Pending Request ({activeRequests.length})</span>
              </button>
            </div>
          </div>

          {/* Target Item Selection Dropdown */}
          {targetType === 'work_order' ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Select Work Order *</Label>
              {activeWorkOrders.length === 0 ? (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs">
                  No active work orders currently require assignment.
                </div>
              ) : (
                <select
                  value={selectedWorkOrderId}
                  onChange={(e) => setSelectedWorkOrderId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                  required
                >
                  {activeWorkOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.workOrderNumber}: {wo.title} ({wo.propertyName})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Select Maintenance Request *</Label>
              {activeRequests.length === 0 ? (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs">
                  No pending requests currently require assignment.
                </div>
              ) : (
                <select
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
                  required
                >
                  {activeRequests.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.reference}: {req.title} ({req.propertyName})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Contractor Partner Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Assign Contractor Partner *</Label>
            <select
              value={selectedVendorId}
              onChange={(e) => handleVendorChange(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800"
              required
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.tradeCategory}) — SLA: {v.responseTimeHours}h
                </option>
              ))}
            </select>

            {selectedVendor && (
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-600 mt-1">
                <div>
                  <span className="font-semibold text-slate-900">{selectedVendor.contactPerson}</span>
                  <span className="text-slate-400 mx-1.5">•</span>
                  <span>{selectedVendor.phone}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-900">{selectedVendor.rating.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Lead Technician & Scheduled Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Lead Field Technician</Label>
              <Input
                placeholder="e.g. Jean Claude Bizimana"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Target Service Date *</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="text-xs h-9 font-mono"
                required
              />
            </div>
          </div>

          {/* Dispatch Notes / Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Special Dispatch Instructions</Label>
            <Textarea
              placeholder="Provide access details, parking gate code, or specific safety procedures..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Confirm Assignment & Notify Partner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
