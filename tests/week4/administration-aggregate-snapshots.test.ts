import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811170000_platform_administration_aggregate_snapshots.sql'), 'utf8');

describe('administration aggregate snapshots', () => {
  it('persists global entity and subscription aggregates', () => {
    for (const field of ['total_users', 'total_landlords', 'total_property_managers', 'total_companies', 'total_billing_groups', 'company_subscriptions', 'group_subscriptions']) {
      expect(migration).toContain(field);
    }
    expect(migration).toContain('company_subscription_statuses');
    expect(migration).toContain('group_subscription_statuses');
  });

  it('uses exact database aggregates outside browser request paths', () => {
    expect(migration).toContain('count(DISTINCT owner_id)');
    expect(migration).toContain("role = 'property_manager' AND status = 'approved'");
    expect(migration).toContain('jsonb_object_agg(status, count)');
  });

  it('derives verified companies from publisher verification without relying on the removed company column', () => {
    expect(migration).toContain("to_regclass('public.publisher_verifications') IS NOT NULL");
    expect(migration).toContain('count(DISTINCT company_id)');
    expect(migration).toContain("WHERE state = 'verified'");
    expect(migration).not.toContain('FROM public.companies WHERE is_verified');
    expect(migration).toMatch(/WHERE state = 'verified'[\s\S]*?INTO v_verified_companies;[\s\S]*?END IF;\s+INSERT INTO public\.platform_administration_snapshots/);
  });

  it('supports audited manual refresh and hourly scheduling', () => {
    expect(migration).toContain('platform_refresh_administration_snapshot');
    expect(migration).toContain('analytics.administration_snapshot.refreshed');
    expect(migration).toContain("platform_administration_snapshot_hourly', '23 * * * *'");
  });
});