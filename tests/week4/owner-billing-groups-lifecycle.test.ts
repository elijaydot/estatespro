import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260810110000_owner_billing_groups_lifecycle.sql'),
  'utf8',
);

describe('owner billing group lifecycle', () => {
  it('exposes only validated lifecycle operations', () => {
    for (const operation of [
      'owner_billing_group_create',
      'owner_billing_group_add_company',
      'owner_billing_group_remove_company',
      'owner_billing_group_dissolve',
      'owner_billing_group_rename',
      'owner_billing_group_change_plan',
    ]) {
      expect(migration).toContain(`CREATE OR REPLACE FUNCTION public.${operation}`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION public.${operation}`);
    }
  });

  it('checks ownership and pooled capacity before creating the group', () => {
    const ownershipCheck = migration.indexOf('PERFORM public.owner_billing_group_assert_actor(v_owner_id)');
    const capacityCheck = migration.indexOf('PERFORM public.owner_billing_group_assert_capacity(p_plan_id, v_company_ids)');
    const groupInsert = migration.indexOf('INSERT INTO public.owner_billing_groups');

    expect(ownershipCheck).toBeGreaterThan(-1);
    expect(capacityCheck).toBeGreaterThan(ownershipCheck);
    expect(groupInsert).toBeGreaterThan(capacityCheck);
    expect(migration).toContain('v_company_owner_id <> v_owner_id');
    expect(migration).not.toContain('company_members');
  });

  it('pauses and preserves standalone subscriptions without granting a group trial', () => {
    expect(migration).toContain("SET status = 'paused'");
    expect(migration).toContain("'previous_status', status");
    expect(migration).not.toContain('DELETE FROM public.saas_company_plan_subscriptions');
    expect(migration).not.toContain('trial_end_at');
    expect(migration).toMatch(/p_plan_id,\s*'active'/);
  });

  it('protects capacity data behind true-owner authorization', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.owner_billing_group_preview_capacity');
    expect(migration).toContain('PERFORM public.owner_billing_group_assert_actor(v_owner_id)');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.owner_billing_group_preview_capacity');
    expect(migration).not.toContain('GRANT EXECUTE ON FUNCTION public.owner_billing_group_capacity_violations');
  });

  it('moves departing companies to needs-plan without reactivating old plans', () => {
    expect(migration).toContain("'needs_plan'");
    expect(migration).toContain("'previous_subscription_reactivated', false");
    expect(migration).toContain("'previous_subscriptions_reactivated', false");
    expect(migration).not.toContain("SET status = 'active'\n  WHERE company_id");
    expect(migration).toContain('OWNER_BILLING_GROUP_DISSOLVE_REQUIRED');
  });

  it('writes correlated lifecycle and platform audit events', () => {
    expect(migration).toContain('INSERT INTO public.saas_owner_group_subscription_events');
    expect(migration).toContain('INSERT INTO public.saas_owner_group_subscription_change_log');
    expect(migration).toContain('INSERT INTO public.platform_audit_events');
    expect(migration).toContain("'billing.group.created'");
    expect(migration).toContain("'billing.group.company_added'");
    expect(migration).toContain("'billing.group.company_removed'");
    expect(migration).toContain("'billing.group.dissolved'");
    expect(migration).toContain("'billing.group.plan_changed'");
  });
});