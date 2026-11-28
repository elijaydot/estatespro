// src/components/forecasts/types.ts
// FishGate Design Constitution v1.0 - Forecasts Module: Workspace Mode Architecture

export type ForecastWorkspaceMode =
  | 'revenue'
  | 'occupancy'
  | 'lease'
  | 'maintenance'
  | 'workload';

// Compatibility alias
export type ForecastAreaType = ForecastWorkspaceMode;

export interface FutureOutlookIndicator {
  id: string;
  title: string;
  forecastValue: string;
  statusBadge: string;
  badgeClass: string;
  horizon: string;
  forwardTrajectory: string;
  context: string;
  secondaryNote: string;
}

export interface ForecastRiskItem {
  id: string;
  title: string;
  category: 'lease' | 'revenue' | 'maintenance' | 'vendor' | 'occupancy' | 'workload';
  horizon: string;
  severity: 'high' | 'medium' | 'low';
  impactDescription: string;
  earlyWarningTrigger: string;
  preparednessAction: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface OpportunityPlanningItem {
  id: string;
  title: string;
  category: 'vacancy' | 'renewal' | 'upgrade' | 'growth';
  projectedGain: string;
  horizon: string;
  requiredEnabler: string;
  actionPlan: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface ScenarioModelConfig {
  occupancyDeltaPercent: number;
  rentAdjustmentPercent: number;
  opexChangePercent: number;
  renewalRatePercent: number;
  additionalUnitsPlanted: number;
}

export interface ScenarioModelResult {
  baselineRevenue: number;
  projectedRevenue: number;
  projectedNOI: number;
  projectedOccupancyRate: number;
  netRevenueDelta: number;
  summaryAssessment: string;
}
