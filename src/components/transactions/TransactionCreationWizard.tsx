// src/components/transactions/TransactionCreationWizard.tsx
// FishGate Design Constitution v1.0 - Manual Transaction Creation 5-Step Wizard

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Building2,
  Users,
  Building,
  Paperclip,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  TransactionRecord,
  TransactionType,
  TransactionDirection,
  TransactionSource,
  TransactionDocument,
} from './types';
import { Property } from '@/hooks/useProperties';
import { Tenant } from '@/hooks/useTenants';
import { Vendor } from '@/hooks/useVendors';

interface TransactionCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  tenants: Tenant[];
  vendors: Vendor[];
  onCreateTransaction: (transaction: TransactionRecord) => void;
  currency?: string;
}

export function TransactionCreationWizard({
  open,
  onOpenChange,
  properties,
  tenants,
  vendors,
  onCreateTransaction,
  currency = 'RWF',
}: TransactionCreationWizardProps) {
  // Wizard Step State
  const [step, setStep] = useState<number>(1);

  // STEP 1: Type & Direction
  const [selectedType, setSelectedType] = useState<TransactionType>('collection');
  const [direction, setDirection] = useState<TransactionDirection>('in');

  // STEP 2: Financial Details
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState<TransactionSource>('bank_transfer');
  const [sourceReference, setSourceReference] = useState('');
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  // STEP 3: Related Entities
  const [propertyId, setPropertyId] = useState<string>('');
  const [unitNumber, setUnitNumber] = useState<string>('');
  const [counterpartyType, setCounterpartyType] = useState<'tenant' | 'vendor' | 'internal'>('tenant');
  const [tenantId, setTenantId] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState('');

  // STEP 4: Documents
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState<TransactionDocument['type']>('receipt');
  const [attachedDocs, setAttachedDocs] = useState<TransactionDocument[]>([]);

  const resetForm = () => {
    setStep(1);
    setSelectedType('collection');
    setDirection('in');
    setAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setSource('bank_transfer');
    setSourceReference('');
    setFeeAmount(0);
    setDescription('');
    setPropertyId(properties[0]?.id || '');
    setUnitNumber('');
    setCounterpartyType('tenant');
    setTenantId('');
    setVendorId('');
    setInternalNotes('');
    setAttachedDocs([]);
  };

  const handleTypeSelect = (type: TransactionType) => {
    setSelectedType(type);
    if (['collection', 'deposit', 'penalty'].includes(type)) {
      setDirection('in');
      setCounterpartyType('tenant');
    } else if (['expense'].includes(type)) {
      setDirection('out');
      setCounterpartyType('vendor');
    } else if (['refund'].includes(type)) {
      setDirection('out');
      setCounterpartyType('tenant');
    } else if (['transfer'].includes(type)) {
      setDirection('neutral');
      setCounterpartyType('internal');
    } else {
      setDirection('in');
    }
  };

  const handleAddDocument = () => {
    if (!docName.trim()) {
      toast({ title: 'Document Label Required', description: 'Please name the document attachment.', variant: 'destructive' });
      return;
    }
    const doc: TransactionDocument = {
      id: `doc-${Date.now()}`,
      name: docName.trim(),
      type: docType,
      size: '1.5 MB',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    setAttachedDocs((prev) => [...prev, doc]);
    setDocName('');
  };

  const handleRemoveDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      return Boolean(selectedType);
    }
    if (currentStep === 2) {
      if (!amount || amount <= 0) {
        toast({ title: 'Invalid Amount', description: 'Amount must be greater than zero.', variant: 'destructive' });
        return false;
      }
      if (!description.trim()) {
        toast({ title: 'Description Required', description: 'Please describe the transaction.', variant: 'destructive' });
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinalSubmit = () => {
    const selectedProp = properties.find((p) => p.id === propertyId);
    const selectedTen = tenants.find((t) => t.id === tenantId);
    const selectedVen = vendors.find((v) => v.id === vendorId);

    const refNumber = `TRX-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newTransaction: TransactionRecord = {
      id: `trx-${Date.now()}`,
      reference: refNumber,
      date: new Date(date).toISOString(),
      type: selectedType,
      direction,
      status: 'completed',
      amount,
      currency,
      feeAmount: feeAmount > 0 ? feeAmount : 0,
      netAmount: amount - feeAmount,
      description: description.trim(),
      source,
      sourceReference: sourceReference.trim() || undefined,
      propertyId: selectedProp?.id || null,
      propertyName: selectedProp?.name || null,
      unitNumber: unitNumber.trim() || null,
      tenantId: selectedTen?.id || null,
      tenantName: selectedTen?.name || null,
      tenantEmail: selectedTen?.email || null,
      vendorId: selectedVen?.id || null,
      vendorName: selectedVen?.name || null,
      vendorCategory: selectedVen?.category || null,
      createdBy: 'Financial Controller',
      createdAt: new Date().toISOString(),
      reconciled: false,
      documents: attachedDocs,
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'Financial Controller',
          action: 'Manual Transaction Booked',
          details: `Created ${selectedType} of ${currency} ${amount.toLocaleString()} via ${source}.`,
          newStatus: 'completed',
        },
      ],
      notes: internalNotes.trim() || undefined,
    };

    onCreateTransaction(newTransaction);
    onOpenChange(false);
    resetForm();
    toast({
      title: 'Transaction Booked',
      description: `${refNumber} recorded and posted to the unified ledger.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-mono text-blue-700 bg-blue-50">
              Step {step} of 5
            </Badge>
            <span className="text-xs text-slate-400 font-medium">Unified Financial Entry</span>
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 mt-1">
            {step === 1 && 'Step 1: Select Transaction Type & Flow'}
            {step === 2 && 'Step 2: Financial Details & Source'}
            {step === 3 && 'Step 3: Associate Property & Counterparty'}
            {step === 4 && 'Step 4: Attach Supporting Evidence'}
            {step === 5 && 'Step 5: Review & Post to Financial Ledger'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {step === 1 && 'Specify the nature and cash-flow direction of the movement.'}
            {step === 2 && 'Enter amount, transaction date, payment mechanism and reference.'}
            {step === 3 && 'Link the financial transaction to a premises, tenant, or vendor.'}
            {step === 4 && 'Attach bank slips, invoices, receipts, or contracts for audit trail.'}
            {step === 5 && 'Verify transaction allocations before committing to the business history.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress Line */}
        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden my-1">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold text-slate-700">Transaction Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'collection', label: 'Rent Collection', dir: 'in', desc: 'Incoming resident rent' },
                { type: 'expense', label: 'Expense Payment', dir: 'out', desc: 'Disbursement to vendor' },
                { type: 'refund', label: 'Deposit Refund', dir: 'out', desc: 'Tenant security return' },
                { type: 'deposit', label: 'Security Deposit', dir: 'in', desc: 'Lease security escrow' },
                { type: 'transfer', label: 'Inter-Account Transfer', dir: 'neutral', desc: 'Treasury rebalance' },
                { type: 'adjustment', label: 'Ledger Adjustment', dir: 'in', desc: 'Correction or credit' },
                { type: 'penalty', label: 'Late Fee / Penalty', dir: 'in', desc: 'Statutory late charge' },
                { type: 'utility', label: 'Utility Recovery', dir: 'in', desc: 'Power / water bill' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleTypeSelect(item.type as TransactionType)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedType === item.type
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{item.label}</span>
                    {item.dir === 'in' ? (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    ) : item.dir === 'out' ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
              <span>Selected Cash Flow Direction:</span>
              <Badge variant="outline" className="font-semibold uppercase tracking-wider text-[10px]">
                {direction === 'in' ? 'Money In (Receipt)' : direction === 'out' ? 'Money Out (Payment)' : 'Neutral (Transfer)'}
              </Badge>
            </div>
          </div>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Amount ({currency}) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="e.g. 850000"
                  className="h-9 text-sm font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Transaction Date *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Payment Method / Source</Label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as TransactionSource)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="bank_transfer">Bank Transfer (RTGS / Direct)</option>
                  <option value="mtn_momo">MTN Mobile Money</option>
                  <option value="airtel_money">Airtel Money</option>
                  <option value="gateway">Online Card Gateway</option>
                  <option value="cash">Cash Counter Receipt</option>
                  <option value="cheque">Bank Cheque</option>
                  <option value="manual">Manual Ledger Entry</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">External Reference / Cheque #</Label>
                <Input
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder="e.g. BK-TX-998231 or MoMo ID"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Transaction Description / Scope *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Rent payment for Nov 2026 or Generator diesel supply"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Processing Fee / Bank Deduction (Optional)</Label>
              <Input
                type="number"
                min="0"
                value={feeAmount || ''}
                onChange={(e) => setFeeAmount(Number(e.target.value))}
                placeholder="e.g. 5000"
                className="h-9 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Net realized: {currency} {(amount - feeAmount).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Premises / Property</Label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="">Platform Corporate (No specific property)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Unit Number (Optional)</Label>
                <Input
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. Unit C-301"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Counterparty Category</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="cparty"
                    checked={counterpartyType === 'tenant'}
                    onChange={() => setCounterpartyType('tenant')}
                  />
                  Resident / Tenant
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="cparty"
                    checked={counterpartyType === 'vendor'}
                    onChange={() => setCounterpartyType('vendor')}
                  />
                  Vendor / Contractor
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="cparty"
                    checked={counterpartyType === 'internal'}
                    onChange={() => setCounterpartyType('internal')}
                  />
                  Internal / Treasury Only
                </label>
              </div>
            </div>

            {counterpartyType === 'tenant' && (
              <div>
                <Label className="text-xs font-semibold">Select Resident / Tenant</Label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="">Select Tenant</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {counterpartyType === 'vendor' && (
              <div>
                <Label className="text-xs font-semibold">Select Vendor</Label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Internal Notes & Audit Justification</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add background notes or instructions..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 4 ================= */}
        {step === 4 && (
          <div className="space-y-3 py-2 text-xs">
            <Label className="text-xs font-semibold">Attach Supporting Evidence</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Document label or ref..."
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
              >
                <option value="receipt">Payment Receipt</option>
                <option value="invoice">Tax Invoice</option>
                <option value="proof_of_payment">Proof of Payment</option>
                <option value="statement">Bank Statement Slip</option>
                <option value="contract">Contract Addendum</option>
              </select>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAddDocument}>
                <Plus className="w-3.5 h-3.5" /> Attach
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white mt-2">
              {attachedDocs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No documents attached. You can continue or attach proof above.
                </div>
              ) : (
                attachedDocs.map((d) => (
                  <div key={d.id} className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{d.name}</span>
                      <span className="text-[10px] text-slate-400">({d.type})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:bg-red-50"
                      onClick={() => handleRemoveDoc(d.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 5 ================= */}
        {step === 5 && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Type & Direction</span>
                <span className="font-bold text-slate-900 uppercase">
                  {selectedType} ({direction})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Total Amount</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {currency} {amount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Source / Method</span>
                <span className="font-semibold text-slate-900">
                  {source.replace('_', ' ').toUpperCase()} {sourceReference ? `(${sourceReference})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Description</span>
                <span className="font-medium text-slate-800">{description}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Premises</span>
                <span className="font-semibold text-slate-900">
                  {properties.find((p) => p.id === propertyId)?.name || 'Platform Corporate'}
                  {unitNumber ? ` (Unit ${unitNumber})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Supporting Evidence</span>
                <span className="font-semibold text-slate-900">
                  {attachedDocs.length} Document(s) Attached
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                Booking will generate a unique auditable transaction reference and update financial records immediately.
              </span>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-500"
            >
              Cancel
            </Button>
            {step < 5 ? (
              <Button type="button" size="sm" onClick={handleNext} className="gap-1 text-xs bg-blue-600 hover:bg-blue-700">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleFinalSubmit}
                className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Commit to Ledger
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
