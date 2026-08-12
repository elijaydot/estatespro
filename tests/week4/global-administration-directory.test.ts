import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811150000_platform_global_administration_directory.sql'), 'utf8');
const verificationCorrection = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811180000_platform_global_directory_publisher_verification.sql'), 'utf8');

describe('global administration directory', () => {
  it('supports every global administration entity with bounded pages', () => {
    for (const type of ['company', 'user', 'landlord', 'property_manager', 'billing_group', 'subscription']) {
      expect(migration).toContain(`'${type}'`);
    }
    expect(migration).toContain('least(100, greatest(10, coalesce(p_page_size, 20)))');
    expect(migration).toContain("'total_count', v_total_count");
  });

  it('deduplicates landlord and PM identities with relationship counts', () => {
    expect(migration).toContain('GROUP BY c.owner_id, p.name, p.email');
    expect(migration).toContain('GROUP BY cm.user_id, p.name, p.email');
    expect(migration).toContain("cm.role = 'property_manager' AND cm.status = 'approved'");
    expect(migration).toContain("'company_count', count(DISTINCT cm.company_id)");
  });

  it('unifies exact company and billing-group subscriptions', () => {
    expect(migration).toContain("'scope_type', 'company'");
    expect(migration).toContain("'scope_type', 'owner_group'");
    expect(migration.match(/s\.id AS entity_id|s\.id,/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('uses indexed search and platform-only authorization', () => {
    expect(migration).toContain('idx_platform_profiles_name_search');
    expect(migration).toContain('idx_platform_company_members_role_status_user');
    expect(migration).toContain('PLATFORM_OPERATOR_REQUIRED');
    expect(migration).toContain('REVOKE ALL ON FUNCTION');
  });

  it('uses publisher verification state for company directory status', () => {
    expect(verificationCorrection).toContain('LEFT JOIN public.publisher_verifications pv ON pv.company_id = c.id');
    expect(verificationCorrection).toContain("CASE WHEN pv.state = 'verified' THEN 'verified' ELSE 'unverified' END");
    expect(verificationCorrection).not.toContain('c.is_verified');
  });
});