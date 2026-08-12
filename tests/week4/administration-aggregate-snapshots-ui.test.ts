import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const tab = readFileSync(resolve(process.cwd(), 'src/components/control-plane/tabs/AnalyticsOpsTab.tsx'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('administration aggregate snapshot UI', () => {
  it('reads only the latest persisted snapshot', () => {
    expect(hooks).toContain("from('platform_administration_snapshots'");
    expect(hooks).toContain(".order('generated_at', { ascending: false })");
    expect(hooks).toContain('.limit(1)');
  });

  it('shows global fleet and subscription status metrics', () => {
    expect(tab).toContain('Global Administration Snapshot');
    expect(tab).toContain('total_landlords');
    expect(tab).toContain('total_property_managers');
    expect(tab).toContain('company_subscription_statuses');
    expect(tab).toContain('group_subscription_statuses');
  });

  it('supports an audited manual refresh', () => {
    expect(hooks).toContain("'platform_refresh_administration_snapshot'");
    expect(page).toContain('onRefreshAdministrationSnapshot');
    expect(tab).toContain('Refresh fleet snapshot');
  });
});