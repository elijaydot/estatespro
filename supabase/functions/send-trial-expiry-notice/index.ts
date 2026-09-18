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

  const { data: profile } = await supabase.from('profiles').select('email,name').eq('user_id', (subscription as any).companies.owner_id).single();
  if (!profile?.email) return new Response(JSON.stringify({ error: 'Owner email not found' }), { status: 404, headers });

  const plan = (subscription as any).saas_plans;
  const usd = plan.saas_plan_prices.find((price: { currency_code: string }) => price.currency_code === 'USD');
  const features = [
    ...plan.saas_plan_quotas.map((quota: { is_unlimited: boolean; hard_limit: number; saas_quota_dimensions: { name: string } }) => `${quota.is_unlimited ? 'Unlimited' : quota.hard_limit.toLocaleString()} ${quota.saas_quota_dimensions.name}`),
    ...plan.saas_plan_entitlements.filter((item: { bool_value: boolean }) => item.bool_value).map((item: { saas_entitlement_keys: { key: string } }) => item.saas_entitlement_keys.key.replaceAll('.', ' ')),
    ...plan.saas_plan_entitlements.filter((item: { json_value: unknown }) => item.json_value && item.json_value !== 'none').map((item: { json_value: unknown; saas_entitlement_keys: { key: string } }) => `${item.saas_entitlement_keys.key.replaceAll('.', ' ')}: ${String(item.json_value)}`),
  ];
  const heading = daysRemaining === 0 ? 'Your trial ends today' : `Your trial ends in ${daysRemaining} days`;
  const appUrl = Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_APP_URL') || 'https://fishgatepro.com';
  const html = `<!doctype html><html><body style="margin:0;background:#0f172a;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"><div style="max-width:600px;margin:auto;padding:40px 20px"><div style="background:#1e293b;border-radius:16px;border:1px solid #334155;padding:32px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5)"><div style="text-align:center;margin-bottom:24px"><span style="display:inline-block;padding:4px 12px;background:#eab308;color:#0f172a;font-weight:bold;font-size:11px;border-radius:20px;letter-spacing:1px">FISHGATE NOTICE</span></div><h1 style="color:#ffffff;font-size:24px;text-align:center;margin-top:0">${escapeHtml(heading)}</h1><p style="color:#94a3b8;font-size:15px;line-height:1.6;text-align:center">Hi ${escapeHtml(profile.name || 'there')}, your 90-day free onboarding trial concludes on <strong style="color:#f8fafc">${escapeHtml(new Date((subscription as any).trial_end_at).toLocaleDateString())}</strong>. Choose a plan today to ensure continuous access to AI Insights, CRM, and Marketplace.</p><div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:24px;margin:24px 0"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;color:#ffffff;font-size:18px">${escapeHtml(plan.name)} Plan</h2><span style="color:#eab308;font-weight:bold;font-size:20px">$${escapeHtml(((usd?.amount_minor || 0) / 100).toFixed(0))} / mo</span></div><p style="color:#94a3b8;font-size:13px;margin:8px 0 16px">${escapeHtml(plan.description || '')}</p><ul style="padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.8">${features.map((feature: string) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul></div><div style="text-align:center;margin-top:28px"><a href="${appUrl}/settings?tab=billing" style="display:inline-block;background:#eab308;color:#0f172a;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:14px">Choose Plan & Keep Active &rarr;</a></div></div><p style="color:#64748b;font-size:12px;text-align:center;margin-top:24px">Zero interruptions to your base Property Management workspace. Need assistance? Reply to this email anytime.</p></div></body></html>`;

  const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
  const result = await resend.emails.send({ from: 'FishGate <noreply@fishgatepro.com>', to: [profile.email], subject: `${heading} - ${plan.name}`, html });
  return new Response(JSON.stringify({ sent: true, result }), { headers });
});
