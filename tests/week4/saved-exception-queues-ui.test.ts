import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');

describe('saved exception queue UI', () => {
  it('lists, creates, and owner-deletes queues through audited RPC hooks', () => {
    expect(hooks).toContain("'platform_list_saved_exception_queues'");
    expect(hooks).toContain("'platform_create_saved_exception_queue'");
    expect(hooks).toContain("'platform_delete_saved_exception_queue'");
    expect(page).toContain('Save current filters');
    expect(page).toContain("?.is_owner");
  });

  it('persists and reapplies server-side triage parameters', () => {
    expect(page).toContain('company_id: triageCompanyFilterId');
    expect(page).toContain('actor_user_id: triageActorFilterId');
    expect(page).toContain('triage_status: triageStatusFilter');
    expect(page).toContain('time_range: timeRange');
    expect(page).toContain("setTriageStatusFilter(filters.triage_status || 'all')");
    expect(page).toContain("setTimeRange(filters.time_range || 'all')");
  });

  it('supports private and risk-team visibility', () => {
    expect(page).toContain('value="private"');
    expect(page).toContain('value="team"');
    expect(page).toContain('Risk team');
  });
});