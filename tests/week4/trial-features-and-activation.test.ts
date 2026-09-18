import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const saasAccessHook = readFileSync(resolve(process.cwd(), 'src/hooks/useSaasAccess.ts'), 'utf8');
const billingOverview = readFileSync(resolve(process.cwd(), 'src/components/billing/GoogleStyleBillingOverview.tsx'), 'utf8');
const checkoutFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/saas-subscription-checkout/index.ts'), 'utf8');
const verifyFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/saas-verify-subscription-payment/index.ts'), 'utf8');
const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260918050000_unify_trials_and_plan_finalization.sql'), 'utf8');

describe('trial feature access and dynamic plan activation', () => {
  it('useSaasAccess recognizes trial state and unlocks all capabilities', () => {
    expect(saasAccessHook).toContain("sub?.status === 'trialing'");
    expect(saasAccessHook).toContain('isTrialing: true');
    expect(saasAccessHook).toContain('entitlements: ALL_TRUE_ENTITLEMENTS');
    expect(saasAccessHook).toContain('trialDaysRemaining');
  });

  it('GoogleStyleBillingOverview initiates checkout with core_property and persists plan selection', () => {
    expect(billingOverview).toContain("productCode: 'core_property'");
    expect(billingOverview).not.toContain("productCode: 'pm_core'");
    expect(billingOverview).toContain("window.sessionStorage.setItem('fishgate_pending_plan_code', plan.code)");
    expect(billingOverview).toContain("window.sessionStorage.getItem('fishgate_pending_plan_code')");
  });

  it('GoogleStyleBillingOverview dynamically matches celebration modal to purchased plan without hardcoding Growth', () => {
    expect(billingOverview).toContain('data?.plan_code');
    expect(billingOverview).toContain('pendingPlanCode');
    expect(billingOverview).toContain('setCelebrationPlan(matchedPlan)');
    // Fallback must not hardcode Growth (RWA_PLANS[1])
    expect(billingOverview).not.toContain('|| RWA_PLANS[1]');
  });

  it('checkout edge function normalizes product code and stores target_plan_code', () => {
    expect(checkoutFunction).toContain('const productCode = (body.productCode === "pm_core" || !body.productCode) ? "core_property" : body.productCode;');
    expect(checkoutFunction).toContain('target_plan_code: body.planCode');
  });

  it('verify edge function returns plan_code and handles direct Paystack plan activation', () => {
    expect(verifyFunction).toContain('target_plan_code: finalPlanCode');
    expect(verifyFunction).toContain('plan_code: finalPlanCode');
    expect(verifyFunction).toContain('saas_change_subscription_plan');
  });

  it('SQL migration grants full trial entitlements and accepts target_plan_code or plan_code', () => {
    expect(migration).toContain("v_sub_status = 'trialing'");
    expect(migration).toContain('RETURN true');
    expect(migration).toContain("coalesce(metadata, '{}'::jsonb)");
    expect(migration).toContain("v_invoice.metadata->>'plan_code'");
    expect(migration).toContain("v_attempt.metadata->>'plan_code'");
  });
});
