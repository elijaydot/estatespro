// src/components/approvals/DelegateApprovalModal.tsx
// FishGate Design Constitution v1.0 - Delegate Approval Authority Modal & Audit Logging

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ApprovalRecord, ApprovalParty } from './types';

interface DelegateApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval?: ApprovalRecord | null;
  teamMembers: Array<{ id: string; name: string; role: string; department?: string }>;
  currentUserName?: string;
  onDelegateConfirm: (
    approvalId: string | undefined,
    delegatee: ApprovalParty,
    reason: string
  ) => void;
}

export function DelegateApprovalModal({
  open,
  onOpenChange,
  approval,
  teamMembers,
  currentUserName = 'Operator',
  onDelegateConfirm,
}: DelegateApprovalModalProps) {
  const [delegateeId, setDelegateeId] = useState(teamMembers[0]?.id || '');
  const [reason, setReason] = useState('');

  const selectedDelegatee = teamMembers.find((m) => m.id === delegateeId) || teamMembers[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for delegation.', variant: 'destructive' });
      return;
    }

    const delegateeParty: ApprovalParty = {
      id: selectedDelegatee.id,
      name: selectedDelegatee.name,
      role: selectedDelegatee.role,
      department: selectedDelegatee.department || 'Operations',
    };

    onDelegateConfirm(approval?.id, delegateeParty, reason.trim());

    toast({
      title: 'Approval Authority Delegated',
      description: `Delegated to ${selectedDelegatee.name}.`,
    });

    onOpenChange(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              <span>Delegate Approval Authority</span>
            </DialogTitle>
          </div>

          <div className="p-5 space-y-3.5 text-xs">
            {approval && (
              <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded text-xs">
                <span className="font-mono text-[10px] text-blue-700 font-bold block">
                  {approval.approvalNumber}
                </span>
                <span className="font-semibold text-slate-800 line-clamp-1">
                  {approval.title}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Delegatee Member *</Label>
              <select
                value={delegateeId}
                onChange={(e) => setDelegateeId(e.target.value)}
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Delegation Justification *</Label>
              <Textarea
                placeholder="Reason for delegation (e.g. Out of office, departmental handover, threshold escalation)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-20 text-xs resize-none"
                required
              />
            </div>
          </div>

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
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 h-9"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Delegation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
