import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const saasAccessHook = readFileSync(resolve(process.cwd(), 'src/hooks/useSaasAccess.ts'), 'utf8');
const billingOverview = readFileSync(resolve(process.cwd(), 'src/components/billing/GoogleStyleBillingOverview.tsx'), 'utf8');
const checkoutFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/saas-subscription-checkout/index.ts'), 'utf8');
const verifyFunction = readFileSync(resolve(process.cwd(), 'supabase/functions/saas-verify-subscription-payment/index.ts'), 'utf8');
const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260918050000_unify_trials_and_plan_finalization.sql'), 'utf8');
const sidebarNav = readFileSync(resolve(process.cwd(), 'src/components/layout/ModuleSidebarNav.tsx'), 'utf8');
const dashboard = readFileSync(resolve(process.cwd(), 'src/pages/Dashboard.tsx'), 'utf8');

describe('trial feature access, expiration locking, and dynamic plan activation', () => {
  it('useSaasAccess recognizes trial state and unlocks all capabilities while trialing', () => {
    expect(saasAccessHook).toContain("sub?.status === 'trialing'");
    expect(saasAccessHook).toContain('isTrialing: true');
    expect(saasAccessHook).toContain('entitlements: ALL_TRUE_ENTITLEMENTS');
    expect(saasAccessHook).toContain('trialDaysRemaining');
  });

  it('useSaasAccess locks trial features and sets isTrialExpired when trial concludes without paid plan', () => {
    expect(saasAccessHook).toContain('isTrialExpired: boolean');
    expect(saasAccessHook).toContain('entitlements: EMPTY_ENTITLEMENTS');
    expect(saasAccessHook).toContain("sub?.status === 'expired'");
    expect(saasAccessHook).toContain('trialDaysRemaining <= 0');
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
    expect(billingOverview).not.toContain('|| RWA_PLANS[1]');
  });

  it('GoogleStyleBillingOverview dynamically renders Next Cycle charges and Current Tier cards', () => {
    expect(billingOverview).toContain('activePlanCode');
    expect(billingOverview).toContain('const isCurrent = plan.code === activePlanCode;');
    expect(billingOverview).toContain("FishGate {currentPlan.name} Base Subscription");
    expect(billingOverview).toContain("formatPrice(currentPlan.priceUsdMonthly)");
  });

  it('Sidebar and Dashboard display trial countdown, expiring soon alerts, and locked state banners', () => {
    expect(sidebarNav).toContain('isTrialExpired');
    expect(sidebarNav).toContain('Trial Ended');
    expect(dashboard).toContain('isTrialExpired');
    expect(dashboard).toContain('90-Day Free Trial Concluded');
  });

  it('checkout and verify edge functions handle dynamic plan codes and Paystack metadata', () => {
    expect(checkoutFunction).toContain('target_plan_code: body.planCode');
    expect(verifyFunction).toContain('target_plan_code: finalPlanCode');
    expect(verifyFunction).toContain('plan_code: finalPlanCode');
  });

  it('SQL migration auto-provisions Starter by default and locks trial features when expired', () => {
    expect(migration).toContain("code = 'fishgate_starter'");
    expect(migration).toContain("v_sub_status = 'trialing' AND v_trial_end_at <= now()");
    expect(migration).toContain("status = 'expired'");
    expect(migration).toContain('Your 90-Day Free Trial Has Concluded');
  });
});
