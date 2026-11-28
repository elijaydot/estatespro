// src/components/approvals/ApprovalHeader.tsx
// FishGate Design Constitution v1.0 - Section 1: Header (Title, Subtitle & Primary Actions)

import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Plus,
  UserCheck,
  Download,
} from 'lucide-react';

interface ApprovalHeaderProps {
  onCreateRequest: () => void;
  onDelegateApproval: () => void;
  onExportApprovals: () => void;
}

export function ApprovalHeader({
  onCreateRequest,
  onDelegateApproval,
  onExportApprovals,
}: ApprovalHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <span>Approvals</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, approve and manage operational decisions across FishGate.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
          onClick={onCreateRequest}
        >
          <Plus className="w-4 h-4" />
          Create Approval Request
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-semibold gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
          onClick={onDelegateApproval}
        >
          <UserCheck className="w-4 h-4 text-purple-600" />
          Delegate Approval
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-medium gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-slate-100"
          onClick={onExportApprovals}
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Approvals
        </Button>
      </div>
    </div>
  );
}
