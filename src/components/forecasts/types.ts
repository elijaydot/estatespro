// src/components/forecasts/types.ts
// FishGate Design Constitution v1.0 - Forecasts Module: Business Planning Workspace

export type ForecastAreaType =
  | 'revenue'
  | 'occupancy'
  | 'lease'
  | 'maintenance'
  | 'workload';

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
  category: 'lease' | 'revenue' | 'maintenance' | 'vendor';
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
  occupancyDeltaPercent: number; // e.g. -5 to +5%
  rentAdjustmentPercent: number; // e.g. -5 to +10%
  opexChangePercent: number; // e.g. -10 to +20%
  renewalRatePercent: number; // e.g. 70% to 100%
  additionalUnitsPlanted: number; // e.g. 0 to 6 units
}

export interface ScenarioModelResult {
  baselineRevenue: number;
  projectedRevenue: number;
  projectedNOI: number;
  projectedOccupancyRate: number;
  netRevenueDelta: number;
  summaryAssessment: string;
}
