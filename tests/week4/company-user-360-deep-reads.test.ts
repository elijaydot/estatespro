import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811260000_platform_company_user_360_deep_reads.sql'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('deep Company 360 and User 360 reads', () => {
  it('provides bounded deterministic membership pages', () => {
    expect(migration).toContain('platform_get_company_360_members_page');
    expect(migration).toContain('platform_get_user_360_companies_page');
    expect(migration.match(/least\(100, greatest\(5, coalesce\(p_page_size, 20\)\)\)/g)).toHaveLength(2);
    expect(migration.match(/ORDER BY created_at DESC, id DESC/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration.match(/'total_count', v_total_count/g)).toHaveLength(2);
  });

  it('returns profile, role, owner, and suspension context', () => {
    expect(migration).toContain("'owner', v_owner");
    expect(migration).toContain("'profile', v_profile");
    expect(migration).toContain("'platform_roles', v_roles");
    expect(migration.match(/'active_suspension', v_suspension/g)).toHaveLength(2);
  });

  it('enforces operator authorization and avoids removed verification columns', () => {
    expect(migration).toContain('CONTROL_PLANE_ENTITY_360_PREREQUISITES_MISSING');
    expect(migration.match(/INSUFFICIENT_PLATFORM_OPERATOR_ROLE/g)).toHaveLength(2);
    expect(migration).toContain("has_platform_operator_role(v_actor, 'support_operator')");
    expect(migration).not.toContain('is_verified');
  });

  it('wires selected entity profiles and exact membership totals into both 360 tabs', () => {
    expect(hooks).toContain("supabase.rpc('platform_get_company_360_members_page'");
    expect(hooks).toContain("supabase.rpc('platform_get_user_360_companies_page'");
    expect(page).toContain('company360Members.data.totalCount');
    expect(page).toContain('user360Companies.data.totalCount');
    expect(page).toContain('company360Snapshot.data.portfolio.property_count');
    expect(page).toContain('user360Companies.data.platformRoles');
  });
});