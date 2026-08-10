import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260810140000_owner_billing_group_addon_override_operations.sql'),
  'utf8',
);

describe('owner billing group add-on and override operations', () => {
  it('lets true owners manage group add-ons without creating trials', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.owner_billing_group_set_addon_status');
    expect(migration).toContain('PERFORM public.owner_billing_group_assert_actor(v_owner_id)');
    expect(migration).toContain("'active'");
    expect(migration).toContain("'canceled'");
    expect(migration).not.toContain('trial_end_at');
    expect(migration).not.toContain("'trialing'");
  });

  it('keeps quota and entitlement overrides super-admin-only', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.owner_billing_group_assert_super_admin');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.platform_set_owner_billing_group_quota_override');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.platform_set_owner_billing_group_entitlement_override');
    expect(migration.match(/PERFORM public\.owner_billing_group_assert_super_admin\(\)/g)?.length).toBe(4);
  });

  it('validates override modes, values, decisions, reasons, and expiry', () => {
    expect(migration).toContain("p_mode NOT IN ('increment', 'set')");
    expect(migration).toContain("p_decision NOT IN ('allow', 'deny')");
    expect(migration).toContain('p_value IS NULL OR p_value < 0');
    expect(migration).toContain('OWNER_BILLING_GROUP_OVERRIDE_EXPIRY_MUST_BE_FUTURE');
    expect(migration).toContain('PERFORM public.owner_billing_group_assert_reason(p_reason)');
  });

  it('audits add-on and override set/clear operations', () => {
    expect(migration).toContain("'billing.group.addon.status_changed'");
    expect(migration).toContain("'billing.group.quota_override.set'");
    expect(migration).toContain("'billing.group.quota_override.cleared'");
    expect(migration).toContain("'billing.group.entitlement_override.set'");
    expect(migration).toContain("'billing.group.entitlement_override.cleared'");
    expect(migration).toContain('INSERT INTO public.saas_owner_group_subscription_events');
  });
});