import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260725110000_saas_billing_entitlements_world_class_remediation.sql',
);

const phaseCompletionMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260725173000_saas_phase_completion_atomic_quota_admin_bridge.sql',
);

const billingSettingsPath = resolve(
  process.cwd(),
  'src/components/settings/BillingPlansSettings.tsx',
);

const pmInviteHookPath = resolve(
  process.cwd(),
  'src/hooks/useCompanies.ts',
);

const saasCheckoutFunctionPath = resolve(
  process.cwd(),
  'supabase/functions/saas-subscription-checkout/index.ts',
);

const saasVerifyFunctionPath = resolve(
  process.cwd(),
  'supabase/functions/saas-verify-subscription-payment/index.ts',
);

const saasRenewalRunnerPath = resolve(
  process.cwd(),
  'supabase/functions/run-subscription-renewals/index.ts',
);

const supabaseConfigPath = resolve(
  process.cwd(),
  'supabase/config.toml',
);

const aiFunctionPaths = [
  'supabase/functions/ai-chat/index.ts',
  'supabase/functions/ai-document-intelligence/index.ts',
  'supabase/functions/ai-financial-insights/index.ts',
  'supabase/functions/ai-generate-description/index.ts',
  'supabase/functions/ai-maintenance-triage/index.ts',
  'supabase/functions/ai-predictive-analytics/index.ts',
  'supabase/functions/ai-smart-search/index.ts',
  'supabase/functions/ai-suggest-reply/index.ts',
  'supabase/functions/ai-tenant-chatbot/index.ts',
].map((path) => resolve(process.cwd(), path));

describe('saas billing and entitlement remediation migration', () => {
  it('creates invoice and payment-attempt ledger with payment-before-entitlement functions', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.saas_subscription_invoices');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.saas_subscription_payment_attempts');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_prepare_plan_change_charge');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_finalize_plan_change_after_payment');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_mark_plan_change_payment_failed');
    expect(sql).toContain('requires_payment');
    expect(sql).toContain('billing.subscription.payment_required');
  });

  it('adds renewal scheduler and dunning workflow functions', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_queue_subscription_renewal_invoices');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_process_subscription_renewals');
    expect(sql).toContain('dunning_attempt_count');
    expect(sql).toContain("invoice_status = 'uncollectible'");
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_schedule_subscription_renewal_worker');
    expect(sql).toContain("'saas_subscription_renewal_worker_hourly'");
    expect(sql).toContain("'0 * * * *'");
  });

  it('adds PM seat and tenant status metering corrections plus reconciliation', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_adjust_usage_counter');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_reconcile_usage_counters');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_meter_pm_seat_insert');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_meter_pm_seat_update');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_meter_tenant_status_update');
    expect(sql).toContain('trg_saas_meter_pm_seat_insert');
    expect(sql).toContain('trg_saas_meter_tenant_status_update');
  });
});

describe('billing UI payment-before-entitlement flow', () => {
  it('routes paid plan changes through checkout and explicit payment verification', () => {
    const source = readFileSync(billingSettingsPath, 'utf8');

    expect(source).toContain("supabase.functions.invoke('saas-subscription-checkout'");
    expect(source).toContain("supabase.functions.invoke('saas-verify-subscription-payment'");
    expect(source).toContain('pendingVerificationByProduct');
    expect(source).toContain('Verify Payment');
    expect(source).toContain('plan.tier !== \'free\'');
    expect(source).toContain('PENDING_VERIFICATIONS_STORAGE_KEY');
    expect(source).toContain('window.localStorage.setItem');
    expect(source).toContain("url.searchParams.get('payment_status')");
    expect(source).toContain("url.searchParams.get('reference')");
    expect(source).toContain('void handleVerifyPendingPayment(matchingProductCode)');
    expect(source).toContain('MAX_PAYMENT_VERIFY_RETRIES');
    expect(source).toContain('payload.pending');
    expect(source).toContain('retryAfterMs');
    expect(source).toContain('Payment is still processing');
  });
});

describe('pm invite quota guard', () => {
  it('checks property manager seat quota before invite creation', () => {
    const source = readFileSync(pmInviteHookPath, 'utf8');

    expect(source).toContain('assertQuotaAvailable');
    expect(source).toContain("quotaCode: 'property_manager_seats'");
    expect(source).toContain("requestedDelta: 1");
  });
});

describe('ai quota enforcement', () => {
  it('guards every ai-* edge function with saas ai credit checks', () => {
    for (const filePath of aiFunctionPaths) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain('enforceAiCreditQuota');
      expect(source).toContain('quotaResult');
      expect(source).toContain('quotaResult.allowed');
    }
  });

  it('applies differentiated ai credit deltas by function cost profile', () => {
    const aiChat = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-chat/index.ts'), 'utf8');
    const aiDocIntel = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-document-intelligence/index.ts'), 'utf8');
    const aiFinancial = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-financial-insights/index.ts'), 'utf8');
    const aiGenerate = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-generate-description/index.ts'), 'utf8');
    const aiMaintenance = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-maintenance-triage/index.ts'), 'utf8');
    const aiPredictive = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-predictive-analytics/index.ts'), 'utf8');
    const aiSmartSearch = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-smart-search/index.ts'), 'utf8');

    expect(aiChat).toContain('requestedDelta: 2');
    expect(aiDocIntel).toContain('requestedDelta: 4');
    expect(aiFinancial).toContain('requestedDelta: 3');
    expect(aiGenerate).toContain('requestedDelta: 2');
    expect(aiMaintenance).toContain('requestedDelta: 2');
    expect(aiPredictive).toContain('requestedDelta: 3');
    expect(aiSmartSearch).toContain('requestedDelta: 1');
  });
});

describe('phase completion quota atomicity and admin bridge', () => {
  it('adds before-insert quota enforcement plus delete decrements', () => {
    const sql = readFileSync(phaseCompletionMigrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_enforce_property_insert_quota');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_enforce_unit_insert_quota');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_enforce_tenant_insert_quota');
    expect(sql).toContain('QUOTA_HARD_LIMIT_EXCEEDED:properties_managed');
    expect(sql).toContain('QUOTA_HARD_LIMIT_EXCEEDED:units_managed');
    expect(sql).toContain('QUOTA_HARD_LIMIT_EXCEEDED:active_tenants');
    expect(sql).toContain('BEFORE INSERT ON public.properties');
    expect(sql).toContain('BEFORE INSERT ON public.units');
    expect(sql).toContain('BEFORE INSERT ON public.tenants');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_meter_property_delete');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_meter_unit_delete');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_meter_tenant_delete');
    expect(sql).toContain('AFTER DELETE ON public.properties');
    expect(sql).toContain('AFTER DELETE ON public.units');
    expect(sql).toContain('AFTER DELETE ON public.tenants');
  });

  it('adds platform admin subscription bridge to shared saas state machine', () => {
    const sql = readFileSync(phaseCompletionMigrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.platform_admin_change_company_plan');
    expect(sql).toContain('public.saas_change_subscription_plan(');
    expect(sql).toContain("public.has_platform_operator_role(v_actor, 'billing_operator')");
    expect(sql).toContain('INSUFFICIENT_PLATFORM_OPERATOR_ROLE');
    expect(sql).toContain('billing.subscription.plan_change.admin_requested');
  });
});

describe('saas billing edge functions', () => {
  it('wires checkout/verify/renewal runner functions to new SaaS RPCs', () => {
    const checkoutSource = readFileSync(saasCheckoutFunctionPath, 'utf8');
    const verifySource = readFileSync(saasVerifyFunctionPath, 'utf8');
    const renewalsSource = readFileSync(saasRenewalRunnerPath, 'utf8');
    const configSource = readFileSync(supabaseConfigPath, 'utf8');

    expect(checkoutSource).toContain('saas_prepare_plan_change_charge');
    expect(checkoutSource).toContain('saas_change_subscription_plan');
    expect(verifySource).toContain('saas_finalize_plan_change_after_payment');
    expect(verifySource).toContain('saas_mark_plan_change_payment_failed');
    expect(verifySource).toContain('payment_verification_pending');
    expect(verifySource).toContain('verificationStatus: "pending"');
    expect(verifySource).toContain('pending_verification_count');
    expect(verifySource).toContain('last_pending_verification_at');
    expect(verifySource).toContain('retryAfterMs');
    expect(verifySource).toContain('pendingCount');
    expect(verifySource).toContain('PENDING_VERIFICATION_ALERT_THRESHOLD');
    expect(verifySource).toContain('platform_create_governance_alert');
    expect(verifySource).toContain('billing_pending_verification_retry_depth');
    expect(verifySource).toContain('payment_verification_pending_threshold_exceeded');
    expect(verifySource).toContain('pending_verification_alerts_auto_resolved');
    expect(verifySource).toContain('.from("governance_alerts")');
    expect(verifySource).toContain('.contains("metadata", { attempt_id: payload.attemptId })');
    expect(verifySource).toContain('pending_alert_level: null');
    expect(verifySource).toContain('pending_alert_id: null');
    expect(verifySource).toContain('Payment reference mismatch for this attempt');
    expect(renewalsSource).toContain('saas_process_subscription_renewals');

    expect(configSource).toContain('[functions.saas-subscription-checkout]');
    expect(configSource).toContain('[functions.saas-verify-subscription-payment]');
    expect(configSource).toContain('[functions.run-subscription-renewals]');
  });
});
