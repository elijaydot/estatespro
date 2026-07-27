import { describe, expect, it } from 'vitest';
import { buildSafetyTimelineRows } from '../../src/lib/controlPlaneSafety';

describe('controlPlane safety timeline', () => {
  it('merges and sorts risk, triage, and revocation activity by newest first', () => {
    const rows = buildSafetyTimelineRows({
      riskQueue: [
        {
          row_type: 'governance_alert',
          row_id: 'r1',
          company_id: 'c1',
          severity: 'critical',
          status: 'open',
          title: 'Critical alert',
          detail: 'Alert detail',
          score: 90,
          occurred_at: '2026-07-26T18:00:00.000Z',
          metadata: null,
        },
      ],
      triageActions: [
        {
          id: 't1',
          row_type: 'governance_alert',
          row_id: 'r1',
          triage_status: 'resolved',
          company_id: 'c1',
          actor_user_id: 'u1',
          notes: 'Verified and resolved',
          metadata: null,
          created_at: '2026-07-26T18:05:00.000Z',
        },
      ],
      events: [
        {
          id: 'e1',
          source: 'platform_control_plane',
          event_type: 'session.revocation.applied',
          module: 'security',
          action: 'revoke_active_platform_sessions',
          result_status: 'success',
          severity: 'critical',
          actor_user_id: 'u2',
          company_id: 'c1',
          principal_type: 'user',
          principal_id: 'u-target',
          correlation_id: 'corr-1',
          risk_score: 85,
          metadata: {
            principal_type: 'user',
            principal_id: 'u-target',
            revoked_sessions: 4,
            revoked_impersonation_sessions: 1,
            reason: 'incident response',
          },
          created_at: '2026-07-26T18:10:00.000Z',
        },
      ],
    });

    expect(rows).toHaveLength(3);
    expect(rows[0].timeline_type).toBe('session_revocation');
    expect(rows[1].timeline_type).toBe('risk_triage');
    expect(rows[2].timeline_type).toBe('risk_detected');
  });

  it('uses fallback triage text and ignores unrelated events', () => {
    const rows = buildSafetyTimelineRows({
      riskQueue: [],
      triageActions: [
        {
          id: 't1',
          row_type: 'abuse_signal',
          row_id: 'ab1',
          triage_status: 'acknowledged',
          company_id: null,
          actor_user_id: null,
          notes: null,
          metadata: null,
          created_at: '2026-07-26T18:00:00.000Z',
        },
      ],
      events: [
        {
          id: 'e-ignore',
          source: 'platform_control_plane',
          event_type: 'entitlement.override.set',
          module: 'entitlement',
          action: 'set_override',
          result_status: 'success',
          severity: 'warning',
          actor_user_id: null,
          company_id: null,
          principal_type: null,
          principal_id: null,
          correlation_id: null,
          risk_score: 10,
          metadata: {},
          created_at: '2026-07-26T18:10:00.000Z',
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].detail).toContain('No triage notes');
    expect(rows[0].timeline_type).toBe('risk_triage');
  });

  it('prefers dedicated session revocation history rows when provided', () => {
    const rows = buildSafetyTimelineRows({
      riskQueue: [],
      triageActions: [],
      sessionRevocations: [
        {
          id: 'rev-1',
          created_at: '2026-07-26T19:00:00.000Z',
          result_status: 'success',
          severity: 'critical',
          company_id: 'c9',
          actor_user_id: 'u9',
          correlation_id: 'corr-9',
          principal_type: 'user',
          principal_id: 'u-target',
          revoked_sessions: 2,
          revoked_impersonation_sessions: 1,
          reason: 'security incident',
          module: 'security',
          action: 'revoke_active_platform_sessions',
        },
      ],
      events: [
        {
          id: 'e-legacy',
          source: 'platform_control_plane',
          event_type: 'session.revocation.applied',
          module: 'security',
          action: 'revoke_active_platform_sessions',
          result_status: 'success',
          severity: 'critical',
          actor_user_id: 'u-legacy',
          company_id: 'c-legacy',
          principal_type: 'user',
          principal_id: 'u-legacy-target',
          correlation_id: 'corr-legacy',
          risk_score: 85,
          metadata: {
            principal_type: 'user',
            principal_id: 'u-legacy-target',
            revoked_sessions: 1,
            revoked_impersonation_sessions: 0,
          },
          created_at: '2026-07-26T18:00:00.000Z',
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].company_id).toBe('c9');
    expect(rows[0].detail).toContain('sessions=2');
  });
});
