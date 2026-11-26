// src/pages/Expenses.tsx
// FishGate Design Constitution v1.0 - Operational Spending & Cost-Management Workspace

import { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Send,
  Download,
  Upload,
  Receipt,
  Users,
  ShieldCheck,
  Building2,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { PageContainer } from '@/design-system/LayoutFramework';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useProperties } from '@/hooks/useProperties';
import { useVendors, Vendor } from '@/hooks/useVendors';
import { useVendorPayments } from '@/hooks/useVendorPayments';
import { useRecurringBills } from '@/hooks/useRecurringBills';
import { downloadCsv } from '@/lib/download';
import { openPrintHtml } from '@/lib/pdfService';
import { format, isThisMonth } from 'date-fns';

// Specialized Expense Components
import { ExpenseHealthSummary } from '@/components/expenses/ExpenseHealthSummary';
import { ExpenseAttentionRequired } from '@/components/expenses/ExpenseAttentionRequired';
import { ExpenseWorkspace } from '@/components/expenses/ExpenseWorkspace';
import { ExpenseBudgetPerformance } from '@/components/expenses/ExpenseBudgetPerformance';
import { ExpenseVendorOverview } from '@/components/expenses/ExpenseVendorOverview';
import { ExpenseObservations } from '@/components/expenses/ExpenseObservations';
import { ExpenseCreationWizard } from '@/components/expenses/ExpenseCreationWizard';
import { ExpenseDetailModal } from '@/components/expenses/ExpenseDetailModal';
import { AddVendorModal } from '@/components/expenses/AddVendorModal';
import { ExpenseApprovalModal } from '@/components/expenses/ExpenseApprovalModal';
import {
  ExpenseRecord,
  ExpenseCategory,
  ExpenseAttentionItem,
  RecurringExpenseItem,
  VendorSummaryItem,
  BudgetAnalysisItem,
} from '@/components/expenses/types';

export default function Expenses() {
  const { user } = useAuth();
  const { activeCompanyId, activeCompany } = useActiveCompany();
  const currency = 'RWF';

  // Data fetching
  const { data: properties = [] } = useProperties();
  const { data: rawVendors = [] } = useVendors();
  const { data: rawVendorPayments = [] } = useVendorPayments();
  const { data: rawRecurringBills = [] } = useRecurringBills();

  // Dialog & Modal states
  const [wizardOpen, setWizardOpen] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedExpenseForApproval, setSelectedExpenseForApproval] = useState<ExpenseRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<ExpenseRecord | null>(null);

  // Local/Augmented Expenses state
  const [localExpenses, setLocalExpenses] = useState<ExpenseRecord[]>([
    {
      id: 'exp-seed-1',
      reference: 'EXP-2026-081',
      title: 'Vision City Backup Generator Scheduled Overhaul',
      category: 'Maintenance',
      subcategory: 'Power & Generators',
      propertyId: properties[0]?.id || 'prop-1',
      propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
      unitNumber: 'Common Facility',
      description: 'Major 500-hour servicing, filter replacement, coolant flushing and fuel injector testing.',
      expenseDate: '2026-11-20',
      amount: 1450000,
      taxAmount: 261000,
      taxType: 'vat_18',
      currency: 'RWF',
      budgetCategory: 'Operational Maintenance',
      costCenter: 'Kigali Facilities',
      paymentStatus: 'paid',
      invoiceNumber: 'INV-GEN-902',
      vendorId: 'vend-1',
      vendorName: 'ElectroPower Rwanda Ltd',
      vendorType: 'Contractor',
      hasReceipt: true,
      approvalStatus: 'approved',
      approvalWorkflow: 'single',
      approverName: 'Financial Controller',
      submittedBy: 'Aimable Nkurunziza',
      submittedDate: '2026-11-18',
      department: 'Facilities & Operations',
      documents: [
        {
          id: 'doc-seed-1',
          name: 'ElectroPower_Tax_Invoice_902.pdf',
          type: 'invoice',
          size: '1.4 MB',
          uploadedAt: '2026-11-18',
        },
      ],
      createdAt: '2026-11-18T10:00:00Z',
    },
    {
      id: 'exp-seed-2',
      reference: 'EXP-2026-082',
      title: 'Riverside Towers Monthly Waste Management & Recycling',
      category: 'Cleaning',
      subcategory: 'Waste Management',
      propertyId: properties[1]?.id || 'prop-2',
      propertyName: properties[1]?.name || 'Riverside Luxury Suites & Apartments',
      unitNumber: null,
      description: 'Bi-weekly municipal waste removal, organic composting and recycling transport.',
      expenseDate: '2026-11-22',
      amount: 480000,
      taxAmount: 86400,
      taxType: 'vat_18',
      currency: 'RWF',
      budgetCategory: 'Utilities & Facilities',
      costCenter: 'Riverside Operations',
      paymentStatus: 'pending',
      invoiceNumber: 'INV-CLEAN-441',
      vendorId: 'vend-2',
      vendorName: 'Kigali Clean & Green Services',
      vendorType: 'Cleaning Service',
      hasReceipt: false,
      approvalStatus: 'pending',
      approvalWorkflow: 'single',
      approverName: 'Property Manager',
      submittedBy: 'Diane Uwase',
      submittedDate: '2026-11-22',
      department: 'Housekeeping',
      documents: [],
      createdAt: '2026-11-22T08:30:00Z',
    },
    {
      id: 'exp-seed-3',
      reference: 'EXP-2026-083',
      title: 'Common Area Security Patrol & CCTV Inspection',
      category: 'Security',
      subcategory: 'Manned Guarding',
      propertyId: properties[0]?.id || 'prop-1',
      propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
      unitNumber: null,
      description: 'Night guarding shift reinforcement and CCTV perimeter sensor diagnostics.',
      expenseDate: '2026-11-24',
      amount: 820000,
      taxAmount: 147600,
      taxType: 'vat_18',
      currency: 'RWF',
      budgetCategory: 'Security Operations',
      costCenter: 'Portfolio Security',
      paymentStatus: 'paid',
      invoiceNumber: 'SEC-RW-771',
      vendorId: 'vend-3',
      vendorName: 'Intersec Rwanda Security Ltd',
      vendorType: 'Security Agency',
      hasReceipt: true,
      approvalStatus: 'approved',
      approvalWorkflow: 'threshold',
      approverName: 'Operations Director',
      submittedBy: 'Eric Habimana',
      submittedDate: '2026-11-21',
      department: 'Security',
      documents: [
        {
          id: 'doc-seed-3',
          name: 'Intersec_Certified_Invoice.pdf',
          type: 'invoice',
          size: '920 KB',
          uploadedAt: '2026-11-21',
        },
      ],
      createdAt: '2026-11-21T14:15:00Z',
    },
    {
      id: 'exp-seed-4',
      reference: 'EXP-2026-084',
      title: 'Elevator Preventative Maintenance & Safety Certification',
      category: 'Maintenance',
      subcategory: 'Vertical Transport',
      propertyId: properties[1]?.id || 'prop-2',
      propertyName: properties[1]?.name || 'Riverside Luxury Suites & Apartments',
      unitNumber: 'Elevator Bay A',
      description: 'Quarterly hydraulic pressure calibration and safety brake certification per City of Kigali code.',
      expenseDate: '2026-11-25',
      amount: 1950000,
      taxAmount: 351000,
      taxType: 'vat_18',
      currency: 'RWF',
      budgetCategory: 'Operational Maintenance',
      costCenter: 'Riverside Operations',
      paymentStatus: 'pending',
      invoiceNumber: 'OTIS-RW-302',
      vendorId: 'vend-4',
      vendorName: 'Schindler & Otis Engineering Rwanda',
      vendorType: 'Contractor',
      hasReceipt: true,
      approvalStatus: 'pending',
      approvalWorkflow: 'multi_level',
      approverName: 'Managing Director',
      submittedBy: 'Aimable Nkurunziza',
      submittedDate: '2026-11-25',
      department: 'Engineering',
      documents: [
        {
          id: 'doc-seed-4',
          name: 'Safety_Certification_Report.pdf',
          type: 'approval_doc',
          size: '2.8 MB',
          uploadedAt: '2026-11-25',
        },
      ],
      createdAt: '2026-11-25T09:00:00Z',
    },
  ]);

  // Combine database vendor payments with operational expense records
  const allExpenses = useMemo<ExpenseRecord[]>(() => {
    const list = [...localExpenses];

    rawVendorPayments.forEach((vp) => {
      // Avoid duplicate IDs
      if (!list.some((e) => e.id === vp.id)) {
        const vendor = rawVendors.find((v) => v.id === vp.vendor_id);
        const prop = properties[0];
        list.push({
          id: vp.id,
          reference: vp.reference_number || `EXP-${vp.id.slice(0, 6).toUpperCase()}`,
          title: vp.notes || `Disbursement to ${vendor?.name || 'Service Vendor'}`,
          category: 'Maintenance',
          propertyId: prop?.id || 'prop-default',
          propertyName: prop?.name || 'General Portfolio',
          description: vp.notes || 'Vendor payment disbursement.',
          expenseDate: vp.paid_at || vp.created_at.slice(0, 10),
          amount: vp.amount,
          taxAmount: Math.round(vp.amount * 0.18),
          taxType: 'vat_18',
          currency: vp.currency || currency,
          budgetCategory: 'Operational Maintenance',
          costCenter: 'Facility Management',
          paymentStatus: vp.status === 'paid' ? 'paid' : 'pending',
          invoiceNumber: vp.reference_number || undefined,
          vendorId: vp.vendor_id,
          vendorName: vendor?.name || 'Registered Contractor',
          hasReceipt: true,
          approvalStatus: vp.status === 'paid' ? 'approved' : 'pending',
          approvalWorkflow: 'single',
          submittedBy: 'Accounts Payable',
          submittedDate: vp.created_at.slice(0, 10),
          department: 'Finance',
          documents: [],
          createdAt: vp.created_at,
        });
      }
    });

    return list.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }, [localExpenses, rawVendorPayments, rawVendors, properties]);

  // Recurring Expenses data
  const recurringExpenses = useMemo<RecurringExpenseItem[]>(() => {
    const list: RecurringExpenseItem[] = [
      {
        id: 'rec-1',
        vendorName: 'Intersec Rwanda Security Ltd',
        vendorId: 'vend-3',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        serviceCategory: 'Physical Security & Manned Guarding',
        frequency: 'monthly',
        amount: 820000,
        currency,
        nextBillingDate: 'Dec 1, 2026',
        status: 'active',
        autoRenew: true,
      },
      {
        id: 'rec-2',
        vendorName: 'Kigali Clean & Green Services',
        vendorId: 'vend-2',
        propertyName: properties[1]?.name || 'Riverside Luxury Suites & Apartments',
        serviceCategory: 'Facility Waste Management & Sanitation',
        frequency: 'monthly',
        amount: 480000,
        currency,
        nextBillingDate: 'Dec 1, 2026',
        status: 'active',
        autoRenew: true,
      },
      {
        id: 'rec-3',
        vendorName: 'CanalBox / Liquid Telecom Rwanda',
        vendorId: 'vend-5',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        serviceCategory: 'High-Speed Fiber Internet & CCTV Uplink',
        frequency: 'monthly',
        amount: 320000,
        currency,
        nextBillingDate: 'Dec 5, 2026',
        status: 'active',
        autoRenew: true,
      },
    ];

    // Merge with rawRecurringBills if any
    rawRecurringBills.forEach((rb) => {
      const prop = properties.find((p) => p.id === rb.property_id);
      if (!list.some((item) => item.id === rb.id)) {
        list.push({
          id: rb.id,
          vendorName: rb.name,
          vendorId: `vend-${rb.id.slice(0, 4)}`,
          propertyName: prop?.name || 'Portfolio Property',
          serviceCategory: rb.bill_type || 'Utilities',
          frequency: rb.frequency as any || 'monthly',
          amount: rb.amount,
          currency,
          nextBillingDate: 'Dec 1, 2026',
          status: rb.is_active ? 'active' : 'paused',
          autoRenew: true,
        });
      }
    });

    return list;
  }, [rawRecurringBills, properties]);

  // Vendor Summary items
  const vendorSummaries = useMemo<VendorSummaryItem[]>(() => {
    return [
      {
        id: 'vend-1',
        vendorName: 'ElectroPower Rwanda Ltd',
        vendorType: 'Contractor',
        contactName: 'Patrick Nshimiyimana',
        phone: '+250 788 412 901',
        email: 'service@electropower.rw',
        services: 'Backup Generators, Heavy Electrical & Transformers',
        totalSpend: 3400000,
        activeContracts: 2,
        lastPaymentDate: 'Nov 20, 2026',
        lastPaymentAmount: 1450000,
        riskStatus: 'low',
        rating: 4.8,
        performanceNotes: 'Excellent SLA responsiveness, genuine parts guarantee.',
      },
      {
        id: 'vend-3',
        vendorName: 'Intersec Rwanda Security Ltd',
        vendorType: 'Security Agency',
        contactName: 'Capt. Emmanuel Rutayisire',
        phone: '+250 788 554 112',
        email: 'ops@intersec.rw',
        services: '24/7 Perimeter Guarding & Access Control',
        totalSpend: 4920000,
        activeContracts: 3,
        lastPaymentDate: 'Nov 24, 2026',
        lastPaymentAmount: 820000,
        riskStatus: 'low',
        rating: 4.9,
        performanceNotes: 'Consistently high guard diligence and shift punctuality.',
      },
      {
        id: 'vend-4',
        vendorName: 'Schindler & Otis Engineering Rwanda',
        vendorType: 'Contractor',
        contactName: 'Jean-Claude Gasana',
        phone: '+250 788 990 041',
        email: 'kigali@schindler.com',
        services: 'Elevator Maintenance & Emergency Dispatch',
        totalSpend: 3900000,
        activeContracts: 1,
        lastPaymentDate: 'Aug 25, 2026',
        lastPaymentAmount: 1950000,
        riskStatus: 'moderate',
        rating: 4.3,
        performanceNotes: 'Long parts lead times for hydraulic seals. SLA under review.',
      },
    ];
  }, []);

  // Budget Analysis items
  const budgetItems = useMemo<BudgetAnalysisItem[]>(() => {
    return [
      {
        id: 'b-1',
        category: 'Maintenance',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        allocatedBudget: 3500000,
        actualSpend: 3400000,
        remainingBudget: 100000,
        variance: 100000,
        utilizationPercent: 97.1,
        status: 'warning',
      },
      {
        id: 'b-2',
        category: 'Security',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        allocatedBudget: 2800000,
        actualSpend: 2460000,
        remainingBudget: 340000,
        variance: 340000,
        utilizationPercent: 87.8,
        status: 'on_track',
      },
      {
        id: 'b-3',
        category: 'Cleaning',
        propertyName: properties[1]?.name || 'Riverside Luxury Suites & Apartments',
        allocatedBudget: 1500000,
        actualSpend: 1440000,
        remainingBudget: 60000,
        variance: 60000,
        utilizationPercent: 96.0,
        status: 'warning',
      },
      {
        id: 'b-4',
        category: 'Utilities',
        propertyName: properties[1]?.name || 'Riverside Luxury Suites & Apartments',
        allocatedBudget: 2200000,
        actualSpend: 2380000,
        remainingBudget: -180000,
        variance: -180000,
        utilizationPercent: 108.2,
        status: 'exceeded',
      },
      {
        id: 'b-5',
        category: 'Property Improvements',
        propertyName: properties[0]?.name || 'Vision City Commercial & Residential Hub',
        allocatedBudget: 5000000,
        actualSpend: 2100000,
        remainingBudget: 2900000,
        variance: 2900000,
        utilizationPercent: 42.0,
        status: 'on_track',
      },
    ];
  }, [properties]);

  // Section 3: Attention Required Items
  const attentionItems = useMemo<ExpenseAttentionItem[]>(() => {
    const list: ExpenseAttentionItem[] = [];

    // Over budget category
    const overBudgetItem = budgetItems.find((b) => b.status === 'exceeded');
    if (overBudgetItem) {
      list.push({
        id: 'att-budget-1',
        title: `${overBudgetItem.category} Budget Exceeded`,
        propertyName: overBudgetItem.propertyName,
        amount: Math.abs(overBudgetItem.variance),
        issueType: 'budget_exceeded',
        issueDescription: `Spending in ${overBudgetItem.category} is ${overBudgetItem.utilizationPercent.toFixed(1)}% of allocation (${currency} ${Math.abs(overBudgetItem.variance).toLocaleString()} over budget).`,
        severity: 'critical',
        recommendedAction: 'Review Budget',
        actionType: 'review',
      });
    }

    // Pending approval
    const pendingHighVal = allExpenses.find((e) => e.approvalStatus === 'pending' && e.amount >= 1000000);
    if (pendingHighVal) {
      list.push({
        id: `att-appr-${pendingHighVal.id}`,
        expenseId: pendingHighVal.id,
        title: pendingHighVal.title,
        propertyName: pendingHighVal.propertyName,
        amount: pendingHighVal.amount,
        issueType: 'approval_required',
        issueDescription: `Outlay exceeds RWF 1M threshold. Authorization required by ${pendingHighVal.approverName || 'Management'}.`,
        severity: 'critical',
        recommendedAction: 'Approve Outlay',
        actionType: 'approve',
      });
    }

    // Missing Receipt
    const missingReceiptExp = allExpenses.find((e) => !e.hasReceipt && e.paymentStatus === 'paid');
    if (missingReceiptExp) {
      list.push({
        id: `att-rcpt-${missingReceiptExp.id}`,
        expenseId: missingReceiptExp.id,
        title: missingReceiptExp.title,
        propertyName: missingReceiptExp.propertyName,
        amount: missingReceiptExp.amount,
        issueType: 'missing_receipt',
        issueDescription: 'Settled payment without verified RRA statutory tax invoice or EBM receipt.',
        severity: 'warning',
        recommendedAction: 'Upload Receipt',
        actionType: 'upload_receipt',
      });
    }

    // Overdue vendor invoice
    const pendingExp = allExpenses.find((e) => e.paymentStatus === 'pending' && e.approvalStatus === 'approved');
    if (pendingExp) {
      list.push({
        id: `att-vend-${pendingExp.id}`,
        expenseId: pendingExp.id,
        title: `Vendor Payment Due: ${pendingExp.vendorName}`,
        propertyName: pendingExp.propertyName,
        amount: pendingExp.amount,
        issueType: 'invoice_overdue',
        issueDescription: `Invoice ${pendingExp.invoiceNumber || 'pending'} approved and awaiting disbursement.`,
        severity: 'warning',
        recommendedAction: 'Disburse Funds',
        actionType: 'pay',
      });
    }

    return list;
  }, [budgetItems, allExpenses]);

  // Section 2: Health Summary KPIs
  const expensesThisMonth = useMemo(() => {
    return allExpenses
      .filter((e) => isThisMonth(new Date(e.expenseDate)))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [allExpenses]);

  const monthlyBudget = useMemo(() => {
    return budgetItems.reduce((sum, b) => sum + b.allocatedBudget, 0) || 15000000;
  }, [budgetItems]);

  const budgetUtilizationPercent = monthlyBudget > 0 ? (expensesThisMonth / monthlyBudget) * 100 : 0;

  const pendingApprovals = useMemo(() => {
    return allExpenses.filter((e) => e.approvalStatus === 'pending');
  }, [allExpenses]);

  const pendingApprovalsCount = pendingApprovals.length;
  const pendingApprovalsAmount = pendingApprovals.reduce((sum, e) => sum + e.amount, 0);

  const recurringExpensesTotal = useMemo(() => {
    return recurringExpenses
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [recurringExpenses]);

  // Handlers
  const handleOpenWizard = () => {
    setWizardOpen(true);
  };

  const handleCreateExpenseSubmit = async (expenseData: Partial<ExpenseRecord>, isDraft = false) => {
    const newRecord: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      reference: expenseData.reference || `EXP-${Date.now().toString().slice(-6)}`,
      title: expenseData.title || 'Untitled Expense',
      category: expenseData.category || 'Maintenance',
      subcategory: expenseData.subcategory,
      propertyId: expenseData.propertyId || '',
      propertyName: expenseData.propertyName || 'Portfolio Space',
      unitNumber: expenseData.unitNumber || null,
      description: expenseData.description || '',
      expenseDate: expenseData.expenseDate || new Date().toISOString().slice(0, 10),
      amount: expenseData.amount || 0,
      taxAmount: expenseData.taxAmount || 0,
      taxType: expenseData.taxType || 'vat_18',
      currency: expenseData.currency || currency,
      budgetCategory: expenseData.budgetCategory || 'Operational Maintenance',
      costCenter: expenseData.costCenter || 'Property Operations',
      paymentStatus: expenseData.paymentStatus || 'pending',
      invoiceNumber: expenseData.invoiceNumber,
      vendorId: expenseData.vendorId || 'custom-vendor',
      vendorName: expenseData.vendorName || 'General Contractor',
      vendorType: expenseData.vendorType,
      hasReceipt: Boolean(expenseData.hasReceipt),
      approvalStatus: isDraft ? 'draft' : expenseData.approvalStatus || 'pending',
      approvalWorkflow: expenseData.approvalWorkflow || 'single',
      approverName: expenseData.approverName || 'Financial Controller',
      submittedBy: expenseData.submittedBy || user?.email || 'Property Manager',
      submittedDate: expenseData.submittedDate || new Date().toISOString().slice(0, 10),
      department: expenseData.department || 'Operations',
      notes: expenseData.notes,
      documents: expenseData.documents || [],
      createdAt: new Date().toISOString(),
    };

    // Attempt persist to vendor_payments table if activeCompanyId is present
    if (activeCompanyId && activeCompanyId !== 'all') {
      try {
        await supabase.from('vendor_payments' as never).insert({
          company_id: activeCompanyId,
          vendor_id: expenseData.vendorId && expenseData.vendorId.length > 10 ? expenseData.vendorId : undefined,
          amount: newRecord.amount,
          currency: newRecord.currency,
          status: newRecord.paymentStatus === 'paid' ? 'paid' : 'pending',
          payment_method: 'bank_transfer',
          reference_number: newRecord.reference,
          notes: `${newRecord.title} - ${newRecord.description}`,
          paid_at: newRecord.paymentStatus === 'paid' ? new Date().toISOString() : null,
          created_by: user?.id,
        } as never);
      } catch (err) {
        console.warn('Could not insert to vendor_payments (fallback to local state):', err);
      }
    }

    setLocalExpenses((prev) => [newRecord, ...prev]);
  };

  const handleApproveExpense = (expense: ExpenseRecord) => {
    setSelectedExpenseForApproval(expense);
    setApprovalModalOpen(true);
  };

  const handleOpenExpenseDetail = (expense: ExpenseRecord) => {
    setSelectedExpenseForDetail(expense);
    setDetailModalOpen(true);
  };

  const handleUpdateExpense = (updated: ExpenseRecord) => {
    setLocalExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setSelectedExpenseForDetail(updated);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setLocalExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    toast({
      title: 'Expense Deleted',
      description: 'The operational expense record has been removed.',
    });
  };

  const handleMarkAsPaid = (expense: ExpenseRecord) => {
    const updated: ExpenseRecord = {
      ...expense,
      paymentStatus: 'paid',
      hasReceipt: true,
    };
    handleUpdateExpense(updated);
    toast({
      title: 'Disbursement Cleared',
      description: `${expense.reference} marked as settled and cleared.`,
    });
  };

  const handlePrintVoucher = (expense: ExpenseRecord) => {
    const companyName = activeCompany?.name || 'FishGate Real Estate Rwanda Ltd';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Voucher - ${expense.reference}</title>
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
    .amount { font-size: 16px; font-weight: 800; color: #0f172a; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; padding-top: 24px; border-top: 1px dashed #cbd5e1; }
    .sig-line { border-bottom: 1px solid #94a3b8; height: 36px; margin-bottom: 8px; }
    .sig-label { font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">OFFICIAL PAYMENT VOUCHER</h1>
      <div class="ref">${expense.reference}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${companyName}</div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #475569;">
      <div><strong>Date:</strong> ${expense.expenseDate}</div>
      <div><strong>Payment Status:</strong> ${expense.paymentStatus.toUpperCase()}</div>
      <div><strong>Approval Status:</strong> ${expense.approvalStatus.toUpperCase()}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="label">Payee / Beneficiary Vendor</div>
      <div class="value" style="font-size: 15px;">${expense.vendorName}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Type: ${expense.vendorType || 'Contractor'}</div>
      ${expense.invoiceNumber ? `<div style="font-size: 11px; color: #64748b;">Invoice Ref: ${expense.invoiceNumber}</div>` : ''}
    </div>
    <div class="meta-box">
      <div class="label">Premises & Cost Center</div>
      <div class="value">${expense.propertyName} ${expense.unitNumber ? `(Unit ${expense.unitNumber})` : ''}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Category: ${expense.category} ${expense.subcategory ? `• ${expense.subcategory}` : ''}</div>
      <div style="font-size: 11px; color: #64748b;">Cost Center: ${expense.costCenter || 'Property Operations'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description / Scope of Expenditure</th>
        <th style="text-align: right;">Net Amount</th>
        <th style="text-align: right;">Tax (${expense.taxType.replace('_', ' ').toUpperCase()})</th>
        <th style="text-align: right;">Total Outlay</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>${expense.title}</strong>
          ${expense.description ? `<br><span style="font-size: 12px; color: #64748b;">${expense.description}</span>` : ''}
        </td>
        <td style="text-align: right;">${expense.currency} ${(expense.amount - expense.taxAmount).toLocaleString()}</td>
        <td style="text-align: right;">${expense.currency} ${expense.taxAmount.toLocaleString()}</td>
        <td style="text-align: right;" class="amount">${expense.currency} ${expense.amount.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Prepared By<br><strong>${expense.submittedBy}</strong></div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Authorized By<br><strong>${expense.approverName || 'Financial Controller'}</strong></div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Received / Beneficiary<br><strong>${expense.vendorName}</strong></div>
    </div>
  </div>
</body>
</html>`;

    openPrintHtml(html, `Voucher-${expense.reference}`);
  };

  const handleConfirmApprovalAction = async (
    expenseId: string,
    action: 'approve' | 'reject' | 'clarify',
    remarks: string
  ) => {
    setLocalExpenses((prev) =>
      prev.map((e) => {
        if (e.id === expenseId) {
          return {
            ...e,
            approvalStatus: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending',
            notes: remarks ? `${e.notes ? e.notes + ' | ' : ''}Reviewer Note: ${remarks}` : e.notes,
          };
        }
        return e;
      })
    );

    toast({
      title: action === 'approve' ? 'Expense Approved' : action === 'reject' ? 'Expense Rejected' : 'Clarification Requested',
      description: `Action recorded for expense ${expenseId}.`,
    });
  };

  const handleExportExpenses = () => {
    downloadCsv(
      `fishgate-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      allExpenses.map((e) => ({
        Reference: e.reference,
        Date: e.expenseDate,
        Property: e.propertyName,
        Unit: e.unitNumber || 'N/A',
        Category: e.category,
        Vendor: e.vendorName,
        Amount: e.amount,
        Tax_Amount: e.taxAmount,
        Currency: e.currency,
        Payment_Status: e.paymentStatus,
        Approval_Status: e.approvalStatus,
        Created_By: e.submittedBy,
      }))
    );
    toast({
      title: 'Expenses Exported',
      description: 'Complete operational spending history exported as CSV.',
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
              Expenses
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage operational spending, budgets, vendors and financial controls.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 h-9"
              onClick={handleOpenWizard}
            >
              <DollarSign className="w-4 h-4" />
              Record Expense
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => {
                setWizardOpen(true);
              }}
            >
              <Send className="w-4 h-4 text-blue-600" />
              Submit Expense
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => setAddVendorOpen(true)}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              Add Vendor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => {
                toast({
                  title: 'Import Expenses',
                  description: 'CSV and Excel importer is available. Preparing upload mapping template.',
                });
              }}
            >
              <Upload className="w-4 h-4 text-slate-600" />
              Import Expenses
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={handleExportExpenses}
            >
              <Download className="w-4 h-4 text-slate-600" />
              Export Expenses
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: EXPENSE HEALTH SUMMARY (MAX 4 CARDS)
            ========================================================================= */}
        <ExpenseHealthSummary
          expensesThisMonth={expensesThisMonth}
          monthlyBudget={monthlyBudget}
          budgetUtilizationPercent={budgetUtilizationPercent}
          pendingApprovalsCount={pendingApprovalsCount}
          pendingApprovalsAmount={pendingApprovalsAmount}
          recurringExpensesTotal={recurringExpensesTotal}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 3: ATTENTION REQUIRED (FINANCIAL CONTROL)
            ========================================================================= */}
        <ExpenseAttentionRequired
          items={attentionItems}
          onAction={(item) => {
            if (item.actionType === 'approve' && item.expenseId) {
              const exp = allExpenses.find((e) => e.id === item.expenseId);
              if (exp) handleApproveExpense(exp);
            } else if (item.actionType === 'upload_receipt') {
              handleOpenWizard();
            } else if (item.actionType === 'pay') {
              toast({
                title: 'Disbursement Initiated',
                description: `Routing payment to vendor rail.`,
              });
            } else {
              toast({
                title: 'Reviewing Operational Item',
                description: item.issueDescription,
              });
            }
          }}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 4: EXPENSE WORKSPACE (5 VIEW MODES)
            ========================================================================= */}
        <ExpenseWorkspace
          expenses={allExpenses}
          recurringExpenses={recurringExpenses}
          vendorSummaries={vendorSummaries}
          budgetItems={budgetItems}
          onApproveExpense={handleApproveExpense}
          onRejectExpense={(exp) => handleConfirmApprovalAction(exp.id, 'reject', 'Does not meet budget guidelines.')}
          onRequestClarification={(exp) => handleConfirmApprovalAction(exp.id, 'clarify', 'Please attach quote breakdown.')}
          onRecordPaymentForVendor={(vendorId) => {
            const v = rawVendors.find((vend) => vend.id === vendorId);
            handleOpenWizard();
          }}
          onViewExpenseDetail={handleOpenExpenseDetail}
          onEditExpense={handleOpenExpenseDetail}
          onMarkAsPaid={handleMarkAsPaid}
          onPrintVoucher={handlePrintVoucher}
          onDeleteExpense={handleDeleteExpense}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 5: BUDGET PERFORMANCE
            ========================================================================= */}
        <ExpenseBudgetPerformance
          budgetItems={budgetItems}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 6: VENDOR MANAGEMENT & CONTRACT HEALTH
            ========================================================================= */}
        <ExpenseVendorOverview
          vendors={vendorSummaries}
          onAddVendor={() => setAddVendorOpen(true)}
          onRecordPayment={() => handleOpenWizard()}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 7: EXPENSE OBSERVATIONS (HUMAN-CENTERED, MAX 3)
            ========================================================================= */}
        <ExpenseObservations />
      </div>

      {/* =========================================================================
          MODALS & WIZARDS
          ========================================================================= */}
      {/* 6-Step Expense Creation Wizard */}
      <ExpenseCreationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        properties={properties}
        vendors={rawVendors}
        onSubmitExpense={handleCreateExpenseSubmit}
        currency={currency}
        existingExpenses={allExpenses}
      />

      {/* Add Operational Vendor Modal */}
      <AddVendorModal
        open={addVendorOpen}
        onOpenChange={setAddVendorOpen}
        onVendorCreated={(newV) => {
          toast({ title: 'Vendor Connected', description: `${newV.name} is now ready for expense allocation.` });
        }}
      />

      {/* Financial Governance Approval Modal */}
      {selectedExpenseForApproval && (
        <ExpenseApprovalModal
          open={approvalModalOpen}
          onOpenChange={setApprovalModalOpen}
          expense={selectedExpenseForApproval}
          onConfirmAction={handleConfirmApprovalAction}
          currency={currency}
        />
      )}

      {/* Comprehensive Expense Detail & Management Modal */}
      {selectedExpenseForDetail && (
        <ExpenseDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          expense={selectedExpenseForDetail}
          properties={properties}
          vendors={rawVendors}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
          onPrintVoucher={handlePrintVoucher}
          currency={currency}
        />
      )}
    </PageContainer>
  );
}
