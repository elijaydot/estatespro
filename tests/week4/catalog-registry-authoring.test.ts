import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260810170000_catalog_registry_authoring.sql'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/CatalogManagement.tsx'), 'utf8');

describe('catalog registry authoring', () => {
  it('uses super-admin-only audited transactional operations', () => {
    expect(migration).toContain('saas_catalog_create_addon');
    expect(migration).toContain('saas_catalog_create_quota_dimension');
    expect(migration).toContain('saas_catalog_create_entitlement_key');
    expect(migration.match(/SUPER_ADMIN_REQUIRED/g)?.length).toBe(3);
    expect(migration).toContain("'catalog.addon.created'");
    expect(migration).toContain("'catalog.quota_dimension.created'");
    expect(migration).toContain("'catalog.entitlement_key.created'");
  });

  it('wires all three authoring dialogs to RPCs', () => {
    expect(page).toContain("openAuthoring('addon')");
    expect(page).toContain("openAuthoring('quota')");
    expect(page).toContain("openAuthoring('entitlement')");
    expect(page).toContain("fn: 'saas_catalog_create_addon'");
    expect(page).toContain("fn: 'saas_catalog_create_quota_dimension'");
    expect(page).toContain("fn: 'saas_catalog_create_entitlement_key'");
  });
});