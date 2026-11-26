// src/components/expenses/ExpenseCreationWizard.tsx
// FishGate Design Constitution v1.0 - Complete 6-Step Expense Creation Wizard

import { useState, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  Users,
  Paperclip,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  AlertTriangle,
  Building2,
  Plus,
  Trash2,
  FileCheck,
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
import { cn } from '@/lib/utils';
import { Property } from '@/hooks/useProperties';
import { Vendor } from '@/hooks/useVendors';
import { ExpenseCategory, ExpenseDocument, ExpenseRecord } from './types';

interface ExpenseCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  vendors: Vendor[];
  onSubmitExpense: (expenseData: Partial<ExpenseRecord>, isDraft?: boolean) => Promise<void>;
  currency?: string;
  existingExpenses?: ExpenseRecord[];
}

export function ExpenseCreationWizard({
  open,
  onOpenChange,
  properties,
  vendors,
  onSubmitExpense,
  currency = 'RWF',
  existingExpenses = [],
}: ExpenseCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Expense Basics
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Maintenance');
  const [subcategory, setSubcategory] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  // Step 2: Financial Information
  const [amount, setAmount] = useState<number>(0);
  const [taxType, setTaxType] = useState<'vat_18' | 'withholding_15' | 'exempt' | 'none'>('vat_18');
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [budgetCategory, setBudgetCategory] = useState('Operational Maintenance');
  const [costCenter, setCostCenter] = useState('Property Operations');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [reference, setReference] = useState(`EXP-${Date.now().toString().slice(-6)}`);

  // Step 3: Vendor Information
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorType, setVendorType] = useState('Contractor');
  const [contractReference, setContractReference] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');

  // Step 4: Supporting Documents
  const [documents, setDocuments] = useState<ExpenseDocument[]>([
    {
      id: 'doc-1',
      name: 'Vendor_Invoice_Official.pdf',
      type: 'invoice',
      size: '1.2 MB',
      uploadedAt: new Date().toISOString().slice(0, 10),
    },
  ]);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<ExpenseDocument['type']>('receipt');

  // Step 5: Approvals & Allocation
  const [approverName, setApproverName] = useState('Financial Controller');
  const [approvalWorkflow, setApprovalWorkflow] = useState<'no_approval' | 'single' | 'multi_level' | 'threshold'>('single');
  const [department, setDepartment] = useState('Facilities & Operations');
  const [allocationRule, setAllocationRule] = useState('100% to Selected Property');
  const [operationalNotes, setOperationalNotes] = useState('');

  // Auto-calculate tax when amount or taxType changes
  const calculatedTax = useMemo(() => {
    if (taxType === 'vat_18') return Math.round(amount * 0.18);
    if (taxType === 'withholding_15') return Math.round(amount * 0.15);
    return 0;
  }, [amount, taxType]);

  // Check for duplicates
  const duplicateAlert = useMemo(() => {
    if (!amount || !propertyId) return null;
    const match = existingExpenses.find(
      (e) =>
        e.propertyId === propertyId &&
        Math.abs(e.amount - amount) < 1000 &&
        (e.vendorName.toLowerCase() === vendorName.toLowerCase() || e.vendorId === vendorId)
    );
    return match ? match : null;
  }, [amount, propertyId, vendorName, vendorId, existingExpenses]);

  // Selected property
  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === propertyId);
  }, [properties, propertyId]);

  // Reset form
  const resetForm = () => {
    setStep(1);
    setTitle('');
    setCategory('Maintenance');
    setSubcategory('');
    setPropertyId(properties[0]?.id || '');
    setUnitNumber('');
    setDescription('');
    setAmount(0);
    setTaxAmount(0);
    setPaymentStatus('pending');
    setInvoiceNumber('');
    setReference(`EXP-${Date.now().toString().slice(-6)}`);
    setVendorId('');
    setVendorName('');
  };

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim()) {
        toast({ title: 'Title Required', description: 'Please provide an expense title.', variant: 'destructive' });
        return;
      }
      if (!propertyId) {
        toast({ title: 'Property Required', description: 'Please select a property.', variant: 'destructive' });
        return;
      }
    }
    if (step === 2) {
      if (amount <= 0) {
        toast({ title: 'Invalid Amount', description: 'Please specify a valid expense amount.', variant: 'destructive' });
        return;
      }
    }
    if (step === 3) {
      if (!vendorName.trim()) {
        toast({ title: 'Vendor Required', description: 'Please specify or select a vendor.', variant: 'destructive' });
        return;
      }
    }
    setStep((prev) => Math.min(6, prev + 1) as any);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1) as any);
  };

  const handleAddDocument = () => {
    if (!newDocName.trim()) return;
    setDocuments((prev) => [
      ...prev,
      {
        id: `doc-${Date.now()}`,
        name: newDocName,
        type: newDocType,
        size: '850 KB',
        uploadedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    setNewDocName('');
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmit = async (isDraft = false) => {
    try {
      setIsSubmitting(true);
      await onSubmitExpense(
        {
          reference,
          title,
          category,
          subcategory,
          propertyId,
          propertyName: selectedProperty?.name || 'Selected Property',
          unitNumber: unitNumber || null,
          description,
          expenseDate,
          amount,
          taxAmount: calculatedTax,
          taxType,
          currency,
          budgetCategory,
          costCenter,
          paymentStatus,
          invoiceNumber,
          vendorId: vendorId || 'custom-vendor',
          vendorName,
          vendorType,
          hasReceipt: documents.some((d) => d.type === 'receipt' || d.type === 'invoice'),
          approvalStatus: isDraft ? 'draft' : approvalWorkflow === 'no_approval' ? 'approved' : 'pending',
          approvalWorkflow,
          approverName,
          submittedBy: 'Property Manager',
          submittedDate: new Date().toISOString().slice(0, 10),
          department,
          notes: operationalNotes,
          documents,
        },
        isDraft
      );

      toast({
        title: isDraft ? 'Draft Saved' : 'Expense Submitted Successfully',
        description: isDraft
          ? 'Expense draft saved for later completion.'
          : 'Expense routed to approval and added to operational workspace.',
      });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Submission Error',
        description: err.message || 'Could not record expense.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Step {step} of 6 • Expense Creation Wizard
            </span>
            <Badge variant="outline" className="text-[11px] font-mono bg-white">
              {reference}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 mt-1">
            {step === 1 && '1. Expense Basics & Classification'}
            {step === 2 && '2. Financial Details, Taxes & Cost Center'}
            {step === 3 && '3. Operational Vendor & Contract Context'}
            {step === 4 && '4. Supporting Documents & Tax Invoices'}
            {step === 5 && '5. Approvals & Departmental Allocation'}
            {step === 6 && '6. Review, Compliance Audit & Submission'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            FishGate Design Constitution v1.0 standard expense recording and audit capture.
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Stepper Bar */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
          {[
            { s: 1, label: 'Basics' },
            { s: 2, label: 'Financials' },
            { s: 3, label: 'Vendor' },
            { s: 4, label: 'Documents' },
            { s: 5, label: 'Approvals' },
            { s: 6, label: 'Review' },
          ].map((item) => (
            <div
              key={item.s}
              className={cn(
                'flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md transition-colors',
                step === item.s
                  ? 'bg-blue-600 text-white'
                  : step > item.s
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-slate-400'
              )}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] border border-current">
                {step > item.s ? '✓' : item.s}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Expense Title *</Label>
                <Input
                  placeholder="e.g., Vision City Phase 2 Backup Generator Overhaul"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Category *</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Security">Security</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Taxes">Taxes</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Property Improvements">Property Improvements</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Office Expenses">Office Expenses</option>
                    <option value="Technology">Technology</option>
                    <option value="Administration">Administration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Subcategory</Label>
                  <Input
                    placeholder="e.g. Electrical, HVAC, Landscaping"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Property *</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                  >
                    <option value="">Select Property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.city || 'Kigali'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Unit (Optional)</Label>
                  <Input
                    placeholder="e.g. Unit 302 or Common Area"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Expense Date *</Label>
                  <Input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Expense Scope & Description</Label>
                <Textarea
                  placeholder="Detailed breakdown of work completed or item purchased..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 text-xs resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* STEP 2: FINANCIALS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Amount ({currency}) *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 h-9 text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Currency</Label>
                  <Input value={currency} disabled className="mt-1 h-9 text-xs bg-slate-100 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tax Type</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value as any)}
                  >
                    <option value="vat_18">VAT 18% (RRA Standard)</option>
                    <option value="withholding_15">Withholding Tax 15%</option>
                    <option value="exempt">Tax Exempt</option>
                    <option value="none">No Tax Applied</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Calculated Tax Amount</Label>
                  <Input
                    value={`${currency} ${calculatedTax.toLocaleString()}`}
                    disabled
                    className="mt-1 h-9 text-xs bg-slate-100 font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Budget Category</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value)}
                  >
                    <option value="Operational Maintenance">Operational Maintenance</option>
                    <option value="Utilities & Facilities">Utilities & Facilities</option>
                    <option value="Security Operations">Security Operations</option>
                    <option value="Capital Improvements">Capital Improvements</option>
                    <option value="Administrative">Administrative</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Cost Center</Label>
                  <Input
                    placeholder="e.g. Kigali Hub Facilities"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Payment Status</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                  >
                    <option value="pending">Pending Settlement</option>
                    <option value="paid">Settled / Paid</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Invoice Number</Label>
                  <Input
                    placeholder="e.g. INV-2026-99"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">FishGate Reference</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono text-blue-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VENDOR */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Select Existing Vendor or Enter New</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                  <select
                    className="w-full h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={vendorId}
                    onChange={(e) => {
                      const v = vendors.find((vend) => vend.id === e.target.value);
                      if (v) {
                        setVendorId(v.id);
                        setVendorName(v.name);
                        setVendorType(v.vendor_type || 'Contractor');
                      } else {
                        setVendorId('');
                      }
                    }}
                  >
                    <option value="">-- Choose Registered Vendor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.vendor_type || 'Vendor'})
                      </option>
                    ))}
                  </select>

                  <Input
                    placeholder="Or type vendor name..."
                    value={vendorName}
                    onChange={(e) => {
                      setVendorName(e.target.value);
                      if (vendorId) setVendorId('');
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Vendor Type</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value)}
                  >
                    <option value="Contractor">Contractor / Technician</option>
                    <option value="Utility Provider">Utility Provider (WASAC / REG)</option>
                    <option value="Security Agency">Security Agency</option>
                    <option value="Cleaning Company">Cleaning Company</option>
                    <option value="Supplier">Equipment / Materials Supplier</option>
                    <option value="Professional Service">Professional / Legal</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Contract / SLA Reference</Label>
                  <Input
                    placeholder="e.g. SLA-2026-ELEVATORS"
                    value={contractReference}
                    onChange={(e) => setContractReference(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Vendor Notes & Work Orders</Label>
                <Textarea
                  placeholder="Terms agreed, technician dispatch details, contact person on site..."
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  className="mt-1 text-xs resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* STEP 4: SUPPORTING DOCUMENTS */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Attach Compliant Documentation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Document Title (e.g. RRA_EBM_Receipt.pdf)"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="sm:col-span-2 h-8 text-xs bg-white"
                  />
                  <select
                    className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white"
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as any)}
                  >
                    <option value="invoice">Invoice</option>
                    <option value="receipt">Official Receipt</option>
                    <option value="quote">Quotation</option>
                    <option value="contract">Contract</option>
                    <option value="approval_doc">Approval Doc</option>
                    <option value="photo">Photo Evidence</option>
                  </select>
                </div>
                <div className="mt-2.5 flex justify-end">
                  <Button
                    size="sm"
                    className="h-7 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                    onClick={handleAddDocument}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Attach Document
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Attached Documents ({documents.length})
                </span>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-md border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-medium text-slate-800">{doc.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold px-1.5 py-0 bg-slate-50">
                        {doc.type}
                      </Badge>
                      <span className="text-slate-400 font-mono text-[11px]">{doc.size}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-slate-400 hover:text-rose-600"
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: APPROVALS & ALLOCATION */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Approval Workflow</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={approvalWorkflow}
                    onChange={(e) => setApprovalWorkflow(e.target.value as any)}
                  >
                    <option value="single">Single Manager Approval</option>
                    <option value="threshold">Threshold-Based Approval (&gt; RWF 1M)</option>
                    <option value="multi_level">Multi-Level Executive Sign-off</option>
                    <option value="no_approval">No Approval Required (Pre-authorized)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Designated Approver</Label>
                  <Input
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Originating Department</Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Cost Allocation Rule</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={allocationRule}
                    onChange={(e) => setAllocationRule(e.target.value)}
                  >
                    <option value="100% to Selected Property">100% to Selected Property</option>
                    <option value="Split Proportionally Across Units">Split Proportionally Across Units</option>
                    <option value="Corporate Portfolio Overhead">Corporate Portfolio Overhead</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Financial Audit Notes</Label>
                <Textarea
                  placeholder="Justification for expenditure, budget authority code, emergency repair context..."
                  value={operationalNotes}
                  onChange={(e) => setOperationalNotes(e.target.value)}
                  className="mt-1 text-xs resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & SUBMIT */}
          {step === 6 && (
            <div className="space-y-4">
              {duplicateAlert && (
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <span className="font-bold block">Possible Duplicate Expense Detected</span>
                    A similar outlay of {currency} {duplicateAlert.amount.toLocaleString()} for {duplicateAlert.vendorName} ({duplicateAlert.reference}) was recorded recently on {duplicateAlert.expenseDate}. Please verify to prevent double-disbursement.
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-sm font-bold text-slate-900">{title}</span>
                  <Badge variant="outline" className="font-mono text-xs bg-white text-blue-700 font-bold">
                    {reference}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Outlay</span>
                    <span className="font-bold text-slate-900">{currency} {amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tax Applicable</span>
                    <span className="font-semibold text-slate-800">{currency} {calculatedTax.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Property</span>
                    <span className="font-semibold text-slate-800">{selectedProperty?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Category</span>
                    <span className="font-semibold text-slate-800">{category}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Vendor</span>
                    <span className="font-semibold text-slate-800">{vendorName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Status</span>
                    <span className="font-semibold uppercase text-slate-800">{paymentStatus}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Approval Mode</span>
                    <span className="font-semibold text-slate-800">{approvalWorkflow.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Documents</span>
                    <span className="font-semibold text-slate-800">{documents.length} attached</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pre-flight audit passed: Budget checks completed, required fields verified.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold gap-1"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 6 ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(true)}
                >
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit(false)}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Recording...' : 'Submit Expense'}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                onClick={handleNext}
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
