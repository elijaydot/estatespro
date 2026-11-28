// src/components/approvals/ApprovalSummary.tsx
// FishGate Design Constitution v1.0 - Section 2: Approval Summary (Max 4 Immediate Governance Cards)

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  UserCheck,
  AlertTriangle,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { ApprovalRecord } from './types';

interface ApprovalSummaryProps {
  approvals: ApprovalRecord[];
  currentUserName?: string;
  activeFilter?: string;
  onFilterSelect: (filterKey: string) => void;
}

export function ApprovalSummary({
  approvals,
  currentUserName = 'Operator',
  activeFilter,
  onFilterSelect,
}: ApprovalSummaryProps) {
  // 1. Pending Approvals
  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'pending' || a.status === 'changes_requested'),
    [approvals]
  );

  // 2. Awaiting My Decision
  const awaitingMyDecision = useMemo(
    () =>
      approvals.filter(
        (a) =>
          a.status === 'pending' &&
          (a.currentApprover.name.toLowerCase().includes(currentUserName.toLowerCase()) ||
            a.delegatedTo?.name.toLowerCase().includes(currentUserName.toLowerCase()))
      ),
    [approvals, currentUserName]
  );

  // 3. Escalated Requests
  const escalatedRequests = useMemo(
    () => approvals.filter((a) => a.isEscalated || a.status === 'escalated'),
    [approvals]
  );

  // 4. Approval SLA Risk (< 24h remaining or overdue)
  const slaRiskApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'pending' && a.slaHoursRemaining <= 24),
    [approvals]
  );

  const cards = [
    {
      id: 'pending',
      title: 'Pending Approvals',
      count: pendingApprovals.length,
      detail: pendingApprovals.length === 0 ? 'All requests resolved' : `${pendingApprovals.length} requests awaiting authorization`,
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      badge: pendingApprovals.length > 0 ? 'Active Queue' : 'Clear',
      badgeClass: pendingApprovals.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'awaiting_me',
      title: 'Awaiting My Decision',
      count: awaitingMyDecision.length,
      detail: awaitingMyDecision.length === 0 ? 'Zero requests pending your review' : 'Immediate personal sign-off required',
      icon: UserCheck,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      badge: awaitingMyDecision.length > 0 ? 'Requires Action' : 'Caught Up',
      badgeClass: awaitingMyDecision.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'escalated',
      title: 'Escalated Requests',
      count: escalatedRequests.length,
      detail: escalatedRequests.length === 0 ? 'Zero operational escalations' : 'Escalated to Managing Director / Legal',
      icon: AlertTriangle,
      color: 'text-red-700 bg-red-50 border-red-200',
      badge: escalatedRequests.length > 0 ? 'Executive Attention' : 'Normal',
      badgeClass: escalatedRequests.length > 0 ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-slate-100 text-slate-700',
    },
    {
      id: 'sla_risk',
      title: 'Approval SLA Risk',
      count: slaRiskApprovals.length,
      detail: slaRiskApprovals.length === 0 ? 'All requests within healthy SLA' : 'Expiring in < 24h or past deadline',
      icon: Flame,
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      badge: slaRiskApprovals.length > 0 ? 'SLA Critical' : 'Healthy',
      badgeClass: slaRiskApprovals.length > 0 ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Decision Velocity & Governance Summary</span>
        </h2>
        <span className="text-[11px] text-slate-400">Real-time authorization status</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const isSelected = activeFilter === c.id;

          return (
            <Card
              key={c.id}
              onClick={() => onFilterSelect(c.id)}
              className={`p-3.5 border transition-all duration-150 cursor-pointer hover:shadow-xs flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600 shadow-2xs'
                  : 'border-slate-200/90 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
                    {c.title}
                  </span>
                  <div className={`p-1 rounded border ${c.color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {c.count}
                  </span>
                  <Badge variant="outline" className={`text-[9px] font-semibold ${c.badgeClass}`}>
                    {c.badge}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-500 line-clamp-1 border-t border-slate-100 pt-1.5">
                {c.detail}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
