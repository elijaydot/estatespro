import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Lock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { GoogleStyleBillingOverview } from '@/components/billing/GoogleStyleBillingOverview';

type PriceRow = {
  currency_code: 'USD' | 'NGN' | 'GBP';
  amount_minor: number;
  is_active: boolean;
};

type EntitlementRow = {
  bool_value: boolean;
  saas_entitlement_keys: {
    key: string;
    domain: string;
  } | null;
};

type ProductRow = {
  code: string;
  name: string;
};

type PlanRow = {
  id: string;
  code: string;
  tier: 'free' | 'bronze' | 'silver' | 'gold' | 'platinum';
  name: string;
  description: string;
  sort_order: number;
  saas_products: ProductRow | null;
  saas_plan_prices: PriceRow[] | null;
  saas_plan_entitlements: EntitlementRow[] | null;
};

type SubscriptionRow = {
  id: string;
  company_id: string;
  product_id: string;
  plan_id: string;
  created_at: string;
  status: string;
  payment_state: string | null;
  dunning_attempt_count: number | null;
  last_dunning_attempt_at: string | null;
  next_renewal_at: string | null;
  next_billing_at: string | null;
  saas_plans: {
    id: string;
    name: string;
    code: string;
    tier: string;
    saas_products: ProductRow | null;
  } | null;
};

type InvoiceRow = {
  id: string;
  company_id: string;
  subscription_id: string;
  invoice_kind: string;
  invoice_status: string;
  amount_minor: number;
  currency_code: 'USD' | 'NGN' | 'GBP';
  due_at: string;
  paid_at: string | null;
  external_reference: string | null;
  created_at: string;
};

type SubscriptionEventRow = {
  id: string;
  company_id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type PendingPaymentVerification = {
  productCode: string;
  attemptId: string;
  invoiceId: string;
  gateway: 'paystack' | 'flutterwave';
  reference: string;
  amountMinor: number;
  currency: 'USD' | 'NGN' | 'GBP';
};

const PENDING_VERIFICATIONS_STORAGE_KEY = 'saas.pendingPlanVerifications.v1';
const MAX_PAYMENT_VERIFY_RETRIES = 5;

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(() => resolve(), ms);
});

const tierOrder: Record<string, number> = {
  free: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

const featuredKeys = [
  'marketplace.listings.manage',
  'marketplace.verification.manage',
  'marketplace.moderation.view',
  'crm.leads.manage',
  'crm.deals.manage',
  'crm.calls_meetings.manage',
  'crm.automation.manage',
  'ai.assistant.enabled',
] as const;

const keyLabelMap: Record<string, string> = {
  'marketplace.listings.manage': 'Marketplace Listing Management',
  'marketplace.verification.manage': 'Marketplace Publisher Verification',
  'marketplace.moderation.view': 'Marketplace Moderation Queue',
  'crm.leads.manage': 'CRM Leads',
  'crm.deals.manage': 'CRM Deals',
  'crm.calls_meetings.manage': 'CRM Calls & Meetings',
  'crm.automation.manage': 'CRM Automation',
  'ai.assistant.enabled': 'AI Assistant & Insights',
};

function formatPrice(amountMinor: number, currencyCode: 'USD' | 'NGN' | 'GBP') {
  const decimals = 2;
  const amount = amountMinor / 10 ** decimals;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: decimals,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function BillingPlansSettings() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { entitlements, quotas, isLoading: saasAccessLoading } = useSaasAccess();
  const [currency, setCurrency] = useState<'USD' | 'NGN' | 'GBP'>('USD');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingVerificationByProduct, setPendingVerificationByProduct] = useState<Record<string, PendingPaymentVerification>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(PENDING_VERIFICATIONS_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Record<string, PendingPaymentVerification>;
      if (parsed && typeof parsed === 'object') {
        setPendingVerificationByProduct(parsed);
      }
    } catch {
      window.localStorage.removeItem(PENDING_VERIFICATIONS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (Object.keys(pendingVerificationByProduct).length === 0) {
      window.localStorage.removeItem(PENDING_VERIFICATIONS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      PENDING_VERIFICATIONS_STORAGE_KEY,
      JSON.stringify(pendingVerificationByProduct),
    );
  }, [pendingVerificationByProduct]);

  const { data: currentSubscriptions = [], isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ['saas-current-subscriptions', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<SubscriptionRow[]> => {
      const { data, error } = await supabase
        .from('saas_company_plan_subscriptions' as never)
        .select('id, company_id, product_id, plan_id, created_at, status, payment_state, dunning_attempt_count, last_dunning_attempt_at, next_renewal_at, next_billing_at, saas_plans:plan_id(id, name, code, tier, saas_products:product_id(code, name))')
        .eq('company_id', activeCompanyId)
        .in('status', ['active', 'trialing', 'grace_period'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as SubscriptionRow[];
    },
  });

  const { data: recentInvoices = [], isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['saas-recent-invoices', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data, error } = await supabase
        .from('saas_subscription_invoices' as never)
        .select('id, company_id, subscription_id, invoice_kind, invoice_status, amount_minor, currency_code, due_at, paid_at, external_reference, created_at')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) throw error;
      return (data || []) as InvoiceRow[];
    },
  });

  const { data: recentEvents = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['saas-subscription-events', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<SubscriptionEventRow[]> => {
      const { data, error } = await supabase
        .from('saas_subscription_events' as never)
        .select('id, company_id, event_type, details, created_at')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as SubscriptionEventRow[];
    },
  });

  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['saas-plans-catalog'],
    queryFn: async (): Promise<PlanRow[]> => {
      const { data, error } = await supabase
        .from('saas_plans' as never)
        .select(
          'id, code, tier, name, description, sort_order, saas_products:product_id(code, name), saas_plan_prices(currency_code, amount_minor, is_active), saas_plan_entitlements(bool_value, saas_entitlement_keys(key, domain))'
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as PlanRow[];
    },
  });

  const groupedPlans = useMemo(() => {
    const groups = new Map<string, PlanRow[]>();
    plans.forEach((plan) => {
      const code = plan.saas_products?.code || 'unknown';
      const existing = groups.get(code) || [];
      existing.push(plan);
      groups.set(code, existing);
    });

    return Array.from(groups.entries()).map(([productCode, productPlans]) => ({
      productCode,
      productName: productPlans[0]?.saas_products?.name || productCode,
      plans: productPlans.sort((a, b) => (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0)),
    }));
  }, [plans]);

  const subscriptionsByProduct = useMemo(() => {
    const map = new Map<string, SubscriptionRow>();
    currentSubscriptions.forEach((subscription) => {
      const productCode = subscription.saas_plans?.saas_products?.code;
      if (!productCode) return;
      if (!map.has(productCode)) {
        map.set(productCode, subscription);
      }
    });
    return map;
  }, [currentSubscriptions]);

  const billingSummary = useMemo(() => {
    const outstandingMinor = recentInvoices
      .filter((row) => row.invoice_status === 'open' || row.invoice_status === 'uncollectible')
      .reduce((sum, row) => sum + Number(row.amount_minor || 0), 0);

    const paidCount = recentInvoices.filter((row) => row.invoice_status === 'paid').length;
    const openCount = recentInvoices.filter((row) => row.invoice_status === 'open').length;
    const uncollectibleCount = recentInvoices.filter((row) => row.invoice_status === 'uncollectible').length;
    const nextBillingAt = currentSubscriptions
      .map((row) => row.next_billing_at || row.next_renewal_at)
      .filter((value): value is string => Boolean(value))
      .sort()[0] || null;
    const maxDunning = currentSubscriptions.reduce((max, row) => Math.max(max, Number(row.dunning_attempt_count || 0)), 0);

    return {
      outstandingMinor,
      paidCount,
      openCount,
      uncollectibleCount,
      nextBillingAt,
      maxDunning,
    };
  }, [currentSubscriptions, recentInvoices]);

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      if (error.message.includes('INSUFFICIENT_PERMISSIONS_FOR_BILLING_ADMIN')) {
        return 'You do not have billing permission for this company.';
      }
      if (error.message.includes('NO_ACTIVE_SUBSCRIPTION_FOR_PRODUCT')) {
        return 'No active subscription found for this product. Start a plan first.';
      }
      if (error.message.includes('UNKNOWN_OR_INCOMPATIBLE_NEW_PLAN')) {
        return 'The selected plan is not compatible with this product.';
      }
      return error.message;
    }
    return 'Unable to change subscription right now.';
  };

  const handleChoosePlan = async (plan: PlanRow, productCode: string) => {
    if (!activeCompanyId) {
      toast({ title: 'No active company', description: 'Select a company before changing plans.', variant: 'destructive' });
      return;
    }

    setPendingPlanId(plan.id);
    try {
      const existing = subscriptionsByProduct.get(productCode);

      const startPaidPlanCheckout = async () => {
        const { data, error } = await supabase.functions.invoke('saas-subscription-checkout', {
          body: {
            companyId: activeCompanyId,
            productCode,
            planCode: plan.code,
            currency,
            gateway: 'paystack',
            paymentMethod: 'link',
            callbackUrl: `${window.location.origin}/settings?tab=billing`,
          },
        });

        if (error) throw new Error(error.message || 'Unable to initialize checkout');

        const payload = (data || {}) as {
          success?: boolean;
          requiresPayment?: boolean;
          checkoutUrl?: string;
          attemptId?: string;
          invoiceId?: string;
          reference?: string;
          amountMinor?: number;
          currency?: 'USD' | 'NGN' | 'GBP';
          changed?: boolean;
          reason?: string;
        };

        if (payload.requiresPayment) {
          if (!payload.attemptId || !payload.invoiceId || !payload.reference || !payload.checkoutUrl) {
            throw new Error('Checkout initialized but missing payment verification details.');
          }

          setPendingVerificationByProduct((prev) => ({
            ...prev,
            [productCode]: {
              productCode,
              attemptId: payload.attemptId,
              invoiceId: payload.invoiceId,
              gateway: 'paystack',
              reference: payload.reference,
              amountMinor: payload.amountMinor || 0,
              currency: payload.currency || currency,
            },
          }));

          window.open(payload.checkoutUrl, '_blank', 'noopener,noreferrer');

          toast({
            title: 'Checkout started',
            description: `Complete payment (${formatPrice(payload.amountMinor || 0, payload.currency || currency)}) and then click Verify Payment in the ${groupedPlans.find((g) => g.productCode === productCode)?.productName || productCode} section.`,
          });
          return;
        }

        if (payload.changed) {
          toast({
            title: 'Plan changed',
            description: `Your ${productCode} subscription is now on ${plan.tier}.`,
          });
          return;
        }

        toast({ title: 'No change', description: payload.reason || 'You are already on this plan.' });
      };

      if (existing) {
        await startPaidPlanCheckout();
      } else {
        if (plan.tier !== 'free') {
          toast({
            title: 'Plan start requires payment-enabled base subscription',
            description: 'Start with the free tier first, then upgrade to paid plans through checkout.',
          });
          return;
        }

        const { error } = await supabase.rpc('saas_start_or_replace_subscription' as never, {
          p_company_id: activeCompanyId,
          p_product_code: productCode,
          p_plan_code: plan.code,
          p_trial_days: 0,
          p_correlation_id: `ui-plan-start-${Date.now()}`,
          p_metadata: { source: 'settings.billing.choose_plan' },
        } as never);

        if (error) throw error;
        toast({
          title: 'Subscription started',
          description: `${productCode} has been activated on the ${plan.tier} plan.`,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saas-current-subscriptions', activeCompanyId] }),
        queryClient.invalidateQueries({ queryKey: ['saas-access', activeCompanyId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats', activeCompanyId] }),
      ]);
    } catch (error) {
      toast({ title: 'Plan change failed', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setPendingPlanId(null);
    }
  };

  const handleVerifyPendingPayment = useCallback(async (productCode: string) => {
    const pending = pendingVerificationByProduct[productCode];
    if (!pending) return;

    setPendingPlanId(`verify-${pending.attemptId}`);
    try {
      let attempt = 0;
      let payload: { success?: boolean; alreadyProcessed?: boolean; pending?: boolean; retryAfterMs?: number } | null = null;

      while (attempt <= MAX_PAYMENT_VERIFY_RETRIES) {
        const { data, error } = await supabase.functions.invoke('saas-verify-subscription-payment', {
          body: {
            attemptId: pending.attemptId,
            gateway: pending.gateway,
            reference: pending.reference,
            test_mode: false,
          },
        });

        if (error) throw new Error(error.message || 'Failed to verify payment');

        payload = (data || {}) as { success?: boolean; alreadyProcessed?: boolean; pending?: boolean; retryAfterMs?: number };

        if (!payload.success) {
          throw new Error('Payment verification did not complete successfully.');
        }

        if (!payload.pending) {
          break;
        }

        if (attempt >= MAX_PAYMENT_VERIFY_RETRIES) {
          throw new Error('Payment is still processing. Please wait a moment and click Verify Payment again.');
        }

        const retryAfterMs = Number(payload.retryAfterMs || 3000);
        await wait(retryAfterMs > 0 ? retryAfterMs : 3000);
        attempt += 1;
      }

      if (!payload || payload.pending) {
        throw new Error('Payment is still processing. Please try verification again shortly.');
      }

      setPendingVerificationByProduct((prev) => {
        const next = { ...prev };
        delete next[productCode];
        return next;
      });

      toast({
        title: payload.alreadyProcessed ? 'Payment already verified' : 'Payment verified',
        description: `Your ${productCode} subscription update is now active.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saas-current-subscriptions', activeCompanyId] }),
        queryClient.invalidateQueries({ queryKey: ['saas-access', activeCompanyId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats', activeCompanyId] }),
      ]);

      const url = new URL(window.location.href);
      url.searchParams.delete('payment_status');
      url.searchParams.delete('reference');
      url.searchParams.delete('trxref');
      url.searchParams.delete('tx_ref');
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
    } catch (error) {
      toast({ title: 'Payment verification failed', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setPendingPlanId(null);
    }
  }, [activeCompanyId, pendingVerificationByProduct, queryClient, toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const status = (url.searchParams.get('payment_status') || '').toLowerCase();
    const returnedReference =
      url.searchParams.get('reference')
      || url.searchParams.get('trxref')
      || url.searchParams.get('tx_ref');

    if (!status || !returnedReference) return;
    if (!['success', 'successful', 'completed', 'paid'].includes(status)) return;

    const matchingProductCode = Object.keys(pendingVerificationByProduct).find((productCode) => {
      return pendingVerificationByProduct[productCode]?.reference === returnedReference;
    });

    if (!matchingProductCode) return;
    if (pendingPlanId) return;

    void handleVerifyPendingPayment(matchingProductCode);
  }, [handleVerifyPendingPayment, pendingVerificationByProduct, pendingPlanId]);

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto">
      <GoogleStyleBillingOverview />

      <Card>
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span>Historical Invoices & Audit Timeline</span>
            <Select value={currency} onValueChange={(value) => setCurrency(value as 'USD' | 'NGN' | 'GBP')}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="NGN">NGN</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-md border border-border/60 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Outstanding Balance</p>
              <p className="text-lg font-semibold mt-1">{formatPrice(billingSummary.outstandingMinor, currency)}</p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Open Invoices</p>
              <p className="text-lg font-semibold mt-1">{billingSummary.openCount}</p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Paid Invoices</p>
              <p className="text-lg font-semibold mt-1">{billingSummary.paidCount}</p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Highest Dunning</p>
              <p className="text-lg font-semibold mt-1">{billingSummary.maxDunning}</p>
            </div>
            <div className="rounded-md border border-border/60 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Next Billing</p>
              <p className="text-sm font-semibold mt-1">{formatDate(billingSummary.nextBillingAt)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current Subscription</p>
            {isSubscriptionLoading ? (
              <p className="text-sm mt-1">Loading subscription...</p>
            ) : currentSubscriptions.length > 0 ? (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentSubscriptions.map((subscription) => (
                  <div key={`${subscription.product_id}-${subscription.plan_id}`} className="rounded-md border border-border/60 p-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{subscription.saas_plans?.name || 'Plan'}</Badge>
                      <Badge variant="outline">{subscription.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Product: {subscription.saas_plans?.saas_products?.name || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Renewal: {formatDate(subscription.next_billing_at || subscription.next_renewal_at)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment state: {subscription.payment_state || 'current'} · Dunning attempts: {subscription.dunning_attempt_count || 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-1 text-muted-foreground">No active subscription found for this company yet.</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Subscription Invoices</p>
            {isInvoicesLoading ? (
              <p className="text-sm text-muted-foreground">Loading invoices...</p>
            ) : recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscription invoices yet for this company.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.slice(0, 12).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{formatDate(invoice.created_at)}</TableCell>
                      <TableCell>{invoice.invoice_kind}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.invoice_status === 'paid' ? 'default' : invoice.invoice_status === 'open' ? 'secondary' : 'outline'}>
                          {invoice.invoice_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(invoice.amount_minor, invoice.currency_code)}</TableCell>
                      <TableCell>{formatDate(invoice.due_at)}</TableCell>
                      <TableCell>{formatDate(invoice.paid_at)}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={invoice.external_reference || ''}>{invoice.external_reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Subscription Timeline</p>
            {isEventsLoading ? (
              <p className="text-sm text-muted-foreground">Loading events...</p>
            ) : recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscription events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentEvents.slice(0, 8).map((event) => (
                  <div key={event.id} className="rounded-md border border-border/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{event.event_type}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
                    </div>
                    {event.details && typeof event.details === 'object' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.entries(event.details)
                          .slice(0, 3)
                          .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium">Feature Access (Current Company)</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {featuredKeys.map((key) => {
                const allowed = Boolean(entitlements[key]);
                return (
                  <div key={key} className="rounded-md border border-border/60 px-3 py-2 flex items-center justify-between">
                    <span className="text-sm">{keyLabelMap[key]}</span>
                    <Badge variant={allowed ? 'default' : 'outline'}>
                      {allowed ? 'Included' : 'Locked'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium">Plan Catalog</p>
            {isPlansLoading ? (
              <p className="text-sm text-muted-foreground">Loading pricing catalog...</p>
            ) : (
              groupedPlans.map((group) => (
                <div key={group.productCode} className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{group.productName}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    {group.plans.map((plan) => {
                      const price = (plan.saas_plan_prices || []).find((row) => row.currency_code === currency && row.is_active);
                      const enabledCount = (plan.saas_plan_entitlements || []).filter((row) => row.bool_value).length;
                      const currentForProduct = subscriptionsByProduct.get(group.productCode);
                      const isCurrent = currentForProduct?.saas_plans?.id === plan.id;

                      return (
                        <Card key={plan.id} className={isCurrent ? 'border-primary/60' : ''}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold">{plan.tier.toUpperCase()}</p>
                              {isCurrent && <Badge>Current</Badge>}
                            </div>
                            <p className="text-2xl font-bold">
                              {price ? formatPrice(price.amount_minor, currency) : 'N/A'}
                              <span className="text-xs font-normal text-muted-foreground"> /month</span>
                            </p>
                            <p className="text-xs text-muted-foreground min-h-[30px]">{plan.description}</p>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> {enabledCount} entitlement grants
                            </div>
                            <Button
                              size="sm"
                              variant={isCurrent ? 'secondary' : 'default'}
                              className="w-full"
                              disabled={isCurrent || pendingPlanId === plan.id}
                              onClick={() => void handleChoosePlan(plan, group.productCode)}
                            >
                              {isCurrent ? 'Current Plan' : pendingPlanId === plan.id ? 'Applying...' : 'Choose Plan'}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {pendingVerificationByProduct[group.productCode] && (
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-2">
                      <div className="text-xs text-muted-foreground">
                        Payment pending for {group.productName}: {formatPrice(
                          pendingVerificationByProduct[group.productCode].amountMinor,
                          pendingVerificationByProduct[group.productCode].currency,
                        )} (ref: {pendingVerificationByProduct[group.productCode].reference})
                      </div>
                      <Button
                        size="sm"
                        disabled={pendingPlanId === `verify-${pendingVerificationByProduct[group.productCode].attemptId}`}
                        onClick={() => void handleVerifyPendingPayment(group.productCode)}
                      >
                        {pendingPlanId === `verify-${pendingVerificationByProduct[group.productCode].attemptId}` ? 'Verifying...' : 'Verify Payment'}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Locked feature journey</p>
              <p className="text-sm text-muted-foreground">
                Any locked module navigation routes users to this Billing tab. Protected routes show a locked screen with a clear upgrade call-to-action.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-md border border-border/60 p-2 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> Sidebar locked items display "Upgrade"
                </div>
                <div className="rounded-md border border-border/60 p-2 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5" /> Direct route access opens locked page with billing CTA
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!saasAccessLoading && quotas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Quota Envelope</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {quotas.map((quota) => (
                <div key={quota.quota_code} className="rounded-md border border-border/60 px-3 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">{quota.quota_code}</p>
                  <p>{quota.used_value} / {quota.hard_limit > 0 ? quota.hard_limit : 'Unlimited'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
