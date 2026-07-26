import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  CreditCard,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { useSettings } from '@/contexts/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';

type TenantInvoicePayment = {
  id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  description: string | null;
  status: string;
};

type TenantPayment = {
  id: string;
  created_at: string;
  method: string;
  amount: number;
  status: string | null;
  invoices: {
    description: string | null;
    due_date: string | null;
  } | null;
};

type TenantRecurringBill = {
  id: string;
  name: string;
  bill_type: string;
  frequency: string;
  amount: number;
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
    case 'overdue':
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Overdue
        </Badge>
      );
    default:
      return null;
  }
};

export default function TenantPayments() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: portalData, isLoading } = useTenantPortalData();
  const { formatCurrency } = useSettings();
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [gateway, setGateway] = useState<'paystack' | 'flutterwave'>('paystack');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const stats = portalData?.stats ?? {
    monthlyRent: 0,
    balance: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalMonthlyDue: 0,
    pending: 0,
    paid: 0,
  };
  const nextPayment = (portalData?.nextPayment || null) as TenantInvoicePayment | null;
  const invoices = (portalData?.invoices || []) as TenantInvoicePayment[];
  const payments = (portalData?.payments || []) as TenantPayment[];
  const paymentSettings = (portalData?.paymentSettings || null) as TenantPaymentSettings | null;
  const recurringBills = (portalData?.recurringBills || []) as unknown as TenantRecurringBill[];

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
  
  // Calculate days until next payment
  const daysUntilDue = nextPayment
    ? differenceInDays(new Date(nextPayment.due_date), new Date())
    : 0;

  const handleExportHistory = () => {
    const exportData = payments.map((payment) => ({
      payment_id: payment.id,
      date: format(new Date(payment.created_at), 'yyyy-MM-dd'),
      description: payment.invoices?.description || 'Payment',
      method: payment.method,
      amount: payment.amount,
      status: payment.status || 'completed',
    }));

    downloadCsv('payment-history.csv', exportData);
    toast({ title: 'Export complete', description: 'Downloaded payment history as CSV.' });
  };

  const handleDownloadReceipt = (payment: TenantPayment) => {
    downloadCsv(`receipt-${payment.id.slice(0, 8)}.csv`, [
      {
        payment_id: payment.id,
        date: format(new Date(payment.created_at), 'yyyy-MM-dd'),
        description: payment.invoices?.description || 'Payment',
        method: payment.method,
        amount: payment.amount,
        status: payment.status || 'completed',
        downloaded_at: new Date().toISOString(),
      },
    ]);

    toast({ title: 'Receipt downloaded', description: `Downloaded receipt for payment.` });
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

    setCheckoutLoading(true);
    try {
      const callbackUrl = `${window.location.origin}/tenant/payments?payment_return=1&invoice_id=${encodeURIComponent(invoiceId)}&gateway=${gateway}`;
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
      setCheckoutLoading(false);
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
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-success/15 via-background to-primary/10 p-5 md:p-6 card-shadow-md">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-success/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tenant Billing Center</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground md:text-3xl">Payments</h1>
            <p className="text-muted-foreground">Manage your rent payments and view history</p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 border-success/30 bg-success/5 text-success font-display">
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Always-On Billing
          </Badge>
        </div>
      </section>

      <div className="rounded-xl border border-border/70 bg-card/85 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">Review your monthly due first, then settle outstanding invoices to keep your account healthy.</p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={handleExportHistory} disabled={payments.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(stats.monthlyRent || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">+ Recurring Bills</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(portalData.totalRecurringAmount || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Monthly Due</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(stats.totalMonthlyDue || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className={`text-2xl font-bold ${stats.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                  {formatCurrency(stats.balance)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stats.balance > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                {stats.balance > 0 ? (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Bills Breakdown */}
      {recurringBills.length > 0 && (
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Recurring Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recurringBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">{bill.bill_type} • {bill.frequency}</p>
                  </div>
                  <span className="font-semibold">{formatCurrency(bill.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Payment */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {nextPayment ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/50">
              <div>
                <p className="font-medium">{nextPayment.description}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Due: {format(new Date(nextPayment.due_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">
                  {formatCurrency(nextPayment.amount - nextPayment.paid_amount)}
                </span>
                <Button className="gap-2" onClick={() => setIsPayDialogOpen(true)}>
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-sm text-success font-medium">
                No pending payments - you're all caught up!
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="card-shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payment History</CardTitle>
          {payments.length > 0 && (
            <Button variant="outline" className="gap-2" onClick={handleExportHistory}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment history yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{payment.invoices?.description || 'Payment'}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{payment.method}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status || 'paid')}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadReceipt(payment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>Pay your rent securely using your preferred payment method.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="text-2xl font-bold">
                  {nextPayment ? formatCurrency(nextPayment.amount - nextPayment.paid_amount) : formatCurrency(0)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Pay with your card</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                  <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Bank Transfer
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Direct bank payment</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                  <RadioGroupItem value="mtn_momo" id="mtn_momo" />
                  <Label htmlFor="mtn_momo" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Mobile Money (East Africa)
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">MTN/Airtel via gateway checkout</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Payment Link Checkout
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Hosted checkout page</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Gateway</Label>
              <RadioGroup value={gateway} onValueChange={(value) => setGateway(value as 'paystack' | 'flutterwave')}>
                {availableGateways.length === 0 ? (
                  <p className="text-sm text-destructive">No online gateway is enabled for this property.</p>
                ) : (
                  availableGateways.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`gateway-${option.value}`} />
                      <Label htmlFor={`gateway-${option.value}`}>{option.label}</Label>
                    </div>
                  ))
                )}
              </RadioGroup>
            </div>

            {paymentSettings?.payment_instructions ? (
              <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                {paymentSettings.payment_instructions}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!nextPayment) return;
                const amount = Number(nextPayment.amount) - Number(nextPayment.paid_amount || 0);
                void startCheckout(nextPayment.id, amount);
              }}
              className="gap-2"
              disabled={checkoutLoading || !nextPayment || availableGateways.length === 0}
            >
              {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Pay {nextPayment ? formatCurrency(nextPayment.amount - nextPayment.paid_amount) : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
