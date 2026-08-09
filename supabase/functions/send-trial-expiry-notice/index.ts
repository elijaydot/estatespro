import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { buildCorsHeaders, handleCorsPreflight } from '../_shared/security.ts';

const escapeHtml = (value: unknown) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return handleCorsPreflight(request);
  const headers = { ...buildCorsHeaders(request), 'Content-Type': 'application/json' };
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (request.headers.get('Authorization') !== `Bearer ${serviceKey}`) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });

  const { subscriptionId, daysRemaining } = await request.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const { data: subscription, error } = await supabase
    .from('saas_company_plan_subscriptions')
    .select('trial_end_at,companies!inner(owner_id),saas_plans!inner(name,description,saas_plan_prices(currency_code,amount_minor),saas_plan_quotas(hard_limit,is_unlimited,saas_quota_dimensions(name)),saas_plan_entitlements(bool_value,json_value,saas_entitlement_keys(key)))')
    .eq('id', subscriptionId)
    .single();
  if (error || !subscription) return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404, headers });

  const { data: profile } = await supabase.from('profiles').select('email,name').eq('user_id', subscription.companies.owner_id).single();
  if (!profile?.email) return new Response(JSON.stringify({ error: 'Owner email not found' }), { status: 404, headers });

  const plan = subscription.saas_plans;
  const usd = plan.saas_plan_prices.find((price: { currency_code: string }) => price.currency_code === 'USD');
  const features = [
    ...plan.saas_plan_quotas.map((quota: { is_unlimited: boolean; hard_limit: number; saas_quota_dimensions: { name: string } }) => `${quota.is_unlimited ? 'Unlimited' : quota.hard_limit.toLocaleString()} ${quota.saas_quota_dimensions.name}`),
    ...plan.saas_plan_entitlements.filter((item: { bool_value: boolean }) => item.bool_value).map((item: { saas_entitlement_keys: { key: string } }) => item.saas_entitlement_keys.key.replaceAll('.', ' ')),
    ...plan.saas_plan_entitlements.filter((item: { json_value: unknown }) => item.json_value && item.json_value !== 'none').map((item: { json_value: unknown; saas_entitlement_keys: { key: string } }) => `${item.saas_entitlement_keys.key.replaceAll('.', ' ')}: ${String(item.json_value)}`),
  ];
  const heading = daysRemaining === 0 ? 'Your trial ends today' : `Your trial ends in ${daysRemaining} days`;
  const appUrl = Deno.env.get('APP_URL') || 'https://app.fishgate.co';
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f0;color:#191919;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:40px 20px"><p style="font-size:13px;font-weight:bold;letter-spacing:1px">FISHGATE</p><h1>${escapeHtml(heading)}</h1><p>Hi ${escapeHtml(profile.name || 'there')}, choose a plan before ${escapeHtml(new Date(subscription.trial_end_at).toLocaleDateString())} to keep your workspace active.</p><div style="background:white;border:1px solid #ddd;padding:24px;margin:28px 0"><h2 style="margin-top:0">${escapeHtml(plan.name)}</h2><p>${escapeHtml(plan.description || '')}</p><p style="font-size:30px;font-weight:bold">$${escapeHtml(((usd?.amount_minor || 0) / 100).toFixed(0))}<span style="font-size:14px;font-weight:normal"> / month</span></p><ul style="padding-left:20px">${features.map((feature: string) => `<li style="margin:10px 0">${escapeHtml(feature)}</li>`).join('')}</ul><a href="${appUrl}/upgrade" style="display:inline-block;background:#18181b;color:white;text-decoration:none;padding:12px 18px">View plans</a></div><p style="color:#666;font-size:13px">Platform checkout is not yet available. The plan page will connect you with the FishGate team.</p></div></body></html>`;

  const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
  const result = await resend.emails.send({ from: 'FishGate <noreply@fishgate.co>', to: [profile.email], subject: `${heading} - ${plan.name}`, html });
  return new Response(JSON.stringify({ sent: true, result }), { headers });
});
