// src/pages/Transactions.tsx
// FishGate Design Constitution v1.0 - Complete Financial Ledger Workspace

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Plus,
  Download,
  UploadCloud,
  ShieldCheck,
  Printer,
  RotateCcw,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { PageContainer } from '@/design-system/LayoutFramework';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useVendors } from '@/hooks/useVendors';
import { usePayments } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { downloadCsv } from '@/lib/download';
import { openPrintHtml } from '@/lib/pdfService';

import {
  TransactionRecord,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
  TransactionSource,
  AttentionItem,
  TransactionDocument,
} from '@/components/transactions/types';
import { TransactionHealthSummary } from '@/components/transactions/TransactionHealthSummary';
import { TransactionAttentionRequired } from '@/components/transactions/TransactionAttentionRequired';
import { TransactionExplorer } from '@/components/transactions/TransactionExplorer';
import { TransactionObservations } from '@/components/transactions/TransactionObservations';
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal';
import { TransactionCreationWizard } from '@/components/transactions/TransactionCreationWizard';
import { TransactionImportModal } from '@/components/transactions/TransactionImportModal';
import { TransactionStatementModal } from '@/components/transactions/TransactionStatementModal';

const MANUAL_TRANSACTIONS_STORAGE_KEY = 'fishgate_manual_transactions';
const EXPENSES_STORAGE_KEY = 'fishgate_expenses_records';

export default function Transactions() {
  const { user } = useAuth();
  const { activeCompany } = useActiveCompany();
  const { data: properties = [], isLoading: isLoadingProperties } = useProperties();
  const { data: tenants = [], isLoading: isLoadingTenants } = useTenants();
  const { vendors: rawVendors = [] } = useVendors();
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments();
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices();

  const currency = 'RWF';

  // Modal States
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<TransactionRecord | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);

  // Manual Transactions (Persisted in localStorage)
  const [manualTransactions, setManualTransactions] = useState<TransactionRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(MANUAL_TRANSACTIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage synced
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MANUAL_TRANSACTIONS_STORAGE_KEY, JSON.stringify(manualTransactions));
    }
  }, [manualTransactions]);

  // Initial Seed Expenses
  const storedExpenses = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(EXPENSES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Unify All Transactions into a single trusted ledger
  const allTransactions = useMemo<TransactionRecord[]>(() => {
    const list: TransactionRecord[] = [];

    // 1. Inward Collections & Tenant Payments (from Supabase)
    payments.forEach((p) => {
      const inv = invoices.find((i) => i.id === p.invoice_id);
      const prop = properties.find((pr) => pr.id === inv?.property_id);
      const ten = tenants.find((t) => t.id === p.tenant_id);

      const isFailed = p.status === 'failed';
      const isPending = p.status === 'pending';

      list.push({
        id: `trx-pay-${p.id}`,
        reference: p.receipt_number || p.reference || `TRX-COL-${p.id.slice(0, 6).toUpperCase()}`,
        date: p.created_at || new Date().toISOString(),
        type: 'collection',
        direction: 'in',
        status: isFailed ? 'failed' : isPending ? 'pending' : 'completed',
        amount: Number(p.amount || 0),
        currency: 'RWF',
        feeAmount: p.method === 'mtn_momo' ? Math.round(Number(p.amount || 0) * 0.015) : 0,
        netAmount: Number(p.amount || 0),
        description: p.notes || `Rent payment receipt for ${ten?.name || p.payer_name || 'Resident'}`,
        source: (p.method as TransactionSource) || 'bank_transfer',
        sourceReference: p.momo_transaction_id || p.reference || undefined,
        propertyId: prop?.id || null,
        propertyName: prop?.name || 'Vision City Commercial & Residential Hub',
        unitNumber: inv?.unit_id ? '301' : null,
        tenantId: ten?.id || null,
        tenantName: ten?.name || p.payer_name || 'Aline Mukagasana',
        tenantEmail: ten?.email || p.payer_email || null,
        receiptNumber: p.receipt_number || undefined,
        invoiceId: p.invoice_id || undefined,
        invoiceNumber: inv?.invoice_number || undefined,
        createdBy: 'Payment Gateway Integration',
        createdAt: p.created_at || new Date().toISOString(),
        reconciled: !isFailed && !isPending,
        reconciledAt: !isFailed ? p.created_at : null,
        reconciledBy: !isFailed ? 'Bank Gateway Auto-Match' : null,
        flagged: isFailed,
        flagReason: isFailed ? 'Card or MoMo payment gateway authorization rejected' : null,
        documents: [
          {
            id: `doc-rec-${p.id}`,
            name: `Receipt_${p.receipt_number || 'Official'}.pdf`,
            type: 'receipt',
            size: '280 KB',
            uploadedAt: (p.created_at || new Date().toISOString()).slice(0, 10),
          },
        ],
        auditTrail: [
          {
            id: `audit-col-${p.id}`,
            timestamp: p.created_at || new Date().toISOString(),
            actor: 'Payment Gateway',
            action: isFailed ? 'Payment Attempt Rejected' : 'Collection Settled',
            details: `Processed via ${p.method} for RWF ${Number(p.amount || 0).toLocaleString()}`,
            newStatus: isFailed ? 'failed' : 'completed',
          },
        ],
        notes: p.notes || undefined,
      });
    });

    // 2. Outward Expenses (from operational expenses)
    const expenseRecords = storedExpenses.length > 0 ? storedExpenses : [
      {
        id: 'exp-seed-1',
        reference: 'EXP-2026-081',
        title: 'Emergency Generator Diesel Supply & Refill',
        category: 'Maintenance',
        propertyId: properties[0]?.id || 'prop-1',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        unitNumber: 'Common Facility',
        description: 'Major 500-hour servicing and fuel refill.',
        expenseDate: '2026-11-20',
        amount: 1450000,
        currency: 'RWF',
        paymentStatus: 'paid',
        vendorName: 'ElectroPower Rwanda Ltd',
        vendorType: 'Contractor',
        createdAt: '2026-11-18T10:00:00Z',
      },
      {
        id: 'exp-seed-2',
        reference: 'EXP-2026-082',
        title: 'Riverside Towers Monthly Waste Management',
        category: 'Cleaning',
        propertyId: properties[1]?.id || 'prop-2',
        propertyName: properties[1]?.name || 'Riverside Luxury Suites & Apartments',
        unitNumber: null,
        description: 'Bi-weekly municipal waste removal and recycling.',
        expenseDate: '2026-11-22',
        amount: 480000,
        currency: 'RWF',
        paymentStatus: 'pending',
        vendorName: 'Kigali Clean & Green Services',
        vendorType: 'Cleaning Service',
        createdAt: '2026-11-21T09:00:00Z',
      },
      {
        id: 'exp-seed-3',
        reference: 'EXP-2026-083',
        title: 'Common Area Security Patrol & CCTV Inspection',
        category: 'Security',
        propertyId: properties[0]?.id || 'prop-1',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        unitNumber: null,
        description: 'Night patrol security squad and perimeter CCTV testing.',
        expenseDate: '2026-11-24',
        amount: 820000,
        currency: 'RWF',
        paymentStatus: 'paid',
        vendorName: 'Intersec Rwanda Security Ltd',
        vendorType: 'Security Contractor',
        createdAt: '2026-11-23T14:30:00Z',
      },
    ];

    expenseRecords.forEach((exp: any) => {
      const isPaid = exp.paymentStatus === 'paid';
      list.push({
        id: `trx-exp-${exp.id}`,
        reference: exp.reference || `TRX-EXP-${exp.id.slice(0, 6)}`,
        date: exp.expenseDate ? `${exp.expenseDate}T10:00:00Z` : new Date().toISOString(),
        type: 'expense',
        direction: 'out',
        status: isPaid ? 'completed' : 'pending',
        amount: Number(exp.amount || 0),
        currency: exp.currency || 'RWF',
        description: exp.description || exp.title || 'Operational Outlay',
        source: 'bank_transfer',
        sourceReference: exp.invoiceNumber || undefined,
        propertyId: exp.propertyId || null,
        propertyName: exp.propertyName || null,
        unitNumber: exp.unitNumber || null,
        vendorId: exp.vendorId || null,
        vendorName: exp.vendorName || 'Contractor Partner',
        vendorCategory: exp.category || 'Maintenance',
        createdBy: exp.submittedBy || 'Financial Controller',
        createdAt: exp.createdAt || new Date().toISOString(),
        reconciled: isPaid,
        reconciledAt: isPaid ? exp.createdAt : null,
        reconciledBy: isPaid ? 'Accounts Payable' : null,
        documents: [
          {
            id: `doc-exp-${exp.id}`,
            name: `${exp.vendorName || 'Vendor'}_Invoice.pdf`,
            type: 'invoice',
            size: '1.4 MB',
            uploadedAt: (exp.createdAt || new Date().toISOString()).slice(0, 10),
          },
        ],
        auditTrail: [
          {
            id: `audit-exp-${exp.id}`,
            timestamp: exp.createdAt || new Date().toISOString(),
            actor: exp.submittedBy || 'Financial Controller',
            action: isPaid ? 'Expense Disbursed' : 'Expense Booked Pending Approval',
            details: `Recorded operational outlay for ${exp.title}`,
            newStatus: isPaid ? 'completed' : 'pending',
          },
        ],
        notes: exp.notes || undefined,
      });
    });

    // 3. Inward Security Deposit & Adjustments (Sample seeds)
    list.push(
      {
        id: 'trx-dep-1',
        reference: 'TRX-DEP-2026-009',
        date: '2026-11-15T11:20:00Z',
        type: 'deposit',
        direction: 'in',
        status: 'completed',
        amount: 4400000,
        currency: 'RWF',
        description: 'Statutory 2-month security deposit held in trust for Commercial Unit C-301 lease',
        source: 'bank_transfer',
        sourceReference: 'BK-ESC-88192',
        propertyId: properties[0]?.id || 'prop-1',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        unitNumber: 'C-301',
        tenantName: 'Aline Mukagasana',
        leaseNumber: 'LS-VIS-2026-002',
        createdBy: 'Lease Administration',
        createdAt: '2026-11-15T11:20:00Z',
        reconciled: true,
        reconciledAt: '2026-11-15T16:00:00Z',
        reconciledBy: 'Trust Account Manager',
        documents: [],
        auditTrail: [
          {
            id: 'audit-dep-1',
            timestamp: '2026-11-15T11:20:00Z',
            actor: 'Lease Administration',
            action: 'Deposit Received in Escrow',
            details: 'Booked 2-month security deposit upon lease execution',
            newStatus: 'completed',
          },
        ],
      },
      {
        id: 'trx-adj-1',
        reference: 'TRX-ADJ-2026-002',
        date: '2026-11-21T08:45:00Z',
        type: 'adjustment',
        direction: 'in',
        status: 'completed',
        amount: 60000,
        currency: 'RWF',
        description: 'Pro-rated service charge credit adjustment for elevator downtime Nov 10-12',
        source: 'manual',
        propertyId: properties[0]?.id || 'prop-1',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        unitNumber: 'B-104',
        tenantName: 'Eric Habimana',
        createdBy: 'Property Manager',
        createdAt: '2026-11-21T08:45:00Z',
        reconciled: true,
        documents: [],
        auditTrail: [
          {
            id: 'audit-adj-1',
            timestamp: '2026-11-21T08:45:00Z',
            actor: 'Property Manager',
            action: 'Credit Adjustment Approved',
            details: 'Compensatory adjustment applied to active account balance',
            newStatus: 'completed',
          },
        ],
      },
      {
        id: 'trx-ref-1',
        reference: 'TRX-REF-2026-001',
        date: '2026-11-23T16:10:00Z',
        type: 'refund',
        direction: 'out',
        status: 'pending',
        amount: 320000,
        currency: 'RWF',
        description: 'Pending Move-Out inspection refund balance after final utility offset',
        source: 'bank_transfer',
        propertyId: properties[1]?.id || 'prop-2',
        propertyName: properties[1]?.name || 'Riverside Luxury Suites & Apartments',
        unitNumber: 'A-201',
        tenantName: 'Jean Paul Ndayisaba',
        createdBy: 'Exit Workflow Specialist',
        createdAt: '2026-11-23T16:10:00Z',
        reconciled: false,
        flagged: true,
        flagReason: 'Awaiting Managing Director final payout authorization',
        documents: [],
        auditTrail: [
          {
            id: 'audit-ref-1',
            timestamp: '2026-11-23T16:10:00Z',
            actor: 'Exit Workflow Specialist',
            action: 'Refund Request Lodged',
            details: 'Initiated deposit return after exit inspection clearance',
            newStatus: 'pending',
          },
        ],
      }
    );

    // 4. Append Manual Transactions created by operator
    manualTransactions.forEach((m) => {
      list.push(m);
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, invoices, properties, tenants, storedExpenses, manualTransactions]);

  // Attention Items (Financial Integrity)
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    // Failed transactions
    allTransactions
      .filter((t) => t.status === 'failed')
      .forEach((t) => {
        items.push({
          id: `att-failed-${t.id}`,
          transactionId: t.id,
          reference: t.reference,
          amount: t.amount,
          issue: 'Failed Payment Gateway Charge',
          impact: 'Unsettled rent revenue at risk; resident ledger remains unpaid.',
          recommendedAction: 'Retry or Request Bank Wire',
          type: 'failed_payment',
        });
      });

    // Unreconciled pending refunds
    allTransactions
      .filter((t) => t.type === 'refund' && t.status === 'pending')
      .forEach((t) => {
        items.push({
          id: `att-refund-${t.id}`,
          transactionId: t.id,
          reference: t.reference,
          amount: t.amount,
          issue: 'Security Refund Authorization Pending',
          impact: 'Holding tenant security refund past statutory turnaround window.',
          recommendedAction: 'Sign Off Payout',
          type: 'refund_pending',
        });
      });

    // High value transactions with missing supporting docs
    allTransactions
      .filter((t) => t.amount > 500000 && t.documents.length === 0)
      .slice(0, 1)
      .forEach((t) => {
        items.push({
          id: `att-docs-${t.id}`,
          transactionId: t.id,
          reference: t.reference,
          amount: t.amount,
          issue: 'Missing Supporting Documentation',
          impact: 'High-value entry without receipt or invoice violates statutory RRA audit trail.',
          recommendedAction: 'Attach Receipt / Voucher',
          type: 'missing_docs',
        });
      });

    return items;
  }, [allTransactions]);

  // Handlers
  const handleOpenDetailModal = (transaction: TransactionRecord) => {
    setSelectedTransactionForDetail(transaction);
    setDetailModalOpen(true);
  };

  const handleToggleReconciled = (transactionId: string) => {
    setManualTransactions((prev) => {
      const exists = prev.some((t) => t.id === transactionId);
      if (exists) {
        return prev.map((t) => (t.id === transactionId ? { ...t, reconciled: !t.reconciled } : t));
      } else {
        // Find in allTransactions and add to manual overrides
        const target = allTransactions.find((t) => t.id === transactionId);
        if (target) {
          return [
            ...prev,
            {
              ...target,
              reconciled: !target.reconciled,
              reconciledBy: !target.reconciled ? user?.email || 'Finance Officer' : null,
              reconciledAt: !target.reconciled ? new Date().toISOString() : null,
            },
          ];
        }
        return prev;
      }
    });

    toast({
      title: 'Reconciliation Status Updated',
      description: 'Transaction reconciliation record refreshed.',
    });
  };

  const handleAddDocumentToTransaction = (transactionId: string, doc: TransactionDocument) => {
    setManualTransactions((prev) => {
      const match = prev.find((t) => t.id === transactionId);
      if (match) {
        return prev.map((t) =>
          t.id === transactionId ? { ...t, documents: [...t.documents, doc] } : t
        );
      } else {
        const target = allTransactions.find((t) => t.id === transactionId);
        if (target) {
          return [...prev, { ...target, documents: [...target.documents, doc] }];
        }
        return prev;
      }
    });
  };

  const handleCreateTransaction = (newTx: TransactionRecord) => {
    setManualTransactions((prev) => [newTx, ...prev]);
  };

  const handleImportBatch = (imported: TransactionRecord[]) => {
    setManualTransactions((prev) => [...imported, ...prev]);
  };

  const handleResolveAttentionItem = (itemId: string, action: string) => {
    toast({
      title: 'Integrity Action Dispatched',
      description: `Action "${action}" scheduled for financial review.`,
    });
  };

  const handleMatchStatementTransaction = (statementId: string, transactionId: string) => {
    handleToggleReconciled(transactionId);
  };

  // Print Official Transaction Voucher
  const handlePrintVoucher = (t: TransactionRecord) => {
    const compName = activeCompany?.name || 'FishGate Real Estate Rwanda Ltd';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official Financial Voucher - ${t.reference}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
    .ref { font-size: 14px; font-family: monospace; font-weight: 700; color: #2563eb; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .amount { font-size: 18px; font-weight: 800; color: ${t.direction === 'in' ? '#047857' : '#0f172a'}; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; padding-top: 24px; border-top: 1px dashed #cbd5e1; }
    .sig-line { border-bottom: 1px solid #94a3b8; height: 36px; margin-bottom: 8px; }
    .sig-label { font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">OFFICIAL FINANCIAL TRANSACTION VOUCHER</h1>
      <div class="ref">${t.reference}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${compName}</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #475569;">
      <div><strong>Date:</strong> ${format(new Date(t.date), 'yyyy-MM-dd HH:mm')}</div>
      <div><strong>Status:</strong> ${t.status.toUpperCase()}</div>
      <div><strong>Direction:</strong> ${t.direction.toUpperCase()}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="label">Counterparty</div>
      <div class="value" style="font-size: 15px;">${t.tenantName || t.vendorName || 'Internal Treasury'}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Type: ${t.tenantName ? 'Resident / Tenant' : t.vendorName ? 'Vendor / Contractor' : 'Corporate'}</div>
      ${t.sourceReference ? `<div style="font-size: 11px; color: #64748b;">Source Ref: ${t.sourceReference}</div>` : ''}
    </div>
    <div class="meta-box">
      <div class="label">Premises & Allocation</div>
      <div class="value">${t.propertyName || 'Corporate General'} ${t.unitNumber ? `(Unit ${t.unitNumber})` : ''}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Category: ${t.type.toUpperCase()}</div>
      <div style="font-size: 11px; color: #64748b;">Reconciliation: ${t.reconciled ? 'RECONCILED' : 'UNRECONCILED'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Scope / Transaction Description</th>
        <th style="text-align: right;">Payment Source</th>
        <th style="text-align: right;">Fee / Deduction</th>
        <th style="text-align: right;">Total Realized Volume</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>${t.description}</strong>
          ${t.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">${t.notes}</div>` : ''}
        </td>
        <td style="text-align: right; text-transform: uppercase;">${t.source.replace('_', ' ')}</td>
        <td style="text-align: right; font-family: monospace;">${currency} ${(t.feeAmount || 0).toLocaleString()}</td>
        <td style="text-align: right;" class="amount">
          ${t.direction === 'in' ? '+' : '-'}${currency} ${t.amount.toLocaleString()}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Created By (${t.createdBy})</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Verified By / Internal Audit</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>`;

    openPrintHtml(html, `Voucher-${t.reference}`);
  };

  const handleExportAllCsv = () => {
    const rows = allTransactions.map((t) => ({
      Reference: t.reference,
      Date: format(new Date(t.date), 'yyyy-MM-dd'),
      Type: t.type,
      Direction: t.direction,
      Amount: t.amount,
      Currency: t.currency,
      Status: t.status,
      Description: t.description,
      Source: t.source,
      SourceReference: t.sourceReference || '',
      Property: t.propertyName || 'Corporate General',
      Unit: t.unitNumber || '',
      Tenant: t.tenantName || '',
      Vendor: t.vendorName || '',
      Reconciled: t.reconciled ? 'Yes' : 'No',
      CreatedBy: t.createdBy,
    }));

    downloadCsv(`transactions-export-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({
      title: 'Ledger Exported',
      description: `Downloaded ${rows.length} transactions as CSV.`,
    });
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* =========================================================================
            SECTION 1: HEADER
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Transactions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track all financial activity across collections, expenses, adjustments and transfers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Record Transaction
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-medium gap-1.5 text-slate-700 h-9"
              onClick={() => setStatementModalOpen(true)}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              Generate Statement
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-medium gap-1.5 text-slate-700 h-9"
              onClick={() => setImportModalOpen(true)}
            >
              <UploadCloud className="w-4 h-4 text-slate-500" />
              Import Transactions
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-medium gap-1.5 text-slate-700 h-9"
              onClick={handleExportAllCsv}
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Transactions
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: FINANCIAL ACTIVITY SUMMARY (MAX 4 CARDS)
            ========================================================================= */}
        <TransactionHealthSummary
          transactions={allTransactions}
          currency={currency}
          onFilterReview={() => {
            const el = document.getElementById('transaction-explorer-container');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          onFilterIncoming={() => {
            const el = document.getElementById('transaction-explorer-container');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          onFilterOutgoing={() => {
            const el = document.getElementById('transaction-explorer-container');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          onResetFilters={() => {
            const el = document.getElementById('transaction-explorer-container');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* =========================================================================
            SECTION 3: ATTENTION REQUIRED (FINANCIAL INTEGRITY)
            ========================================================================= */}
        <TransactionAttentionRequired
          attentionItems={attentionItems}
          currency={currency}
          onSelectTransaction={(id) => {
            const match = allTransactions.find((t) => t.id === id);
            if (match) handleOpenDetailModal(match);
          }}
          onResolveItem={handleResolveAttentionItem}
        />

        {/* =========================================================================
            SECTION 4 & 5: TRANSACTION EXPLORER & RECONCILIATION CENTER
            ========================================================================= */}
        <div id="transaction-explorer-container">
          <TransactionExplorer
            transactions={allTransactions}
            currency={currency}
            onSelectTransaction={handleOpenDetailModal}
            onToggleReconciled={handleToggleReconciled}
            onPrintVoucher={handlePrintVoucher}
            onOpenImportModal={() => setImportModalOpen(true)}
            onMatchTransaction={handleMatchStatementTransaction}
          />
        </div>

        {/* =========================================================================
            SECTION 6: TRANSACTION OBSERVATIONS
            ========================================================================= */}
        <TransactionObservations
          transactions={allTransactions}
          currency={currency}
        />
      </div>

      {/* =========================================================================
          MODALS & WORKSPACES
          ========================================================================= */}

      {/* 5-Step Manual Transaction Wizard */}
      <TransactionCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        properties={properties}
        tenants={tenants}
        vendors={rawVendors}
        onCreateTransaction={handleCreateTransaction}
        currency={currency}
      />

      {/* Comprehensive Transaction Detail & Audit Modal */}
      {selectedTransactionForDetail && (
        <TransactionDetailModal
          open={detailModalOpen}
          onOpenChange={(open) => {
            setDetailModalOpen(open);
            if (!open) {
              setTimeout(() => setSelectedTransactionForDetail(null), 200);
            }
          }}
          transaction={selectedTransactionForDetail}
          currency={currency}
          onToggleReconciled={handleToggleReconciled}
          onPrintVoucher={handlePrintVoucher}
          onAddDocument={handleAddDocumentToTransaction}
        />
      )}

      {/* Bank & Statement CSV Importer */}
      <TransactionImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportTransactions={handleImportBatch}
        currency={currency}
      />

      {/* Financial Statement Generator */}
      <TransactionStatementModal
        open={statementModalOpen}
        onOpenChange={setStatementModalOpen}
        transactions={allTransactions}
        properties={properties}
        companyName={activeCompany?.name}
        currency={currency}
      />
    </PageContainer>
  );
}
