import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811250000_platform_safety_operations_server_pagination.sql'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('safety operations server pagination', () => {
  it('provides bounded exact pages for all three operational lists', () => {
    expect(migration.match(/least\(100, greatest\(5, coalesce\(p_page_size, 20\)\)\)/g)).toHaveLength(3);
    expect(migration.match(/'total_count', v_total_count/g)).toHaveLength(3);
    expect(migration).toContain('ORDER BY created_at DESC, id DESC');
    expect(migration).toContain('ORDER BY started_at DESC, id DESC');
  });

  it('uses partial indexes for active operational records', () => {
    expect(migration).toContain('WHERE revoked_at IS NULL');
    expect(migration).toContain('WHERE is_active = true');
    expect(migration).toContain('WHERE ended_at IS NULL');
  });

  it('resolves the current operator session independently of list limits', () => {
    expect(migration).toContain('platform_get_current_operator_impersonation_session');
    expect(migration).toContain('session.actor_user_id = v_actor');
    expect(migration).toContain('session.expires_at > now()');
    expect(hooks).toContain("supabase.rpc('platform_get_current_operator_impersonation_session'");
    expect(page).toContain('const activeOperatorImpersonation = currentOperatorImpersonation.data');
  });

  it('renders all three tables from server rows and exact totals', () => {
    expect(page).toContain('(pagedEntitlementOverrides.data?.rows || []).map((row)');
    expect(page).toContain('(pagedActiveSuspensions.data?.rows || []).map((row)');
    expect(page).toContain('(pagedImpersonationSessions.data?.rows || []).map((row)');
    expect(page).toContain('total={pagedEntitlementOverrides.data?.totalCount || 0}');
    expect(page).toContain('total={pagedActiveSuspensions.data?.totalCount || 0}');
    expect(page).toContain('total={pagedImpersonationSessions.data?.totalCount || 0}');
  });
});