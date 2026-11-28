// src/components/analytics/types.ts
// FishGate Design Constitution v1.0 - Analytics Module: Workspace Mode Architecture

export type AnalyticsWorkspaceMode =
  | 'portfolio'
  | 'residents'
  | 'finance'
  | 'operations'
  | 'team';

// Backwards-compatibility alias
export type AnalyticsPerspective = AnalyticsWorkspaceMode;

export interface WorkspaceModeCardConfig {
  id: AnalyticsWorkspaceMode;
  title: string;
  subtitle: string[];
  keyMetric: string;
  badgeText: string;
  badgeClass: string;
}

export interface ExecutiveIndicator {
  id: string;
  title: string;
  headlineValue: string;
  statusBadge: string;
  badgeClass: string;
  primaryContext: string;
  secondaryExplanation: string;
  trend: 'up' | 'down' | 'neutral';
  trendText: string;
}

export interface TrendDriverItem {
  id: string;
  title: string;
  category: 'revenue' | 'occupancy' | 'maintenance' | 'collections' | 'team';
  trendOutcome: string;
  primaryCause: string;
  supportingDetail: string;
  affectedProperties: string[];
  impactMagnitude: string;
  actionableNextStep?: string;
}

export interface AnalyticsRiskItem {
  id: string;
  title: string;
  category: 'financial' | 'occupancy' | 'operational' | 'team';
  exposure: string;
  rootCause: string;
  consequence: string;
  mitigation: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface AnalyticsOpportunityItem {
  id: string;
  title: string;
  category: 'growth' | 'cost_reduction' | 'resident' | 'team';
  estimatedGain: string;
  enabler: string;
  operationalAction: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface PropertyComparisonRow {
  propertyId: string;
  propertyName: string;
  unitCount: number;
  occupancyRate: number;
  monthlyRevenue: number;
  collectionRate: number;
  opexRatio: number;
  avgSlaDays: number;
  healthScore: number;
}
