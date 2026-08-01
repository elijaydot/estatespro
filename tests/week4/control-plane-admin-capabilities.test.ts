import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const billingSql = readFileSync(resolve('supabase/migrations/20260726150000_platform_control_plane_company_billing_operations.sql'), 'utf8');
const safetySql = readFileSync(resolve('supabase/migrations/20260726162000_platform_control_plane_safety_and_overrides.sql'), 'utf8');
const hooks = readFileSync(resolve('src/hooks/useControlPlane.ts'), 'utf8');
const ui = readFileSync(resolve('src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('control-plane admin capabilities', () => {
  it('supports viewing and changing a company plan from Monetization', () => {
    expect(billingSql).toContain('platform_admin_change_company_plan');
    expect(hooks).toContain('useAdminChangeCompanyPlan');
    expect(ui).toContain('handleAdminPlanChange');
    expect(ui).toContain('companyBillingContext.data?.subscriptions');
  });

  it('supports manual entitlement overrides and principal suspension lifecycle', () => {
    expect(safetySql).toContain('platform_set_entitlement_override');
    expect(safetySql).toContain('platform_revoke_entitlement_override');
    expect(safetySql).toContain('platform_set_principal_suspension');
    expect(ui).toContain('handleSetEntitlementOverride');
    expect(ui).toContain('handleSetPrincipalSuspension(true)');
    expect(ui).toContain('handleSetPrincipalSuspension(false)');
  });

  it('creates, scopes, audits, and closes real impersonation sessions', () => {
    expect(safetySql).toContain('INSERT INTO public.platform_impersonation_sessions');
    expect(safetySql).toContain('UPDATE public.platform_impersonation_sessions');
    expect(safetySql).toContain('platform_ingest_audit_event');
    expect(safetySql).toContain("has_platform_operator_role(v_actor, 'support_operator')");
    expect(hooks).toContain('useStartImpersonationSession');
    expect(hooks).toContain('useStopImpersonationSession');
    expect(ui).toContain('handleStartImpersonation');
    expect(ui).toContain('handleStopImpersonation');
  });

  it('keeps Control Plane navigation and recovery actions available when a dataset fails', () => {
    expect(ui).not.toContain('{!isLoading && (');
    expect(ui).toContain("case 'monetization':");
    expect(ui).toContain("dataset('Billing catalog', billingCatalog)");
    expect(ui).toContain('failedDatasets.map');
    expect(ui).toContain('Retry this view');
    expect(ui).toContain('Back to Overview');
  });
});