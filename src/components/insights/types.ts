// src/components/insights/types.ts
// FishGate Design Constitution v1.0 - Insights Module: Decision-Support, Analytics & Forecasting Layer

export interface InsightRiskItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'revenue' | 'expense' | 'occupancy' | 'operational' | 'compliance';
  impactStatement: string;
  rootCause: string;
  affectedPremises?: string;
  potentialExposure?: string;
  suggestedMitigation: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface InsightOpportunityItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'quick_win';
  category: 'yield' | 'retention' | 'cost_reduction' | 'process';
  upsideStatement: string;
  enabler: string;
  affectedPremises?: string;
  estimatedGain?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface InsightRecommendationItem {
  id: string;
  title: string;
  urgency: 'immediate' | 'this_week' | 'strategic';
  reasoning: string;
  expectedOutcome: string;
  ownerDepartment: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface InsightObservationItem {
  id: string;
  title: string;
  finding: string;
  metricReference?: string;
  operationalContext: string;
}

export interface AnalyticsDriverMetric {
  label: string;
  value: string;
  variance: string;
  direction: 'positive' | 'negative' | 'neutral';
  cause: string;
}

export interface ForecastProjectionPoint {
  period: string;
  expected: number;
  conservative: number;
  optimistic: number;
  notes?: string;
}

export interface LeaseRenewalForecastItem {
  id: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  expiryDate: string;
  currentRentMonthly: number;
  renewalProbability: 'high' | 'medium' | 'at_risk';
  riskFactor: string;
  projectedEscalation: string;
}

export interface CapexForecastItem {
  id: string;
  equipmentOrProject: string;
  propertyName: string;
  projectedQuarter: string;
  estimatedCost: number;
  statutoryMandate: boolean;
  justification: string;
}
