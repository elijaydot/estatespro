import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';

interface ActionContext {
  booking: {
    id: string;
    guest_name: string;
    guest_email: string;
    check_in: string;
    check_out: string;
    total_amount: number;
    status: string;
    payment_status: string;
    guest_response_status: string;
    properties?: { name?: string };
    units?: { unit_number?: string };
  };
  invoice?: {
    id: string;
    invoice_number: string;
    amount: number;
    paid_amount: number;
    due_date: string;
    status: string;
  } | null;
}

const statusBadgeVariant = (status: string) => {
  if (status === 'confirmed' || status === 'paid') return 'default';
  if (status === 'cancelled' || status === 'no_show') return 'destructive';
  if (status === 'partial' || status === 'pending') return 'outline';
  return 'secondary';
};

export default function GuestBookingActionPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const actionFromLink = searchParams.get('action') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [context, setContext] = useState<ActionContext | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionHandled, setActionHandled] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [gateway, setGateway] = useState<'paystack' | 'flutterwave'>('paystack');
  const [paymentReference, setPaymentReference] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const remainingAmount = useMemo(() => {
    if (!context?.invoice) return Number(context?.booking?.total_amount || 0);
    return Math.max(0, Number(context.invoice.amount) - Number(context.invoice.paid_amount));
  }, [context]);

  const callFunction = async (body: Record<string, any>) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shortlet-booking-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || `HTTP ${response.status}` };
    }

    if (!response.ok) {
      throw new Error(data?.error || `Request failed (HTTP ${response.status})`);
    }

    return data;
  };

  const callCheckoutFunction = async (path: 'payment-checkout' | 'verify-payment', body: Record<string, any>) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || `HTTP ${response.status}` };
    }

    if (!response.ok) {
      throw new Error(data?.error || `Request failed (HTTP ${response.status})`);
    }

    return data;
  };

  const loadContext = async () => {
    if (!token) {
      setError('Missing booking action token.');
      setLoading(false);
      return;
    }

    try {
      const data = await callFunction({ operation: 'get_action_context', token });
      setContext(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const submitAction = async (action: 'accept' | 'cancel' | 'pay', amount?: number) => {
    if (!token) return;
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const data = await callFunction({
        operation: 'submit_action',
        token,
        action,
        amount,
        method: paymentMethod,
        reference: paymentReference || null,
      });

      setSuccessMessage(data?.message || 'Action completed successfully.');
      await loadContext();
    } catch (err: any) {
      setError(err.message || 'Failed to complete request.');
    } finally {
      setSubmitting(false);
      setActionHandled(true);
    }
  };

  useEffect(() => {
    void loadContext();
  }, [token]);

  useEffect(() => {
    if (!context || actionHandled) return;
    if (actionFromLink === 'accept') {
      void submitAction('accept');
    }
    if (actionFromLink === 'cancel') {
      void submitAction('cancel');
    }
  }, [context, actionFromLink, actionHandled]);

  useEffect(() => {
    const paymentReturn = searchParams.get('payment_return');
    const reference = searchParams.get('reference') || searchParams.get('tx_ref');
    const returnGateway = searchParams.get('gateway') as 'paystack' | 'flutterwave' | null;

    if (paymentReturn !== '1' || !reference || !returnGateway || !token) return;

    const verify = async () => {
      try {
        const data = await callCheckoutFunction('verify-payment', {
          bookingToken: token,
          gateway: returnGateway,
          reference,
        });

        if (!data?.success) {
          throw new Error(data?.error || 'Payment verification failed');
        }

        setSuccessMessage('Payment verified and recorded successfully.');
        await loadContext();
      } catch (err: any) {
        setError(err.message || 'Unable to verify payment.');
      }
    };

    void verify();
  }, [searchParams, token]);

  const startProviderPayment = async () => {
    if (!token || remainingAmount <= 0) return;

    setCheckoutLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const callbackUrl = `${window.location.origin}/bookings/guest-action?token=${encodeURIComponent(token)}&payment_return=1&gateway=${gateway}`;
      const data = await callCheckoutFunction('payment-checkout', {
        source: 'guest_booking',
        bookingToken: token,
        amount: remainingAmount,
        gateway,
        paymentMethod,
        callbackUrl,
        origin: window.location.origin,
      });

      if (!data?.checkoutUrl) {
        throw new Error(data?.error || 'No checkout URL returned');
      }

      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message || 'Unable to start checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <XCircle className="h-14 w-14 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Unable to open booking action</h1>
            <p className="text-muted-foreground">{error}</p>
            <Link to="/">
              <Button variant="outline">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Manage Your Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>Guest:</strong> {context?.booking.guest_name}</p>
            <p><strong>Email:</strong> {context?.booking.guest_email}</p>
            <p><strong>Property:</strong> {context?.booking.properties?.name || 'N/A'}</p>
            <p><strong>Unit:</strong> {context?.booking.units?.unit_number || 'N/A'}</p>
            <p><strong>Check-in:</strong> {context?.booking.check_in}</p>
            <p><strong>Check-out:</strong> {context?.booking.check_out}</p>
            <p><strong>Total:</strong> {Number(context?.booking.total_amount || 0).toLocaleString()}</p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant={statusBadgeVariant(context?.booking.status || '') as any}>
                Booking: {(context?.booking.status || '').replace('_', ' ')}
              </Badge>
              <Badge variant={statusBadgeVariant(context?.booking.payment_status || '') as any}>
                Payment: {(context?.booking.payment_status || '').replace('_', ' ')}
              </Badge>
              <Badge variant={statusBadgeVariant(context?.booking.guest_response_status || '') as any}>
                Response: {(context?.booking.guest_response_status || '').replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {(successMessage || error) && (
          <Card>
            <CardContent className="pt-6">
              {successMessage && (
                <div className="flex items-start gap-2 text-success">
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                  <p>{successMessage}</p>
                </div>
              )}
              {error && <p className="text-destructive mt-2">{error}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button disabled={submitting || context?.booking.status === 'cancelled'} onClick={() => void submitAction('accept')}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Accept Booking
              </Button>
              <Button variant="destructive" disabled={submitting || context?.booking.status === 'cancelled'} onClick={() => void submitAction('cancel')}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Cancel Booking
              </Button>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <h3 className="font-semibold">Make Payment</h3>
              </div>

              <p className="text-sm text-muted-foreground">
                Outstanding amount: <strong>{remainingAmount.toLocaleString()}</strong>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                      <SelectItem value="link">Payment Link</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gateway</Label>
                  <Select value={gateway} onValueChange={(value) => setGateway(value as 'paystack' | 'flutterwave')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paystack">Paystack</SelectItem>
                      <SelectItem value="flutterwave">Flutterwave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reference (optional)</Label>
                  <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="TXN-123" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={checkoutLoading || remainingAmount <= 0}
                  onClick={() => void startProviderPayment()}
                >
                  {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Pay via Secure Checkout {remainingAmount.toLocaleString()}
                </Button>
                <Button
                  variant="outline"
                  disabled={submitting || remainingAmount <= 0}
                  onClick={() => void submitAction('pay', remainingAmount)}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Record Offline Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
