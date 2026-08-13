import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812100000_fishgate_public_api_foundation.sql'),
  'utf8',
);

describe('FishGate public API foundation', () => {
  it('binds keys to companies and reuses the canonical API entitlement', () => {
    expect(migration).toContain('REFERENCES public.companies(id)');
    expect(migration).toContain("'api.access.level'");
    expect(migration).not.toContain("VALUES ('api_access'");
    expect(migration).toContain("('fishgate_professional', 'limited')");
    expect(migration).toContain("('fishgate_enterprise', 'full')");
  });

  it('keeps key management super-admin-only', () => {
    expect(migration).toContain('CREATE POLICY "Super admins manage API keys"');
    expect(migration).toContain('public.is_platform_super_admin(auth.uid())');
  });

  it('resolves active control-plane overrides using their stored schema', () => {
    expect(migration).toContain('override_row.revoked_at IS NULL');
    expect(migration).toContain("v_override.metadata->>'access_level'");
    expect(migration).not.toContain('override_row.is_active');
    expect(migration).not.toContain('override_row.override_value');
  });

  it('uses persistent atomic limits and service-role-only security functions', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.api_rate_limit_windows');
    expect(migration).toContain('ON CONFLICT (api_key_id, window_started_at) DO UPDATE');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.api_consume_rate_limit(uuid) TO service_role');
    expect(migration).toContain('REVOKE ALL ON TABLE public.api_rate_limit_windows');
  });

  it('provides indexed telemetry and durable write idempotency', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.api_request_events');
    expect(migration).toContain('idx_api_request_events_key_created');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.api_idempotency_records');
    expect(migration).toContain('PRIMARY KEY (api_key_id, idempotency_key)');
  });
});