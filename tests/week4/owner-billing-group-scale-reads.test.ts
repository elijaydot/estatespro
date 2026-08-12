import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811140000_platform_owner_billing_group_directory_and_360.sql'), 'utf8');

describe('scale-grade owner billing group reads', () => {
  it('provides bounded server-side directory search and pagination', () => {
    expect(migration).toContain('platform_get_owner_billing_groups_page');
    expect(migration).toContain("least(100, greatest(10, coalesce(p_page_size, 20)))");
    expect(migration).toContain("'total_count', v_total_count");
    expect(migration).toContain('idx_owner_billing_groups_name_search');
    expect(migration).toContain('idx_owner_billing_groups_status_created');
    expect(migration).toContain("WHERE e.extname = 'pg_trgm'");
    expect(migration).toContain('%I.gin_trgm_ops');
    expect(migration).not.toContain('extensions.gin_trgm_ops');
  });

  it('loads only one selected group with independently paged collections', () => {
    expect(migration).toContain('platform_get_owner_billing_group_360');
    expect(migration).toContain('WHERE g.id = p_group_id');
    expect(migration).toContain("'members', jsonb_build_object");
    expect(migration).toContain("'invoices', jsonb_build_object");
    expect(migration).toContain("'quota_overrides', jsonb_build_object");
    expect(migration).toContain("'entitlement_overrides', jsonb_build_object");
    expect(migration).toContain("'events', jsonb_build_object");
    expect(migration).toContain("'outstanding_by_currency'");
  });

  it('requires a platform operator and grants no public execution', () => {
    expect(migration.match(/PLATFORM_OPERATOR_REQUIRED/g)?.length).toBe(2);
    expect(migration.match(/REVOKE ALL ON FUNCTION/g)?.length).toBe(2);
    expect(migration.match(/TO authenticated, service_role/g)?.length).toBe(2);
  });
});