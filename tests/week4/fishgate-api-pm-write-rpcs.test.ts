import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260812120000_fishgate_api_pm_write_rpcs.sql'), 'utf8');

describe('FishGate PM write RPCs', () => {
  it('requires Full-tier write scope and derives company from api_key_id', () => {
    expect(migration.match(/api_authorized_company_id\(p_api_key_id, 'pm:write', 'full'\)/g)).toHaveLength(9);
    expect(migration).not.toMatch(/api_(?:create|update)_[a-z_]+\([\s\S]{0,100}p_company_id/);
  });

  it('validates every parent relationship against the derived company', () => {
    expect(migration).toContain('property.company_id = v_company');
    expect(migration).toContain('unit.property_id = property.id');
    expect(migration).toContain('tenant.property_id = property.id');
  });

  it('implements durable replay, conflict, and in-progress idempotency states', () => {
    for (const state of ['conflict', 'replay', 'in_progress', 'started']) expect(migration).toContain(`'${state}'`);
    expect(migration).toContain('GET DIAGNOSTICS v_inserted = ROW_COUNT');
    expect(migration).toContain('p_request_fingerprint');
    expect(migration).toContain('p_response_body');
  });

  it('has no business-data delete function and strips internal fields', () => {
    expect(migration).not.toMatch(/FUNCTION public\.api_delete_/);
    expect(migration).toContain("- 'user_id'");
    expect(migration).toContain("- 'id_document'");
  });
});