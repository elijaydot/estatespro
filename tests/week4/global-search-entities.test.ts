import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');
const hooks = readFileSync(resolve(process.cwd(), 'src/hooks/useControlPlane.ts'), 'utf8');
const searchMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830150000_platform_search_global_entities_all_types.sql'),
  'utf8'
);
const snapshotMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260830140000_platform_company_snapshot_cross_product.sql'),
  'utf8'
);

const ALL_14_ENTITY_TYPES = [
  'subscription',
  'landlord',
  'property_manager',
  'billing_group',
  'company',
  'user',
  'property',
  'unit',
  'marketplace_listing',
  'crm_lead',
  'crm_deal',
  'crm_account',
  'guest_booking',
  'vendor',
] as const;

describe('Global Search: 14-Entity Full-Platform Coverage (Ticket E)', () => {
  it('defines all 14 entity types in GlobalEntityType type', () => {
    for (const type of ALL_14_ENTITY_TYPES) {
      expect(hooks).toContain(`'${type}'`);
    }
  });

  it('renders dropdown options for all 14 entity types in SuperAdminControlPlane directory tab', () => {
    for (const type of ALL_14_ENTITY_TYPES) {
      expect(page).toContain(`value="${type}"`);
    }
  });

  it('contains search handlers for all 14 entity types in the migration SQL', () => {
    for (const type of ALL_14_ENTITY_TYPES) {
      expect(searchMigration).toContain(`'${type}'`);
    }
    expect(searchMigration).toContain('public.platform_search_global_entities');
  });

  it('exposes cross-product activity rollup in Company 360 snapshot migration and UI (Ticket D)', () => {
    expect(snapshotMigration).toContain('product_activity');
    expect(snapshotMigration).toContain('marketplace_listing_count');
    expect(snapshotMigration).toContain('crm_lead_count');
    expect(snapshotMigration).toContain('crm_deal_open_count');
    expect(snapshotMigration).toContain('guest_booking_count');

    expect(page).toContain('Cross-Product Activity Rollup');
    expect(page).toContain('Marketplace Listings');
    expect(page).toContain('CRM Leads');
    expect(page).toContain('Open Deals');
    expect(page).toContain('Guest Bookings');
  });
});
