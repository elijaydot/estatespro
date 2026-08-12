import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const remoteSelect = readFileSync(resolve(process.cwd(), 'src/components/control-plane/RemoteEntitySelect.tsx'), 'utf8');
const operators = readFileSync(resolve(process.cwd(), 'src/components/control-plane/tabs/OperatorsTab.tsx'), 'utf8');

describe('global administration directory UI', () => {
  it('uses the unified RPC for six global directory modes', () => {
    expect(hooks).toContain("'platform_search_global_entities'");
    for (const type of ['subscription', 'landlord', 'property_manager', 'billing_group', 'company', 'user']) {
      expect(page).toContain(`value="${type}"`);
    }
    expect(page).toContain('globalDirectory.data?.total_count');
  });

  it('provides exact 360 drill-throughs for every scope', () => {
    expect(page).toContain('/super-admin/billing-groups?group=');
    expect(page).toContain("setActiveTab(row.entity_type === 'subscription' ? 'monetization' : 'company360')");
    expect(page).toContain("setActiveTab('user360')");
  });

  it('uses bounded remote search for privileged entity selection', () => {
    expect(remoteSelect).toContain('deferredSearch.trim().length >= 2');
    expect(remoteSelect).toContain('useGlobalEntityDirectory(entityType, 1, 20');
    expect(operators).toContain('<RemoteEntitySelect');
    expect(page.match(/<RemoteEntitySelect/g)?.length).toBeGreaterThanOrEqual(5);
  });
});