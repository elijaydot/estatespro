// src/components/approvals/CreateApprovalModal.tsx
// FishGate Design Constitution v1.0 - Create Approval Request Wizard

import { useState } from 'react';
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
import { toast } from '@/components/ui/use-toast';
import {
  ShieldCheck,
  CheckCircle2,
  Building,
  User,
  Clock,
  DollarSign,
} from 'lucide-react';
import {
  ApprovalRecord,
  ApprovalType,
  ApprovalPriority,
  ApprovalWorkflowType,
  ApprovalParty,
} from './types';
import { APPROVAL_TYPE_REGISTRY, WORKFLOW_CONFIG } from './ApprovalVisualRegistry';

interface CreateApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string; role: string; department?: string }>;
  currentUserName?: string;
  onCreateApproval: (newRecord: ApprovalRecord) => void;
}

export function CreateApprovalModal({
  open,
  onOpenChange,
  properties,
  teamMembers,
  currentUserName = 'Operator',
  onCreateApproval,
}: CreateApprovalModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ApprovalType>('expense');
  const [priority, setPriority] = useState<ApprovalPriority>('high');
  const [workflowType, setWorkflowType] = useState<ApprovalWorkflowType>('single_step');
  const [amount, setAmount] = useState<string>('');
  const [financialImpact, setFinancialImpact] = useState('');
  const [reason, setReason] = useState('');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [unitNumber, setUnitNumber] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [approverId, setApproverId] = useState(teamMembers[0]?.id || '');
  const [deadline, setDeadline] = useState(todayStr);

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const selectedApprover = teamMembers.find((m) => m.id === approverId) || teamMembers[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !reason.trim()) {
      toast({ title: 'Missing Information', description: 'Please provide a title and operational reason.', variant: 'destructive' });
      return;
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const approvalNumber = `APP-2026-${randomSuffix}`;
    const timestamp = new Date().toISOString();

    const newApproval: ApprovalRecord = {
      id: `app-${Date.now()}`,
      approvalNumber,
      title: title.trim(),
      type,
      status: 'pending',
      priority,
      workflowType,
      amount: amount ? parseFloat(amount) : undefined,
      currency: 'RWF',
      financialImpact: financialImpact.trim() || 'Standard operational budget line',
      reason: reason.trim(),
      summary: title.trim(),
      deadline,
      slaHoursRemaining: 48,
      isUrgent: priority === 'critical',
      isEscalated: false,
      requester: {
        id: 'usr-current',
        name: currentUserName,
        role: 'Property Operations Lead',
        department: 'Operations & Facilities',
      },
      currentApprover: {
        id: selectedApprover.id,
        name: selectedApprover.name,
        role: selectedApprover.role,
        department: selectedApprover.department || 'Management',
      },
      steps: [
        {
          stepNumber: 1,
          roleRequired: selectedApprover.role,
          approverName: selectedApprover.name,
          approverId: selectedApprover.id,
          status: 'pending',
        },
      ],
      currentStepIndex: 0,
      propertyId,
      propertyName: selectedProperty?.name || 'All Properties',
      unitNumber: unitNumber.trim() || undefined,
      tenantName: tenantName.trim() || undefined,
      vendorName: vendorName.trim() || undefined,
      attachments: [],
      comments: [],
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          timestamp,
          actorName: currentUserName,
          actorRole: 'Requester',
          action: 'created',
          details: `Approval request ${approvalNumber} created and assigned to ${selectedApprover.name}.`,
          newState: 'pending',
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    onCreateApproval(newApproval);
    toast({
      title: 'Approval Request Created',
      description: `Request ${approvalNumber} dispatched to ${selectedApprover.name}.`,
    });

    onOpenChange(false);
    setTitle('');
    setAmount('');
    setFinancialImpact('');
    setReason('');
  };

  const typeEntries = Object.entries(APPROVAL_TYPE_REGISTRY) as [ApprovalType, (typeof APPROVAL_TYPE_REGISTRY)[ApprovalType]][];
  const workflowEntries = Object.entries(WORKFLOW_CONFIG) as [ApprovalWorkflowType, (typeof WORKFLOW_CONFIG)[ApprovalWorkflowType]][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Submit Approval Authorization Request</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Route operational spending, leases, or policy exceptions through structured governance.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 text-xs">
            {/* Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Request Title *</Label>
                <Input
                  placeholder="e.g. Authorize High-Value Outlay: Elevator Overhaul"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Approval Type *</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ApprovalType)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  {typeEntries.map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Financial Outlay & Workflow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Amount (RWF)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1950000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Workflow Chain</Label>
                <select
                  value={workflowType}
                  onChange={(e) => setWorkflowType(e.target.value as ApprovalWorkflowType)}
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
                >
                  {workflowEntries.map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Priority Level</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ApprovalPriority)}
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 capitalize"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical (Executive Attention)</option>
                </select>
              </div>
            </div>

            {/* Financial Impact description */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Financial Impact & Budget Source *
              </Label>
              <Input
                placeholder="e.g. Quarterly elevator overhaul exceeds RWF 1M threshold. Facilities CAPEX budget allocation."
                value={financialImpact}
                onChange={(e) => setFinancialImpact(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Property, Unit & Designated Approver */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Property</Label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="">Portfolio-wide</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Unit / Asset</Label>
                <Input
                  placeholder="e.g. Main Lift A or Unit C-301"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Designated Approver *</Label>
                <select
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
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

            {/* Operational Justification / Reason */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Operational Reason & Justification *
              </Label>
              <Textarea
                placeholder="Detail the operational urgency, quotes obtained, statutory compliance requirement..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-20 text-xs resize-none"
                required
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
              <CheckCircle2 className="w-4 h-4" /> Submit for Approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
