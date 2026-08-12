import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811210000_platform_impersonation_session_timebox.sql'), 'utf8');
const paginationMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260811250000_platform_safety_operations_server_pagination.sql'), 'utf8');
const page = readFileSync(resolve(process.cwd(), 'src/pages/SuperAdminControlPlane.tsx'), 'utf8');

describe('impersonation session timebox', () => {
  it('enforces a maximum thirty-minute lifetime at the database boundary', () => {
    expect(migration).toContain("NEW.started_at + interval '30 minutes'");
    expect(migration).toContain('platform_timebox_impersonation_session_trigger');
    expect(migration).toContain('ALTER COLUMN expires_at SET NOT NULL');
  });

  it('expires linked records with locking and immutable audit', () => {
    expect(migration).toContain('FOR UPDATE SKIP LOCKED');
    expect(migration).toContain("'impersonation.session.expired'");
    expect(migration).toContain("platform_impersonation_expiry_every_minute', '* * * * *'");
    expect(migration).toContain("'impersonation_expired_automatically', true");
  });

  it('shows and stops only the current operator session', () => {
    expect(paginationMigration).toContain('platform_get_current_operator_impersonation_session');
    expect(paginationMigration).toContain('session.actor_user_id = v_actor');
    expect(page).toContain('Active support impersonation session');
    expect(page).toContain('handleStopImpersonation(activeOperatorImpersonation.id)');
  });
});