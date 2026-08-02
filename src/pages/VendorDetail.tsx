import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Ban, CheckCircle2, ExternalLink, FileText, Mail, MapPin, Pencil, Phone, Plus, Trash2, Wrench } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DocumentUploader } from '@/components/marketplace-crm/DocumentUploader';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSettings } from '@/contexts/useSettings';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import {
  useCreateVendorDocument,
  useDeleteVendorDocument,
  useUpdateVendor,
  useVendor,
  useVendorDocuments,
  useVendorWorkOrders,
  type VendorDocument,
  type VendorInput,
} from '@/hooks/useVendors';
import { summarizeVendorPayments, useCreateVendorPayment, useUpdateVendorPayment, useVendorPayments, type VendorPayment } from '@/hooks/useVendorPayments';

const emptyVendorForm: VendorInput = {
  name: '', vendor_type: '', contact_name: '', phone: '', email: '', address: '', status: 'active', notes: '', rating: null,
};

const emptyPaymentForm = {
  amount: '', maintenance_request_id: '', status: 'pending' as VendorPayment['status'], payment_method: '', reference_number: '', notes: '',
};

const paymentMethods = ['Bank transfer', 'Cash', 'Cheque', 'Credit card', 'Debit card', 'Mobile money', 'Direct debit', 'Online payment'];

function DocumentRow({ document, onDelete }: { document: VendorDocument; onDelete: () => void }) {
  const { signedUrl } = useSignedUrl('vendor-documents', document.storage_path);
  const expired = document.expiry_date && new Date(`${document.expiry_date}T23:59:59`) < new Date();
  return (
    <div className="flex flex-col gap-3 border-b py-3 last:border-0 sm:flex-row sm:items-center">
      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="font-medium capitalize">{document.document_type}</p>
        <p className="truncate text-xs text-muted-foreground">{document.storage_path.split('/').pop()}</p>
      </div>
      <div className="flex items-center gap-2">
        {document.expiry_date && <Badge variant={expired ? 'destructive' : 'outline'}>Expires {format(new Date(`${document.expiry_date}T00:00:00`), 'MMM d, yyyy')}</Badge>}
        {signedUrl && <Button asChild size="icon" variant="ghost"><a href={signedUrl} target="_blank" rel="noreferrer" title="Open document"><ExternalLink className="h-4 w-4" /></a></Button>}
        <Button size="icon" variant="ghost" onClick={onDelete} title="Delete document"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    </div>
  );
}

export default function VendorDetail() {
  const { id = '' } = useParams();
  const { activeCompanyId } = useActiveCompany();
  const { settings, formatCurrency } = useSettings();
  const { data: vendor, isLoading, error } = useVendor(id);
  const { data: documents = [] } = useVendorDocuments(id);
  const { data: workOrders = [] } = useVendorWorkOrders(id);
  const { data: payments = [] } = useVendorPayments(id);
  const updateVendor = useUpdateVendor();
  const createDocument = useCreateVendorDocument(id);
  const deleteDocument = useDeleteVendorDocument(id);
  const createPayment = useCreateVendorPayment();
  const updatePayment = useUpdateVendorPayment();
  const confirmAction = useConfirmAction();
  const [editOpen, setEditOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState<VendorInput>(emptyVendorForm);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<VendorPayment | null>(null);
  const [documentForm, setDocumentForm] = useState({ document_type: 'insurance' as VendorDocument['document_type'], storage_path: '', mime_type: '', expiry_date: '' });
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const totals = summarizeVendorPayments(payments);
  const ratingInvalid = vendorForm.rating != null && (vendorForm.rating < 0 || vendorForm.rating > 5);

  if (isLoading) return <Card><CardContent className="py-12 text-center text-muted-foreground">Loading vendor...</CardContent></Card>;
  if (error || !vendor) return <Card className="border-destructive/40"><CardContent className="py-12 text-center text-destructive">{error?.message ?? 'Vendor not found'}</CardContent></Card>;

  const addDocument = async () => {
    if (!documentForm.storage_path) return;
    await createDocument.mutateAsync({ ...documentForm, expiry_date: documentForm.expiry_date || null });
    setDocumentForm({ document_type: 'insurance', storage_path: '', mime_type: '', expiry_date: '' });
    setDocumentOpen(false);
  };

  const savePayment = async () => {
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) return;
    const input = {
      vendor_id: id,
      maintenance_request_id: paymentForm.maintenance_request_id || null,
      amount,
      currency: settings.currencyCode,
      status: paymentForm.status,
      payment_method: paymentForm.payment_method || null,
      reference_number: paymentForm.reference_number || null,
      paid_at: paymentForm.status === 'paid' ? editingPayment?.paid_at ?? new Date().toISOString() : null,
      notes: paymentForm.notes || null,
    };
    if (editingPayment) await updatePayment.mutateAsync({ id: editingPayment.id, ...input });
    else await createPayment.mutateAsync(input);
    setPaymentForm(emptyPaymentForm);
    setEditingPayment(null);
    setPaymentOpen(false);
  };

  const openNewPayment = () => {
    setEditingPayment(null);
    setPaymentForm(emptyPaymentForm);
    setPaymentOpen(true);
  };

  const openPaymentEditor = (payment: VendorPayment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: String(payment.amount),
      maintenance_request_id: payment.maintenance_request_id ?? '',
      status: payment.status,
      payment_method: payment.payment_method ?? '',
      reference_number: payment.reference_number ?? '',
      notes: payment.notes ?? '',
    });
    setPaymentOpen(true);
  };

  const selectWorkOrder = (value: string) => {
    const maintenanceRequestId = value === 'none' ? '' : value;
    const workOrder = workOrders.find((order) => order.id === maintenanceRequestId);
    const suggestedAmount = workOrder?.actual_cost ?? workOrder?.estimated_cost;
    setPaymentForm((current) => ({
      ...current,
      maintenance_request_id: maintenanceRequestId,
      amount: suggestedAmount != null ? String(suggestedAmount) : current.amount,
    }));
  };

  const openVendorEditor = () => {
    setVendorForm({
      name: vendor.name,
      vendor_type: vendor.vendor_type ?? '',
      contact_name: vendor.contact_name ?? '',
      phone: vendor.phone ?? '',
      email: vendor.email ?? '',
      address: vendor.address ?? '',
      status: vendor.status,
      notes: vendor.notes ?? '',
      rating: vendor.rating,
    });
    setEditOpen(true);
  };

  const saveVendor = async () => {
    if (!vendorForm.name.trim() || ratingInvalid) return;
    await updateVendor.mutateAsync({ id, ...vendorForm, name: vendorForm.name.trim() });
    setEditOpen(false);
  };

  const removeDocument = async (document: VendorDocument) => {
    const confirmed = await confirmAction({
      title: 'Delete vendor document?',
      description: 'This permanently removes the private file and its compliance record.',
      confirmLabel: 'Delete document',
      destructive: true,
    });
    if (confirmed) await deleteDocument.mutateAsync(document);
  };

  const changePaymentStatus = async (paymentId: string, status: 'paid' | 'cancelled') => {
    const confirmed = await confirmAction({
      title: status === 'paid' ? 'Mark payment as paid?' : 'Cancel this payment?',
      description: status === 'paid'
        ? 'The payment will be included in the vendor paid total.'
        : 'The payment will be removed from the pending total.',
      confirmLabel: status === 'paid' ? 'Mark paid' : 'Cancel payment',
      destructive: status === 'cancelled',
    });
    if (!confirmed) return;
    await updatePayment.mutateAsync({ id: paymentId, status, paid_at: status === 'paid' ? new Date().toISOString() : null });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button asChild variant="ghost" className="mb-3 -ml-3"><Link to="/vendors"><ArrowLeft className="mr-2 h-4 w-4" /> Vendors</Link></Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h1 className="text-2xl font-bold sm:text-3xl">{vendor.name}</h1><p className="mt-1 text-muted-foreground">{vendor.vendor_type || 'General contractor'}{vendor.contact_name ? ` · ${vendor.contact_name}` : ''}</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openVendorEditor}><Pencil className="mr-2 h-4 w-4" /> Edit vendor</Button>
            <Select value={vendor.status} onValueChange={(status) => updateVendor.mutate({ id, status: status as typeof vendor.status })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Contact</p><p className="mt-1 font-medium">{vendor.contact_name || 'Not provided'}</p></div>
          <div><p className="text-xs text-muted-foreground">Phone</p>{vendor.phone ? <a className="mt-1 flex items-center gap-2 font-medium hover:underline" href={`tel:${vendor.phone}`}><Phone className="h-3.5 w-3.5" />{vendor.phone}</a> : <p className="mt-1">Not provided</p>}</div>
          <div><p className="text-xs text-muted-foreground">Email</p>{vendor.email ? <a className="mt-1 flex items-center gap-2 truncate font-medium hover:underline" href={`mailto:${vendor.email}`}><Mail className="h-3.5 w-3.5" />{vendor.email}</a> : <p className="mt-1">Not provided</p>}</div>
          <div><p className="text-xs text-muted-foreground">Address</p><p className="mt-1 flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{vendor.address || 'Not provided'}</p></div>
          {vendor.notes && <div className="sm:col-span-2 xl:col-span-4"><p className="text-xs text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap">{vendor.notes}</p></div>}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Assigned work</p><p className="mt-1 text-2xl font-bold">{workOrders.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Paid</p><p className="mt-1 text-2xl font-bold text-success">{formatCurrency(totals.paid)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pending</p><p className="mt-1 text-2xl font-bold text-warning">{formatCurrency(totals.pending)}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Compliance documents</CardTitle><p className="mt-1 text-sm text-muted-foreground">Private insurance, licenses, certifications, and contracts. Expiry dates generate operational alerts.</p></div><Button size="sm" onClick={() => setDocumentOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add</Button></CardHeader>
          <CardContent>{documents.length ? documents.map((document) => <DocumentRow key={document.id} document={document} onDelete={() => void removeDocument(document)} />) : <p className="py-8 text-center text-sm text-muted-foreground">No compliance documents yet. Add one when you receive the vendor's supporting file.</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Payment ledger</CardTitle><Button size="sm" onClick={openNewPayment}><Plus className="mr-2 h-4 w-4" /> Record</Button></CardHeader>
          <CardContent className="space-y-1">{payments.length ? payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
              <div><p className="font-medium">{formatCurrency(payment.amount)}</p><p className="text-xs text-muted-foreground">{payment.reference_number || payment.payment_method || 'No reference'} · {format(new Date(payment.created_at), 'MMM d, yyyy')}</p></div>
              <div className="flex items-center gap-1">
                <Badge variant={payment.status === 'paid' ? 'secondary' : payment.status === 'cancelled' ? 'outline' : 'default'}>{payment.status}</Badge>
                <Button size="icon" variant="ghost" title="Edit payment" onClick={() => openPaymentEditor(payment)}><Pencil className="h-4 w-4" /></Button>
                {payment.status === 'pending' && <>
                  <Button size="icon" variant="ghost" title="Mark paid" onClick={() => void changePaymentStatus(payment.id, 'paid')}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                  <Button size="icon" variant="ghost" title="Cancel payment" onClick={() => void changePaymentStatus(payment.id, 'cancelled')}><Ban className="h-4 w-4 text-destructive" /></Button>
                </>}
              </div>
            </div>
          )) : <p className="py-8 text-center text-sm text-muted-foreground">No payments recorded.</p>}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Assigned maintenance</CardTitle></CardHeader>
        <CardContent className="divide-y">{workOrders.length ? workOrders.map((order) => (
          <div key={order.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{order.title}</p><p className="text-xs text-muted-foreground capitalize">{order.priority} priority · {format(new Date(order.created_at), 'MMM d, yyyy')}</p></div><div className="flex items-center gap-3"><span className="text-sm">{order.actual_cost != null ? formatCurrency(order.actual_cost) : order.estimated_cost != null ? `${formatCurrency(order.estimated_cost)} est.` : 'No cost'}</span><Badge variant="outline">{order.status.replace('_', ' ')}</Badge></div></div>
        )) : <p className="py-8 text-center text-sm text-muted-foreground">No maintenance requests assigned.</p>}</CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Edit vendor</DialogTitle><DialogDescription>Update contractor details, service rating, and internal notes.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="edit-vendor-name">Vendor name *</Label><Input id="edit-vendor-name" value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-vendor-type">Service type</Label><Input id="edit-vendor-type" value={vendorForm.vendor_type ?? ''} onChange={(event) => setVendorForm({ ...vendorForm, vendor_type: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-vendor-contact">Contact name</Label><Input id="edit-vendor-contact" value={vendorForm.contact_name ?? ''} onChange={(event) => setVendorForm({ ...vendorForm, contact_name: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-vendor-email">Email</Label><Input id="edit-vendor-email" type="email" value={vendorForm.email ?? ''} onChange={(event) => setVendorForm({ ...vendorForm, email: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-vendor-phone">Phone</Label><Input id="edit-vendor-phone" value={vendorForm.phone ?? ''} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-vendor-address">Address</Label><Input id="edit-vendor-address" value={vendorForm.address ?? ''} onChange={(event) => setVendorForm({ ...vendorForm, address: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-vendor-rating">Rating (0-5)</Label><Input id="edit-vendor-rating" type="number" min="0" max="5" step="0.5" value={vendorForm.rating ?? ''} aria-invalid={ratingInvalid} onChange={(event) => setVendorForm({ ...vendorForm, rating: event.target.value ? Number(event.target.value) : null })} />{ratingInvalid && <p className="text-xs text-destructive">Enter a rating between 0 and 5.</p>}</div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="edit-vendor-notes">Notes</Label><Textarea id="edit-vendor-notes" value={vendorForm.notes ?? ''} onChange={(event) => setVendorForm({ ...vendorForm, notes: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={() => void saveVendor()} disabled={!vendorForm.name.trim() || ratingInvalid || updateVendor.isPending}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}><DialogContent><DialogHeader><DialogTitle>Add compliance document</DialogTitle><DialogDescription>Upload a private PDF or image. Add an expiry date for insurance, licenses, or certifications so the Alerts Center can warn you before renewal is due.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label>Document type</Label><Select value={documentForm.document_type} onValueChange={(value) => setDocumentForm({ ...documentForm, document_type: value as VendorDocument['document_type'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['insurance', 'license', 'certification', 'contract', 'other'].map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="document-expiry">Expiry date</Label><Input id="document-expiry" type="date" value={documentForm.expiry_date} onChange={(event) => setDocumentForm({ ...documentForm, expiry_date: event.target.value })} /><p className="text-xs text-muted-foreground">Optional for contracts or records that do not expire.</p></div><DocumentUploader bucket="vendor-documents" pathPrefix={`${activeCompanyId}/${id}`} acceptedMimeTypes={['application/pdf', 'image/jpeg', 'image/png']} maxFileSizeBytes={10 * 1024 * 1024} onUploaded={(storage_path, mime_type) => setDocumentForm((current) => ({ ...current, storage_path, mime_type }))} /></div><DialogFooter><Button variant="outline" onClick={() => setDocumentOpen(false)}>Cancel</Button><Button onClick={() => void addDocument()} disabled={!documentForm.storage_path || createDocument.isPending}>Add document</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={paymentOpen} onOpenChange={(open) => { setPaymentOpen(open); if (!open) setEditingPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit vendor payment' : 'Record vendor payment'}</DialogTitle>
            <DialogDescription>Selecting a work order suggests its actual cost, or its estimate when no actual cost exists. You can edit the amount before saving.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Work order</Label>
              <Select value={paymentForm.maintenance_request_id || 'none'} onValueChange={selectWorkOrder}>
                <SelectTrigger><SelectValue placeholder="Optional work order" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No work order</SelectItem>{workOrders.map((order) => <SelectItem key={order.id} value={order.id}>{order.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="payment-amount">Amount ({settings.currencyCode}) *</Label><Input id="payment-amount" type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={paymentForm.status} onValueChange={(value) => setPaymentForm({ ...paymentForm, status: value as VendorPayment['status'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="payment-method">Payment method</Label><Input id="payment-method" list="vendor-payment-methods" value={paymentForm.payment_method} placeholder="Select or enter a method" onChange={(event) => setPaymentForm({ ...paymentForm, payment_method: event.target.value })} /><datalist id="vendor-payment-methods">{paymentMethods.map((method) => <option key={method} value={method} />)}</datalist></div>
            <div className="space-y-2"><Label htmlFor="payment-reference">Reference</Label><Input id="payment-reference" value={paymentForm.reference_number} onChange={(event) => setPaymentForm({ ...paymentForm, reference_number: event.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="payment-notes">Notes</Label><Textarea id="payment-notes" value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button><Button onClick={() => void savePayment()} disabled={!Number(paymentForm.amount) || createPayment.isPending || updatePayment.isPending}>{editingPayment ? 'Update payment' : 'Record payment'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}