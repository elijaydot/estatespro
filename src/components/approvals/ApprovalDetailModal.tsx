// src/components/approvals/ApprovalDetailModal.tsx
// FishGate Design Constitution v1.0 - Approval Detail Cockpit, Multi-Step Governance, Audit Trail & Decision Actions

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  Building,
  User,
  Clock,
  FileText,
  Paperclip,
  ExternalLink,
  MessageSquare,
  History,
  Send,
  Calendar,
} from 'lucide-react';
import {
  ApprovalRecord,
  ApprovalStatus,
  ApprovalStep,
  ApprovalAuditEntry,
} from './types';
import {
  APPROVAL_TYPE_REGISTRY,
  STATUS_CONFIG,
  WORKFLOW_CONFIG,
} from './ApprovalVisualRegistry';

interface ApprovalDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: ApprovalRecord;
  currentUserName?: string;
  onUpdateApproval: (updated: ApprovalRecord) => void;
  onOpenDelegate?: (approval: ApprovalRecord) => void;
}

export function ApprovalDetailModal({
  open,
  onOpenChange,
  approval,
  currentUserName = 'Operator',
  onUpdateApproval,
  onOpenDelegate,
}: ApprovalDetailModalProps) {
  const navigate = useNavigate();
  const [actionTab, setActionTab] = useState<'overview' | 'audit' | 'comments'>('overview');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [newComment, setNewComment] = useState('');

  const typeCfg = APPROVAL_TYPE_REGISTRY[approval.type] || APPROVAL_TYPE_REGISTRY.custom;
  const statusCfg = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
  const workflowCfg = WORKFLOW_CONFIG[approval.workflowType] || WORKFLOW_CONFIG.single_step;
  const TypeIcon = typeCfg.icon;
  const StatusIcon = statusCfg.icon;

  const isPending = approval.status === 'pending' || approval.status === 'changes_requested';

  const handleDecision = (
    newStatus: ApprovalStatus,
    actionName: ApprovalAuditEntry['action'],
    detailText: string
  ) => {
    const timestamp = new Date().toISOString();
    const newAuditEntry: ApprovalAuditEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      actorName: currentUserName,
      actorRole: 'Authorized Approver',
      action: actionName,
      details: detailText,
      previousState: approval.status,
      newState: newStatus,
    };

    // Update steps if multi-step
    const updatedSteps = approval.steps.map((step, idx) => {
      if (idx === approval.currentStepIndex) {
        return {
          ...step,
          status: (newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'pending') as ApprovalStep['status'],
          approverName: currentUserName,
          decidedAt: timestamp,
          comments: decisionNotes || undefined,
        };
      }
      return step;
    });

    const updatedRecord: ApprovalRecord = {
      ...approval,
      status: newStatus,
      decidedAt: timestamp,
      decisionComments: decisionNotes.trim() || detailText,
      steps: updatedSteps,
      auditTrail: [newAuditEntry, ...approval.auditTrail],
      updatedAt: timestamp,
    };

    onUpdateApproval(updatedRecord);
    setDecisionNotes('');

    toast({
      title: `Approval ${newStatus.replace('_', ' ').toUpperCase()}`,
      description: `Request ${approval.approvalNumber} updated.`,
    });
  };

  const handleEscalate = () => {
    const timestamp = new Date().toISOString();
    const newAuditEntry: ApprovalAuditEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      actorName: currentUserName,
      actorRole: 'Approver Lead',
      action: 'escalated',
      details: 'Escalated to Managing Director for statutory sign-off.',
      previousState: approval.status,
      newState: 'escalated',
    };

    const updatedRecord: ApprovalRecord = {
      ...approval,
      status: 'escalated',
      isEscalated: true,
      escalationReason: 'Escalated to Executive Committee per statutory CAPEX threshold.',
      auditTrail: [newAuditEntry, ...approval.auditTrail],
      updatedAt: timestamp,
    };

    onUpdateApproval(updatedRecord);
    toast({
      title: 'Request Escalated',
      description: 'Request escalated to Managing Director / Executive Committee.',
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const timestamp = new Date().toISOString();
    const newCommentObj = {
      id: `c-${Date.now()}`,
      authorName: currentUserName,
      authorRole: 'Reviewer',
      text: newComment.trim(),
      createdAt: timestamp,
    };

    const newAuditEntry: ApprovalAuditEntry = {
      id: `aud-${Date.now()}`,
      timestamp,
      actorName: currentUserName,
      actorRole: 'Reviewer',
      action: 'commented' as const,
      details: `Comment added: "${newComment.trim().slice(0, 40)}..."`,
    };

    const updatedRecord: ApprovalRecord = {
      ...approval,
      comments: [...approval.comments, newCommentObj],
      auditTrail: [newAuditEntry, ...approval.auditTrail],
      updatedAt: timestamp,
    };

    onUpdateApproval(updatedRecord);
    setNewComment('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2.5 rounded-lg border bg-white ${typeCfg.badgeClass} shrink-0 mt-0.5`}>
              <TypeIcon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {approval.approvalNumber}
                </span>
                <Badge className={`text-[10px] uppercase font-bold ${typeCfg.badgeClass}`}>
                  {typeCfg.label}
                </Badge>
                <Badge className={`text-[10px] font-semibold ${statusCfg.badgeClass}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusCfg.label}
                </Badge>
                <span className="text-[10px] font-mono text-slate-500 font-medium">
                  {workflowCfg.label}
                </span>
              </div>

              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                {approval.title}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Tab Navigation in Cockpit */}
        <div className="flex border-b border-slate-200 px-5 pt-2 bg-slate-50/40 text-xs gap-4">
          <button
            onClick={() => setActionTab('overview')}
            className={`pb-2.5 font-semibold transition-colors border-b-2 ${
              actionTab === 'overview'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Decision Context
          </button>
          <button
            onClick={() => setActionTab('audit')}
            className={`pb-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              actionTab === 'audit'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Trail ({approval.auditTrail.length})
          </button>
          <button
            onClick={() => setActionTab('comments')}
            className={`pb-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              actionTab === 'comments'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Comments ({approval.comments.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {actionTab === 'overview' && (
            <>
              {/* Financial Outlay & Impact Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Financial Outlay & Impact
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono font-black text-lg text-slate-900">
                      {approval.amount !== undefined ? `${approval.currency} ${approval.amount.toLocaleString()}` : 'Policy Authorization'}
                    </span>
                    <span className="text-slate-500 text-xs font-medium">
                      ({approval.financialImpact})
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    SLA Deadline
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {approval.deadline} ({approval.slaHoursRemaining}h remaining)
                  </span>
                </div>
              </div>

              {/* Justification & Operational Reason */}
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-500">
                  Operational Justification & Context
                </Label>
                <p className="mt-1 text-slate-700 text-xs leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                  {approval.reason}
                </p>
              </div>

              {/* Multi-step Workflow Progress */}
              {approval.steps && approval.steps.length > 0 && (
                <div className="space-y-2 p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
                  <Label className="text-[10px] uppercase font-bold text-slate-500 block">
                    Approval Workflow Chain ({workflowCfg.label})
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {approval.steps.map((st, i) => (
                      <div
                        key={st.stepNumber}
                        className={`p-2 rounded border flex items-center justify-between text-[11px] ${
                          st.status === 'approved'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : st.status === 'rejected'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold">Step {st.stepNumber}: </span>
                          <span>{st.roleRequired}</span>
                          {st.approverName && (
                            <span className="block text-[10px] opacity-75 font-mono">
                              By {st.approverName}
                            </span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase font-bold py-0"
                        >
                          {st.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Context Stakeholders: Property, Requester, Tenant, Vendor */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-200/80 text-[11px]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Property & Space
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{approval.propertyName}</span>
                  </div>
                  {approval.unitNumber && (
                    <span className="text-slate-500 ml-5 block">
                      Unit {approval.unitNumber}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Requester
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{approval.requester.name}</span>
                  </div>
                  <span className="text-slate-500 ml-5 block">
                    {approval.requester.role} ({approval.requester.department})
                  </span>
                </div>

                {approval.tenantName && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Tenant Reference
                    </span>
                    <span className="font-semibold text-slate-800">{approval.tenantName}</span>
                  </div>
                )}

                {approval.vendorName && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Vendor / Contractor
                    </span>
                    <span className="font-semibold text-slate-800">{approval.vendorName}</span>
                  </div>
                )}
              </div>

              {/* Connected Entity Link */}
              {approval.sourceEntityRef && (
                <div className="p-2.5 bg-blue-50/40 border border-blue-200 rounded flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 block uppercase">
                      Linked Source Entity
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {approval.sourceEntityRef}
                    </span>
                  </div>
                  {approval.targetUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-white text-blue-700 font-semibold gap-1 hover:bg-blue-50 border-blue-200"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(approval.targetUrl!);
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Record
                    </Button>
                  )}
                </div>
              )}

              {/* Decision Notes Input (if pending) */}
              {isPending && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Decision Justification / Reason Notes
                  </Label>
                  <Textarea
                    placeholder="Enter approval note, changes required, or rejection grounds..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="h-16 text-xs resize-none"
                  />
                </div>
              )}
            </>
          )}

          {/* Audit Trail Tab */}
          {actionTab === 'audit' && (
            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-bold text-slate-500 block">
                Immutable Authorization Audit Log
              </Label>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white overflow-hidden">
                {approval.auditTrail.map((entry) => (
                  <div key={entry.id} className="p-3 text-xs flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {entry.actorName} ({entry.actorRole})
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {entry.timestamp.replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{entry.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {actionTab === 'comments' && (
            <div className="space-y-3">
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {approval.comments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No comments recorded on this approval request.
                  </div>
                ) : (
                  approval.comments.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{c.authorName}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {c.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      <p className="text-slate-700 text-[11px]">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  placeholder="Type an internal note or query..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 text-white font-semibold gap-1">
                  <Send className="w-3 h-3" /> Post
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {isPending ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 h-9"
                onClick={() =>
                  handleDecision(
                    'approved',
                    'approved',
                    decisionNotes.trim() || 'Approved by authorized officer.'
                  )
                }
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-rose-700 border-rose-200 hover:bg-rose-50 font-semibold gap-1.5 h-9"
                onClick={() =>
                  handleDecision(
                    'rejected',
                    'rejected',
                    decisionNotes.trim() || 'Declined authorization.'
                  )
                }
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold gap-1.5 h-9"
                onClick={() =>
                  handleDecision(
                    'changes_requested',
                    'changes_requested',
                    decisionNotes.trim() || 'Returned to requester with revision notes.'
                  )
                }
              >
                <RotateCcw className="w-4 h-4" /> Request Changes
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-amber-700 border-amber-200 hover:bg-amber-50 font-semibold gap-1.5 h-9"
                onClick={handleEscalate}
              >
                <AlertTriangle className="w-4 h-4" /> Escalate
              </Button>

              {onOpenDelegate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-purple-700 border-purple-200 hover:bg-purple-50 font-semibold gap-1.5 h-9"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenDelegate(approval);
                  }}
                >
                  <UserCheck className="w-4 h-4" /> Delegate
                </Button>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium">
              Decision finalized on {approval.decidedAt ? approval.decidedAt.slice(0, 10) : approval.updatedAt.slice(0, 10)}.
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs text-slate-700"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
