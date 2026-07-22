import type {
  ControlPlaneEvent,
  EntitlementDecision,
  GovernanceAlert,
  PlatformOperatorRole,
  UsageSnapshot,
} from '@/hooks/useControlPlane';
import type { ControlPlaneTab } from '@/lib/controlPlaneState';
import type {
  Company360Row,
  CorrelationSummaryRow,
  IncidentTimelineRow,
  User360Row,
} from '@/lib/controlPlaneViews';

export type ControlPlaneExportRowsInput = {
  openAlerts: number;
  blockedEvents: number;
  highRiskEvents: number;
  alerts: GovernanceAlert[];
  events: ControlPlaneEvent[];
  decisions: EntitlementDecision[];
  usage: UsageSnapshot[];
  incidents: IncidentTimelineRow[];
  companyRows: Company360Row[];
  userRows: User360Row[];
  analyticsRows: Record<string, unknown>[];
  operators: PlatformOperatorRole[];
  correlationSummary: CorrelationSummaryRow[];
};

export function getControlPlaneExportRows(
  activeTab: ControlPlaneTab,
  input: ControlPlaneExportRowsInput,
): Record<string, unknown>[] {
  switch (activeTab) {
    case 'overview':
      return [{
        openAlerts: input.openAlerts,
        blockedEvents: input.blockedEvents,
        highRiskEvents: input.highRiskEvents,
        usageSnapshots: input.usage.length,
      }];
    case 'alerts':
      return input.alerts;
    case 'events':
      return input.events;
    case 'decisions':
      return input.decisions;
    case 'usage':
      return input.usage;
    case 'incidents':
      return input.incidents;
    case 'company360':
      return input.companyRows;
    case 'user360':
      return input.userRows;
    case 'analytics':
      return input.analyticsRows;
    case 'operators':
      return input.operators;
    default:
      return input.correlationSummary;
  }
}
