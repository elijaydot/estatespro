// src/components/maintenance/WorkOrderDetailModal.tsx
// FishGate Design Constitution v1.0 - Work Order Execution & Sign-Off Modal

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
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  CheckSquare,
  Wrench,
  Building2,
  User,
  Clock,
  Printer,
  CheckCircle2,
  Plus,
  Package,
} from 'lucide-react';
import { WorkOrderRecord, WorkOrderStatus } from './types';

interface WorkOrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrderRecord | null;
  currency?: string;
  onPrintWorkOrder: (order: WorkOrderRecord) => void;
  onUpdateWorkOrder: (updated: WorkOrderRecord) => void;
}

export function WorkOrderDetailModal({
  open,
  onOpenChange,
  workOrder,
  currency = 'RWF',
  onPrintWorkOrder,
  onUpdateWorkOrder,
}: WorkOrderDetailModalProps) {
  // All hooks declared unconditionally at the very top
  const [progressVal, setProgressVal] = useState<number>(workOrder?.progress || 0);
  const [actualCost, setActualCost] = useState<number>(workOrder?.actualCost || workOrder?.estimatedCost || 0);
  const [technicianNotes, setTechnicianNotes] = useState(workOrder?.technicianNotes || '');
  const [orderStatus, setOrderStatus] = useState<WorkOrderStatus>(workOrder?.status || 'in_progress');

  if (!workOrder) return null;

  const handleSaveExecution = () => {
    const updated: WorkOrderRecord = {
      ...workOrder,
      progress: progressVal,
      actualCost,
      technicianNotes,
      status: orderStatus,
      completedAt: orderStatus === 'completed' ? new Date().toISOString() : workOrder.completedAt,
      updatedAt: new Date().toISOString(),
    };
    onUpdateWorkOrder(updated);
    onOpenChange(false);
    toast({
      title: 'Work Order Updated',
      description: `${workOrder.workOrderNumber} status and field notes saved.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 bg-blue-50">
                {workOrder.workOrderNumber}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {workOrder.tradeCategory}
              </Badge>
              <Badge
                className={`text-[10px] capitalize font-semibold ${
                  workOrder.status === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {workOrder.status.replace('_', ' ')}
              </Badge>
            </div>
            <span className="text-[10px] text-slate-400">
              Due {format(new Date(workOrder.dueDate), 'MMM d, yyyy')}
            </span>
          </div>

          <DialogTitle className="text-base font-bold text-slate-900 mt-2">
            {workOrder.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {workOrder.propertyName} {workOrder.unitNumber ? `• Unit ${workOrder.unitNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Issue Scope Box */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed">
            <span className="font-bold text-slate-900 block mb-1">Scope of Work & Specification</span>
            {workOrder.issueDescription}
          </div>

          {/* Allocation & Assigned Vendor Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
              <span className="text-slate-400 block text-[10px]">Assigned Contractor</span>
              <span className="font-bold text-slate-900 text-sm">
                {workOrder.assignedVendorName || 'In-House Crew'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Lead Tech: {workOrder.assignedTechnician || 'Operations Specialist'}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
              <span className="text-slate-400 block text-[10px]">Budget & Outlay</span>
              <div className="text-slate-900 font-bold text-sm font-mono">
                {currency} {actualCost.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 block">
                Estimated: {currency} {workOrder.estimatedCost.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Execution Progress Controller */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Work Execution Progress</span>
              <span className="font-mono text-blue-700 font-bold">{progressVal}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressVal}
              onChange={(e) => setProgressVal(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Dispatched</span>
              <span>On-Site Diagnostics</span>
              <span>Parts Installed</span>
              <span>Quality Sign-off</span>
            </div>
          </div>

          {/* Status & Actual Billing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Operational Status</Label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as WorkOrderStatus)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="assigned">Assigned</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="parts_required">Parts Required / On Order</option>
                <option value="awaiting_inspection">Awaiting Quality Inspection</option>
                <option value="completed">Work Completed</option>
                <option value="closed">Closed & Audited</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Final Invoiced Cost ({currency})</Label>
              <Input
                type="number"
                min="0"
                value={actualCost}
                onChange={(e) => setActualCost(Number(e.target.value))}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Field Technician Log & Resolution Notes</Label>
            <Textarea
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="e.g. Replaced 15mm copper piping elbow, tested at 4.2 bar pressure, zero leaks found."
              rows={2}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
            onClick={() => onPrintWorkOrder(workOrder)}
          >
            <Printer className="w-3.5 h-3.5" /> Print Work Sheet
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs" onClick={handleSaveExecution}>
              Save Updates
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
