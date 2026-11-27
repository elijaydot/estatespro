// src/components/maintenance/CreateWorkOrderModal.tsx
// FishGate Design Constitution v1.0 - Create Operational Work Order Modal

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
import { CheckSquare, Wrench } from 'lucide-react';
import { WorkOrderRecord, MaintenancePriority } from './types';
import { Property } from '@/hooks/useProperties';
import { Vendor } from '@/hooks/useVendors';

interface CreateWorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  vendors: Vendor[];
  onCreateWorkOrder: (order: WorkOrderRecord) => void;
  currency?: string;
  initialData?: {
    title?: string;
    description?: string;
    propertyId?: string;
    propertyName?: string;
    unitNumber?: string;
    tradeCategory?: string;
    priority?: MaintenancePriority;
    requestId?: string;
    requestReference?: string;
  };
}

export function CreateWorkOrderModal({
  open,
  onOpenChange,
  properties,
  vendors,
  onCreateWorkOrder,
  currency = 'RWF',
  initialData,
}: CreateWorkOrderModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [propertyId, setPropertyId] = useState(initialData?.propertyId || properties[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState(initialData?.unitNumber || '');
  const [tradeCategory, setTradeCategory] = useState(initialData?.tradeCategory || 'Plumbing');
  const [vendorId, setVendorId] = useState('');
  const [technician, setTechnician] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>(initialData?.priority || 'medium');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
  const [estimatedCost, setEstimatedCost] = useState<number>(120000);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: 'Title Required', description: 'Please provide a title for the work order.', variant: 'destructive' });
      return;
    }

    const prop = properties.find((p) => p.id === propertyId) || properties[0];
    const ven = vendors.find((v) => v.id === vendorId);

    const woNumber = `WO-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder: WorkOrderRecord = {
      id: `wo-${Date.now()}`,
      workOrderNumber: woNumber,
      requestId: initialData?.requestId || null,
      requestReference: initialData?.requestReference || null,
      title: title.trim(),
      issueDescription: description.trim() || title.trim(),
      propertyId: prop?.id || 'prop-1',
      propertyName: prop?.name || 'Vision City Commercial & Residential Hub',
      unitNumber: unitNumber.trim() || null,
      assignedVendorId: ven?.id || null,
      assignedVendorName: ven?.name || 'In-House Crew',
      assignedTechnician: technician.trim() || 'Lead Technician',
      tradeCategory,
      status: 'assigned',
      priority,
      scheduledDate: new Date().toISOString(),
      dueDate,
      estimatedCost,
      actualCost: estimatedCost,
      progress: 0,
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateWorkOrder(newOrder);
    onOpenChange(false);
    toast({
      title: 'Work Order Dispatched',
      description: `${woNumber} assigned and scheduled for execution.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Dispatch Maintenance Work Order
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Issue executable work order with assigned trade contractor and cost ceiling.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold">Work Order Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clean & service roof stormwater drainage gutter"
              className="h-9 text-xs"
            />
          </div>

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
                placeholder="e.g. Unit 302"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Trade Category</Label>
              <select
                value={tradeCategory}
                onChange={(e) => setTradeCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="HVAC">HVAC & AC</option>
                <option value="Elevator">Elevator Maintenance</option>
                <option value="Roofing">Roofing & Waterproofing</option>
                <option value="Security">Security & Access</option>
                <option value="Cleaning">Deep Cleaning & Waste</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Priority</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="emergency">Emergency</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Assigned Contractor</Label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="">In-House Operations Crew</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lead Technician</Label>
              <Input
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="e.g. Eric Habimana"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Cost Ceiling / Estimate ({currency})</Label>
              <Input
                type="number"
                min="0"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(Number(e.target.value))}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Detailed Scope of Work</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specific tasks, replacement parts needed, safety precautions..."
              rows={3}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs" onClick={handleSubmit}>
            Create & Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
