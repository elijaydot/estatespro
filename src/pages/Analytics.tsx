// src/pages/Analytics.tsx
// FishGate Design Constitution v1.0 - Insights Module: Analytics Workspace
// Strict Purpose: Business Understanding Center ("Why Did It Happen?")
// 6-Section Architecture:
// 1. Header (Title, Subtitle, Export Analysis, Save View, Create Comparison)
// 2. Executive Understanding (Max 4 Summary Indicators, Not Dashboards)
// 3. Performance Areas (5 Perspectives: Portfolio, Resident, Financial, Operational, Team Performance)
// 4. Trends & Drivers (Explaining Underlying Causes)
// 5. Risks & Opportunities (Executive Decision Support)
// 6. Detailed Analysis (Interactive Exploration, Comparison Matrix, Saved Views, Export, Pagination)
// + Operational Observations (3-5 Grounded Human Observations, Zero AI/Telemetry Buzzwords)

import { useState } from 'react';
import { PageContainer } from '@/design-system/LayoutFramework';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';

import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsExecutiveUnderstanding } from '@/components/analytics/AnalyticsExecutiveUnderstanding';
import { AnalyticsPerformanceAreas } from '@/components/analytics/AnalyticsPerformanceAreas';
import { AnalyticsTrendsDrivers } from '@/components/analytics/AnalyticsTrendsDrivers';
import { AnalyticsRisksOpportunities } from '@/components/analytics/AnalyticsRisksOpportunities';
import { AnalyticsDetailedAnalysis } from '@/components/analytics/AnalyticsDetailedAnalysis';
import { AnalyticsObservations } from '@/components/analytics/AnalyticsObservations';
import { AnalyticsComparisonModal } from '@/components/analytics/AnalyticsComparisonModal';
import { AnalyticsPerspective, PropertyComparisonRow } from '@/components/analytics/types';

export default function AnalyticsPage() {
  const [activePerspective, setActivePerspective] = useState<AnalyticsPerspective>('portfolio');
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  const comparisonProperties: PropertyComparisonRow[] = [
    {
      propertyId: 'prop-1',
      propertyName: 'Riverside Luxury Suites',
      unitCount: 14,
      occupancyRate: 100,
      monthlyRevenue: 14800000,
      collectionRate: 100,
      opexRatio: 12.5,
      avgSlaDays: 1.4,
      healthScore: 96,
    },
    {
      propertyId: 'prop-2',
      propertyName: 'Kigali Heights Residences',
      unitCount: 20,
      occupancyRate: 95,
      monthlyRevenue: 11200000,
      collectionRate: 99.1,
      opexRatio: 19.6,
      avgSlaDays: 1.8,
      healthScore: 92,
    },
    {
      propertyId: 'prop-3',
      propertyName: 'Vision City Commercial & Residential',
      unitCount: 14,
      occupancyRate: 85.7,
      monthlyRevenue: 5500000,
      collectionRate: 99.1,
      opexRatio: 17.3,
      avgSlaDays: 2.1,
      healthScore: 88,
    },
  ];

  const handleExportAnalysis = () => {
    const summaryData = [
      { Indicator: 'Portfolio Health', Value: '94.2%', Status: 'Optimal Capacity', Trend: '+1.8% QoQ' },
      { Indicator: 'Financial Health', Value: '99.4%', Status: 'Strong Realization', Trend: '101% of Target' },
      { Indicator: 'Operational Health', Value: '1.8 Days', Status: 'Healthy SLA', Trend: '-47% Turnaround' },
      { Indicator: 'Productivity Health', Value: '85.7%', Status: 'Disciplined Execution', Trend: '+6.4% Completion' },
    ];
    downloadCsv(summaryData, `FishGate_Analytics_Executive_Summary_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Analysis Exported',
      description: 'Downloaded executive performance indicators and trends CSV.',
    });
  };

  const handleSaveView = () => {
    toast({
      title: 'Analytics View Saved',
      description: `Saved current perspective (${activePerspective.toUpperCase()}) as default executive view.`,
    });
  };

  const handleCreateComparison = () => {
    setIsComparisonOpen(true);
  };

  return (
    <PageContainer>
      <div className="space-y-6 pb-12">
        {/* SECTION 1: HEADER */}
        <AnalyticsHeader
          onExport={handleExportAnalysis}
          onSaveView={handleSaveView}
          onCreateComparison={handleCreateComparison}
        />

        {/* SECTION 2: EXECUTIVE UNDERSTANDING */}
        <AnalyticsExecutiveUnderstanding />

        {/* SECTION 3: PERFORMANCE AREAS (5 PERSPECTIVES) */}
        <AnalyticsPerformanceAreas
          activePerspective={activePerspective}
          onPerspectiveChange={setActivePerspective}
        />

        {/* SECTION 4: TRENDS & DRIVERS (CAUSAL EXPLANATIONS) */}
        <AnalyticsTrendsDrivers />

        {/* SECTION 5: RISKS & OPPORTUNITIES (DECISION SUPPORT) */}
        <AnalyticsRisksOpportunities />

        {/* SECTION 6: DETAILED ANALYSIS (INTERACTIVE EXPLORATION) */}
        <AnalyticsDetailedAnalysis
          onOpenComparisonModal={handleCreateComparison}
        />

        {/* SECTION 7: OPERATIONAL OBSERVATIONS */}
        <AnalyticsObservations />
      </div>

      {/* Global Comparison Modal */}
      <AnalyticsComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        properties={comparisonProperties}
      />
    </PageContainer>
  );
}
