// src/pages/Forecasts.tsx
// FishGate Design Constitution v1.0 - Insights Module: Forecasts Workspace
// Strict Purpose: Business Planning Center ("What is Likely to Happen Next?")
// 6-Section Architecture:
// 1. Header (Title, Subtitle, Export Forecast, Save Scenario, Create Scenario)
// 2. Future Outlook (Max 4 Cards: Revenue Outlook, Occupancy Outlook, Lease Outlook, Operational Demand Outlook)
// 3. Forecast Areas (5 Areas: Revenue, Occupancy, Lease, Maintenance, Workload Outlook)
// 4. Future Risks (Early Warning Radar)
// 5. Opportunity Planning (Strategic Forward Upside)
// 6. Scenario Modeling (Simple, Practical Forward Stress Testing)
// + Planning Observations (3-5 Natural Observations, Zero AI/Prediction Engine Jargon)

import { useState } from 'react';
import { PageContainer } from '@/design-system/LayoutFramework';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';

import { ForecastsHeader } from '@/components/forecasts/ForecastsHeader';
import { ForecastsFutureOutlook } from '@/components/forecasts/ForecastsFutureOutlook';
import { ForecastsAreas } from '@/components/forecasts/ForecastsAreas';
import { ForecastsFutureRisks } from '@/components/forecasts/ForecastsFutureRisks';
import { ForecastsOpportunityPlanning } from '@/components/forecasts/ForecastsOpportunityPlanning';
import { ForecastsScenarioModeling } from '@/components/forecasts/ForecastsScenarioModeling';
import { ForecastsObservations } from '@/components/forecasts/ForecastsObservations';
import { ForecastsScenarioModal } from '@/components/forecasts/ForecastsScenarioModal';
import { ForecastAreaType } from '@/components/forecasts/types';

export default function ForecastsPage() {
  const [activeArea, setActiveArea] = useState<ForecastAreaType>('revenue');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);

  const handleExportForecast = () => {
    const exportData = [
      { Metric: 'Revenue Outlook (Q1 2027)', Value: 'RWF 33.2M / mo', Trajectory: '+5.4% Forward Growth', Status: 'Target Met' },
      { Metric: 'Occupancy Outlook', Value: '95.8%', Trajectory: '46 of 48 Units Occupied', Status: 'High Capacity' },
      { Metric: 'Lease Expirations (90d)', Value: '8 Leases', Trajectory: 'RWF 5.2M / mo at stake', Status: '87.5% Renewal Target' },
      { Metric: 'Maintenance Demand (Dec)', Value: '18 Work Orders', Trajectory: 'RWF 4.2M Budgeted Load', Status: 'All Vendors Confirmed' },
    ];
    downloadCsv(exportData, `FishGate_Forecasts_Forward_Plan_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Forecast Exported',
      description: 'Downloaded forward operational and cashflow projections CSV.',
    });
  };

  const handleSaveScenario = () => {
    setIsScenarioModalOpen(true);
  };

  const handleCreateScenario = () => {
    setIsScenarioModalOpen(true);
  };

  return (
    <PageContainer>
      <div className="space-y-6 pb-12">
        {/* SECTION 1: HEADER */}
        <ForecastsHeader
          onExport={handleExportForecast}
          onSaveScenario={handleSaveScenario}
          onCreateScenario={handleCreateScenario}
        />

        {/* SECTION 2: FUTURE OUTLOOK (MAX 4 CARDS) */}
        <ForecastsFutureOutlook />

        {/* SECTION 3: FORECAST AREAS (5 FORWARD PERSPECTIVES) */}
        <ForecastsAreas
          activeArea={activeArea}
          onAreaChange={setActiveArea}
        />

        {/* SECTION 4: FUTURE RISKS (EARLY WARNING SYSTEM) */}
        <ForecastsFutureRisks />

        {/* SECTION 5: OPPORTUNITY PLANNING (STRATEGIC FORWARD UPSIDE) */}
        <ForecastsOpportunityPlanning />

        {/* SECTION 6: SCENARIO MODELING (INTERACTIVE FORWARD STRESS TEST) */}
        <ForecastsScenarioModeling
          onSaveScenario={handleSaveScenario}
        />

        {/* SECTION 7: PLANNING OBSERVATIONS */}
        <ForecastsObservations />
      </div>

      {/* Scenario Creation / Save Modal */}
      <ForecastsScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
      />
    </PageContainer>
  );
}
