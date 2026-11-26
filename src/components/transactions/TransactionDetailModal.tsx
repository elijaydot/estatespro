// src/components/transactions/TransactionDetailModal.tsx
// FishGate Design Constitution v1.0 - Section 5: Transaction Detail & Audit Workspace

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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  FileText,
  DollarSign,
  Building2,
  Users,
  Building,
  ShieldCheck,
  Clock,
  Printer,
  Download,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Eye,
  FileCheck,
  Calendar,
  Lock,
} from 'lucide-react';
import { TransactionRecord, TransactionDocument } from './types';

interface TransactionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionRecord | null;
  currency?: string;
  onToggleReconciled: (transactionId: string) => void;
  onPrintVoucher: (transaction: TransactionRecord) => void;
  onAddDocument: (transactionId: string, doc: TransactionDocument) => void;
}

export function TransactionDetailModal({
  open,
  onOpenChange,
  transaction,
  currency = 'RWF',
  onToggleReconciled,
  onPrintVoucher,
  onAddDocument,
}: TransactionDetailModalProps) {
  // All hooks declared unconditionally at the very top
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'documents' | 'audit'>('overview');
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState<TransactionDocument['type']>('receipt');

  if (!transaction) return null;

  const handleAttachDocument = () => {
    if (!newDocName.trim()) {
      toast({ title: 'Document Name Required', description: 'Please enter a name for the document.', variant: 'destructive' });
      return;
    }

    const doc: TransactionDocument = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      type: newDocType,
      size: '1.2 MB',
      uploadedAt: new Date().toISOString().slice(0, 10),
    };

    onAddDocument(transaction.id, doc);
    setNewDocName('');
    toast({ title: 'Document Attached', description: `${doc.name} has been linked to ${transaction.reference}.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 bg-blue-50/60 border-blue-200">
                  {transaction.reference}
                </Badge>
                <Badge variant="secondary" className="capitalize text-[10px]">
                  {transaction.type}
                </Badge>
                <Badge
                  className={`text-[10px] capitalize font-semibold ${
                    transaction.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {transaction.status}
                </Badge>
                {transaction.reconciled && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                    <ShieldCheck className="w-3 h-3" /> Reconciled
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                {transaction.description}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Recorded {format(new Date(transaction.date), 'MMMM d, yyyy')} • Created by {transaction.createdBy}
              </DialogDescription>
            </div>

            {/* Total Amount Badge */}
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Transaction Volume
              </span>
              <div
                className={`text-2xl font-bold font-mono tracking-tight flex items-center sm:justify-end gap-1 ${
                  transaction.direction === 'in'
                    ? 'text-emerald-700'
                    : transaction.direction === 'out'
                    ? 'text-slate-900'
                    : 'text-blue-700'
                }`}
              >
                {transaction.direction === 'in' ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-slate-500" />
                )}
                {currency} {transaction.amount.toLocaleString()}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Workspace Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-2">
          <TabsList className="grid grid-cols-4 bg-slate-100 p-1">
            <TabsTrigger value="overview" className="text-xs font-semibold">
              Overview & Financials
            </TabsTrigger>
            <TabsTrigger value="entities" className="text-xs font-semibold">
              Associated Entities
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs font-semibold">
              Evidence & Files ({transaction.documents.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs font-semibold">
              Audit Trail ({transaction.auditTrail.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & FINANCIALS */}
          <TabsContent value="overview" className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Amount</span>
                <span className="text-sm font-bold text-slate-900">
                  {currency} {transaction.amount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Service / Processing Fee</span>
                <span className="text-sm font-bold text-slate-900">
                  {currency} {(transaction.feeAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Realized</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {currency} {(transaction.netAmount || transaction.amount - (transaction.feeAmount || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border border-slate-200 rounded-lg p-3.5 bg-white">
              <div>
                <span className="text-slate-400 block text-[10px]">Payment Source</span>
                <span className="font-semibold text-slate-900 capitalize">{transaction.source.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Source Reference</span>
                <span className="font-mono font-semibold text-slate-900">{transaction.sourceReference || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Direction</span>
                <span className="font-semibold text-slate-900 uppercase tracking-wider">{transaction.direction}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Transaction Date</span>
                <span className="font-medium text-slate-900">{format(new Date(transaction.date), 'yyyy-MM-dd HH:mm')}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Reconciliation</span>
                <span className="font-semibold text-slate-900">
                  {transaction.reconciled ? `Reconciled by ${transaction.reconciledBy || 'Finance'}` : 'Unreconciled'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Internal Invoice / Receipt</span>
                <span className="font-mono font-semibold text-blue-700">
                  {transaction.receiptNumber || transaction.invoiceNumber || 'Direct Ledger'}
                </span>
              </div>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700">
                <span className="font-semibold text-slate-900 block mb-1">Operational & Audit Notes</span>
                {transaction.notes}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: ASSOCIATED ENTITIES */}
          <TabsContent value="entities" className="space-y-3 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Property & Space */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Property & Premises</span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <div><strong className="text-slate-900">Name:</strong> {transaction.propertyName || 'Corporate Account'}</div>
                  {transaction.unitNumber && <div><strong className="text-slate-900">Unit:</strong> Space #{transaction.unitNumber}</div>}
                  {transaction.leaseNumber && <div><strong className="text-slate-900">Lease Ref:</strong> {transaction.leaseNumber}</div>}
                </div>
              </div>

              {/* Counterparty (Resident / Vendor) */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  {transaction.tenantName ? (
                    <>
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Resident / Tenant</span>
                    </>
                  ) : (
                    <>
                      <Building className="w-4 h-4 text-purple-600" />
                      <span>Contractor / Vendor</span>
                    </>
                  )}
                </div>
                <div className="space-y-1 text-slate-600">
                  {transaction.tenantName && (
                    <>
                      <div><strong className="text-slate-900">Resident:</strong> {transaction.tenantName}</div>
                      {transaction.tenantEmail && <div><strong className="text-slate-900">Email:</strong> {transaction.tenantEmail}</div>}
                    </>
                  )}
                  {transaction.vendorName && (
                    <>
                      <div><strong className="text-slate-900">Vendor:</strong> {transaction.vendorName}</div>
                      <div><strong className="text-slate-900">Category:</strong> {transaction.vendorCategory || 'Contractor'}</div>
                    </>
                  )}
                  {!transaction.tenantName && !transaction.vendorName && (
                    <div className="text-slate-400 italic">Inter-account internal treasury transfer</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: SUPPORTING DOCUMENTS & EVIDENCE */}
          <TabsContent value="documents" className="space-y-3 pt-3">
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {transaction.documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No supporting documents attached yet.
                </div>
              ) : (
                transaction.documents.map((doc) => (
                  <div key={doc.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <div>
                        <span className="font-semibold text-slate-900 block">{doc.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{doc.type} • {doc.size} • Uploaded {doc.uploadedAt}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-blue-600 hover:text-blue-700 gap-1"
                      onClick={() => toast({ title: 'Viewing Document', description: `Opening ${doc.name} securely.` })}
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Upload Dialog Box */}
            <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Attach Supporting Evidence</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Document label / receipt ref..."
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as any)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
                >
                  <option value="receipt">Payment Receipt</option>
                  <option value="invoice">Tax Invoice</option>
                  <option value="statement">Bank Statement Feed</option>
                  <option value="proof_of_payment">Bank Proof of Payment</option>
                  <option value="contract">Addendum / Contract</option>
                </select>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleAttachDocument}>
                  <Plus className="w-3.5 h-3.5" /> Attach File
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: AUDIT TRAIL */}
          <TabsContent value="audit" className="space-y-3 pt-3">
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
              {transaction.auditTrail.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-xs border-b border-slate-100 last:border-none pb-2.5 last:pb-0">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{entry.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{entry.details}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Actor: {entry.actor}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Footer Actions */}
        <DialogFooter className="border-t border-slate-100 pt-3 flex flex-row items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={() => onPrintVoucher(transaction)}
            >
              <Printer className="w-3.5 h-3.5" /> Print Official Voucher
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium gap-1.5 text-slate-700"
              onClick={() => onToggleReconciled(transaction.id)}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {transaction.reconciled ? 'Unreconcile' : 'Mark Reconciled'}
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
