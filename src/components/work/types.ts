// src/components/work/types.ts
// FishGate Design Constitution v1.0 - Work Module & Personal Work Hub Architecture

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'waiting'
  | 'blocked'
  | 'under_review'
  | 'completed'
  | 'cancelled';

export type TaskSource =
  | 'leases'
  | 'collections'
  | 'maintenance'
  | 'occupancy'
  | 'finance'
  | 'approvals'
  | 'crm'
  | 'marketing'
  | 'manual';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  authorName: string;
  role?: string;
  text: string;
  createdAt: string;
  emoji?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: string;
  type: string; // 'pdf' | 'docx' | 'xlsx' | 'image' | 'link'
  url: string;
}

export interface TaskOwner {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export interface TaskRecord {
  id: string;
  taskNumber: string; // e.g. TSK-2026-101
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  source: TaskSource;
  sourceEntityId?: string;
  sourceEntityRef?: string; // e.g. LEAS-2026-084, WO-2026-081, EXP-2026-084, INSP-2026-042
  propertyId?: string;
  propertyName: string;
  unitId?: string | null;
  unitNumber?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  owner: TaskOwner;
  collaborators?: TaskOwner[];
  department: string; // Facilities, Leasing, Finance, Ops, Executive
  dueDate: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  completedAt?: string | null;
  blockedReason?: string | null;
  waitingOn?: string | null;
  checklist: ChecklistItem[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  tags: string[];
  primaryAction?: {
    label: string;
    actionType: string;
    targetUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkSummaryKPIs {
  assignedToMe: number;
  dueToday: number;
  overdue: number;
  waitingForOthers: number;
}

export interface WorkloadMember {
  id: string;
  name: string;
  role: string;
  department: string;
  activeCount: number;
  completedCount: number;
  overdueCount: number;
  capacityStatus: 'optimal' | 'busy' | 'overloaded';
}

export interface WorkObservation {
  id: string;
  title: string;
  detail: string;
  metric?: string;
  severity: 'info' | 'warning' | 'positive';
}
