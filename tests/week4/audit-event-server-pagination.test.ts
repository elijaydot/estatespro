import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811220000_platform_audit_event_server_pagination.sql'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('audit event server pagination', () => {
  it('supports every Events tab filter with bounded deterministic pages', () => {
    for (const parameter of ['p_company_id', 'p_actor_user_id', 'p_search', 'p_severity', 'p_result_status', 'p_correlation_id', 'p_created_after']) {
      expect(migration).toContain(parameter);
    }
    expect(migration).toContain('least(100, greatest(5, coalesce(p_page_size, 25)))');
    expect(migration).toContain('ORDER BY created_at DESC, id DESC');
    expect(migration).toContain("'total_count', v_total_count");
  });

  it('adds indexes for high-selectivity operator filters', () => {
    expect(migration).toContain('idx_platform_audit_events_actor_created');
    expect(migration).toContain('idx_platform_audit_events_result_created');
    expect(migration).toContain('idx_platform_audit_events_severity_created');
  });

  it('wires the Events table to server rows and totals', () => {
    expect(hooks).toContain("supabase.rpc('platform_get_audit_events_page'");
    expect(page).toContain('(pagedEvents.data?.rows || []).map((item)');
    expect(page).toContain('total={pagedEvents.data?.totalCount || 0}');
    expect(page).not.toContain('filteredEvents.slice((eventsPage - 1) * monitorPageSize');
  });
});