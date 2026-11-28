// src/components/analytics/types.ts
// FishGate Design Constitution v1.0 - Analytics Module: Business Understanding Center

export type AnalyticsPerspective =
  | 'portfolio'
  | 'resident'
  | 'financial'
  | 'operational'
  | 'team';

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
  category: 'financial' | 'occupancy' | 'operational';
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
  category: 'growth' | 'cost_reduction';
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
