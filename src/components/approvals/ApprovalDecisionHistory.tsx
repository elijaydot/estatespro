// src/components/approvals/ApprovalDecisionHistory.tsx
// FishGate Design Constitution v1.0 - Section 5: Decision History (Audit Trail of Concluded Approvals)

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  Building,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ApprovalRecord } from './types';
import { APPROVAL_TYPE_REGISTRY, STATUS_CONFIG } from './ApprovalVisualRegistry';

interface ApprovalDecisionHistoryProps {
  approvals: ApprovalRecord[];
  onSelectApproval: (approval: ApprovalRecord) => void;
}

export function ApprovalDecisionHistory({
  approvals,
  onSelectApproval,
}: ApprovalDecisionHistoryProps) {
  // Concluded decisions: approved, rejected, delegated
  const historyList = approvals
    .filter((a) => a.status === 'approved' || a.status === 'rejected' || a.status === 'delegated')
    .slice(0, 5); // Clean, calm: top 5 recent audit entries

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>Decision History & Audit Trail</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Immutable log of concluded authorizations and executive determinations
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-500">
          {historyList.length} Concluded Records
        </span>
      </div>

      <Card className="border border-slate-200/90 bg-white divide-y divide-slate-100 shadow-2xs">
        {historyList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No concluded decisions on record.
          </div>
        ) : (
          historyList.map((req) => {
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.approved;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={req.id}
                onClick={() => onSelectApproval(req)}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : req.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    <StatusIcon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                        {req.approvalNumber}
                      </span>
                      <Badge className={`text-[9px] font-bold ${statusCfg.badgeClass}`}>
                        {statusCfg.label}
                      </Badge>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">{req.propertyName}</span>
                    </div>

                    <h4 className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {req.title}
                    </h4>

                    {req.decisionComments && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5 truncate">
                        &ldquo;{req.decisionComments}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="font-mono font-bold text-xs text-slate-800 block">
                      {req.amount !== undefined ? `${req.currency} ${req.amount.toLocaleString()}` : 'Policy'}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Decided {req.decidedAt ? req.decidedAt.slice(0, 10) : req.updatedAt.slice(0, 10)}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
