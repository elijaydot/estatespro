import { Check, Clock3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { untypedSupabase } from '@/integrations/supabase/untypedClient';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type UpgradePlan = {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  saas_plan_prices: Array<{ currency_code: string; amount_minor: number }>;
  saas_plan_quotas: Array<{
    hard_limit: number;
    is_unlimited: boolean;
    saas_quota_dimensions: { name: string };
  }>;
  saas_plan_entitlements: Array<{
    bool_value: boolean | null;
    json_value: unknown;
    saas_entitlement_keys: { key: string };
  }>;
};

export default function Upgrade() {
  const { activeCompanyId } = useActiveCompany();
  const query = useQuery({
    queryKey: ['upgrade-catalog', activeCompanyId],
    queryFn: async () => {
      const [plansResult, subscriptionResult] = await Promise.all([
        untypedSupabase.from('saas_plans').select('id,name,code,sort_order,saas_plan_prices(currency_code,amount_minor),saas_plan_quotas(hard_limit,is_unlimited,saas_quota_dimensions(name)),saas_plan_entitlements(bool_value,json_value,saas_entitlement_keys(key))').like('code', 'fishgate_%').eq('is_active', true).order('sort_order'),
        activeCompanyId ? supabase.from('saas_company_plan_subscriptions').select('status,trial_end_at').eq('company_id', activeCompanyId).eq('status', 'trialing').maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (plansResult.error) throw plansResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;
      return { plans: (plansResult.data || []) as UpgradePlan[], subscription: subscriptionResult.data };
    },
  });

  const trialEnd = query.data?.subscription?.trial_end_at ? new Date(query.data.subscription.trial_end_at) : null;
  const daysRemaining = trialEnd ? Math.max(0, differenceInCalendarDays(trialEnd, new Date())) : null;

  return <div className="min-h-screen bg-muted/30 px-4 py-8 md:px-8">
    <div className="mx-auto max-w-7xl space-y-8">
      {trialEnd && <div className="flex items-center justify-between gap-4 border-y bg-background px-4 py-3"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5" /><div><strong>Your trial ends in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</strong><p className="text-sm text-muted-foreground">{format(trialEnd, 'MMMM d, yyyy')}</p></div></div><Badge>Trialing</Badge></div>}
      <div><h1 className="text-3xl font-semibold">Choose your FishGate plan</h1><p className="mt-2 text-muted-foreground">One subscription across property management, Marketplace, CRM, and Bookings.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{query.data?.plans.map((plan) => {
        const usd = plan.saas_plan_prices.find((price) => price.currency_code === 'USD');
        const features = [
          ...plan.saas_plan_quotas.map((quota) => `${quota.is_unlimited ? 'Unlimited' : quota.hard_limit.toLocaleString()} ${quota.saas_quota_dimensions.name}`),
          ...plan.saas_plan_entitlements.filter((item) => item.bool_value === true).map((item) => item.saas_entitlement_keys.key.replaceAll('.', ' ')),
          ...plan.saas_plan_entitlements.filter((item) => item.json_value && item.json_value !== 'none').map((item) => `${item.saas_entitlement_keys.key.replaceAll('.', ' ')}: ${String(item.json_value)}`),
        ];
        return <Card key={plan.id} className="flex flex-col rounded-md"><CardHeader><CardTitle>{plan.name}</CardTitle><div><span className="text-3xl font-semibold">${((usd?.amount_minor || 0) / 100).toFixed(0)}</span><span className="text-muted-foreground"> / month</span></div></CardHeader><CardContent className="flex-1 space-y-3">{features.map((feature: string) => <div key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0" /><span className="capitalize">{feature}</span></div>)}</CardContent><CardFooter><Button className="w-full" asChild><a href={`mailto:sales@fishgate.co?subject=${encodeURIComponent(`Upgrade to ${plan.name}`)}`}>Talk to us about {plan.name}</a></Button></CardFooter></Card>;
      })}</div>
      <p className="text-center text-sm text-muted-foreground">Annual billing will be available after backend billing intervals and platform checkout are implemented.</p>
    </div>
  </div>;
}
