import type {
  CompanyDirectoryRecord,
  ControlPlaneEvent,
  EntitlementDecision,
  GovernanceAlert,
  PlatformOperatorRole,
  UserDirectoryRecord,
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
  directoryCompanies: CompanyDirectoryRecord[];
  directoryUsers: UserDirectoryRecord[];
  monetizationRows: Record<string, unknown>[];
  safetyRows: Record<string, unknown>[];
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
    case 'directory':
      return [
        ...input.directoryCompanies.map((row) => ({
          row_type: 'company_directory',
          id: row.id,
          name: row.name,
          email: row.email,
        })),
        ...input.directoryUsers.map((row) => ({
          row_type: 'user_directory',
          user_id: row.user_id,
          name: row.name,
          email: row.email,
        })),
      ];
    case 'monetization':
      return input.monetizationRows;
    case 'safety':
      return input.safetyRows;
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
