// src/pages/Analytics.tsx
// FishGate Design Constitution v1.0 - Insights Module: Analytics Workspace
// Workspace Mode Architecture: Users choose a perspective; system reconfigures around that perspective.
// Visible clutter reduced by > 60%; strictly one perspective displayed at a time.

import { useState } from 'react';
import { PageContainer } from '@/design-system/LayoutFramework';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';

import { AnalyticsHeader } from '@/components/analytics/AnalyticsHeader';
import { AnalyticsExecutiveUnderstanding } from '@/components/analytics/AnalyticsExecutiveUnderstanding';
import { AnalyticsWorkspaceCards } from '@/components/analytics/AnalyticsWorkspaceCards';
import { PortfolioAnalyticsMode } from '@/components/analytics/modes/PortfolioAnalyticsMode';
import { ResidentAnalyticsMode } from '@/components/analytics/modes/ResidentAnalyticsMode';
import { FinancialAnalyticsMode } from '@/components/analytics/modes/FinancialAnalyticsMode';
import { OperationsAnalyticsMode } from '@/components/analytics/modes/OperationsAnalyticsMode';
import { TeamAnalyticsMode } from '@/components/analytics/modes/TeamAnalyticsMode';
import { AnalyticsObservations } from '@/components/analytics/AnalyticsObservations';
import { AnalyticsComparisonModal } from '@/components/analytics/AnalyticsComparisonModal';
import { AnalyticsWorkspaceMode, PropertyComparisonRow } from '@/components/analytics/types';

export default function AnalyticsPage() {
  const [activeMode, setActiveMode] = useState<AnalyticsWorkspaceMode>('portfolio');
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
      { Workspace: activeMode.toUpperCase(), ExportDate: new Date().toISOString().slice(0, 10), Status: 'Complete' },
      { Indicator: 'Portfolio Health', Value: '94.2%', Status: 'Optimal Capacity', Trend: '+1.8% QoQ' },
      { Indicator: 'Financial Health', Value: '99.4%', Status: 'Strong Realization', Trend: '101% of Target' },
      { Indicator: 'Operational Health', Value: '1.8 Days', Status: 'Healthy SLA', Trend: '-47% Turnaround' },
      { Indicator: 'Productivity Health', Value: '85.7%', Status: 'Disciplined Execution', Trend: '+6.4% Completion' },
    ];
    downloadCsv(summaryData, `FishGate_${activeMode}_Analysis_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Analysis Exported',
      description: `Downloaded comprehensive ${activeMode} workspace analysis CSV.`,
    });
  };

  const handleSaveView = () => {
    toast({
      title: 'Analytics View Saved',
      description: `Saved current workspace (${activeMode.toUpperCase()}) as default view.`,
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

        {/* SECTION 2: EXECUTIVE UNDERSTANDING (VITAL SIGNS) */}
        <AnalyticsExecutiveUnderstanding />

        {/* SECTION 3: WORKSPACE MODE ARCHITECTURE (PRIMARY NAVIGATION & KEY TAKEAWAY) */}
        <AnalyticsWorkspaceCards
          activeMode={activeMode}
          onSelectMode={setActiveMode}
        />

        {/* SECTION 4: DEDICATED WORKSPACE MODE VIEW (EXCLUSIVE CONTENT PER MODE) */}
        <div className="pt-1">
          {activeMode === 'portfolio' && <PortfolioAnalyticsMode />}
          {activeMode === 'residents' && <ResidentAnalyticsMode />}
          {activeMode === 'finance' && <FinancialAnalyticsMode />}
          {activeMode === 'operations' && <OperationsAnalyticsMode />}
          {activeMode === 'team' && <TeamAnalyticsMode />}
        </div>

        {/* SECTION 5: OPERATIONAL OBSERVATIONS */}
        <AnalyticsObservations />
      </div>

      {/* Cross-Property Comparison Modal */}
      <AnalyticsComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        properties={comparisonProperties}
      />
    </PageContainer>
  );
}
