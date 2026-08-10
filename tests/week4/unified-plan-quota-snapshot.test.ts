import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260810160000_unified_plan_quota_snapshot_compatibility.sql'),
  'utf8',
);

describe('unified plan quota snapshot compatibility', () => {
  it('only resolves quota dimensions configured for the effective plan', () => {
    expect(migration).toContain('v_plan_id := public.saas_get_effective_plan_id');
    expect(migration).toContain('FROM public.saas_plan_quotas plan_quota');
    expect(migration).toContain('WHERE plan_quota.plan_id = v_plan_id');
    expect(migration).toContain('JOIN LATERAL public.saas_get_effective_quota_limits');
  });

  it('does not add an unapproved AI quota to the unified catalog', () => {
    expect(migration).not.toContain("INSERT INTO public.saas_plan_quotas");
  });

  it('includes pooled groups in catalog impact and decrease protection', () => {
    expect(migration).toContain('FROM public.saas_owner_group_plan_subscriptions group_subscription');
    expect(migration).toContain('public.saas_catalog_plan_has_active_subscriptions(v_plan_id)');
    expect(migration).toContain("RAISE EXCEPTION 'PAID_SUBSCRIBER_QUOTA_DECREASE_POLICY_REQUIRED'");
  });
});