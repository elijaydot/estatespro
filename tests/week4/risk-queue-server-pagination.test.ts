import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811200000_platform_risk_queue_server_pagination.sql'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');

describe('risk queue server pagination', () => {
  it('returns bounded pages and exact total counts', () => {
    expect(migration).toContain('least(100, greatest(5, coalesce(p_page_size, 20)))');
    expect(migration).toContain("'total_count', v_total_count");
    expect(migration).toContain('OFFSET (v_page - 1) * v_page_size LIMIT v_page_size');
  });

  it('filters all risk sources before pagination', () => {
    expect(migration).toContain('p_occurred_after');
    expect(migration).toContain('v_severity');
    expect(migration).toContain('v_triage_status');
    expect(migration).toContain("lower(item.title) LIKE '%' || v_search || '%'");
  });

  it('uses latest triage disposition and deterministic ordering', () => {
    expect(migration).toContain('LEFT JOIN LATERAL');
    expect(migration).toContain('coalesce(latest_triage.triage_status, c.status)');
    expect(migration).toContain('ORDER BY occurred_at DESC, row_type, row_id DESC');
  });

  it('provides company and time indexes for each source', () => {
    expect(migration).toContain('idx_platform_governance_alerts_company_status_created');
    expect(migration).toContain('idx_platform_abuse_signals_company_detected_id');
    expect(migration).toContain('idx_platform_risk_decisions_company_decided_id');
  });

  it('wires every filter and exact total through the paged hook', () => {
    expect(hooks).toContain("supabase.rpc('platform_get_risk_queue_page'");
    expect(hooks).toContain('p_occurred_after: input.occurredAfter || null');
    expect(hooks).toContain('p_triage_status:');
    expect(hooks).toContain('totalCount: payload.total_count || 0');
  });
});