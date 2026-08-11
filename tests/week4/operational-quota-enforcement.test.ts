import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260811100000_operational_quota_enforcement.sql'),
  'utf8',
);
const accessHook = readFileSync(resolve(process.cwd(), 'src/hooks/useSaasAccess.ts'), 'utf8');

describe('operational quota enforcement', () => {
  it.each([
    ['marketplace_listings_active', 'marketplace_listings'],
    ['crm_contacts', 'leads'],
    ['guest_bookings_active', 'bookings'],
    ['maintenance_tickets_monthly', 'maintenance_requests'],
  ])('enforces %s at the database write boundary', (quotaCode, table) => {
    expect(migration).toContain(`'${quotaCode}'`);
    expect(migration).toContain(` ON public.${table}`);
  });

  it('serializes and pools checks at the effective billing scope', () => {
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('owner_billing_group_members');
    expect(migration).toContain('company_id = ANY(v_company_ids)');
  });

  it('exposes every configured unified quota to application snapshots', () => {
    expect(migration).toContain('WHERE plan_quota.plan_id = v_plan_id');
    expect(migration).not.toContain("dimension.code IN (");
    expect(migration).toContain('saas_get_operational_quota_usage(p_company_id, codes.code)');
    for (const code of ['marketplace_listings_active', 'crm_contacts', 'guest_bookings_active', 'maintenance_tickets_monthly']) {
      expect(accessHook).toContain(`| '${code}'`);
    }
  });

  it('rechecks active records moved into another company scope', () => {
    expect(migration).toContain('UPDATE OF status, company_id ON public.marketplace_listings');
    expect(migration).toContain('UPDATE OF company_id ON public.leads');
    expect(migration).toContain('UPDATE OF status, property_id ON public.bookings');
  });
});