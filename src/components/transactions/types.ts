// src/components/transactions/types.ts
// FishGate Design Constitution v1.0 - Complete Financial Ledger Architecture

export type TransactionType =
  | 'collection'
  | 'expense'
  | 'refund'
  | 'deposit'
  | 'transfer'
  | 'adjustment'
  | 'credit'
  | 'debit'
  | 'penalty'
  | 'utility'
  | 'custom';

export type TransactionDirection = 'in' | 'out' | 'neutral';

export type TransactionStatus =
  | 'completed'
  | 'pending'
  | 'processing'
  | 'failed'
  | 'cancelled'
  | 'disputed'
  | 'refunded'
  | 'reversed'
  | 'archived';

export type TransactionSource =
  | 'gateway'
  | 'bank_transfer'
  | 'mtn_momo'
  | 'airtel_money'
  | 'cash'
  | 'cheque'
  | 'manual'
  | 'system';

export interface TransactionDocument {
  id: string;
  name: string;
  type: 'receipt' | 'invoice' | 'statement' | 'proof_of_payment' | 'contract' | 'other';
  size: string;
  uploadedAt: string;
  url?: string;
}

export interface TransactionAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  previousStatus?: TransactionStatus;
  newStatus?: TransactionStatus;
}

export interface TransactionRecord {
  id: string;
  reference: string;
  date: string;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  amount: number;
  currency: string;
  feeAmount?: number;
  netAmount?: number;
  description: string;
  source: TransactionSource;
  sourceReference?: string;
  
  // Associated Entities
  propertyId?: string | null;
  propertyName?: string | null;
  unitId?: string | null;
  unitNumber?: string | null;
  tenantId?: string | null;
  tenantName?: string | null;
  tenantEmail?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  vendorCategory?: string | null;
  leaseId?: string | null;
  leaseNumber?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  receiptNumber?: string | null;

  // Metadata & Governance
  createdBy: string;
  createdAt: string;
  modifiedBy?: string;
  modifiedAt?: string;
  reconciled: boolean;
  reconciledAt?: string | null;
  reconciledBy?: string | null;
  reconciliationNotes?: string | null;
  
  // Review & Integrity Flagging
  flagged?: boolean;
  flagReason?: string | null;
  
  documents: TransactionDocument[];
  auditTrail: TransactionAuditEntry[];
  notes?: string | null;
}

export interface AttentionItem {
  id: string;
  transactionId: string;
  reference: string;
  amount: number;
  issue: string;
  impact: string;
  recommendedAction: string;
  type: 'failed_payment' | 'unmatched' | 'duplicate' | 'refund_pending' | 'reconciliation_issue' | 'missing_docs';
}

export interface ReconciliationStatementItem {
  id: string;
  externalRef: string;
  date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  bankAccount: string;
  matchedTransactionId?: string | null;
  status: 'matched' | 'unmatched' | 'exception' | 'ignored';
}

export interface TransactionFilterState {
  searchQuery: string;
  typeFilter: string;
  statusFilter: string;
  propertyFilter: string;
  directionFilter: string;
  sourceFilter: string;
  dateRange: 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year';
  minAmount?: number;
  maxAmount?: number;
}
