// src/components/expenses/ExpenseDetailModal.tsx
// FishGate Design Constitution v1.0 - Comprehensive Expense Detail & Management Workspace

import { useState, useMemo, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  FileText,
  DollarSign,
  Users,
  Paperclip,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  Edit,
  Trash2,
  Building2,
  AlertTriangle,
  Clock,
  Plus,
  HelpCircle,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpenseRecord, ExpenseCategory, ExpenseDocument } from './types';
import { Property } from '@/hooks/useProperties';
import { Vendor } from '@/hooks/useVendors';

interface ExpenseDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRecord | null;
  properties: Property[];
  vendors: Vendor[];
  onUpdateExpense: (updated: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onPrintVoucher: (expense: ExpenseRecord) => void;
  currency?: string;
}

export function ExpenseDetailModal({
  open,
  onOpenChange,
  expense,
  properties,
  vendors,
  onUpdateExpense,
  onDeleteExpense,
  onPrintVoucher,
  currency = 'RWF',
}: ExpenseDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'vendor' | 'documents' | 'audit'>('overview');
  const [isEditing, setIsEditing] = useState(false);

  // Editable Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('Maintenance');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editPropertyId, setEditPropertyId] = useState('');
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editTaxType, setEditTaxType] = useState<'vat_18' | 'withholding_15' | 'exempt' | 'none'>('vat_18');
  const [editDescription, setEditDescription] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'paid' | 'pending' | 'partially_paid' | 'cancelled'>('pending');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editVendorName, setEditVendorName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // New Document Attachment
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<ExpenseDocument['type']>('receipt');

  const calculatedTax = useMemo(() => {
    if (editTaxType === 'vat_18') return Math.round(editAmount * 0.18);
    if (editTaxType === 'withholding_15') return Math.round(editAmount * 0.15);
    return 0;
  }, [editAmount, editTaxType]);

  // Initialize editable state whenever expense changes
  useEffect(() => {
    if (expense) {
      setEditTitle(expense.title);
      setEditCategory(expense.category);
      setEditSubcategory(expense.subcategory || '');
      setEditPropertyId(expense.propertyId);
      setEditUnitNumber(expense.unitNumber || '');
      setEditAmount(expense.amount);
      setEditTaxType(expense.taxType);
      setEditDescription(expense.description || '');
      setEditPaymentStatus(expense.paymentStatus);
      setEditInvoiceNumber(expense.invoiceNumber || '');
      setEditVendorName(expense.vendorName);
      setEditNotes(expense.notes || '');
      setIsEditing(false);
    }
  }, [expense]);

  if (!expense) return null;

  const handleSaveChanges = () => {
    if (!editTitle.trim()) {
      toast({ title: 'Title Required', description: 'Please enter a valid title.', variant: 'destructive' });
      return;
    }
    if (editAmount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Amount must be greater than zero.', variant: 'destructive' });
      return;
    }

    const prop = properties.find((p) => p.id === editPropertyId);

    const updatedRecord: ExpenseRecord = {
      ...expense,
      title: editTitle.trim(),
      category: editCategory,
      subcategory: editSubcategory.trim() || undefined,
      propertyId: editPropertyId || expense.propertyId,
      propertyName: prop ? prop.name : expense.propertyName,
      unitNumber: editUnitNumber.trim() || null,
      amount: editAmount,
      taxAmount: calculatedTax,
      taxType: editTaxType,
      description: editDescription.trim(),
      paymentStatus: editPaymentStatus,
      invoiceNumber: editInvoiceNumber.trim() || undefined,
      vendorName: editVendorName.trim() || expense.vendorName,
      notes: editNotes.trim() || undefined,
    };

    onUpdateExpense(updatedRecord);
    setIsEditing(false);
    toast({
      title: 'Expense Updated',
      description: `Changes to ${expense.reference} have been saved successfully.`,
    });
  };

  const handleMarkAsPaid = () => {
    const updated: ExpenseRecord = {
      ...expense,
      paymentStatus: 'paid',
      hasReceipt: true,
    };
    onUpdateExpense(updated);
    toast({
      title: 'Disbursement Recorded',
      description: `${expense.reference} marked as settled and cleared.`,
    });
  };

  const handleApprove = () => {
    const updated: ExpenseRecord = {
      ...expense,
      approvalStatus: 'approved',
    };
    onUpdateExpense(updated);
    toast({
      title: 'Expense Authorized',
      description: `Approval sign-off granted for ${expense.reference}.`,
    });
  };

  const handleReject = () => {
    const updated: ExpenseRecord = {
      ...expense,
      approvalStatus: 'rejected',
    };
    onUpdateExpense(updated);
    toast({
      title: 'Expense Rejected',
      description: `${expense.reference} has been marked as rejected.`,
      variant: 'destructive',
    });
  };

  const handleAddDocument = () => {
    if (!newDocName.trim()) {
      toast({ title: 'Document Title Required', description: 'Enter a file name or description.', variant: 'destructive' });
      return;
    }

    const newDoc: ExpenseDocument = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      type: newDocType,
      size: '1.1 MB',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };

    const updated: ExpenseRecord = {
      ...expense,
      hasReceipt: true,
      documents: [...(expense.documents || []), newDoc],
    };

    onUpdateExpense(updated);
    setNewDocName('');
    toast({
      title: 'Document Attached',
      description: `${newDoc.name} uploaded to compliance repository.`,
    });
  };

  const handleRemoveDocument = (docId: string) => {
    const remaining = (expense.documents || []).filter((d) => d.id !== docId);
    const updated: ExpenseRecord = {
      ...expense,
      hasReceipt: remaining.some((d) => d.type === 'receipt' || d.type === 'invoice'),
      documents: remaining,
    };
    onUpdateExpense(updated);
    toast({ title: 'Document Removed' });
  };

  const isPending = expense.paymentStatus === 'pending';
  const isAwaitingApproval = expense.approvalStatus === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {expense.reference}
                </span>
                <Badge variant="outline" className="text-[10px] font-bold uppercase bg-white">
                  {expense.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-bold uppercase',
                    expense.paymentStatus === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {expense.paymentStatus}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-bold uppercase',
                    expense.approvalStatus === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : expense.approvalStatus === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  )}
                >
                  {expense.approvalStatus}
                </Badge>
              </div>

              <DialogTitle className="text-lg font-bold text-slate-900 mt-2">
                {expense.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {expense.propertyName} {expense.unitNumber ? `• Unit ${expense.unitNumber}` : ''} • Recorded on{' '}
                {format(new Date(expense.expenseDate), 'MMMM d, yyyy')}
              </DialogDescription>
            </div>

            {/* Header Action Tools */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 text-slate-700 bg-white shadow-2xs"
                onClick={() => onPrintVoucher(expense)}
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                Voucher PDF
              </Button>
              <Button
                variant={isEditing ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 text-slate-700 bg-white shadow-2xs"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-3.5 h-3.5 text-blue-600" />
                {isEditing ? 'Cancel Edit' : 'Edit'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 4 Core Financial Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 pb-3 border-b border-slate-100 bg-slate-50/30">
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Outlay
            </span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">
              {currency} {expense.amount.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tax Amount ({expense.taxType.replace('_', ' ').toUpperCase()})
            </span>
            <span className="text-base font-bold text-slate-700 mt-0.5 block">
              {currency} {expense.taxAmount.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Cost Center
            </span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
              {expense.costCenter || 'Property Operations'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Vendor Partner
            </span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
              {expense.vendorName}
            </span>
          </div>
        </div>

        {/* Modal Content Tabs / Edit Mode */}
        <div className="p-6">
          {isEditing ? (
            /* =========================================================================
               EDIT MODE
               ========================================================================= */
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 font-semibold flex items-center justify-between">
                <span>Editing Expense Entry: Modify financial, property, or vendor fields.</span>
                <Badge variant="outline" className="bg-white text-blue-700 font-mono text-[10px]">
                  {expense.reference}
                </Badge>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Expense Title *</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Category</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                  >
                    <option value="Maintenance">Maintenance</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Security">Security</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Taxes">Taxes</option>
                    <option value="Property Improvements">Property Improvements</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Office Expenses">Office Expenses</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Subcategory</Label>
                  <Input
                    value={editSubcategory}
                    onChange={(e) => setEditSubcategory(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Property</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={editPropertyId}
                    onChange={(e) => setEditPropertyId(e.target.value)}
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Unit (Optional)</Label>
                  <Input
                    value={editUnitNumber}
                    onChange={(e) => setEditUnitNumber(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Amount ({currency}) *</Label>
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="mt-1 h-9 text-xs font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Tax Type</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={editTaxType}
                    onChange={(e) => setEditTaxType(e.target.value as any)}
                  >
                    <option value="vat_18">VAT 18%</option>
                    <option value="withholding_15">Withholding 15%</option>
                    <option value="exempt">Tax Exempt</option>
                    <option value="none">No Tax</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Payment Status</Label>
                  <select
                    className="w-full mt-1 h-9 text-xs border border-slate-200 rounded-md px-3 bg-white"
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Vendor Name</Label>
                  <Input
                    value={editVendorName}
                    onChange={(e) => setEditVendorName(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Invoice Number</Label>
                  <Input
                    value={editInvoiceNumber}
                    onChange={(e) => setEditInvoiceNumber(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Scope & Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 text-xs resize-none"
                  rows={3}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            /* =========================================================================
               VIEW MODE TABS
               ========================================================================= */
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
              <TabsList className="bg-slate-100 p-1 h-9 rounded-lg mb-4">
                <TabsTrigger value="overview" className="text-xs font-bold gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Overview & Financials
                </TabsTrigger>
                <TabsTrigger value="vendor" className="text-xs font-bold gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Vendor & SLA
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs font-bold gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                  Documents & Receipts ({expense.documents?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="audit" className="text-xs font-bold gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                  Approval & Audit
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: OVERVIEW & FINANCIALS */}
              <TabsContent value="overview" className="space-y-4 m-0">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Expenditure Specification
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {expense.description || 'No detailed scope description provided.'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Budget Category</span>
                      <span className="font-semibold text-slate-800">{expense.budgetCategory}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Subcategory</span>
                      <span className="font-semibold text-slate-800">{expense.subcategory || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Invoice Number</span>
                      <span className="font-semibold font-mono text-slate-800">
                        {expense.invoiceNumber || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Settlement Action if Pending */}
                {isPending && (
                  <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="text-xs text-amber-900">
                        <span className="font-bold block">Payment Pending Settlement</span>
                        <span>This expense is approved and awaiting financial disbursement.</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={handleMarkAsPaid}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark as Settled
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: VENDOR & SLA */}
              <TabsContent value="vendor" className="space-y-4 m-0">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{expense.vendorName}</h4>
                      <span className="text-xs text-slate-500 font-medium">{expense.vendorType || 'Contractor'}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold bg-white text-emerald-700">
                      Active Partner
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact Person</span>
                      <span className="font-semibold text-slate-800">Operational Dispatch</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Primary Service</span>
                      <span className="font-semibold text-slate-800">{expense.category} Facility Services</span>
                    </div>
                  </div>

                  {expense.notes && (
                    <div className="pt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-400 block text-[11px]">Operational Notes</span>
                      <p className="text-slate-700 mt-0.5">{expense.notes}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: DOCUMENTS & RECEIPTS */}
              <TabsContent value="documents" className="space-y-4 m-0">
                {/* Upload Form */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Attach Compliant Document
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="e.g. Official_EBM_Receipt.pdf"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="sm:col-span-2 h-8 text-xs bg-white"
                    />
                    <select
                      className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white"
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value as any)}
                    >
                      <option value="receipt">Official Receipt</option>
                      <option value="invoice">Invoice</option>
                      <option value="quote">Quotation</option>
                      <option value="approval_doc">Approval Doc</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                  <div className="mt-2.5 flex justify-end">
                    <Button
                      size="sm"
                      className="h-7 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                      onClick={handleAddDocument}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Attach File
                    </Button>
                  </div>
                </div>

                {/* Attached Files List */}
                <div className="space-y-2">
                  {(!expense.documents || expense.documents.length === 0) ? (
                    <div className="p-6 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      <Paperclip className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      No receipts or invoices attached to this expense yet.
                    </div>
                  ) : (
                    expense.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{doc.name}</span>
                            <span className="text-[11px] text-slate-400">
                              {doc.type.toUpperCase()} • {doc.size} • {doc.uploadedAt}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-semibold gap-1 text-slate-700"
                            onClick={() => {
                              toast({
                                title: 'Document Downloaded',
                                description: `Downloaded ${doc.name} for financial audit.`,
                              });
                            }}
                          >
                            <Download className="w-3 h-3 text-blue-600" />
                            Download
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            onClick={() => handleRemoveDocument(doc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: GOVERNANCE & AUDIT TRAIL */}
              <TabsContent value="audit" className="space-y-4 m-0">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Authorization & Compliance Record
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Workflow Policy</span>
                      <span className="font-semibold text-slate-800 uppercase">
                        {expense.approvalWorkflow.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Designated Approver</span>
                      <span className="font-semibold text-slate-800">
                        {expense.approverName || 'Financial Controller'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Submitted By</span>
                      <span className="font-semibold text-slate-800">{expense.submittedBy}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Department</span>
                      <span className="font-semibold text-slate-800">{expense.department}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Approval Actions if Pending */}
                {isAwaitingApproval && (
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">
                        Authorization Action Required
                      </span>
                      <span className="text-xs text-amber-800">
                        You have permission to review and sign off on this operational expenditure.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50"
                        onClick={handleReject}
                      >
                        Reject Outlay
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={handleApprove}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Grant Approval
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1"
            onClick={() => {
              if (confirm(`Are you sure you want to void and delete ${expense.reference}?`)) {
                onDeleteExpense(expense.id);
                onOpenChange(false);
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Entry
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs font-semibold text-slate-700"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
