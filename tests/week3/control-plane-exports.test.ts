import { describe, expect, it } from 'vitest';
import { getControlPlaneExportRows, type ControlPlaneExportRowsInput } from '../../src/lib/controlPlaneExports';

const baseInput: ControlPlaneExportRowsInput = {
  openAlerts: 2,
  blockedEvents: 3,
  highRiskEvents: 1,
  alerts: [{
    id: 'alert-1',
    severity: 'warning',
    status: 'open',
    alert_type: 'risk_or_blocked_event',
    title: 'Alert',
    description: null,
    company_id: 'company-1',
    correlation_id: 'corr-1',
    created_at: '2026-07-22T00:00:00.000Z',
  }],
  events: [{
    id: 'event-1',
    source: 'ui',
    event_type: 'admin.seed_event',
    module: 'admin',
    action: 'seed_event',
    severity: 'warning',
    result_status: 'blocked',
    actor_user_id: 'user-1',
    company_id: 'company-1',
    correlation_id: 'corr-1',
    risk_score: 90,
    created_at: '2026-07-22T00:00:00.000Z',
  }],
  decisions: [{
    id: 'decision-1',
    company_id: 'company-1',
    actor_user_id: 'user-1',
    module: 'billing',
    action: 'invoice.send',
    entitlement_key: 'billing_send_invoice',
    allowed: true,
    decision_reason: null,
    correlation_id: 'corr-1',
    risk_score: 10,
    created_at: '2026-07-22T00:00:00.000Z',
  }],
  usage: [{
    id: 'usage-1',
    company_id: 'company-1',
    product_code: 'core_property',
    quota_code: 'units',
    used_value: 5,
    soft_limit: 10,
    hard_limit: 20,
    remaining: 15,
    usage_percent: 25,
    limit_state: 'ok',
    snapshot_at: '2026-07-22T00:00:00.000Z',
  }],
  incidents: [{
    type: 'event',
    id: 'incident-1',
    created_at: '2026-07-22T00:00:00.000Z',
    correlation_id: 'corr-1',
    module: 'admin',
    action: 'seed_event',
    detail: 'admin.seed_event (blocked)',
    risk_score: 90,
    company_id: 'company-1',
    actor_user_id: 'user-1',
  }],
  companyRows: [{
    company_id: 'company-1',
    events: 1,
    alerts: 1,
    decisions: 1,
    usage_snapshots: 1,
    blocked_events: 1,
    last_activity_at: '2026-07-22T00:00:00.000Z',
  }],
  userRows: [{
    user_id: 'user-1',
    event_count: 1,
    decision_count: 1,
    high_risk_events: 1,
    blocked_events: 1,
    last_activity_at: '2026-07-22T00:00:00.000Z',
  }],
  operators: [{
    id: 'opr-1',
    user_id: 'user-1',
    role: 'security_auditor',
    created_at: '2026-07-22T00:00:00.000Z',
  }],
  correlationSummary: [{
    correlation_id: 'corr-1',
    events: 1,
    high_risk: 1,
  }],
};

describe('controlPlane export rows', () => {
  it('returns computed summary row for overview tab', () => {
    const rows = getControlPlaneExportRows('overview', baseInput);
    expect(rows).toEqual([{ openAlerts: 2, blockedEvents: 3, highRiskEvents: 1, usageSnapshots: 1 }]);
  });

  it('returns tab-specific rows for direct exports', () => {
    expect(getControlPlaneExportRows('alerts', baseInput)).toEqual(baseInput.alerts);
    expect(getControlPlaneExportRows('events', baseInput)).toEqual(baseInput.events);
    expect(getControlPlaneExportRows('decisions', baseInput)).toEqual(baseInput.decisions);
    expect(getControlPlaneExportRows('usage', baseInput)).toEqual(baseInput.usage);
    expect(getControlPlaneExportRows('incidents', baseInput)).toEqual(baseInput.incidents);
    expect(getControlPlaneExportRows('company360', baseInput)).toEqual(baseInput.companyRows);
    expect(getControlPlaneExportRows('user360', baseInput)).toEqual(baseInput.userRows);
    expect(getControlPlaneExportRows('operators', baseInput)).toEqual(baseInput.operators);
  });
});
