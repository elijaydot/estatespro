import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260811120000_trial_expiry_policy_enforcement.sql'),
  'utf8',
);
const page = readFileSync(resolve(process.cwd(), 'src/pages/CatalogManagement.tsx'), 'utf8');

describe('trial expiry policy enforcement', () => {
  it('stores constrained per-plan policy and idempotent subscription state', () => {
    expect(migration).toContain("post_trial_action IN ('grace_period', 'lockout')");
    expect(migration).toContain('post_trial_grace_days BETWEEN 1 AND 90');
    expect(migration).toContain('trial_policy_enforced_at timestamptz');
    expect(migration).toContain("status = 'trialing' AND trial_policy_enforced_at IS NULL");
  });

  it('provides an audited super-admin catalog policy operation', () => {
    expect(migration).toContain('FUNCTION public.saas_catalog_set_trial_policy');
    expect(migration).toContain('SUPER_ADMIN_REQUIRED');
    expect(migration).toContain("'catalog.trial_policy.updated'");
    expect(migration).toContain('TO authenticated');
  });

  it('processes expired trials safely into grace or lockout', () => {
    expect(migration).toContain('FUNCTION public.saas_process_expired_trials');
    expect(migration).toContain('FOR UPDATE OF subscription SKIP LOCKED');
    expect(migration).toContain("trial_final_action = 'grace_period'");
    expect(migration).toContain("trial_final_action = 'lockout'");
    expect(migration).toContain("payment_state = 'grace'");
    expect(migration).toContain("payment_state = 'canceled'");
    expect(migration).toContain('TO service_role');
  });

  it('schedules the processor and exposes the complete Catalog controls', () => {
    expect(migration).toContain("'saas_trial_expiry_worker_hourly'");
    expect(migration).toContain("'17 * * * *'");
    expect(page).toContain("rpc('saas_catalog_set_trial_policy'");
    expect(page).toContain('Expired trials are processed hourly');
    expect(page).toContain('<SelectItem value="grace_period">Grace period</SelectItem>');
    expect(page).toContain('<SelectItem value="lockout">Lock access</SelectItem>');
    expect(page).not.toContain('Post-expiry behavior is not implemented');
  });
});