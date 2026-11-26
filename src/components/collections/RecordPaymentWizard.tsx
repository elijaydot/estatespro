import { useState, useEffect } from 'react';
import {
  User,
  CreditCard,
  PieChart,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Mail,
  Printer,
  ShieldCheck,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Tenant } from '@/hooks/useTenants';
import { Property } from '@/hooks/useProperties';
import { Invoice } from '@/hooks/useInvoices';
import { Lease } from '@/hooks/useLeases';
import { downloadReceiptPdf } from '@/lib/pdfService';

interface RecordPaymentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  properties: Property[];
  invoices: any[];
  leases: any[];
  defaultTenantId?: string;
  defaultInvoiceId?: string | null;
  onSubmitPayment: (payload: {
    tenantId: string;
    invoiceId?: string | null;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    allocation: {
      rent: number;
      utilities: number;
      parking: number;
      penalties: number;
      other: number;
    };
    sendReceiptEmail: boolean;
    printReceipt: boolean;
  }) => Promise<string | void>; // returns paymentId if generated
  currency?: string;
}

export function RecordPaymentWizard({
  open,
  onOpenChange,
  tenants,
  properties,
  invoices,
  leases,
  defaultTenantId,
  defaultInvoiceId,
  onSubmitPayment,
  currency = 'RWF',
}: RecordPaymentWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  // Step 2 Form
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>('mtn_momo');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [isPartialPayment, setIsPartialPayment] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Step 3 Allocation
  const [allocRent, setAllocRent] = useState<number>(0);
  const [allocUtilities, setAllocUtilities] = useState<number>(0);
  const [allocParking, setAllocParking] = useState<number>(0);
  const [allocPenalties, setAllocPenalties] = useState<number>(0);
  const [allocOther, setAllocOther] = useState<number>(0);

  // Step 4 Receipt Options
  const [sendReceiptEmail, setSendReceiptEmail] = useState<boolean>(true);
  const [printReceiptImmediate, setPrintReceiptImmediate] = useState<boolean>(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize from defaults
  useEffect(() => {
    if (defaultTenantId) {
      setSelectedTenantId(defaultTenantId);
    }
    if (defaultInvoiceId) {
      setSelectedInvoiceId(defaultInvoiceId);
    }
  }, [defaultTenantId, defaultInvoiceId, open]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const selectedProperty = properties.find((p) => p.id === selectedTenant?.property_id);
  const tenantLease = leases.find((l) => l.tenant_id === selectedTenantId && (l.status === 'active' || l.status === 'signed'));
  const tenantInvoices = invoices.filter((inv) => inv.tenant_id === selectedTenantId && inv.status !== 'paid');

  // When tenant or invoice is selected, prepopulate amounts & payer name
  useEffect(() => {
    if (selectedTenant) {
      setPayerName(selectedTenant.name);
      const targetInvoice = tenantInvoices.find((i) => i.id === selectedInvoiceId) || tenantInvoices[0];
      if (targetInvoice) {
        setSelectedInvoiceId(targetInvoice.id);
        const due = Number(targetInvoice.amount || 0) - Number(targetInvoice.paid_amount || 0);
        setAmount(due > 0 ? due : Number(targetInvoice.amount || 0));
        setAllocRent(due > 0 ? due : Number(targetInvoice.amount || 0));
      } else if (tenantLease) {
        setAmount(Number(tenantLease.rent_amount || 0));
        setAllocRent(Number(tenantLease.rent_amount || 0));
      }
    }
  }, [selectedTenantId, selectedInvoiceId]);

  // Handle amount change and automatically allocate to rent by default
  const handleAmountChange = (newVal: number) => {
    setAmount(newVal);
    setAllocRent(newVal);
    setAllocUtilities(0);
    setAllocParking(0);
    setAllocPenalties(0);
    setAllocOther(0);
  };

  const totalAllocated = allocRent + allocUtilities + allocParking + allocPenalties + allocOther;
  const allocationMatches = Math.abs(totalAllocated - amount) < 1;

  const handleSubmit = async () => {
    if (!selectedTenantId || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please ensure tenant and a valid amount are selected.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const paymentId = await onSubmitPayment({
        tenantId: selectedTenantId,
        invoiceId: selectedInvoiceId || null,
        amount,
        method: paymentMethod,
        reference: paymentReference || `REF-${Date.now().toString().slice(-6)}`,
        notes,
        allocation: {
          rent: allocRent,
          utilities: allocUtilities,
          parking: allocParking,
          penalties: allocPenalties,
          other: allocOther,
        },
        sendReceiptEmail,
        printReceipt: printReceiptImmediate,
      });

      if (printReceiptImmediate && paymentId && typeof paymentId === 'string') {
        void downloadReceiptPdf({ paymentId });
      }

      toast({
        title: 'Payment Successfully Recorded',
        description: `${currency} ${amount.toLocaleString()} received and confirmed for ${selectedTenant?.name}.`,
      });

      onOpenChange(false);
      setStep(1);
    } catch (err: any) {
      toast({
        title: 'Collection Submission Failed',
        description: err?.message || 'Could not save payment record.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const q = tenantSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q) || (t.phone || '').includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Record Payment & Settle Balance
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                5-Step Enterprise Collection Wizard • Compliant Financial Documentation
              </DialogDescription>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold px-2 py-0.5">
              Step {step} of 5
            </Badge>
          </div>

          {/* Wizard Step Progression Bar */}
          <div className="grid grid-cols-5 gap-1.5 pt-4">
            {[
              { num: 1, label: 'Resident' },
              { num: 2, label: 'Details' },
              { num: 3, label: 'Allocation' },
              { num: 4, label: 'Receipt' },
              { num: 5, label: 'Review' },
            ].map((s) => {
              const isPast = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div key={s.num} className="space-y-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isPast
                        ? 'bg-emerald-600'
                        : isCurrent
                        ? 'bg-blue-600'
                        : 'bg-slate-200'
                    }`}
                  />
                  <p
                    className={`text-[10px] font-bold text-center tracking-wide ${
                      isCurrent
                        ? 'text-blue-700'
                        : isPast
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.num}. {s.label}
                  </p>
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Modal Body Container */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* =========================================================================
              STEP 1: SELECT TENANT & PREMISES
              ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Step 1: Choose Resident & Tenancy Record
              </h4>

              {selectedTenant ? (
                <div className="p-4 border-2 border-blue-500/30 bg-blue-50/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                        {selectedTenant.name[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{selectedTenant.name}</h3>
                        <p className="text-xs text-slate-500">{selectedTenant.phone || selectedTenant.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setSelectedTenantId('')}
                    >
                      Change Resident
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100 text-xs text-slate-700">
                    <div>
                      <span className="text-slate-400 font-medium">Property: </span>
                      <span className="font-semibold text-slate-900">{selectedProperty?.name || 'Assigned Property'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Lease Status: </span>
                      <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-200">
                        {tenantLease?.status ? tenantLease.status.toUpperCase() : 'ACTIVE'}
                      </Badge>
                    </div>
                  </div>

                  {tenantInvoices.length > 0 && (
                    <div className="pt-2">
                      <Label className="text-xs font-bold text-slate-700">Outstanding Invoice to Settle:</Label>
                      <select
                        className="w-full text-xs h-9 border border-blue-200 rounded-md px-3 mt-1 bg-white"
                        value={selectedInvoiceId}
                        onChange={(e) => setSelectedInvoiceId(e.target.value)}
                      >
                        {tenantInvoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_number} • Due: {currency} {Number(inv.amount - (inv.paid_amount || 0)).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Search residents by name, phone, or email..."
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    className="text-xs"
                  />
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {filteredTenants.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No matching residents found.
                      </div>
                    ) : (
                      filteredTenants.map((t) => {
                        const prop = properties.find((p) => p.id === t.property_id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTenantId(t.id)}
                            className="p-3 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                                {t.name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{t.name}</p>
                                <p className="text-[11px] text-slate-400">
                                  {prop?.name || 'Property'} • {t.phone || t.email}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              Select
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              STEP 2: PAYMENT DETAILS
              ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Step 2: Transaction & Payment Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Amount Received ({currency}) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={amount || ''}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="text-base font-bold text-slate-900"
                    placeholder="e.g., 850000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Payment Date *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Payment Channel / Method *</Label>
                  <select
                    className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="mtn_momo">Mobile Money (MTN MoMo)</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="cash">Cash Settlement</option>
                    <option value="credit_card">Debit / Credit Card</option>
                    <option value="standing_order">Bank Standing Order</option>
                    <option value="cheque">Bank Check / Cheque</option>
                    <option value="online">Online Payment Gateway</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Transaction Reference / Slip #</Label>
                  <Input
                    placeholder="e.g., MTN-TX-849201 or BK-9842"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Payer Name</Label>
                  <Input
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="text-xs"
                    placeholder="Name on bank slip or MoMo account"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={isPartialPayment}
                      onChange={(e) => setIsPartialPayment(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Mark as Partial Installment
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Internal Audit Notes</Label>
                <Textarea
                  placeholder="Optional audit trail notes (e.g. verified on bank statement)..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 3: ALLOCATION
              ========================================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Step 3: Revenue Allocation Breakdown
                </h4>
                <div className="text-xs">
                  <span className="text-slate-400">Total Payment: </span>
                  <span className="font-bold text-slate-900">{currency} {amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-xs font-semibold text-slate-700">Rent Charge ({currency})</Label>
                  <Input
                    type="number"
                    value={allocRent}
                    onChange={(e) => setAllocRent(Number(e.target.value))}
                    className="text-xs font-bold text-slate-900 text-right bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-xs font-semibold text-slate-700">Utilities (Water, Power, Service)</Label>
                  <Input
                    type="number"
                    value={allocUtilities}
                    onChange={(e) => setAllocUtilities(Number(e.target.value))}
                    className="text-xs font-bold text-slate-900 text-right bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-xs font-semibold text-slate-700">Parking Fee</Label>
                  <Input
                    type="number"
                    value={allocParking}
                    onChange={(e) => setAllocParking(Number(e.target.value))}
                    className="text-xs font-bold text-slate-900 text-right bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-xs font-semibold text-slate-700">Late Payment Penalties</Label>
                  <Input
                    type="number"
                    value={allocPenalties}
                    onChange={(e) => setAllocPenalties(Number(e.target.value))}
                    className="text-xs font-bold text-slate-900 text-right bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-xs font-semibold text-slate-700">Other Miscellaneous Charges</Label>
                  <Input
                    type="number"
                    value={allocOther}
                    onChange={(e) => setAllocOther(Number(e.target.value))}
                    className="text-xs font-bold text-slate-900 text-right bg-white"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Allocated Sum:</span>
                  <span
                    className={`font-bold ${
                      allocationMatches ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {currency} {totalAllocated.toLocaleString()} / {currency} {amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {!allocationMatches && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>The sum of allocations must equal the total received payment amount.</span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              STEP 4: RECEIPT & CONFIRMATION
              ========================================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Step 4: Statutory Receipt & Resident Delivery
              </h4>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Automatic Digital Receipt Generation Enabled</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Upon completion, FishGate generates an official certified payment receipt with a unique sequential reference code.
                </p>

                <div className="pt-2 border-t border-emerald-200/60 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-800 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendReceiptEmail}
                      onChange={(e) => setSendReceiptEmail(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Email Official Receipt to Resident ({selectedTenant?.email || 'N/A'})
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-800 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printReceiptImmediate}
                      onChange={(e) => setPrintReceiptImmediate(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <Printer className="w-3.5 h-3.5 text-slate-700" />
                    Open PDF Print / Download Window Immediately
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 5: REVIEW & DUPLICATE CHECK
              ========================================================================= */}
          {step === 5 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Step 5: Review & Confirm Submission
              </h4>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Resident / Tenant:</span>
                  <span className="font-bold text-slate-900">{selectedTenant?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Property & Space:</span>
                  <span className="font-bold text-slate-900">{selectedProperty?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Amount Received:</span>
                  <span className="font-bold text-emerald-700 text-sm">{currency} {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Payment Channel:</span>
                  <span className="font-semibold text-slate-800 uppercase">{paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono text-slate-700">{paymentReference || 'Auto-generated'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Payment Date:</span>
                  <span className="font-semibold text-slate-800">{paymentDate}</span>
                </div>
              </div>

              {/* Duplicate check clearance badge */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Pre-flight duplicate check passed: No identical payment recorded in the last 24 hours.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="gap-1.5 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 5 ? (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 text-xs"
                disabled={
                  (step === 1 && !selectedTenantId) ||
                  (step === 2 && amount <= 0) ||
                  (step === 3 && !allocationMatches)
                }
                onClick={() => setStep((s) => Math.min(5, s + 1))}
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Recording Collection...' : 'Confirm & Settle Payment'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
