export type CollectionPaymentMethod =
  | 'bank_transfer'
  | 'mtn_momo'
  | 'cash'
  | 'credit_card'
  | 'standing_order'
  | 'cheque'
  | 'online';

export interface CollectionAccount {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  leaseId: string | null;
  monthlyRent: number;
  currentBalance: number;
  paidAmount: number;
  paymentStatus: 'paid' | 'overdue' | 'grace_period' | 'partial';
  daysOutstanding: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  nextDueDate: string | null;
  activeInvoiceId?: string | null;
}

export interface CollectionPaymentRecord {
  id: string;
  created_at: string;
  tenant_id: string | null;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  amount: number;
  method: string;
  reference: string | null;
  receipt_number: string | null;
  status: 'completed' | 'pending' | 'failed';
  invoice_id: string | null;
  invoice_number?: string | null;
  notes?: string | null;
}

export interface OutstandingBalanceItem {
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  amount: number;
  daysOverdue: number;
  impact: 'critical' | 'high' | 'medium';
  recommendedAction: string;
  invoiceId?: string | null;
  leaseId?: string | null;
}

export interface PaymentPlanItem {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  originalBalance: number;
  remainingAmount: number;
  installmentsTotal: number;
  installmentsPaid: number;
  nextInstallmentAmount: number;
  nextInstallmentDate: string;
  status: 'active' | 'completed' | 'defaulted';
  riskStatus: 'on_track' | 'at_risk' | 'breached';
}

export interface ReceiptItem {
  id: string;
  receiptNumber: string;
  paymentReference: string;
  tenantId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: number;
  issuedDate: string;
  deliveryStatus: 'sent_email' | 'printed' | 'delivered' | 'pending';
  paymentMethod: string;
  invoiceId?: string | null;
}

export interface CollectionAttentionItem {
  id: string;
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  amount: number;
  daysOutstanding: number;
  issueType: 'rent_overdue' | 'failed_payment' | 'plan_breach' | 'lease_balance' | 'chronic_late';
  businessImpact: string;
  recommendedAction: string;
  actionType: 'remind' | 'resolve' | 'review_plan' | 'record';
  invoiceId?: string | null;
}
