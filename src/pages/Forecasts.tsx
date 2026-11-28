// src/pages/Forecasts.tsx
// FishGate Design Constitution v1.0 - Insights Module: Forecasts Workspace
// Workspace Mode Architecture: Users choose an outlook mode; system reconfigures around that perspective.
// Visible clutter reduced by > 60%; strictly one forward outlook displayed at a time.
// Scenario Modeling is collapsible by default to prevent cognitive overload.

import { useState } from 'react';
import { PageContainer } from '@/design-system/LayoutFramework';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';

import { ForecastsHeader } from '@/components/forecasts/ForecastsHeader';
import { ForecastsFutureOutlook } from '@/components/forecasts/ForecastsFutureOutlook';
import { ForecastsWorkspaceCards } from '@/components/forecasts/ForecastsWorkspaceCards';
import { RevenueOutlookMode } from '@/components/forecasts/modes/RevenueOutlookMode';
import { OccupancyOutlookMode } from '@/components/forecasts/modes/OccupancyOutlookMode';
import { LeaseOutlookMode } from '@/components/forecasts/modes/LeaseOutlookMode';
import { MaintenanceOutlookMode } from '@/components/forecasts/modes/MaintenanceOutlookMode';
import { WorkloadOutlookMode } from '@/components/forecasts/modes/WorkloadOutlookMode';
import { ForecastsScenarioModal } from '@/components/forecasts/ForecastsScenarioModal';
import { ForecastWorkspaceMode } from '@/components/forecasts/types';

export default function ForecastsPage() {
  const [activeMode, setActiveMode] = useState<ForecastWorkspaceMode>('revenue');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);

  const handleExportForecast = () => {
    const exportData = [
      { Outlook: activeMode.toUpperCase(), ExportDate: new Date().toISOString().slice(0, 10), Status: 'Forward Plan' },
      { Metric: 'Revenue Outlook (Q1 2027)', Value: 'RWF 33.2M / mo', Trajectory: '+5.4% Forward Growth', Status: 'Target Met' },
      { Metric: 'Occupancy Outlook', Value: '95.8%', Trajectory: '46 of 48 Units Occupied', Status: 'High Capacity' },
      { Metric: 'Lease Expirations (90d)', Value: '8 Leases', Trajectory: 'RWF 5.2M / mo at stake', Status: '87.5% Renewal Target' },
      { Metric: 'Maintenance Demand (Dec)', Value: '18 Work Orders', Trajectory: 'RWF 4.2M Budgeted Load', Status: 'All Vendors Confirmed' },
    ];
    downloadCsv(exportData, `FishGate_${activeMode}_Forecast_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Forecast Exported',
      description: `Downloaded comprehensive ${activeMode} forward plan CSV.`,
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

        {/* SECTION 3: WORKSPACE MODE ARCHITECTURE (PRIMARY OUTLOOK CARDS & PLANNING TAKEAWAY) */}
        <ForecastsWorkspaceCards
          activeMode={activeMode}
          onSelectMode={setActiveMode}
        />

        {/* SECTION 4: DEDICATED OUTLOOK MODE VIEW (EXCLUSIVE CONTENT PER MODE) */}
        <div className="pt-1">
          {activeMode === 'revenue' && <RevenueOutlookMode />}
          {activeMode === 'occupancy' && <OccupancyOutlookMode />}
          {activeMode === 'lease' && <LeaseOutlookMode />}
          {activeMode === 'maintenance' && <MaintenanceOutlookMode />}
          {activeMode === 'workload' && <WorkloadOutlookMode />}
        </div>
      </div>

      {/* Scenario Creation / Save Modal */}
      <ForecastsScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
      />
    </PageContainer>
  );
}
