import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260811110000_catalog_assignment_authoring.sql'),
  'utf8',
);
const page = readFileSync(resolve(process.cwd(), 'src/pages/CatalogManagement.tsx'), 'utf8');

describe('catalog assignment authoring', () => {
  it.each([
    ['saas_catalog_assign_quota_to_plan', 'saas_plan_quotas'],
    ['saas_catalog_assign_entitlement_to_plan', 'saas_plan_entitlements'],
    ['saas_catalog_set_addon_quota_effect', 'saas_addon_quota_overrides'],
    ['saas_catalog_set_addon_entitlement_effect', 'saas_addon_entitlements'],
  ])('provides audited idempotent %s writes', (rpc, table) => {
    expect(migration).toContain(`FUNCTION public.${rpc}`);
    expect(migration).toContain(`INSERT INTO public.${table}`);
    expect(migration).toContain('ON CONFLICT');
  });

  it('validates super-admin access and typed entitlement values', () => {
    expect(migration.match(/SUPER_ADMIN_REQUIRED/g)?.length).toBe(4);
    expect(migration).toContain('ENTITLEMENT_VALUE_TYPE_MISMATCH');
    expect(migration).toContain("v_value_type = 'boolean'");
    expect(migration).toContain("v_value_type = 'integer'");
    expect(migration).toContain("v_value_type = 'json'");
  });

  it('audits every assignment and effect operation', () => {
    expect(migration).toContain("'catalog.plan_quota.assigned'");
    expect(migration).toContain("'catalog.plan_entitlement.assigned'");
    expect(migration).toContain("'catalog.addon_quota_effect.set'");
    expect(migration).toContain("'catalog.addon_entitlement_effect.set'");
  });

  it('wires plan assignments and add-on effects into Catalog Management', () => {
    expect(page).toContain("fn: 'saas_catalog_assign_quota_to_plan'");
    expect(page).toContain("fn: 'saas_catalog_assign_entitlement_to_plan'");
    expect(page).toContain("fn: 'saas_catalog_set_addon_quota_effect'");
    expect(page).toContain("fn: 'saas_catalog_set_addon_entitlement_effect'");
    expect(page).toContain('Plan quota coverage');
    expect(page).toContain('<TablePagination');
  });

  it('keeps quota and entitlement registry pagination independent and functional', () => {
    expect(page).toContain('const [quotaPage, setQuotaPage]');
    expect(page).toContain('const [entitlementPage, setEntitlementPage]');
    expect(page).toContain('setQuotaPageSize(size)');
    expect(page).toContain('setEntitlementPageSize(size)');
    expect(page).not.toContain('onPageSizeChange={() => undefined}');
  });
});