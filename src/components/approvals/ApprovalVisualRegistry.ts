// src/components/approvals/ApprovalVisualRegistry.ts
// FishGate Design Constitution v1.0 - Visual Registry, Type Indicators & Status Badges for Approvals

import {
  Receipt,
  FileText,
  Truck,
  Wrench,
  PieChart,
  ArrowDownLeft,
  ShieldAlert,
  Tag,
  Scroll,
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  UserCheck,
  LucideIcon,
} from 'lucide-react';
import {
  ApprovalType,
  ApprovalStatus,
  ApprovalPriority,
  ApprovalWorkflowType,
} from './types';

export interface ApprovalTypeConfig {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  pillClass: string;
  colorClass: string;
}

export const APPROVAL_TYPE_REGISTRY: Record<ApprovalType, ApprovalTypeConfig> = {
  expense: {
    label: 'Expense Outlay',
    icon: Receipt,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    pillClass: 'border-l-4 border-l-purple-500 bg-purple-50/20',
    colorClass: 'text-purple-600',
  },
  lease: {
    label: 'Lease Agreement',
    icon: FileText,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    pillClass: 'border-l-4 border-l-blue-500 bg-blue-50/20',
    colorClass: 'text-blue-600',
  },
  vendor: {
    label: 'Vendor Onboarding',
    icon: Truck,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    pillClass: 'border-l-4 border-l-amber-500 bg-amber-50/20',
    colorClass: 'text-amber-600',
  },
  maintenance: {
    label: 'Maintenance Order',
    icon: Wrench,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    pillClass: 'border-l-4 border-l-orange-500 bg-orange-50/20',
    colorClass: 'text-orange-600',
  },
  budget: {
    label: 'Budget Allocation',
    icon: PieChart,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    pillClass: 'border-l-4 border-l-indigo-500 bg-indigo-50/20',
    colorClass: 'text-indigo-600',
  },
  refund: {
    label: 'Deposit Refund',
    icon: ArrowDownLeft,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pillClass: 'border-l-4 border-l-emerald-500 bg-emerald-50/20',
    colorClass: 'text-emerald-600',
  },
  write_off: {
    label: 'Arrears Write-Off',
    icon: ShieldAlert,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    pillClass: 'border-l-4 border-l-rose-500 bg-rose-50/20',
    colorClass: 'text-rose-600',
  },
  discount: {
    label: 'Rent Concession',
    icon: Tag,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    pillClass: 'border-l-4 border-l-teal-500 bg-teal-50/20',
    colorClass: 'text-teal-600',
  },
  contract: {
    label: 'Procurement Contract',
    icon: Scroll,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    pillClass: 'border-l-4 border-l-sky-500 bg-sky-50/20',
    colorClass: 'text-sky-600',
  },
  custom: {
    label: 'Operational Sign-Off',
    icon: CheckSquare,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    pillClass: 'border-l-4 border-l-slate-400 bg-slate-50/20',
    colorClass: 'text-slate-600',
  },
};

export const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; badgeClass: string; icon: LucideIcon }
> = {
  pending: {
    label: 'Pending Decision',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: XCircle,
  },
  changes_requested: {
    label: 'Changes Requested',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: RotateCcw,
  },
  escalated: {
    label: 'Escalated to Executive',
    badgeClass: 'bg-red-50 text-red-800 border-red-300 animate-pulse',
    icon: AlertTriangle,
  },
  delegated: {
    label: 'Delegated',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: UserCheck,
  },
};

export const PRIORITY_CONFIG: Record<
  ApprovalPriority,
  { label: string; badgeClass: string }
> = {
  critical: {
    label: 'Critical SLA',
    badgeClass: 'bg-red-100 text-red-900 border-red-300 font-bold',
  },
  high: {
    label: 'High Priority',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-medium',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-normal',
  },
};

export const WORKFLOW_CONFIG: Record<
  ApprovalWorkflowType,
  { label: string; description: string }
> = {
  single_step: {
    label: 'Single-Step',
    description: 'Direct authorization by assigned lead',
  },
  multi_step: {
    label: 'Multi-Step',
    description: 'Requires consecutive department reviews',
  },
  threshold: {
    label: 'Threshold Outlay',
    description: 'Triggered by high financial outlay threshold',
  },
  role_based: {
    label: 'Role-Based',
    description: 'Requires specific statutory or licensing role',
  },
  department: {
    label: 'Departmental',
    description: 'Reviewed by department head',
  },
  executive: {
    label: 'Executive Board',
    description: 'Requires Managing Director or Board authorization',
  },
};
