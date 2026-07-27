import type { TimeRange } from '@/lib/controlPlane';

export type ControlPlaneTab =
  | 'overview'
  | 'directory'
  | 'monetization'
  | 'safety'
  | 'alerts'
  | 'events'
  | 'decisions'
  | 'usage'
  | 'incidents'
  | 'company360'
  | 'user360'
  | 'analytics'
  | 'operators';

export type SeverityFilter = 'all' | 'info' | 'warning' | 'error' | 'critical';
export type EventResultFilter = 'all' | 'success' | 'warning' | 'blocked' | 'denied' | 'error';
export type AlertStatusFilter = 'all' | 'open' | 'acknowledged' | 'resolved';
export type DecisionFilter = 'all' | 'allowed' | 'denied';

export type ControlPlaneUiState = {
  tab: ControlPlaneTab;
  timeRange: TimeRange;
  search: string;
  severityFilter: SeverityFilter;
  eventResultFilter: EventResultFilter;
  alertStatusFilter: AlertStatusFilter;
  decisionFilter: DecisionFilter;
  companyFilter: string;
  userFilter: string;
  correlationFilter: string;
};

const VALID_TABS: ControlPlaneTab[] = ['overview', 'directory', 'monetization', 'safety', 'alerts', 'events', 'decisions', 'usage', 'incidents', 'company360', 'user360', 'analytics', 'operators'];
const VALID_TIME_RANGES: TimeRange[] = ['24h', '7d', '30d', 'all'];
const VALID_SEVERITY: SeverityFilter[] = ['all', 'info', 'warning', 'error', 'critical'];
const VALID_EVENT_RESULTS: EventResultFilter[] = ['all', 'success', 'warning', 'blocked', 'denied', 'error'];
const VALID_ALERT_STATUS: AlertStatusFilter[] = ['all', 'open', 'acknowledged', 'resolved'];
const VALID_DECISION_FILTER: DecisionFilter[] = ['all', 'allowed', 'denied'];

export const DEFAULT_CONTROL_PLANE_STATE: ControlPlaneUiState = {
  tab: 'overview',
  timeRange: '7d',
  search: '',
  severityFilter: 'all',
  eventResultFilter: 'all',
  alertStatusFilter: 'all',
  decisionFilter: 'all',
  companyFilter: '',
  userFilter: '',
  correlationFilter: '',
};

function normalizeEnum<T extends string>(
  value: string | null,
  allowed: T[],
  fallback: T,
): T {
  if (!value) return fallback;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseControlPlaneUiState(params: URLSearchParams): ControlPlaneUiState {
  return {
    tab: normalizeEnum(params.get('cp_tab'), VALID_TABS, DEFAULT_CONTROL_PLANE_STATE.tab),
    timeRange: normalizeEnum(params.get('cp_range'), VALID_TIME_RANGES, DEFAULT_CONTROL_PLANE_STATE.timeRange),
    search: params.get('cp_q') || DEFAULT_CONTROL_PLANE_STATE.search,
    severityFilter: normalizeEnum(params.get('cp_sev'), VALID_SEVERITY, DEFAULT_CONTROL_PLANE_STATE.severityFilter),
    eventResultFilter: normalizeEnum(params.get('cp_result'), VALID_EVENT_RESULTS, DEFAULT_CONTROL_PLANE_STATE.eventResultFilter),
    alertStatusFilter: normalizeEnum(params.get('cp_alert'), VALID_ALERT_STATUS, DEFAULT_CONTROL_PLANE_STATE.alertStatusFilter),
    decisionFilter: normalizeEnum(params.get('cp_decision'), VALID_DECISION_FILTER, DEFAULT_CONTROL_PLANE_STATE.decisionFilter),
    companyFilter: params.get('cp_company') || DEFAULT_CONTROL_PLANE_STATE.companyFilter,
    userFilter: params.get('cp_user') || DEFAULT_CONTROL_PLANE_STATE.userFilter,
    correlationFilter: params.get('cp_correlation') || DEFAULT_CONTROL_PLANE_STATE.correlationFilter,
  };
}

export function toControlPlaneSearchParams(state: ControlPlaneUiState): URLSearchParams {
  const params = new URLSearchParams();

  params.set('cp_tab', state.tab);
  params.set('cp_range', state.timeRange);

  if (state.search) params.set('cp_q', state.search);
  if (state.severityFilter !== DEFAULT_CONTROL_PLANE_STATE.severityFilter) params.set('cp_sev', state.severityFilter);
  if (state.eventResultFilter !== DEFAULT_CONTROL_PLANE_STATE.eventResultFilter) params.set('cp_result', state.eventResultFilter);
  if (state.alertStatusFilter !== DEFAULT_CONTROL_PLANE_STATE.alertStatusFilter) params.set('cp_alert', state.alertStatusFilter);
  if (state.decisionFilter !== DEFAULT_CONTROL_PLANE_STATE.decisionFilter) params.set('cp_decision', state.decisionFilter);
  if (state.companyFilter) params.set('cp_company', state.companyFilter);
  if (state.userFilter) params.set('cp_user', state.userFilter);
  if (state.correlationFilter) params.set('cp_correlation', state.correlationFilter);

  return params;
}
