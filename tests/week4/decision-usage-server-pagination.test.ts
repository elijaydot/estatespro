import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811230000_platform_decision_usage_server_pagination.sql'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('decision and usage server pagination', () => {
  it('provides bounded deterministic RPC pages and exact totals', () => {
    expect(migration.match(/least\(100, greatest\(5, coalesce\(p_page_size, 25\)\)\)/g)).toHaveLength(2);
    expect(migration).toContain('ORDER BY created_at DESC, id DESC');
    expect(migration).toContain('ORDER BY snapshot_at DESC, id DESC');
    expect(migration.match(/'total_count', v_total_count/g)).toHaveLength(2);
  });

  it('passes decision, company, actor, time, and usage search filters server-side', () => {
    expect(hooks).toContain("supabase.rpc('platform_get_entitlement_decisions_page'");
    expect(hooks).toContain("supabase.rpc('platform_get_usage_snapshots_page'");
    expect(hooks).toContain("input.decision === 'allowed' ? true");
    expect(hooks).toContain('p_snapshot_after: input.snapshotAfter || null');
  });

  it('renders server rows and exact totals without browser slices', () => {
    expect(page).toContain('(pagedDecisions.data?.rows || []).map((item)');
    expect(page).toContain('(pagedUsage.data?.rows || []).map((item)');
    expect(page).toContain('total={pagedDecisions.data?.totalCount || 0}');
    expect(page).toContain('total={pagedUsage.data?.totalCount || 0}');
    expect(page).not.toContain('filteredDecisions.slice((decisionsPage - 1)');
    expect(page).not.toContain('filteredUsage.slice((usagePage - 1)');
  });
});