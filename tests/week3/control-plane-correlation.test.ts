import { describe, expect, it } from 'vitest';
import { buildCorrelationSummary, buildIncidentTimeline } from '../../src/lib/controlPlaneViews';

describe('control-plane correlation helpers', () => {
  const events = [
    {
      id: 'e1',
      source: 'ui',
      event_type: 'auth.login',
      module: 'auth',
      action: 'login',
      severity: 'warning',
      result_status: 'blocked',
      actor_user_id: 'u1',
      company_id: 'c1',
      correlation_id: 'corr-a',
      risk_score: 80,
      created_at: '2026-07-22T00:00:00.000Z',
    },
    {
      id: 'e2',
      source: 'ui',
      event_type: 'auth.login',
      module: 'auth',
      action: 'login',
      severity: 'warning',
      result_status: 'denied',
      actor_user_id: 'u1',
      company_id: 'c1',
      correlation_id: 'corr-a',
      risk_score: 90,
      created_at: '2026-07-22T01:00:00.000Z',
    },
    {
      id: 'e3',
      source: 'ui',
      event_type: 'billing.charge',
      module: 'billing',
      action: 'charge',
      severity: 'info',
      result_status: 'success',
      actor_user_id: 'u2',
      company_id: 'c2',
      correlation_id: 'corr-b',
      risk_score: 10,
      created_at: '2026-07-22T02:00:00.000Z',
    },
  ] as const;

  it('prioritizes high-risk correlations in summary', () => {
    const rows = buildCorrelationSummary(events as never);
    expect(rows[0].correlation_id).toBe('corr-a');
    expect(rows[0].high_risk).toBe(2);
  });

  it('keeps timeline in chronological order', () => {
    const rows = buildIncidentTimeline(events as never);
    expect(rows[0].id).toBe('e1');
    expect(rows[rows.length - 1].id).toBe('e3');
  });
});
