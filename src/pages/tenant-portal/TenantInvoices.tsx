import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { useSettings } from '@/contexts/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

type PortalInvoice = {
  id: string;
  invoice_number: string | null;
  description: string | null;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
};

type TenantPaymentSettings = {
  paystack_enabled?: boolean;
  flutterwave_enabled?: boolean;
  payment_instructions?: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle className="h-3 w-3" /> Paid
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="bg-info/10 text-info border-info/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Partial
        </Badge>
      );
    case 'overdue':
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <XCircle className="h-3 w-3" /> Overdue
        </Badge>
      );
    default:
      return null;
  }
};

export default function TenantInvoices() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: portalData, isLoading } = useTenantPortalData();
  const { formatCurrency } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'mtn_momo' | 'link'>('link');
  const [gateway, setGateway] = useState<'paystack' | 'flutterwave'>('paystack');

  const invoices = (portalData?.invoices || []) as PortalInvoice[];
  const paymentSettings = (portalData?.paymentSettings || null) as TenantPaymentSettings | null;

  const availableGateways = useMemo(() => {
    const gateways: Array<{ value: 'paystack' | 'flutterwave'; label: string }> = [];
    if (paymentSettings?.paystack_enabled) {
      gateways.push({ value: 'paystack', label: 'Paystack' });
    }
    if (paymentSettings?.flutterwave_enabled) {
      gateways.push({ value: 'flutterwave', label: 'Flutterwave' });
    }
    return gateways;
  }, [paymentSettings]);

  useEffect(() => {
    if (availableGateways.length > 0 && !availableGateways.some((g) => g.value === gateway)) {
      setGateway(availableGateways[0].value);
    }
  }, [availableGateways, gateway]);

  useEffect(() => {
    const paymentReturn = searchParams.get('payment_return');
    const reference = searchParams.get('reference') || searchParams.get('tx_ref');
    const returnGateway = searchParams.get('gateway') as 'paystack' | 'flutterwave' | null;
    const invoiceId = searchParams.get('invoice_id');

    if (paymentReturn !== '1' || !reference || !returnGateway || !invoiceId) return;

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: {
            gateway: returnGateway,
            reference,
            invoiceId,
          },
        });

        if (error) throw new Error(error.message || 'Unable to verify payment');
        if (!data?.success) throw new Error(data?.error || 'Payment verification failed');

        toast({ title: 'Payment confirmed', description: 'Your payment was verified and recorded successfully.' });
        await queryClient.invalidateQueries({ queryKey: ['tenant_portal_data'] });
      } catch (err: unknown) {
        toast({ title: 'Verification failed', description: getErrorMessage(err, 'Could not verify payment.'), variant: 'destructive' });
      } finally {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('payment_return');
          next.delete('reference');
          next.delete('tx_ref');
          next.delete('gateway');
          next.delete('invoice_id');
          next.delete('transaction_id');
          next.delete('status');
          return next;
        }, { replace: true });
      }
    };

    void verify();
  }, [searchParams, setSearchParams, queryClient]);

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: invoices.length,
    pending: invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'partial').length,
    paid: invoices.filter((invoice) => invoice.status === 'paid').length,
    totalAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    totalPaid: invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0),
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId },
      });

      if (error) throw new Error(error.message || 'Failed to generate PDF');

      const html = typeof data === 'string' ? data : await new Response(data).text();
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);

      const printWindow = window.open(htmlUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
            URL.revokeObjectURL(htmlUrl);
          }, 500);
        }, { once: true });
      } else {
        URL.revokeObjectURL(htmlUrl);
      }
    } catch (error: unknown) {
      console.error('Error downloading PDF:', error);
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to generate invoice PDF'), variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const startCheckout = async (invoiceId: string, amount: number) => {
    if (availableGateways.length === 0) {
      toast({
        title: 'Online payment unavailable',
        description: 'No gateway is enabled for this property. Please contact your landlord.',
        variant: 'destructive',
      });
      return;
    }

    setCheckoutLoadingId(invoiceId);
    try {
      const callbackUrl = `${window.location.origin}/tenant/invoices?payment_return=1&invoice_id=${encodeURIComponent(invoiceId)}&gateway=${gateway}`;
      const { data, error } = await supabase.functions.invoke('payment-checkout', {
        body: {
          source: 'tenant_invoice',
          invoiceId,
          amount,
          gateway,
          paymentMethod,
          callbackUrl,
          origin: window.location.origin,
        },
      });

      if (error) throw new Error(error.message || 'Unable to start checkout');
      if (!data?.checkoutUrl) throw new Error(data?.error || 'No checkout URL returned');

      window.location.href = data.checkoutUrl;
    } catch (err: unknown) {
      toast({ title: 'Checkout failed', description: getErrorMessage(err, 'Unable to start checkout.'), variant: 'destructive' });
    } finally {
      setCheckoutLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!portalData || !portalData.tenant) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Account Not Linked</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Your account hasn't been linked to a tenant profile yet.
            Please contact your property manager for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground">View and download your invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-success">{stats.paid}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(stats.totalAmount - stats.totalPaid)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={gateway}
            onChange={(e) => setGateway(e.target.value as 'paystack' | 'flutterwave')}
            disabled={availableGateways.length === 0}
          >
            {availableGateways.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
            {availableGateways.length === 0 ? <option value="paystack">No Gateway</option> : null}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'bank_transfer' | 'mtn_momo' | 'link')}
          >
            <option value="link">Payment Link</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mtn_momo">Mobile Money</option>
          </select>
        </div>
      </div>

      {paymentSettings?.payment_instructions ? (
        <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          {paymentSettings.payment_instructions}
        </div>
      ) : null}

      {/* Invoices Table */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const balance = invoice.amount - invoice.paid_amount;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{invoice.description}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell className="text-success">{formatCurrency(invoice.paid_amount)}</TableCell>
                      <TableCell className={balance > 0 ? 'text-destructive font-semibold' : 'text-success'}>
                        {formatCurrency(balance)}
                      </TableCell>
                      <TableCell>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {(invoice.status === 'pending' || invoice.status === 'partial' || invoice.status === 'overdue') && (invoice.amount - invoice.paid_amount) > 0 ? (
                            <Button
                              size="sm"
                              onClick={() => void startCheckout(invoice.id, Number(invoice.amount) - Number(invoice.paid_amount || 0))}
                              disabled={checkoutLoadingId === invoice.id || availableGateways.length === 0}
                            >
                              {checkoutLoadingId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay'}
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadPdf(invoice.id)}
                            disabled={downloadingId === invoice.id}
                          >
                            {downloadingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
