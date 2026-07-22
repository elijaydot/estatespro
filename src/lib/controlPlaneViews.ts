import type { ControlPlaneEvent, EntitlementDecision, GovernanceAlert, UsageSnapshot } from '@/hooks/useControlPlane';

export type Company360Row = {
  company_id: string;
  events: number;
  alerts: number;
  decisions: number;
  usage_snapshots: number;
  blocked_events: number;
  last_activity_at: string;
};

export type User360Row = {
  user_id: string;
  event_count: number;
  decision_count: number;
  high_risk_events: number;
  blocked_events: number;
  last_activity_at: string;
};

export type IncidentTimelineRow = {
  type: 'event';
  id: string;
  created_at: string;
  correlation_id: string;
  module: string;
  action: string;
  detail: string;
  risk_score: number;
  company_id: string | null;
  actor_user_id: string | null;
};

export type CorrelationSummaryRow = {
  correlation_id: string;
  events: number;
  high_risk: number;
};

function isLater(left: string, right: string) {
  return new Date(left).getTime() > new Date(right).getTime();
}

export function buildCompany360Rows(
  events: ControlPlaneEvent[],
  alerts: GovernanceAlert[],
  decisions: EntitlementDecision[],
  usage: UsageSnapshot[],
): Company360Row[] {
  const rows = new Map<string, Company360Row>();

  events.forEach((item) => {
    const companyId = item.company_id || 'unscoped';
    const current = rows.get(companyId) || {
      company_id: companyId,
      events: 0,
      alerts: 0,
      decisions: 0,
      usage_snapshots: 0,
      blocked_events: 0,
      last_activity_at: item.created_at,
    };
    current.events += 1;
    if (item.result_status === 'blocked' || item.result_status === 'denied') current.blocked_events += 1;
    if (isLater(item.created_at, current.last_activity_at)) current.last_activity_at = item.created_at;
    rows.set(companyId, current);
  });

  alerts.forEach((item) => {
    const companyId = item.company_id || 'unscoped';
    const current = rows.get(companyId) || {
      company_id: companyId,
      events: 0,
      alerts: 0,
      decisions: 0,
      usage_snapshots: 0,
      blocked_events: 0,
      last_activity_at: item.created_at,
    };
    current.alerts += 1;
    if (isLater(item.created_at, current.last_activity_at)) current.last_activity_at = item.created_at;
    rows.set(companyId, current);
  });

  decisions.forEach((item) => {
    const companyId = item.company_id || 'unscoped';
    const current = rows.get(companyId) || {
      company_id: companyId,
      events: 0,
      alerts: 0,
      decisions: 0,
      usage_snapshots: 0,
      blocked_events: 0,
      last_activity_at: item.created_at,
    };
    current.decisions += 1;
    if (isLater(item.created_at, current.last_activity_at)) current.last_activity_at = item.created_at;
    rows.set(companyId, current);
  });

  usage.forEach((item) => {
    const companyId = item.company_id || 'unscoped';
    const current = rows.get(companyId) || {
      company_id: companyId,
      events: 0,
      alerts: 0,
      decisions: 0,
      usage_snapshots: 0,
      blocked_events: 0,
      last_activity_at: item.snapshot_at,
    };
    current.usage_snapshots += 1;
    if (isLater(item.snapshot_at, current.last_activity_at)) current.last_activity_at = item.snapshot_at;
    rows.set(companyId, current);
  });

  return Array.from(rows.values()).sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());
}

export function buildUser360Rows(events: ControlPlaneEvent[], decisions: EntitlementDecision[]): User360Row[] {
  const rows = new Map<string, User360Row>();

  events.forEach((item) => {
    const actorId = item.actor_user_id || 'unknown';
    const current = rows.get(actorId) || {
      user_id: actorId,
      event_count: 0,
      decision_count: 0,
      high_risk_events: 0,
      blocked_events: 0,
      last_activity_at: item.created_at,
    };
    current.event_count += 1;
    if (item.risk_score >= 80) current.high_risk_events += 1;
    if (item.result_status === 'blocked' || item.result_status === 'denied') current.blocked_events += 1;
    if (isLater(item.created_at, current.last_activity_at)) current.last_activity_at = item.created_at;
    rows.set(actorId, current);
  });

  decisions.forEach((item) => {
    const actorId = item.actor_user_id || 'unknown';
    const current = rows.get(actorId) || {
      user_id: actorId,
      event_count: 0,
      decision_count: 0,
      high_risk_events: 0,
      blocked_events: 0,
      last_activity_at: item.created_at,
    };
    current.decision_count += 1;
    if (isLater(item.created_at, current.last_activity_at)) current.last_activity_at = item.created_at;
    rows.set(actorId, current);
  });

  return Array.from(rows.values()).sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());
}

export function buildIncidentTimeline(events: ControlPlaneEvent[]): IncidentTimelineRow[] {
  return events
    .map((event) => ({
      type: 'event' as const,
      id: event.id,
      created_at: event.created_at,
      correlation_id: event.correlation_id,
      module: event.module,
      action: event.action,
      detail: `${event.event_type} (${event.result_status})`,
      risk_score: event.risk_score,
      company_id: event.company_id,
      actor_user_id: event.actor_user_id,
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function buildCorrelationSummary(events: ControlPlaneEvent[]): CorrelationSummaryRow[] {
  const summary = events.reduce<Record<string, CorrelationSummaryRow>>((acc, event) => {
    const key = event.correlation_id;
    const current = acc[key] || { correlation_id: key, events: 0, high_risk: 0 };
    current.events += 1;
    if (event.risk_score >= 80) current.high_risk += 1;
    acc[key] = current;
    return acc;
  }, {});

  return Object.values(summary)
    .sort((a, b) => b.high_risk - a.high_risk || b.events - a.events)
    .slice(0, 10);
}
