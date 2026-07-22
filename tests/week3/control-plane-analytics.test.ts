import { describe, expect, it } from 'vitest';
import {
  buildCompanyRiskRows,
  buildModuleAdoptionRows,
  buildOpsSignals,
} from '../../src/lib/controlPlaneAnalytics';

const events = [
  {
    id: 'e1', source: 'ui', event_type: 'x', module: 'marketplace.listings', action: 'edit', severity: 'warning', result_status: 'blocked', actor_user_id: 'u1', company_id: 'c1', correlation_id: 'k1', risk_score: 90, created_at: '2026-07-22T00:00:00.000Z',
  },
  {
    id: 'e2', source: 'ui', event_type: 'x', module: 'crm.leads', action: 'save', severity: 'info', result_status: 'success', actor_user_id: 'u1', company_id: 'c1', correlation_id: 'k2', risk_score: 20, created_at: '2026-07-22T00:00:00.000Z',
  },
  {
    id: 'e3', source: 'ui', event_type: 'x', module: 'billing.checkout', action: 'submit', severity: 'warning', result_status: 'denied', actor_user_id: 'u2', company_id: 'c2', correlation_id: 'k3', risk_score: 85, created_at: '2026-07-22T00:00:00.000Z',
  },
] as const;

const decisions = [
  {
    id: 'd1', company_id: 'c1', actor_user_id: 'u1', module: 'billing', action: 'pay', entitlement_key: 'pay', allowed: false, decision_reason: null, correlation_id: 'k1', risk_score: 30, created_at: '2026-07-22T00:00:00.000Z',
  },
] as const;

const alerts = [
  {
    id: 'a1', severity: 'critical', status: 'open', alert_type: 'risk', title: 'Critical', description: null, company_id: 'c1', correlation_id: 'k1', created_at: '2026-07-22T00:00:00.000Z',
  },
] as const;

const usage = [
  {
    id: 'u1', company_id: 'c1', product_code: 'core', quota_code: 'units', used_value: 9, soft_limit: 10, hard_limit: 10, remaining: 1, usage_percent: 95, limit_state: 'high', snapshot_at: '2026-07-22T00:00:00.000Z',
  },
] as const;

describe('controlPlane analytics helpers', () => {
  it('groups module adoption with denied/high-risk counts', () => {
    const rows = buildModuleAdoptionRows(events as never);
    expect(rows.find((row) => row.module === 'marketplace')?.events).toBe(1);
    expect(rows.find((row) => row.module === 'billing')?.denied_or_blocked).toBe(1);
  });

  it('builds ops signals and flags warning thresholds', () => {
    const rows = buildOpsSignals(events as never, decisions as never, alerts as never, usage as never);
    const denialSignal = rows.find((row) => row.signal === 'Entitlement Denial Rate');
    const criticalSignal = rows.find((row) => row.signal === 'Open Critical Alerts');

    expect(denialSignal?.status).toBe('warning');
    expect(criticalSignal?.status).toBe('warning');
  });

  it('ranks company risk rows', () => {
    const rows = buildCompanyRiskRows(events as never, decisions as never, alerts as never, usage as never);
    expect(rows[0].company_id).toBe('c1');
    expect(rows[0].risk_score).toBeGreaterThan(0);
  });
});
