import type { ControlPlaneEvent, EntitlementDecision, GovernanceAlert, UsageSnapshot } from '@/hooks/useControlPlane';

export type ModuleAdoptionRow = {
  module: string;
  events: number;
  denied_or_blocked: number;
  high_risk: number;
};

export type OpsSignalRow = {
  signal: string;
  value: number;
  threshold: number;
  status: 'ok' | 'warning';
  unit: 'percent' | 'count';
};

export type CompanyRiskRow = {
  company_id: string;
  denial_events: number;
  high_risk_events: number;
  open_alerts: number;
  usage_pressure: number;
  risk_score: number;
};

function normalizeModuleName(raw: string): string {
  const value = raw.toLowerCase();
  if (value.startsWith('marketplace')) return 'marketplace';
  if (value.startsWith('crm')) return 'crm';
  if (value.startsWith('ai')) return 'ai';
  if (value.startsWith('billing') || value.startsWith('entitlement')) return 'billing';
  if (value.startsWith('admin')) return 'admin';
  return 'core';
}

export function buildModuleAdoptionRows(events: ControlPlaneEvent[]): ModuleAdoptionRow[] {
  const rows = new Map<string, ModuleAdoptionRow>();

  events.forEach((event) => {
    const module = normalizeModuleName(event.module);
    const current = rows.get(module) || {
      module,
      events: 0,
      denied_or_blocked: 0,
      high_risk: 0,
    };

    current.events += 1;
    if (event.result_status === 'blocked' || event.result_status === 'denied') {
      current.denied_or_blocked += 1;
    }
    if (event.risk_score >= 80) {
      current.high_risk += 1;
    }

    rows.set(module, current);
  });

  return Array.from(rows.values()).sort((a, b) => b.events - a.events);
}

export function buildOpsSignals(
  events: ControlPlaneEvent[],
  decisions: EntitlementDecision[],
  alerts: GovernanceAlert[],
  usage: UsageSnapshot[],
): OpsSignalRow[] {
  const blockedOrDenied = events.filter((event) => event.result_status === 'blocked' || event.result_status === 'denied').length;
  const highRisk = events.filter((event) => event.risk_score >= 80).length;
  const deniedDecisions = decisions.filter((decision) => !decision.allowed).length;
  const criticalOpenAlerts = alerts.filter((alert) => alert.status === 'open' && alert.severity === 'critical').length;
  const highPressureUsage = usage.filter((snapshot) => snapshot.usage_percent >= 90).length;

  const eventCount = Math.max(events.length, 1);
  const decisionCount = Math.max(decisions.length, 1);

  const blockedRate = blockedOrDenied / eventCount;
  const highRiskRate = highRisk / eventCount;
  const deniedRate = deniedDecisions / decisionCount;

  return [
    {
      signal: 'Blocked/Denied Event Rate',
      value: Number((blockedRate * 100).toFixed(1)),
      threshold: 15,
      status: blockedRate > 0.15 ? 'warning' : 'ok',
      unit: 'percent',
    },
    {
      signal: 'High Risk Event Rate',
      value: Number((highRiskRate * 100).toFixed(1)),
      threshold: 10,
      status: highRiskRate > 0.1 ? 'warning' : 'ok',
      unit: 'percent',
    },
    {
      signal: 'Entitlement Denial Rate',
      value: Number((deniedRate * 100).toFixed(1)),
      threshold: 20,
      status: deniedRate > 0.2 ? 'warning' : 'ok',
      unit: 'percent',
    },
    {
      signal: 'Open Critical Alerts',
      value: criticalOpenAlerts,
      threshold: 0,
      status: criticalOpenAlerts > 0 ? 'warning' : 'ok',
      unit: 'count',
    },
    {
      signal: 'Usage Pressure Snapshots (>=90%)',
      value: highPressureUsage,
      threshold: 0,
      status: highPressureUsage > 0 ? 'warning' : 'ok',
      unit: 'count',
    },
  ];
}

export function buildCompanyRiskRows(
  events: ControlPlaneEvent[],
  decisions: EntitlementDecision[],
  alerts: GovernanceAlert[],
  usage: UsageSnapshot[],
): CompanyRiskRow[] {
  const rows = new Map<string, CompanyRiskRow>();

  const ensure = (companyId: string) => {
    const existing = rows.get(companyId);
    if (existing) return existing;
    const next: CompanyRiskRow = {
      company_id: companyId,
      denial_events: 0,
      high_risk_events: 0,
      open_alerts: 0,
      usage_pressure: 0,
      risk_score: 0,
    };
    rows.set(companyId, next);
    return next;
  };

  events.forEach((event) => {
    const companyId = event.company_id || 'unscoped';
    const row = ensure(companyId);
    if (event.result_status === 'blocked' || event.result_status === 'denied') row.denial_events += 1;
    if (event.risk_score >= 80) row.high_risk_events += 1;
  });

  decisions.forEach((decision) => {
    const companyId = decision.company_id || 'unscoped';
    const row = ensure(companyId);
    if (!decision.allowed) row.denial_events += 1;
  });

  alerts.forEach((alert) => {
    const companyId = alert.company_id || 'unscoped';
    const row = ensure(companyId);
    if (alert.status === 'open') row.open_alerts += 1;
  });

  usage.forEach((snapshot) => {
    const companyId = snapshot.company_id || 'unscoped';
    const row = ensure(companyId);
    if (snapshot.usage_percent >= 90) row.usage_pressure += 1;
  });

  rows.forEach((row) => {
    row.risk_score = row.denial_events * 2 + row.high_risk_events * 3 + row.open_alerts * 2 + row.usage_pressure;
  });

  return Array.from(rows.values())
    .filter((row) => row.risk_score > 0)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 15);
}
