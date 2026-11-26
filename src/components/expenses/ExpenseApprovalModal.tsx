// src/components/expenses/ExpenseApprovalModal.tsx
// FishGate Design Constitution v1.0 - Financial Governance Approval Workflow Modal

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { ExpenseRecord } from './types';

interface ExpenseApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRecord | null;
  onConfirmAction: (expenseId: string, action: 'approve' | 'reject' | 'clarify', remarks: string) => Promise<void>;
  currency?: string;
}

export function ExpenseApprovalModal({
  open,
  onOpenChange,
  expense,
  onConfirmAction,
  currency = 'RWF',
}: ExpenseApprovalModalProps) {
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!expense) return null;

  const handleAction = async (action: 'approve' | 'reject' | 'clarify') => {
    try {
      setIsSubmitting(true);
      await onConfirmAction(expense.id, action, remarks);
      setRemarks('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <DialogTitle className="text-base font-bold text-slate-900">
            Expense Approval Review
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Sign off or query operational expenditure per authorization limits.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">{expense.title}</span>
            <Badge variant="outline" className="font-mono text-[10px] bg-white text-blue-700">
              {expense.reference}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px]">Amount</span>
              <span className="font-bold text-slate-900 text-sm">
                {currency} {expense.amount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Property</span>
              <span className="font-medium text-slate-800">{expense.propertyName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Requester</span>
              <span className="font-medium text-slate-800">{expense.submittedBy}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Vendor</span>
              <span className="font-medium text-slate-800">{expense.vendorName}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-3">
          <Label className="text-xs font-semibold text-slate-700">Approval Remarks / Query Notes</Label>
          <Textarea
            placeholder="Add reviewer authorization code, reason for rejection, or questions for requester..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="text-xs resize-none"
            rows={3}
          />
        </div>

        <DialogFooter className="pt-3 flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-slate-700 hover:text-blue-700 gap-1"
              disabled={isSubmitting}
              onClick={() => handleAction('clarify')}
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              Clarify
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1"
              disabled={isSubmitting}
              onClick={() => handleAction('reject')}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              disabled={isSubmitting}
              onClick={() => handleAction('approve')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
