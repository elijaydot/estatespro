// src/components/expenses/types.ts
// FishGate Design Constitution v1.0 - Operational Expense Architecture

export type ExpenseCategory =
  | 'Maintenance'
  | 'Utilities'
  | 'Cleaning'
  | 'Security'
  | 'Insurance'
  | 'Taxes'
  | 'Marketing'
  | 'Property Improvements'
  | 'Professional Services'
  | 'Office Expenses'
  | 'Technology'
  | 'Administration'
  | 'Other';

export interface ExpenseDocument {
  id: string;
  name: string;
  type: 'invoice' | 'quote' | 'receipt' | 'approval_doc' | 'contract' | 'photo' | 'other';
  size: string;
  uploadedAt: string;
  url?: string;
}

export interface ExpenseRecord {
  id: string;
  reference: string;
  title: string;
  category: ExpenseCategory;
  subcategory?: string;
  propertyId: string;
  propertyName: string;
  unitId?: string | null;
  unitNumber?: string | null;
  description: string;
  expenseDate: string;
  amount: number;
  taxAmount: number;
  taxType: 'vat_18' | 'withholding_15' | 'exempt' | 'none';
  currency: string;
  budgetCategory: string;
  costCenter: string;
  paymentStatus: 'paid' | 'pending' | 'partially_paid' | 'cancelled';
  invoiceNumber?: string;
  vendorId: string;
  vendorName: string;
  vendorType?: string;
  hasReceipt: boolean;
  receiptUrl?: string;
  approvalStatus: 'approved' | 'pending' | 'rejected' | 'draft';
  approvalWorkflow: 'no_approval' | 'single' | 'multi_level' | 'threshold';
  approverName?: string;
  submittedBy: string;
  submittedDate: string;
  department: string;
  notes?: string;
  documents: ExpenseDocument[];
  createdAt: string;
}

export interface ExpenseAttentionItem {
  id: string;
  expenseId?: string;
  title: string;
  propertyName: string;
  amount: number;
  issueType:
    | 'budget_exceeded'
    | 'approval_required'
    | 'missing_receipt'
    | 'recurring_due'
    | 'invoice_overdue'
    | 'unassigned';
  issueDescription: string;
  severity: 'critical' | 'warning' | 'info';
  recommendedAction: string;
  actionType: 'approve' | 'upload_receipt' | 'pay' | 'assign' | 'review';
}

export interface RecurringExpenseItem {
  id: string;
  vendorName: string;
  vendorId: string;
  propertyName: string;
  serviceCategory: string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'weekly';
  amount: number;
  currency: string;
  nextBillingDate: string;
  status: 'active' | 'paused' | 'review_due';
  autoRenew: boolean;
}

export interface VendorSummaryItem {
  id: string;
  vendorName: string;
  vendorType: string;
  contactName: string;
  phone: string;
  email: string;
  services: string;
  totalSpend: number;
  activeContracts: number;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  riskStatus: 'low' | 'moderate' | 'high';
  rating: number;
  performanceNotes: string;
}

export interface BudgetAnalysisItem {
  id: string;
  category: ExpenseCategory;
  propertyName: string;
  allocatedBudget: number;
  actualSpend: number;
  remainingBudget: number;
  variance: number;
  utilizationPercent: number;
  status: 'on_track' | 'warning' | 'exceeded';
}
