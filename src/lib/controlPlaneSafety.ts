import type { ControlPlaneEvent, RiskQueueRow, RiskTriageActionRow, SessionRevocationHistoryRow } from '@/hooks/useControlPlane';

export type SafetyTimelineType = 'risk_detected' | 'risk_triage' | 'session_revocation';

export type SafetyTimelineRow = {
  occurred_at: string;
  timeline_type: SafetyTimelineType;
  status: string;
  title: string;
  detail: string;
  company_id: string | null;
  actor_user_id: string | null;
  severity: string;
};

function describeSessionRevocation(metadata: Record<string, unknown>) {
  const principalType = typeof metadata.principal_type === 'string' ? metadata.principal_type : 'unknown';
  const principalId = typeof metadata.principal_id === 'string' ? metadata.principal_id : '-';
  const revokedSessions = typeof metadata.revoked_sessions === 'number' ? metadata.revoked_sessions : 0;
  const revokedImpersonation = typeof metadata.revoked_impersonation_sessions === 'number'
    ? metadata.revoked_impersonation_sessions
    : 0;
  const reason = typeof metadata.reason === 'string' ? metadata.reason : null;

  return `${principalType}:${principalId} · sessions=${revokedSessions} · impersonation=${revokedImpersonation}${reason ? ` · reason=${reason}` : ''}`;
}

function describeSessionRevocationRow(item: SessionRevocationHistoryRow) {
  const principalType = item.principal_type || 'unknown';
  const principalId = item.principal_id || '-';
  const reason = item.reason ? ` · reason=${item.reason}` : '';
  return `${principalType}:${principalId} · sessions=${item.revoked_sessions} · impersonation=${item.revoked_impersonation_sessions}${reason}`;
}

export function buildSafetyTimelineRows(input: {
  riskQueue: RiskQueueRow[];
  triageActions: RiskTriageActionRow[];
  events?: ControlPlaneEvent[];
  sessionRevocations?: SessionRevocationHistoryRow[];
}): SafetyTimelineRow[] {
  const rows: SafetyTimelineRow[] = [
    ...input.riskQueue.map((item) => ({
      occurred_at: item.occurred_at,
      timeline_type: 'risk_detected' as const,
      status: item.status,
      title: item.title,
      detail: item.detail,
      company_id: item.company_id,
      actor_user_id: null,
      severity: item.severity,
    })),
    ...input.triageActions.map((item) => ({
      occurred_at: item.created_at,
      timeline_type: 'risk_triage' as const,
      status: item.triage_status,
      title: `${item.row_type} ${item.triage_status}`,
      detail: item.notes || `No triage notes (${item.row_id})`,
      company_id: item.company_id,
      actor_user_id: item.actor_user_id,
      severity: 'info',
    })),
    ...((input.sessionRevocations || []).map((item) => ({
      occurred_at: item.created_at,
      timeline_type: 'session_revocation' as const,
      status: item.result_status,
      title: 'Active sessions revoked',
      detail: describeSessionRevocationRow(item),
      company_id: item.company_id,
      actor_user_id: item.actor_user_id,
      severity: item.severity,
    }))),
    ...((input.sessionRevocations && input.sessionRevocations.length > 0) ? [] : (input.events || [])
      .filter((item) => item.event_type === 'session.revocation.applied' || item.action === 'revoke_active_platform_sessions')
      .map((item) => ({
        occurred_at: item.created_at,
        timeline_type: 'session_revocation' as const,
        status: item.result_status,
        title: 'Active sessions revoked',
        detail: describeSessionRevocation((item.metadata || {}) as Record<string, unknown>),
        company_id: item.company_id,
        actor_user_id: item.actor_user_id,
        severity: item.severity,
      }))),
  ];

  return rows.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
}
