import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260810120000_owner_billing_groups_resolution.sql'),
  'utf8',
);

describe('owner billing group resolution', () => {
  it('resolves an active group plan before company and legacy free fallbacks', () => {
    const groupLookup = migration.indexOf('FROM public.owner_billing_group_members member');
    const companyLookup = migration.indexOf('FROM public.saas_company_plan_subscriptions company_subscription');
    const freeLookup = migration.indexOf("AND plan.tier = 'free'");

    expect(groupLookup).toBeGreaterThan(-1);
    expect(companyLookup).toBeGreaterThan(groupLookup);
    expect(freeLookup).toBeGreaterThan(companyLookup);
    expect(migration).toContain("v_access_state IN ('grouped', 'needs_plan')");
    expect(migration).toContain('(plan.product_id IS NULL OR plan.product_id = product.id)');
  });

  it('pools member usage while retaining product-scoped company counters', () => {
    expect(migration).toContain('LEFT JOIN public.saas_usage_counters counter');
    expect(migration).toContain('counter.company_id = member.company_id');
    expect(migration).toContain('counter.product_id = v_product_id');
    expect(migration).not.toContain('UPDATE public.saas_usage_counters');
    expect(migration).not.toContain('INSERT INTO public.saas_usage_counters');
    expect(migration).toContain("WHEN v_is_unlimited THEN 'ok'");
    expect(migration).toContain('WHEN v_is_unlimited THEN NULL');
  });

  it('counts group increments once and stacks only the requesting company increment', () => {
    expect(migration).toContain('INTO v_group_increment');
    expect(migration).toContain('group_addon.group_id = v_group_id');
    expect(migration).toContain('company_addon.company_id = p_company_id');
    expect(migration).toContain('v_base_hard + coalesce(v_group_increment, 0) + coalesce(v_company_increment, 0)');
    expect(migration).not.toMatch(/group_addon[\s\S]{0,300}owner_billing_group_members/);
  });

  it('uses the maximum set override across group and company sources', () => {
    expect(migration).toContain('SELECT max(set_value)');
    expect(migration).toContain('FROM public.saas_owner_group_quota_overrides group_override');
    expect(migration).toContain('FROM public.saas_company_addon_subscriptions company_addon');
    expect(migration).toContain('greatest(');
  });

  it('preserves company entitlement decisions above group and catalog grants', () => {
    const companyOverride = migration.indexOf('FROM public.platform_entitlement_overrides override');
    const groupOverride = migration.indexOf('FROM public.saas_owner_group_entitlement_overrides override');
    const planGrant = migration.indexOf('FROM public.saas_plan_entitlements entitlement');

    expect(companyOverride).toBeGreaterThan(-1);
    expect(groupOverride).toBeGreaterThan(companyOverride);
    expect(planGrant).toBeGreaterThan(groupOverride);
    expect(migration).toContain('v_group_addon_allow');
    expect(migration).toContain('v_company_addon_allow');
  });
});