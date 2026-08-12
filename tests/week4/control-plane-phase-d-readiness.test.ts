import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const verification = readFileSync(resolve(process.cwd(), 'supabase/verification/control_plane_phase_d_checks.sql'), 'utf8');
const runbook = readFileSync(resolve(process.cwd(), 'docs/ops/CONTROL_PLANE_PHASE_D_READINESS_RUNBOOK.md'), 'utf8');

describe('Control Plane Phase D readiness', () => {
  it('checks every newly exposed safety and entity-profile RPC', () => {
    for (const rpc of [
      'platform_get_entitlement_overrides_page', 'platform_get_active_suspensions_page',
      'platform_get_impersonation_sessions_page', 'platform_get_current_operator_impersonation_session',
      'platform_get_company_360_members_page', 'platform_get_user_360_companies_page',
    ]) expect(verification).toContain(rpc);
  });

  it('documents authorization, load, UI smoke, and rollback gates', () => {
    expect(runbook).toContain('## Authorization Matrix');
    expect(runbook).toContain('## Pagination And Load Checks');
    expect(runbook).toContain('## Deployment Smoke Verification');
    expect(runbook).toContain('### Backend Smoke');
    expect(runbook).toContain('### UI Smoke');
    expect(runbook).toContain('## Rollback');
    expect(runbook).toContain('p95 below 500 ms');
  });
});