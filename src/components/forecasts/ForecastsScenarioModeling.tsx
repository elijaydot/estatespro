// src/components/forecasts/ForecastsScenarioModeling.tsx
// FishGate Design Constitution v1.0 - Collapsible Scenario Modeling Workspace
// Default State: Collapsed (Displays "Explore Scenarios"). Expandable on-demand to reduce complexity.

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Bookmark,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ScenarioModelConfig } from './types';

interface ForecastsScenarioModelingProps {
  onSaveScenario?: (scenarioName: string) => void;
  defaultExpanded?: boolean;
}

export function ForecastsScenarioModeling({
  onSaveScenario,
  defaultExpanded = false,
}: ForecastsScenarioModelingProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Baseline parameters: 48 total units, 45 occupied, RWF 31.5M monthly gross, RWF 5.0M monthly OPEX
  const [config, setConfig] = useState<ScenarioModelConfig>({
    occupancyDeltaPercent: 2,
    rentAdjustmentPercent: 4,
    opexChangePercent: 0,
    renewalRatePercent: 90,
    additionalUnitsPlanted: 1,
  });

  const baselineGross = 31500000;
  const baselineOpex = 5000000;
  const baselineOccupancy = 94.2;

  // Real-time dynamic calculations
  const occupancyFactor = 1 + config.occupancyDeltaPercent / 100;
  const rentGrowthFactor = 1 + config.rentAdjustmentPercent / 100;
  const additionalUnitRev = config.additionalUnitsPlanted * 700000;
  const renewalPenalty = config.renewalRatePercent < 85 ? (85 - config.renewalRatePercent) * 120000 : 0;

  const projectedGross = Math.round(
    baselineGross * rentGrowthFactor * occupancyFactor + additionalUnitRev - renewalPenalty
  );

  const opexFactor = 1 + config.opexChangePercent / 100;
  const projectedOpex = Math.round(baselineOpex * opexFactor);
  const projectedNOI = projectedGross - projectedOpex;
  const baselineNOI = baselineGross - baselineOpex;
  const netDelta = projectedNOI - baselineNOI;
  const projectedOccupancy = Math.min(
    100,
    Math.max(80, +(baselineOccupancy + config.occupancyDeltaPercent + config.additionalUnitsPlanted * 2.1).toFixed(1))
  );

  const handleReset = () => {
    setConfig({
      occupancyDeltaPercent: 0,
      rentAdjustmentPercent: 0,
      opexChangePercent: 0,
      renewalRatePercent: 88,
      additionalUnitsPlanted: 0,
    });
    toast({
      title: 'Parameters Reset',
      description: 'Restored scenario levers to contractual baseline.',
    });
  };

  const handleSave = () => {
    if (onSaveScenario) {
      onSaveScenario('Target Q1 Growth Scenario');
    } else {
      toast({
        title: 'Scenario Saved',
        description: `Saved planning scenario (+RWF ${(netDelta / 1000000).toFixed(2)}M / mo impact).`,
      });
    }
  };

  return (
    <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden transition-all">
      {/* COLLAPSIBLE HEADER BAR */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Explore Scenarios
              </h3>
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                Sensitivity Stress Test
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate occupancy shifts, rent indexation, and operational expense changes without affecting live data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-600 hidden sm:inline">
            {isExpanded ? 'Hide Model' : 'Expand Model'}
          </span>
          <div className="p-1 rounded bg-slate-100 text-slate-600">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* EXPANDABLE BODY CONTENT */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-slate-100 mt-2 space-y-4">
          <div className="flex items-center justify-between pt-3 pb-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Active Scenario Controls
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-medium gap-1 text-slate-600 border-slate-200"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSave}
              >
                <Bookmark className="w-3 h-3" />
                <span>Save</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* LEVERS (7 COLS) */}
            <div className="lg:col-span-7 space-y-3 p-3 bg-slate-50/50 rounded-lg border border-slate-200/80">
              {/* Lever 1: Occupancy Changes */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">1. Occupancy Shift</span>
                  <span className="font-mono font-bold text-blue-700">
                    {config.occupancyDeltaPercent > 0 ? `+${config.occupancyDeltaPercent}%` : `${config.occupancyDeltaPercent}%`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[-5, 0, 2, 5].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={config.occupancyDeltaPercent === val ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs font-medium ${
                        config.occupancyDeltaPercent === val
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => setConfig({ ...config, occupancyDeltaPercent: val })}
                    >
                      {val === 0 ? 'Baseline' : val > 0 ? `+${val}%` : `${val}%`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Lever 2: Rent Indexation */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">2. Rent Indexation</span>
                  <span className="font-mono font-bold text-emerald-700">
                    +{config.rentAdjustmentPercent}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 4, 8, 12].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={config.rentAdjustmentPercent === val ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs font-medium ${
                        config.rentAdjustmentPercent === val
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => setConfig({ ...config, rentAdjustmentPercent: val })}
                    >
                      {val === 0 ? '0%' : `+${val}%`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Lever 3: Operating Expenses */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">3. Operating Expenses</span>
                  <span className="font-mono font-bold text-slate-700">
                    {config.opexChangePercent > 0 ? `+${config.opexChangePercent}%` : `${config.opexChangePercent}%`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[-5, 0, 5, 15].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={config.opexChangePercent === val ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs font-medium ${
                        config.opexChangePercent === val
                          ? 'bg-slate-800 text-white hover:bg-slate-900'
                          : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => setConfig({ ...config, opexChangePercent: val })}
                    >
                      {val === 0 ? 'Baseline' : val > 0 ? `+${val}%` : `${val}%`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Lever 4: Renewal Rate */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">4. Renewal Retention Target</span>
                  <span className="font-mono font-bold text-purple-700">
                    {config.renewalRatePercent}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[75, 85, 90, 100].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={config.renewalRatePercent === val ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs font-medium ${
                        config.renewalRatePercent === val
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => setConfig({ ...config, renewalRatePercent: val })}
                    >
                      {val}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Lever 5: Growth Plan */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">5. Vacant Units Absorbed</span>
                  <span className="font-mono font-bold text-blue-700">
                    +{config.additionalUnitsPlanted} Units
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={config.additionalUnitsPlanted === val ? 'default' : 'outline'}
                      size="sm"
                      className={`h-7 text-xs font-medium ${
                        config.additionalUnitsPlanted === val
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => setConfig({ ...config, additionalUnitsPlanted: val })}
                    >
                      {val === 0 ? 'None' : `+${val}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* OUTCOME (5 COLS) */}
            <div className="lg:col-span-5 p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">
                    Projected Variance
                  </span>
                  <Badge variant="outline" className={`font-mono text-[9px] ${
                    netDelta >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                  }`}>
                    {netDelta >= 0 ? '+ Expansion' : '- Contraction'}
                  </Badge>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Projected Monthly Rent Roll
                  </span>
                  <span className="text-lg font-mono font-bold text-slate-900 block">
                    RWF {(projectedGross / 1000000).toFixed(2)}M
                  </span>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Projected Net NOI
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-mono font-bold text-emerald-700">
                      RWF {(projectedNOI / 1000000).toFixed(2)}M
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${
                      netDelta >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}>
                      {netDelta >= 0 ? `+RWF ${(netDelta / 1000000).toFixed(2)}M` : `-RWF ${(Math.abs(netDelta) / 1000000).toFixed(2)}M`}
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Projected Occupancy
                  </span>
                  <span className="text-base font-mono font-bold text-slate-900 block">
                    {projectedOccupancy}% Capacity
                  </span>
                </div>
              </div>

              <div className="p-2 bg-blue-50/80 border border-blue-200 rounded text-xs">
                <span className="text-[10px] font-bold text-blue-900 uppercase block mb-0.5">
                  Planning Takeaway:
                </span>
                <p className="text-blue-950 text-[11px] leading-relaxed">
                  {netDelta >= 0
                    ? `Indexation and placement lift NOI by +RWF ${(netDelta * 12 / 1000000).toFixed(1)}M/yr.`
                    : 'Expense increases outpace revenues. Recommend tighter cost controls.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
