import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Receipt,
  Phone,
  CreditCard,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Send,
  Sparkles,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';
import { useSettings } from '@/contexts/SettingsContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePayments, useCreatePayment } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { useTenants } from '@/hooks/useTenants';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useStepUpGuard } from '@/hooks/useStepUpGuard';
import { logSecurityEvent } from '@/lib/security';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle className="h-3 w-3" /> Completed
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    case 'refunded':
      return (
        <Badge className="bg-info/10 text-info border-info/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Refunded
        </Badge>
      );
    default:
      return null;
  }
};

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'mtn_momo':
      return <Phone className="h-4 w-4 text-warning" />;
    case 'bank_transfer':
      return <Building2 className="h-4 w-4 text-info" />;
    case 'card':
      return <CreditCard className="h-4 w-4 text-primary" />;
    case 'cash':
      return <DollarSign className="h-4 w-4 text-success" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

const getMethodLabel = (method: string) => {
  switch (method) {
    case 'mtn_momo':
      return 'MTN MoMo';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'card':
      return 'Card';
    case 'cash':
      return 'Cash';
    default:
      return 'Other';
  }
};

const paymentMethodOptions = [
  { value: 'mtn_momo', label: 'MTN Mobile Money', description: 'MoMo payment' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'Direct bank transfer' },
  { value: 'card', label: 'Card Payment', description: 'Credit/Debit card' },
  { value: 'cash', label: 'Cash', description: 'Cash payment' },
  { value: 'other', label: 'Other', description: 'Other payment method' },
];

export default function Payments() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [checkoutGateway, setCheckoutGateway] = useState<'paystack' | 'flutterwave'>('paystack');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: '',
    invoice_id: '',
    amount: 0,
    method: 'mtn_momo',
    momo_phone: '',
    momo_transaction_id: '',
    reference: '',
    notes: '',
  });

  const { data: payments = [], isLoading } = usePayments();
  const { data: invoices = [] } = useInvoices();
  const { data: tenants = [] } = useTenants();
  const createPayment = useCreatePayment();
  const { ensureAal2 } = useStepUpGuard();

  const tenantOptions = tenants.map((tenant: any) => ({
    value: tenant.id,
    label: tenant.name,
    description: tenant.email,
  }));

  const invoiceOptions = invoices
    .filter((inv: any) => !formData.tenant_id || inv.tenant_id === formData.tenant_id)
    .filter((inv: any) => inv.status !== 'paid' && inv.status !== 'cancelled')
    .map((inv: any) => ({
      value: inv.id,
      label: inv.invoice_number,
      description: `${formatCurrency(inv.amount - inv.paid_amount)} due`,
    }));

  const stats = {
    totalReceived: payments.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + p.amount, 0),
    pendingAmount: payments.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + p.amount, 0),
    failedCount: payments.filter((p: any) => p.status === 'failed').length,
    momoPayments: payments.filter((p: any) => p.method === 'mtn_momo').length,
  };

  const filteredPayments = payments.filter((payment: any) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (payment.tenants?.name || '').toLowerCase().includes(q) ||
      (payment.payer_name || '').toLowerCase().includes(q) ||
      (payment.payer_email || '').toLowerCase().includes(q) ||
      (payment.receipt_number || '').toLowerCase().includes(q) ||
      (payment.invoices?.invoice_number || '').toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    downloadCsv(
      'payments-export.csv',
      payments.map((p: any) => ({
        receipt_number: p.receipt_number || '',
        tenant: p.tenants?.name || p.payer_name || '',
        payer_email: p.payer_email || '',
        invoice: p.invoices?.invoice_number || '',
        amount: p.amount,
        method: getMethodLabel(p.method),
        status: p.status,
        date: format(new Date(p.created_at), 'yyyy-MM-dd'),
        momo_phone: p.momo_phone || '',
        momo_transaction: p.momo_transaction_id || '',
        notes: p.notes || '',
      }))
    );
    toast({ title: 'Export complete', description: 'Payments exported as CSV.' });
  };

  const handleDownloadReceipt = (payment: any) => {
    downloadCsv(`receipt-${(payment.receipt_number || payment.id.slice(0, 8))}.csv`, [
      {
        receipt_number: payment.receipt_number || '',
        date: format(new Date(payment.created_at), 'yyyy-MM-dd'),
        tenant: payment.tenants?.name || payment.payer_name || '',
        payer_email: payment.payer_email || '',
        invoice: payment.invoices?.invoice_number || '',
        amount: payment.amount,
        method: getMethodLabel(payment.method),
        status: payment.status,
        momo_phone: payment.momo_phone || '',
        momo_transaction_id: payment.momo_transaction_id || '',
        reference: payment.reference || '',
        notes: payment.notes || '',
      },
    ]);
    toast({ title: 'Receipt downloaded', description: 'Payment receipt saved as CSV.' });
  };

  const handleSendReceipt = async (payment: any) => {
    const canProceed = await ensureAal2('payments.send_receipt');
    if (!canProceed) return;

    try {
      await supabase.functions.invoke('send-payment-confirmation', {
        body: { paymentId: payment.id },
      });
      await logSecurityEvent('payment_receipt_sent', { paymentId: payment.id });
      toast({ title: 'Receipt Sent', description: `Receipt sent to ${payment.tenants?.name || 'tenant'}.` });
    } catch (error: any) {
      await logSecurityEvent('payment_receipt_failed', { paymentId: payment.id, reason: error?.message || 'unknown' });
      toast({ title: 'Error', description: error.message || 'Failed to send receipt', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    const canProceed = await ensureAal2('payments.record');
    if (!canProceed) return;

    if (!formData.tenant_id || !formData.invoice_id || !formData.amount) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const payment = await createPayment.mutateAsync({
      tenant_id: formData.tenant_id,
      invoice_id: formData.invoice_id,
      amount: formData.amount,
      method: formData.method,
      momo_phone: formData.momo_phone || null,
      momo_transaction_id: formData.momo_transaction_id || null,
      reference: formData.reference || null,
      notes: formData.notes || null,
    });

    await logSecurityEvent('payment_recorded', {
      paymentId: (payment as any)?.id ?? (typeof payment === 'string' ? payment : null),
      invoiceId: formData.invoice_id,
      amount: formData.amount,
      method: formData.method,
    });

    setIsRecordOpen(false);
    setFormData({
      tenant_id: '',
      invoice_id: '',
      amount: 0,
      method: 'mtn_momo',
      momo_phone: '',
      momo_transaction_id: '',
      reference: '',
      notes: '',
    });
  };

  const handleGenerateCheckoutLink = async () => {
    const canProceed = await ensureAal2('payments.generate_checkout_link');
    if (!canProceed) return;

    if (!formData.invoice_id) {
      toast({ title: 'Error', description: 'Please select an invoice first', variant: 'destructive' });
      return;
    }

    const selectedInvoice = invoices.find((inv: any) => inv.id === formData.invoice_id);
    const remaining = selectedInvoice ? Number(selectedInvoice.amount) - Number(selectedInvoice.paid_amount || 0) : 0;
    const amount = formData.amount > 0 ? formData.amount : remaining;

    if (!amount || amount <= 0) {
      toast({ title: 'Error', description: 'No outstanding balance on selected invoice', variant: 'destructive' });
      return;
    }

    setCheckoutLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/tenant/payments?payment_return=1&invoice_id=${encodeURIComponent(formData.invoice_id)}&gateway=${checkoutGateway}`;
      const { data, error } = await supabase.functions.invoke('payment-checkout', {
        body: {
          source: 'landlord_invoice',
          invoiceId: formData.invoice_id,
          gateway: checkoutGateway,
          paymentMethod: formData.method || 'link',
          amount,
          callbackUrl,
          origin: window.location.origin,
        },
      });

      if (error) throw new Error(error.message || 'Unable to generate checkout link');
      if (!data?.checkoutUrl) throw new Error(data?.error || 'No checkout URL returned');

      await logSecurityEvent('payment_checkout_link_generated', {
        invoiceId: formData.invoice_id,
        amount,
        gateway: checkoutGateway,
      });

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.checkoutUrl);
      }

      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: 'Checkout link generated',
        description: 'Payment link was opened in a new tab and copied to your clipboard.',
      });
    } catch (error: any) {
      await logSecurityEvent('payment_checkout_link_failed', {
        invoiceId: formData.invoice_id || null,
        gateway: checkoutGateway,
        reason: error?.message || 'unknown',
      });
      toast({ title: 'Error', description: error.message || 'Failed to generate payment link', variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Cashflow control
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Track collections, failures, and gateway checkout flow</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto rounded-full px-5" onClick={() => setIsRecordOpen(true)}>
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <Card className="border border-border/70 bg-card/85 backdrop-blur-sm card-shadow-md overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Payment operations cockpit
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Fast access to checkout links, receipts, and retry workflows.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 border-success/30 text-success">
              Received {formatCurrency(stats.totalReceived)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 border-warning/30 text-warning">
              Pending {formatCurrency(stats.pendingAmount)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 border-destructive/30 text-destructive">
              Failed {stats.failedCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalReceived)}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-3">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive">{stats.failedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MTN MoMo</p>
                <p className="text-2xl font-bold text-foreground">{stats.momoPayments}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Phone className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tenant, receipt, or invoice..."
            className="pl-10 h-11 border-border/70 bg-card/80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Button variant="outline" className="gap-2 w-full sm:w-auto rounded-full px-4">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2 w-full sm:w-auto rounded-full px-4" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="card-shadow-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading payment activity...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      {!isLoading && (
        <Card className="card-shadow-md border-border/70 animate-enter stagger-2">
          <CardContent className="p-0">
            <div className="md:hidden divide-y">
              {filteredPayments.length === 0 ? (
                <div className="py-12 px-6 text-center text-muted-foreground">
                  <p className="font-medium text-foreground">No payments found</p>
                  <p className="text-sm mt-1">Try adjusting your search query or record a payment.</p>
                  <Button size="sm" className="mt-4 rounded-full" onClick={() => setIsRecordOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Record first payment
                  </Button>
                </div>
              ) : (
                filteredPayments.map((payment: any, index: number) => (
                  <div key={payment.id} className={`p-4 space-y-3 animate-enter ${index < 5 ? `stagger-${(index % 5) + 1}` : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{payment.receipt_number || 'No receipt number'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{payment.tenants?.name || payment.payer_name || 'Guest'}</p>
                      {payment.payer_email ? <p className="text-xs text-muted-foreground">{payment.payer_email}</p> : null}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {getMethodIcon(payment.method)}
                        <span>{getMethodLabel(payment.method)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold">{formatCurrency(payment.amount)}</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(payment)}>
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleSendReceipt(payment)}>
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <div className="space-y-3 py-4">
                        <p>No payments found</p>
                        <Button size="sm" className="rounded-full" onClick={() => setIsRecordOpen(true)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Record first payment
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.receipt_number || '-'}</TableCell>
                      <TableCell>{format(new Date(payment.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {payment.tenant_id ? (
                          <button
                            className="hover:text-primary transition-colors"
                            onClick={() => navigate(`/tenants/${payment.tenant_id}`)}
                          >
                            {payment.tenants?.name || payment.payer_name || 'Unknown'}
                          </button>
                        ) : (
                          <div>
                            <p>{payment.payer_name || payment.tenants?.name || 'Guest'}</p>
                            {payment.payer_email ? <p className="text-xs text-muted-foreground">{payment.payer_email}</p> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{payment.invoices?.invoice_number || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMethodIcon(payment.method)}
                          <span>{getMethodLabel(payment.method)}</span>
                        </div>
                        {payment.momo_phone && (
                          <p className="text-xs text-muted-foreground">{payment.momo_phone}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleDownloadReceipt(payment)}>
                              <Receipt className="h-4 w-4 mr-2" /> Download Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void handleSendReceipt(payment)}>
                              <Send className="h-4 w-4 mr-2" /> Send Receipt to Tenant
                            </DropdownMenuItem>
                            {payment.tenant_id ? (
                              <DropdownMenuItem
                                onSelect={() => navigate(`/tenants/${payment.tenant_id}`)}
                              >
                                <DollarSign className="h-4 w-4 mr-2" /> View Tenant
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a new payment from a tenant.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tenant *</Label>
                <SearchableSelect
                  options={tenantOptions}
                  value={formData.tenant_id}
                  onValueChange={(value) => setFormData({ ...formData, tenant_id: value, invoice_id: '' })}
                  placeholder="Select tenant..."
                  searchPlaceholder="Search tenants..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Invoice *</Label>
                <SearchableSelect
                  options={invoiceOptions}
                  value={formData.invoice_id}
                  onValueChange={(value) => setFormData({ ...formData, invoice_id: value })}
                  placeholder="Select invoice..."
                  searchPlaceholder="Search invoices..."
                  disabled={!formData.tenant_id}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paymentAmount">Amount *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label>Payment Method *</Label>
                <SearchableSelect
                  options={paymentMethodOptions}
                  value={formData.method}
                  onValueChange={(value) => setFormData({ ...formData, method: value })}
                  placeholder="Select method..."
                  searchPlaceholder="Search methods..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Checkout Gateway</Label>
              <SearchableSelect
                options={[
                  { value: 'paystack', label: 'Paystack', description: 'Hosted checkout' },
                  { value: 'flutterwave', label: 'Flutterwave', description: 'Hosted checkout' },
                ]}
                value={checkoutGateway}
                onValueChange={(value) => setCheckoutGateway(value as 'paystack' | 'flutterwave')}
                placeholder="Select gateway..."
                searchPlaceholder="Search gateway..."
              />
            </div>

            {formData.method === 'mtn_momo' && (
              <>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-5 w-5 text-warning" />
                    <span className="font-medium text-warning">MTN Mobile Money</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the MoMo details for this payment.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="momoPhone">MoMo Phone Number</Label>
                    <Input
                      id="momoPhone"
                      value={formData.momo_phone}
                      onChange={(e) => setFormData({ ...formData, momo_phone: e.target.value })}
                      placeholder="+250 XXX XXX XXX"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="momoTransactionId">Transaction ID</Label>
                    <Input
                      id="momoTransactionId"
                      value={formData.momo_transaction_id}
                      onChange={(e) => setFormData({ ...formData, momo_transaction_id: e.target.value })}
                      placeholder="e.g., TXN123456789"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.method === 'bank_transfer' && (
              <div className="grid gap-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Bank transfer reference"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void handleGenerateCheckoutLink()} disabled={checkoutLoading}>
              {checkoutLoading ? 'Generating...' : 'Generate Checkout Link'}
            </Button>
            <Button onClick={handleCreate} disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
