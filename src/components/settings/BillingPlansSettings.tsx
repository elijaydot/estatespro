import { useMemo, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';

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
  product_id: string;
  plan_id: string;
  created_at: string;
  status: string;
  saas_plans: {
    id: string;
    name: string;
    code: string;
    tier: string;
    saas_products: ProductRow | null;
  } | null;
};

const tierOrder: Record<string, number> = {
  free: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

const featuredKeys = [
  'marketplace.listings.manage',
  'marketplace.moderation.view',
  'crm.leads.manage',
  'crm.deals.manage',
  'crm.calls_meetings.manage',
  'crm.automation.manage',
  'ai.assistant.enabled',
] as const;

const keyLabelMap: Record<string, string> = {
  'marketplace.listings.manage': 'Marketplace Listing Management',
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

export function BillingPlansSettings() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { entitlements, quotas, isLoading: saasAccessLoading } = useSaasAccess();
  const [currency, setCurrency] = useState<'USD' | 'NGN' | 'GBP'>('USD');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const { data: currentSubscriptions = [], isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ['saas-current-subscriptions', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<SubscriptionRow[]> => {
      const { data, error } = await supabase
        .from('saas_company_plan_subscriptions' as never)
        .select('product_id, plan_id, created_at, status, saas_plans:plan_id(id, name, code, tier, saas_products:product_id(code, name))')
        .eq('company_id', activeCompanyId)
        .in('status', ['active', 'trialing', 'grace_period'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as SubscriptionRow[];
    },
  });

  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['saas-plans-catalog'],
    queryFn: async (): Promise<PlanRow[]> => {
      const { data, error } = await supabase
        .from('saas_plans' as never)
        .select(
          'id, code, tier, name, description, sort_order, saas_products:product_id(code, name), saas_plan_prices(currency_code, amount_minor, is_active), saas_plan_entitlements(bool_value, saas_entitlement_keys:entitlement_key_id(key, domain))'
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

      if (existing) {
        const { data, error } = await supabase.rpc('saas_change_subscription_plan' as never, {
          p_company_id: activeCompanyId,
          p_product_code: productCode,
          p_new_plan_code: plan.code,
          p_currency_code: currency,
          p_effective_now: true,
          p_reason: 'self_service_upgrade',
          p_correlation_id: `ui-plan-change-${Date.now()}`,
          p_metadata: { source: 'settings.billing.choose_plan' },
        } as never);

        if (error) throw error;

        const result = (data || {}) as { changed?: boolean; estimated_charge_minor?: number; currency_code?: string };
        if (result.changed) {
          const amount = result.estimated_charge_minor || 0;
          const label = result.currency_code || currency;
          toast({
            title: 'Plan changed',
            description: `Your ${productCode} subscription is now on ${plan.tier}. Estimated prorated charge: ${formatPrice(amount, label as 'USD' | 'NGN' | 'GBP')}.`,
          });
        } else {
          toast({ title: 'No change', description: 'You are already on this plan.' });
        }
      } else {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Billing & Plans</span>
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-1 text-muted-foreground">No active subscription found for this company yet.</p>
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
