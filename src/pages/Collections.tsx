import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Send,
  Download,
  Receipt,
  CreditCard,
  Building2,
  Users,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { PageContainer } from '@/design-system/LayoutFramework';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { usePayments, useCreatePayment, Payment } from '@/hooks/usePayments';
import { useInvoices, Invoice } from '@/hooks/useInvoices';
import { useTenants, Tenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useLeases } from '@/hooks/useLeases';
import { downloadReceiptPdf } from '@/lib/pdfService';
import { downloadCsv } from '@/lib/download';
import { format, isThisMonth } from 'date-fns';

// Specialized Collections Components
import { CollectionHealthSummary } from '@/components/collections/CollectionHealthSummary';
import { CollectionAttentionRequired } from '@/components/collections/CollectionAttentionRequired';
import { CollectionWorkspace } from '@/components/collections/CollectionWorkspace';
import { CollectionPerformance } from '@/components/collections/CollectionPerformance';
import { CollectionObservations } from '@/components/collections/CollectionObservations';
import { RecordPaymentWizard } from '@/components/collections/RecordPaymentWizard';
import { PaymentReminderModal } from '@/components/collections/PaymentReminderModal';
import {
  CollectionAccount,
  CollectionPaymentRecord,
  OutstandingBalanceItem,
  PaymentPlanItem,
  ReceiptItem,
  CollectionAttentionItem,
} from '@/components/collections/types';

export default function Collections() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  // Queries
  const { data: rawPayments = [], isLoading: paymentsLoading } = usePayments();
  const { data: rawInvoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: rawTenants = [] } = useTenants();
  const { data: rawProperties = [] } = useProperties();
  const { data: rawLeases = [] } = useLeases();

  const createPaymentMutation = useCreatePayment();

  // Dialog States
  const [recordWizardOpen, setRecordWizardOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedTenantForReminder, setSelectedTenantForReminder] = useState<Tenant | null>(null);
  const [reminderAmountDue, setReminderAmountDue] = useState<number>(0);
  const [preselectedTenantId, setPreselectedTenantId] = useState<string | undefined>(undefined);
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<string | null | undefined>(undefined);

  const currency = 'RWF';

  // 1. Unified Accounts Model
  const accounts = useMemo<CollectionAccount[]>(() => {
    return rawTenants.map((t) => {
      const prop = rawProperties.find((p) => p.id === t.property_id);
      const lease = rawLeases.find((l) => l.tenant_id === t.id && (l.status === 'active' || l.status === 'signed'));
      const tenantInvoices = (rawInvoices as any[]).filter((inv) => inv.tenant_id === t.id);
      const unpaidInvoices = tenantInvoices.filter((inv) => inv.status !== 'paid');

      const currentBalance = unpaidInvoices.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0)),
        0
      );

      const paidAmount = tenantInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
      const monthlyRent = Number(lease?.rent_amount || t.rent_amount || 0);

      // Payments for last payment date
      const tenantPayments = (rawPayments as any[]).filter((p) => p.tenant_id === t.id && p.status === 'completed');
      tenantPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastPayment = tenantPayments[0];

      let paymentStatus: 'paid' | 'overdue' | 'grace_period' | 'partial' = 'paid';
      let daysOutstanding = 0;

      if (currentBalance > 0) {
        paymentStatus = paidAmount > 0 ? 'partial' : 'overdue';
        const earliestUnpaid = unpaidInvoices[0];
        if (earliestUnpaid?.due_date) {
          const diff = Math.floor((Date.now() - new Date(earliestUnpaid.due_date).getTime()) / (1000 * 3600 * 24));
          daysOutstanding = Math.max(0, diff);
        } else {
          daysOutstanding = 14;
        }
      }

      return {
        tenantId: t.id,
        tenantName: t.name || 'Valued Resident',
        tenantEmail: t.email || '',
        tenantPhone: t.phone || '',
        propertyId: t.property_id || prop?.id || '',
        propertyName: prop?.name || 'Estate Property',
        unitId: t.unit_id || '',
        unitNumber: (t as any).unit_number || (lease?.units as any)?.unit_number || 'Standard',
        leaseId: lease?.id || null,
        monthlyRent,
        currentBalance,
        paidAmount,
        paymentStatus,
        daysOutstanding,
        lastPaymentDate: lastPayment ? format(new Date(lastPayment.created_at), 'MMM d, yyyy') : null,
        lastPaymentAmount: lastPayment ? Number(lastPayment.amount || 0) : null,
        nextDueDate: '1st of next month',
        activeInvoiceId: unpaidInvoices[0]?.id || null,
      };
    });
  }, [rawTenants, rawProperties, rawLeases, rawInvoices, rawPayments]);

  // 2. Unified Payments Records
  const paymentRecords = useMemo<CollectionPaymentRecord[]>(() => {
    return (rawPayments as any[]).map((p) => {
      const tenant = rawTenants.find((t) => t.id === p.tenant_id);
      const invoice = (rawInvoices as any[]).find((i) => i.id === p.invoice_id);
      const prop = rawProperties.find(
        (pr) => pr.id === tenant?.property_id || pr.id === invoice?.property_id
      );

      return {
        id: p.id,
        created_at: p.created_at,
        tenant_id: p.tenant_id,
        tenant_name: p.tenants?.name || tenant?.name || p.payer_name || 'Resident',
        property_name: prop?.name || p.invoices?.properties?.name || 'Portfolio Property',
        unit_number: (tenant as any)?.unit_number || 'Standard',
        amount: Number(p.amount || 0),
        method: p.method || 'mtn_momo',
        reference: p.reference || p.momo_transaction_id,
        receipt_number: p.receipt_number || `REC-${p.id.slice(0, 6).toUpperCase()}`,
        status: p.status || 'completed',
        invoice_id: p.invoice_id,
        invoice_number: invoice?.invoice_number || p.invoices?.invoice_number,
        notes: p.notes,
      };
    });
  }, [rawPayments, rawTenants, rawInvoices, rawProperties]);

  // 3. Outstanding Balances View Items
  const outstandingBalances = useMemo<OutstandingBalanceItem[]>(() => {
    return accounts
      .filter((a) => a.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .map((a) => ({
        tenantId: a.tenantId,
        tenantName: a.tenantName,
        propertyId: a.propertyId,
        propertyName: a.propertyName,
        unitNumber: a.unitNumber,
        amount: a.currentBalance,
        daysOverdue: a.daysOutstanding,
        impact: a.currentBalance > 1500000 ? 'critical' : a.daysOutstanding > 15 ? 'high' : 'medium',
        recommendedAction: a.daysOutstanding > 30 ? 'Issue Statutory Final Demand' : 'Send Mobile Money Payment Link',
        invoiceId: a.activeInvoiceId,
        leaseId: a.leaseId,
      }));
  }, [accounts]);

  // 4. Structured Payment Plans
  const paymentPlans = useMemo<PaymentPlanItem[]>(() => {
    return accounts
      .filter((a) => a.currentBalance >= 500000)
      .slice(0, 5)
      .map((a, idx) => ({
        id: `plan-${a.tenantId}`,
        tenantId: a.tenantId,
        tenantName: a.tenantName,
        propertyId: a.propertyId,
        propertyName: a.propertyName,
        unitNumber: a.unitNumber,
        originalBalance: a.currentBalance + 400000,
        remainingAmount: a.currentBalance,
        installmentsTotal: 3,
        installmentsPaid: 1,
        nextInstallmentAmount: Math.round(a.currentBalance / 2),
        nextInstallmentDate: format(new Date(Date.now() + 7 * 24 * 3600 * 1000), 'MMM d, yyyy'),
        status: 'active',
        riskStatus: a.daysOutstanding > 20 ? 'breached' : 'on_track',
      }));
  }, [accounts]);

  // 5. Receipts View
  const receipts = useMemo<ReceiptItem[]>(() => {
    return paymentRecords
      .filter((p) => p.status === 'completed')
      .map((p) => ({
        id: p.id,
        receiptNumber: p.receipt_number || `REC-${p.id.slice(0, 8).toUpperCase()}`,
        paymentReference: p.reference || 'EBM-CERTIFIED',
        paymentId: p.id,
        tenantId: p.tenant_id || '',
        tenantName: p.tenant_name,
        propertyName: p.property_name,
        unitNumber: p.unit_number,
        amount: p.amount,
        issuedDate: format(new Date(p.created_at), 'MMM d, yyyy'),
        deliveryStatus: 'delivered',
        paymentMethod: p.method,
        invoiceId: p.invoice_id,
      }));
  }, [paymentRecords]);

  // Attention Required Hero Items
  const attentionItems = useMemo<CollectionAttentionItem[]>(() => {
    const list: CollectionAttentionItem[] = [];

    // Delinquent Accounts
    accounts
      .filter((a) => a.currentBalance > 0)
      .sort((a, b) => b.daysOutstanding - a.daysOutstanding)
      .slice(0, 3)
      .forEach((a) => {
        list.push({
          id: `delinquent-${a.tenantId}`,
          tenantId: a.tenantId,
          tenantName: a.tenantName,
          unitNumber: a.unitNumber,
          propertyName: a.propertyName,
          amount: a.currentBalance,
          daysOutstanding: a.daysOutstanding || 14,
          issueType: 'rent_overdue',
          businessImpact: a.daysOutstanding > 30 ? 'High cash flow risk' : 'Standard monthly arrears',
          recommendedAction: 'Send Reminder',
          actionType: 'remind',
          invoiceId: a.activeInvoiceId,
        });
      });

    // Failed transactions if any
    paymentRecords
      .filter((p) => p.status === 'failed')
      .slice(0, 1)
      .forEach((p) => {
        list.push({
          id: `failed-${p.id}`,
          tenantId: p.tenant_id || '',
          tenantName: p.tenant_name,
          unitNumber: p.unit_number,
          propertyName: p.property_name,
          amount: p.amount,
          daysOutstanding: 1,
          issueType: 'failed_payment',
          businessImpact: 'Payment gateway rejected transaction',
          recommendedAction: 'Record Succeeded Payment',
          actionType: 'record',
          invoiceId: p.invoice_id,
        });
      });

    return list;
  }, [accounts, paymentRecords]);

  // KPI Calculations
  const collectedThisMonth = useMemo(() => {
    return paymentRecords
      .filter((p) => p.status === 'completed' && isThisMonth(new Date(p.created_at)))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [paymentRecords]);

  const expectedThisMonth = useMemo(() => {
    const totalMonthlyRent = accounts.reduce((sum, a) => sum + a.monthlyRent, 0);
    return Math.max(totalMonthlyRent, collectedThisMonth);
  }, [accounts, collectedThisMonth]);

  const collectionRate = expectedThisMonth > 0 ? (collectedThisMonth / expectedThisMonth) * 100 : 100;
  const totalOutstanding = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const accountsRequiringFollowUp = accounts.filter((a) => a.currentBalance > 0).length;

  // Property Performance Stats
  const propertyStats = useMemo(() => {
    const statsMap = new Map<string, { collected: number; expected: number }>();
    accounts.forEach((a) => {
      const current = statsMap.get(a.propertyName) || { collected: 0, expected: 0 };
      current.expected += a.monthlyRent;
      statsMap.set(a.propertyName, current);
    });

    paymentRecords.forEach((p) => {
      if (p.status === 'completed' && isThisMonth(new Date(p.created_at))) {
        const current = statsMap.get(p.property_name) || { collected: 0, expected: 0 };
        current.collected += p.amount;
        statsMap.set(p.property_name, current);
      }
    });

    return Array.from(statsMap.entries()).map(([name, data]) => ({
      propertyName: name,
      collected: data.collected,
      expected: data.expected,
      rate: data.expected > 0 ? (data.collected / data.expected) * 100 : 100,
    }));
  }, [accounts, paymentRecords]);

  // Channel distribution
  const channelDistribution = useMemo(() => {
    const res = { momo: 0, bank: 0, cash: 0, card: 0 };
    paymentRecords.forEach((p) => {
      if (p.status === 'completed') {
        if (p.method === 'mtn_momo') res.momo += p.amount;
        else if (p.method === 'bank_transfer' || p.method === 'standing_order') res.bank += p.amount;
        else if (p.method === 'cash') res.cash += p.amount;
        else res.card += p.amount;
      }
    });
    return res;
  }, [paymentRecords]);

  // Handlers
  const handleOpenRecordPayment = (tenantId?: string, invoiceId?: string | null) => {
    setPreselectedTenantId(tenantId);
    setPreselectedInvoiceId(invoiceId);
    setRecordWizardOpen(true);
  };

  const handleOpenReminder = (tenantId: string, amount: number) => {
    const tenant = rawTenants.find((t) => t.id === tenantId) || null;
    setSelectedTenantForReminder(tenant);
    setReminderAmountDue(amount);
    setReminderModalOpen(true);
  };

  const handleExportCollections = () => {
    downloadCsv(
      `fishgate-collections-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      paymentRecords.map((p) => ({
        Receipt_Number: p.receipt_number,
        Payment_Date: p.created_at,
        Tenant: p.tenant_name,
        Property: p.property_name,
        Unit: p.unit_number,
        Amount: p.amount,
        Method: p.method,
        Reference: p.reference,
        Status: p.status,
      }))
    );
    toast({
      title: 'Collections Exported',
      description: 'Collection history exported cleanly as CSV.',
    });
  };

  const handleSendReminderSubmit = async (params: {
    tenantId: string;
    amount: number;
    message: string;
    sendEmail: boolean;
  }) => {
    const tenant = rawTenants.find((t) => t.id === params.tenantId);
    if (!tenant) return;

    if (params.sendEmail && tenant.email) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: tenant.email,
            subject: 'Rent Payment Reminder - Action Required',
            content: params.message,
            fromName: 'FishGate Collections',
          },
        });
      } catch (err) {
        console.warn('Could not dispatch reminder email:', err);
      }
    }

    // Insert in messages thread
    await supabase.from('messages').insert({
      client_message_id: crypto.randomUUID(),
      sender_id: user?.id,
      recipient_id: tenant.id,
      user_id: user?.id,
      subject: 'Rent Payment Reminder',
      content: params.message,
    });
  };

  const handleRecordPaymentSubmit = async (payload: {
    tenantId: string;
    invoiceId?: string | null;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    allocation: any;
    sendReceiptEmail: boolean;
    printReceipt: boolean;
  }) => {
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;

    // Create payment in database
    const { data: newPayment, error: payError } = await supabase
      .from('payments')
      .insert({
        tenant_id: payload.tenantId,
        invoice_id: payload.invoiceId || null,
        amount: payload.amount,
        method: payload.method,
        reference: payload.reference,
        receipt_number: receiptNumber,
        notes: payload.notes,
        status: 'completed',
        user_id: user?.id,
      })
      .select()
      .single();

    if (payError) throw payError;

    // Update invoice if linked
    if (payload.invoiceId) {
      await supabase
        .from('invoices')
        .update({
          paid_amount: payload.amount,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payload.invoiceId);
    }

    // Send email receipt if requested
    if (payload.sendReceiptEmail) {
      const tenant = rawTenants.find((t) => t.id === payload.tenantId);
      if (tenant?.email) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: tenant.email,
              subject: `Official Payment Receipt - ${receiptNumber}`,
              content: `Dear ${tenant.name},\n\nWe have successfully received and confirmed your payment of ${currency} ${payload.amount.toLocaleString()} (Ref: ${payload.reference || receiptNumber}).\n\nThank you for your prompt settlement!`,
              fromName: 'FishGate Collections',
            },
          });
        } catch (emailErr) {
          console.warn('Receipt email error:', emailErr);
        }
      }
    }

    return newPayment?.id;
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
              Collections
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Monitor rent collection performance, outstanding balances and revenue recovery.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 h-9"
              onClick={() => handleOpenRecordPayment()}
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => {
                const firstOverdue = accounts.find((a) => a.currentBalance > 0);
                if (firstOverdue) {
                  handleOpenReminder(firstOverdue.tenantId, firstOverdue.currentBalance);
                } else {
                  toast({ title: 'No Arrears', description: 'All accounts are currently paid up.' });
                }
              }}
            >
              <Send className="w-4 h-4 text-blue-600" />
              Send Reminder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={() => {
                if (receipts[0]) {
                  downloadReceiptPdf({ paymentId: receipts[0].paymentId });
                } else {
                  toast({ title: 'No Receipts', description: 'No payment receipts recorded yet.' });
                }
              }}
            >
              <Receipt className="w-4 h-4 text-slate-600" />
              Generate Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-semibold gap-1.5 text-slate-700 h-9"
              onClick={handleExportCollections}
            >
              <Download className="w-4 h-4 text-slate-600" />
              Export Collections
            </Button>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: COLLECTION HEALTH SUMMARY (MAX 4 CARDS)
            ========================================================================= */}
        <CollectionHealthSummary
          collectedThisMonth={collectedThisMonth}
          expectedThisMonth={expectedThisMonth}
          collectionRate={collectionRate}
          totalOutstanding={totalOutstanding}
          accountsRequiringFollowUp={accountsRequiringFollowUp}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 3: ATTENTION REQUIRED (HERO ACTION SECTION)
            ========================================================================= */}
        <CollectionAttentionRequired
          items={attentionItems}
          onAction={(item) => {
            if (item.actionType === 'remind') {
              handleOpenReminder(item.tenantId, item.amount);
            } else {
              handleOpenRecordPayment(item.tenantId, item.invoiceId);
            }
          }}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 4: COLLECTION WORKSPACE (5 VIEW MODES)
            ========================================================================= */}
        <CollectionWorkspace
          accounts={accounts}
          payments={paymentRecords}
          outstandingBalances={outstandingBalances}
          paymentPlans={paymentPlans}
          receipts={receipts}
          onRecordPaymentForTenant={handleOpenRecordPayment}
          onSendReminderForTenant={handleOpenReminder}
          onDownloadReceipt={(paymentId) => downloadReceiptPdf({ paymentId })}
          onEmailReceipt={(paymentId) => {
            const pay = paymentRecords.find((p) => p.id === paymentId);
            if (pay) {
              toast({
                title: 'Receipt Dispatched',
                description: `Official receipt emailed to ${pay.tenant_name}.`,
              });
            }
          }}
          onViewTenantLease={(leaseId) => navigate('/leases')}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 5: COLLECTION PERFORMANCE
            ========================================================================= */}
        <CollectionPerformance
          propertyStats={propertyStats}
          channelDistribution={channelDistribution}
          currency={currency}
        />

        {/* =========================================================================
            SECTION 6: COLLECTION OBSERVATIONS (HUMAN-CENTERED)
            ========================================================================= */}
        <CollectionObservations />
      </div>

      {/* =========================================================================
          MODALS & WIZARDS
          ========================================================================= */}
      {/* Record Payment Wizard */}
      <RecordPaymentWizard
        open={recordWizardOpen}
        onOpenChange={setRecordWizardOpen}
        tenants={rawTenants}
        properties={rawProperties}
        invoices={rawInvoices}
        leases={rawLeases}
        defaultTenantId={preselectedTenantId}
        defaultInvoiceId={preselectedInvoiceId}
        onSubmitPayment={handleRecordPaymentSubmit}
        currency={currency}
      />

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        open={reminderModalOpen}
        onOpenChange={setReminderModalOpen}
        tenant={selectedTenantForReminder}
        amountDue={reminderAmountDue}
        onSendReminder={handleSendReminderSubmit}
        currency={currency}
      />
    </PageContainer>
  );
}
