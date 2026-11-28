// src/pages/Forecasts.tsx
// FishGate Design Constitution v1.0 - Insights Module: Forecasts Workspace
// Controlled Workspace Expansion: Default state is completely calm with detailed forecast content hidden until an outlook is selected.
// Toggle behavior: clicking an active card collapses the view back to overview.
// Scenario planning is visible only when its related workspace is open.

import { useState } from 'react';
import { PageContainer } from '@/design-system/LayoutFramework';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';
import { LayoutGrid, Compass } from 'lucide-react';

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
  // Default state: null (no workspace open, calm executive overview)
  const [activeMode, setActiveMode] = useState<ForecastWorkspaceMode | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);

  const handleExportForecast = () => {
    const outlookName = activeMode ? activeMode.toUpperCase() : 'PLANNING_OVERVIEW';
    const exportData = [
      { Outlook: outlookName, ExportDate: new Date().toISOString().slice(0, 10), Status: 'Forward Plan' },
      { Metric: 'Revenue Outlook (Q1 2027)', Value: 'RWF 33.2M / mo', Trajectory: '+5.4% Forward Growth', Status: 'Target Met' },
      { Metric: 'Occupancy Outlook', Value: '95.8%', Trajectory: '46 of 48 Units Occupied', Status: 'High Capacity' },
      { Metric: 'Lease Expirations (90d)', Value: '8 Leases', Trajectory: 'RWF 5.2M / mo at stake', Status: '87.5% Renewal Target' },
      { Metric: 'Maintenance Demand (Dec)', Value: '18 Work Orders', Trajectory: 'RWF 4.2M Budgeted Load', Status: 'All Vendors Confirmed' },
    ];
    downloadCsv(exportData, `FishGate_${outlookName}_Forecast_${new Date().toISOString().slice(0, 10)}`);
    toast({
      title: 'Forecast Exported',
      description: `Downloaded ${outlookName} forward plan CSV.`,
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

        {/* SECTION 2: FUTURE OUTLOOK (VITAL HORIZONS) */}
        <ForecastsFutureOutlook />

        {/* SECTION 3: FORWARD PLANNING TAKEAWAY & WORKSPACE MODE CARDS */}
        <ForecastsWorkspaceCards
          activeMode={activeMode}
          onSelectMode={setActiveMode}
        />

        {/* SECTION 4: CONTROLLED WORKSPACE EXPANSION CONTENT */}
        {activeMode === null ? (
          /* EMPTY WORKSPACE GUIDANCE STATE (QUIET, CALM EXECUTIVE OVERVIEW) */
          <div className="py-10 px-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/40 text-center flex flex-col items-center justify-center space-y-2 transition-all duration-200">
            <div className="p-2 rounded-full bg-slate-100 text-slate-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium max-w-md">
              Select a workspace above to explore detailed analysis and planning information.
            </p>
          </div>
        ) : (
          /* DEDICATED OUTLOOK MODE VIEW (SMOOTH 200ms EXPANSION, STRICTLY ONE PERSPECTIVE) */
          <div className="transition-all duration-200 ease-out space-y-6">
            {activeMode === 'revenue' && <RevenueOutlookMode />}
            {activeMode === 'occupancy' && <OccupancyOutlookMode />}
            {activeMode === 'lease' && <LeaseOutlookMode />}
            {activeMode === 'maintenance' && <MaintenanceOutlookMode />}
            {activeMode === 'workload' && <WorkloadOutlookMode />}
          </div>
        )}
      </div>

      {/* Scenario Creation / Save Modal */}
      <ForecastsScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
      />
    </PageContainer>
  );
}
