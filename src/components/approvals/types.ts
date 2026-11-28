// src/components/approvals/types.ts
// FishGate Design Constitution v1.0 - Approvals Module: Decision-Management Center & Operational Authorization Layer

export type ApprovalType =
  | 'expense'
  | 'lease'
  | 'vendor'
  | 'maintenance'
  | 'budget'
  | 'refund'
  | 'write_off'
  | 'discount'
  | 'contract'
  | 'custom';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'escalated'
  | 'delegated';

export type ApprovalPriority = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalWorkflowType =
  | 'single_step'
  | 'multi_step'
  | 'threshold'
  | 'role_based'
  | 'department'
  | 'executive';

export interface ApprovalStep {
  stepNumber: number;
  roleRequired: string;
  approverName?: string;
  approverId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decidedAt?: string;
  comments?: string;
}

export interface ApprovalAuditEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action:
    | 'created'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'delegated'
    | 'escalated'
    | 'commented'
    | 'document_attached';
  details: string;
  previousState?: string;
  newState?: string;
}

export interface ApprovalComment {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
  isInternalOnly?: boolean;
}

export interface ApprovalAttachment {
  id: string;
  name: string;
  url?: string;
  size?: string;
  type?: string;
}

export interface ApprovalParty {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
}

export interface ApprovalRecord {
  id: string;
  approvalNumber: string; // e.g. APP-2026-091
  title: string;
  type: ApprovalType;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  workflowType: ApprovalWorkflowType;
  amount?: number;
  currency: string;
  financialImpact: string;
  reason: string;
  summary: string;
  deadline: string; // yyyy-MM-dd
  slaHoursRemaining: number;
  isUrgent: boolean;
  isEscalated: boolean;
  escalationReason?: string;
  requester: ApprovalParty;
  currentApprover: ApprovalParty;
  originalApprover?: ApprovalParty;
  delegatedTo?: {
    id: string;
    name: string;
    role: string;
    reason?: string;
    delegatedAt: string;
  };
  steps: ApprovalStep[];
  currentStepIndex: number;
  propertyId?: string;
  propertyName: string;
  unitNumber?: string;
  tenantName?: string;
  vendorName?: string;
  leaseRef?: string;
  sourceEntityRef?: string;
  targetUrl?: string;
  attachments: ApprovalAttachment[];
  comments: ApprovalComment[];
  auditTrail: ApprovalAuditEntry[];
  decidedAt?: string;
  decisionComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalObservation {
  id: string;
  title: string;
  insight: string;
  metric?: string;
  impact: 'governance' | 'operational' | 'velocity';
}
