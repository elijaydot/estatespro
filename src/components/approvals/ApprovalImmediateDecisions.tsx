// src/components/approvals/ApprovalImmediateDecisions.tsx
// FishGate Design Constitution v1.0 - Section 3: Immediate Decisions (Hero Section for Urgent Operational Approvals)

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Building,
  User,
  AlertTriangle,
  Receipt,
  FileText,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { ApprovalRecord } from './types';
import { APPROVAL_TYPE_REGISTRY, PRIORITY_CONFIG } from './ApprovalVisualRegistry';

interface ApprovalImmediateDecisionsProps {
  approvals: ApprovalRecord[];
  onSelectApproval: (approval: ApprovalRecord) => void;
  onQuickApprove: (approvalId: string, comments?: string) => void;
  onQuickReject: (approvalId: string, reason: string) => void;
}

export function ApprovalImmediateDecisions({
  approvals,
  onSelectApproval,
  onQuickApprove,
  onQuickReject,
}: ApprovalImmediateDecisionsProps) {
  // Urgent approvals pending decision
  const urgentApprovals = useMemo(() => {
    return approvals
      .filter((a) => (a.status === 'pending' || a.status === 'escalated') && (a.isUrgent || a.priority === 'critical' || a.priority === 'high'))
      .sort((a, b) => a.slaHoursRemaining - b.slaHoursRemaining)
      .slice(0, 3); // Top 3 critical decisions
  }, [approvals]);

  if (urgentApprovals.length === 0) {
    return (
      <Card className="p-4 border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-800">No urgent approval bottlenecks.</span>
          <span className="text-slate-500">All high-priority operational requests have been authorized.</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">Governance Healthy</span>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-0.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700">
            <Flame className="w-3.5 h-3.5" />
          </span>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Immediate Decisions Requiring Action
          </h2>
          <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0 h-4">
            {urgentApprovals.length} Urgent
          </Badge>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Decide within SLA window
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {urgentApprovals.map((req) => {
          const typeCfg = APPROVAL_TYPE_REGISTRY[req.type] || APPROVAL_TYPE_REGISTRY.custom;
          const TypeIcon = typeCfg.icon;
          const isCritical = req.priority === 'critical' || req.slaHoursRemaining <= 12;

          return (
            <Card
              key={req.id}
              className={`p-4 border transition-all duration-150 flex flex-col justify-between hover:shadow-xs group ${
                isCritical
                  ? 'border-red-200 bg-red-50/15 hover:border-red-300'
                  : 'border-slate-200/90 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <Badge className={`text-[9px] uppercase font-bold ${typeCfg.badgeClass}`}>
                    <TypeIcon className="w-2.5 h-2.5 mr-1" />
                    {typeCfg.label}
                  </Badge>

                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{req.slaHoursRemaining}h SLA left</span>
                  </div>
                </div>

                {/* Request title */}
                <h4
                  onClick={() => onSelectApproval(req)}
                  className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 cursor-pointer leading-snug"
                >
                  {req.title}
                </h4>

                {/* Financial impact / amount */}
                <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200/80 rounded flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Financial Impact
                  </span>
                  <span className="font-mono font-black text-xs text-slate-900">
                    {req.amount !== undefined ? `${req.currency} ${req.amount.toLocaleString()}` : 'Policy Exception'}
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {req.financialImpact}
                </p>

                {/* Requester & Premises */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Requester:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                      {req.requester.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Property:</span>
                    <span className="text-slate-700 truncate max-w-[150px]">
                      {req.propertyName} {req.unitNumber ? `(${req.unitNumber})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-1.5"
                  onClick={() => onQuickApprove(req.id, 'Approved via immediate decisions hero')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1 px-1.5"
                  onClick={() => onQuickReject(req.id, 'Declined pending budget reallocation')}
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-slate-700 hover:bg-slate-100 font-medium px-1.5"
                  onClick={() => onSelectApproval(req)}
                >
                  Review
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
