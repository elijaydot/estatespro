import { describe, expect, it } from 'vitest';
import {
  buildCompany360Rows,
  buildCorrelationSummary,
  buildIncidentTimeline,
  buildUser360Rows,
} from '../../src/lib/controlPlaneViews';

const events = [
  {
    id: 'e1',
    source: 'app',
    event_type: 'entitlement.denied',
    module: 'entitlement',
    action: 'route_access',
    severity: 'warning',
    result_status: 'denied',
    actor_user_id: 'u1',
    company_id: 'c1',
    correlation_id: 'corr-1',
    risk_score: 85,
    created_at: '2026-07-20T10:00:00.000Z',
  },
  {
    id: 'e2',
    source: 'app',
    event_type: 'billing.ok',
    module: 'billing',
    action: 'invoice_paid',
    severity: 'info',
    result_status: 'success',
    actor_user_id: 'u2',
    company_id: 'c1',
    correlation_id: 'corr-1',
    risk_score: 20,
    created_at: '2026-07-21T10:00:00.000Z',
  },
] as const;

const alerts = [
  {
    id: 'a1',
    severity: 'warning',
    status: 'open',
    alert_type: 'risk_or_blocked_event',
    title: 'Review needed',
    description: null,
    company_id: 'c1',
    correlation_id: 'corr-1',
    created_at: '2026-07-21T11:00:00.000Z',
  },
] as const;

const decisions = [
  {
    id: 'd1',
    company_id: 'c1',
    actor_user_id: 'u1',
    module: 'entitlement',
    action: 'route_access',
    entitlement_key: 'crm.leads.manage',
    allowed: false,
    decision_reason: 'plan_restriction',
    correlation_id: 'corr-1',
    risk_score: 60,
    created_at: '2026-07-21T12:00:00.000Z',
  },
] as const;

const usage = [
  {
    id: 's1',
    company_id: 'c1',
    product_code: 'core_property',
    quota_code: 'units_managed',
    used_value: 3,
    soft_limit: 5,
    hard_limit: 10,
    remaining: 7,
    usage_percent: 30,
    limit_state: 'ok',
    snapshot_at: '2026-07-21T13:00:00.000Z',
  },
] as const;

describe('controlPlaneViews', () => {
  it('builds company 360 rows', () => {
    const rows = buildCompany360Rows([...events], [...alerts], [...decisions], [...usage]);
    expect(rows).toHaveLength(1);
    expect(rows[0].company_id).toBe('c1');
    expect(rows[0].events).toBe(2);
    expect(rows[0].alerts).toBe(1);
    expect(rows[0].decisions).toBe(1);
    expect(rows[0].usage_snapshots).toBe(1);
    expect(rows[0].blocked_events).toBe(1);
  });

  it('builds user 360 rows', () => {
    const rows = buildUser360Rows([...events], [...decisions]);
    const first = rows.find((r) => r.user_id === 'u1');
    expect(first?.event_count).toBe(1);
    expect(first?.decision_count).toBe(1);
    expect(first?.high_risk_events).toBe(1);
    expect(first?.blocked_events).toBe(1);
  });

  it('builds incident timeline sorted ascending', () => {
    const rows = buildIncidentTimeline([...events]);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('e1');
    expect(rows[1].id).toBe('e2');
  });

  it('builds correlation summary with high risk counts', () => {
    const rows = buildCorrelationSummary([...events]);
    expect(rows).toHaveLength(1);
    expect(rows[0].correlation_id).toBe('corr-1');
    expect(rows[0].events).toBe(2);
    expect(rows[0].high_risk).toBe(1);
  });
});
