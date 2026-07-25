import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260725124500_saas_pending_verification_health_reporting.sql',
);

describe('saas pending verification health reporting migration', () => {
  it('adds operations helper functions for pending verification attempts', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_get_pending_payment_attempts');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.saas_get_pending_verification_health');
    expect(sql).toContain("payment_status IN ('pending', 'processing')");
    expect(sql).toContain("pending_verification_count");
    expect(sql).toContain('last_pending_verification_at');
    expect(sql).toContain('public.saas_user_can_access_company');
    expect(sql).toContain('public.is_platform_super_admin');
    expect(sql).toContain('INSUFFICIENT_PERMISSIONS_FOR_COMPANY_ACCESS');
  });

  it('grants execution to authenticated and service role while revoking public access', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('REVOKE ALL ON FUNCTION public.saas_get_pending_payment_attempts(uuid, integer) FROM PUBLIC');
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.saas_get_pending_verification_health(uuid, integer) FROM PUBLIC');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.saas_get_pending_payment_attempts(uuid, integer) TO authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.saas_get_pending_verification_health(uuid, integer) TO authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.saas_get_pending_payment_attempts(uuid, integer) TO service_role');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.saas_get_pending_verification_health(uuid, integer) TO service_role');
  });
});
