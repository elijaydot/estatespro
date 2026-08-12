import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811240000_platform_governance_alert_server_pagination.sql'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('governance alert server pagination', () => {
  it('provides bounded pages with all monitoring filters', () => {
    for (const filter of ['p_company_id', 'p_search', 'p_severity', 'p_status', 'p_correlation_id', 'p_created_after']) expect(migration).toContain(filter);
    expect(migration).toContain('ORDER BY created_at DESC, id DESC');
    expect(migration).toContain("'total_count', v_total_count");
  });

  it('wires exact server rows and refreshes them after mutations', () => {
    expect(hooks).toContain("supabase.rpc('platform_get_governance_alerts_page'");
    expect(hooks).toContain("queryKey: ['control-plane-alerts-page']");
    expect(page).toContain('(pagedAlerts.data?.rows || []).map((item)');
    expect(page).toContain('total={pagedAlerts.data?.totalCount || 0}');
    expect(page).not.toContain('filteredAlerts.slice((alertsPage - 1)');
  });
});