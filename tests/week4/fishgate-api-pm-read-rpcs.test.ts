import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260812110000_fishgate_api_pm_read_rpcs.sql'), 'utf8');

describe('FishGate PM read RPCs', () => {
  it('derives company ownership only from an active authorized key', () => {
    expect(migration).toContain('api_authorized_company_id');
    expect(migration).toContain('WHERE id = p_api_key_id AND revoked_at IS NULL');
    expect(migration).toContain("p_required_scope = ANY(v_key.scopes)");
    expect(migration).not.toMatch(/api_get_(?:properties|units|leases|tenants|invoices|payments|maintenance_requests)\([\s\S]{0,100}p_company_id/);
  });

  it('uses the correct tenant ownership path for every PM resource', () => {
    expect(migration).toContain('property.company_id = v_company');
    expect(migration).toContain('JOIN public.properties property ON property.id = unit.property_id');
    expect(migration).toContain('JOIN public.properties property ON property.id = lease.property_id');
    expect(migration).toContain('JOIN public.properties property ON property.id = tenant.property_id');
    expect(migration).toContain('JOIN public.invoices invoice ON invoice.id = payment.invoice_id');
  });

  it('provides bounded pagination and deterministic ordering', () => {
    expect(migration.match(/least\(100, greatest\(1, coalesce\(p_per_page, 20\)\)\)/g)).toHaveLength(7);
    expect(migration.match(/created_at DESC, id DESC/g)).toHaveLength(7);
    expect(migration.match(/'has_more'/g)).toHaveLength(7);
  });

  it('allows only the service role to execute resource RPCs', () => {
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });
});