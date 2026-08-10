import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260810130000_owner_billing_groups_pooled_metering.sql'),
  'utf8',
);

describe('owner billing group pooled metering', () => {
  it('serializes writes by group or standalone company scope before quota resolution', () => {
    const lock = migration.indexOf('PERFORM pg_advisory_xact_lock');
    const quotaRead = migration.indexOf('FROM public.saas_get_effective_quota_limits');

    expect(migration).toContain("'group:' || v_group_id::text");
    expect(migration).toContain("'company:' || p_company_id::text");
    expect(lock).toBeGreaterThan(-1);
    expect(quotaRead).toBeGreaterThan(lock);
  });

  it('enforces against pooled usage while updating only the requesting company counter', () => {
    expect(migration).toContain('(v_pooled_used + p_delta) > v_hard_limit');
    expect(migration).toContain('WHERE company_id = p_company_id');
    expect(migration).toContain('RETURNING used_value INTO v_new_company_used');
    expect(migration).toContain('v_new_pooled_used := v_pooled_used + p_delta');
    expect(migration).not.toContain('WHERE company_id = ANY');
  });

  it('keeps company event history and adds pooled scope metadata', () => {
    expect(migration).toContain('v_new_company_used,');
    expect(migration).toContain("'pooled_used_value', v_new_pooled_used");
    expect(migration).toContain("'billing_scope', v_scope_key");
    expect(migration).toContain("'company_used_value', v_new_company_used");
  });

  it('preserves explicit unlimited behavior', () => {
    expect(migration).toContain('IF NOT v_is_unlimited AND (v_pooled_used + p_delta) > v_hard_limit THEN');
    expect(migration).toContain('WHEN v_is_unlimited THEN NULL');
  });
});