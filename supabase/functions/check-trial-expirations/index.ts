import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/security.ts';

const THRESHOLDS = [30, 14, 3, 1, 0];
const dateAtOffset = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);
  const headers = { ...buildCorsHeaders(request), 'Content-Type': 'application/json' };
  const authorization = request.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (authorization !== `Bearer ${serviceKey}`) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });

  const url = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(url, serviceKey);
  const results: Array<{ subscriptionId: string; daysRemaining: number; status: string }> = [];

  for (const daysRemaining of THRESHOLDS) {
    const targetDate = dateAtOffset(daysRemaining);
    const { data: subscriptions, error } = await supabase
      .from('saas_company_plan_subscriptions')
      .select('id,company_id,trial_end_at,companies!inner(owner_id),saas_plans!inner(name)')
      .eq('status', 'trialing')
      .gte('trial_end_at', `${targetDate}T00:00:00.000Z`)
      .lt('trial_end_at', `${targetDate}T23:59:59.999Z`);
    if (error) throw error;

    for (const subscription of subscriptions || []) {
      const userId = subscription.companies.owner_id;
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'trial_expiring')
        .contains('metadata', { subscription_id: subscription.id, days_remaining: daysRemaining })
        .maybeSingle();
      if (existing) {
        results.push({ subscriptionId: subscription.id, daysRemaining, status: 'duplicate_skipped' });
        continue;
      }

      const title = daysRemaining === 0 ? 'Your FishGate trial ends today' : `Your FishGate trial ends in ${daysRemaining} days`;
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message: `${subscription.saas_plans.name} trial access ${daysRemaining === 0 ? 'ends today' : `ends on ${targetDate}`}. Choose a plan to continue.`,
        type: 'trial_expiring',
        link: '/upgrade',
        metadata: { subscription_id: subscription.id, days_remaining: daysRemaining, trial_end_at: subscription.trial_end_at },
      });
      if (notificationError) throw notificationError;

      const emailResponse = await fetch(`${url}/functions/v1/send-trial-expiry-notice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id, daysRemaining }),
      });
      results.push({ subscriptionId: subscription.id, daysRemaining, status: emailResponse.ok ? 'sent' : 'notification_only' });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { headers });
});
