// src/components/forecasts/ForecastsScenarioModeling.tsx
// FishGate Design Constitution v1.0 - Section 6: Scenario Modeling (Simple, Practical Forward Planning)
// Allow testing: Occupancy Changes, Revenue Changes, Expense Changes, Lease Renewals, Maintenance Costs, Growth Plans

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sliders,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Bookmark,
  CheckCircle2,
  DollarSign,
  Building,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ScenarioModelConfig } from './types';

interface ForecastsScenarioModelingProps {
  onSaveScenario?: (scenarioName: string) => void;
}

export function ForecastsScenarioModeling({
  onSaveScenario,
}: ForecastsScenarioModelingProps) {
  // Baseline parameters: 48 total units, 45 occupied (93.75%), RWF 31.5M monthly gross, RWF 5.0M monthly OPEX
  const [config, setConfig] = useState<ScenarioModelConfig>({
    occupancyDeltaPercent: 2, // +2%
    rentAdjustmentPercent: 4, // +4%
    opexChangePercent: 0, // baseline
    renewalRatePercent: 90, // 90%
    additionalUnitsPlanted: 1, // 1 unit leased
  });

  const baselineGross = 31500000;
  const baselineOpex = 5000000;
  const baselineOccupancy = 94.2;

  // Real-time calculation
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
  const projectedOccupancy = Math.min(100, Math.max(80, +(baselineOccupancy + config.occupancyDeltaPercent + (config.additionalUnitsPlanted * 2.1)).toFixed(1)));

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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Scenario Modeling (Interactive Forward Stress Test)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Test sensitivity across occupancy, rent adjustments, maintenance costs, and lease renewals. Simple and decision-focused.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium gap-1 text-slate-600 border-slate-200"
            onClick={handleReset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </Button>

          <Button
            size="sm"
            className="h-8 text-xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save Scenario</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* LEVERS CONTROLS (7 COLS) */}
        <Card className="lg:col-span-7 p-4 border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Planning Levers & Assumptions
            </span>
            <span className="text-[11px] text-slate-400">Select parameters to model forward performance</span>
          </div>

          <div className="space-y-3.5">
            {/* Lever 1: Occupancy Changes */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
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
                        : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => setConfig({ ...config, occupancyDeltaPercent: val })}
                  >
                    {val === 0 ? 'Baseline (0%)' : val > 0 ? `+${val}%` : `${val}%`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Lever 2: Rent Indexation & Revenue Growth */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800">2. Rent Indexation / Pricing Growth</span>
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
                        : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => setConfig({ ...config, rentAdjustmentPercent: val })}
                  >
                    {val === 0 ? 'No Increase' : `+${val}% Indexation`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Lever 3: Operating Expenses & Maintenance Costs */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800">3. Operating Expenses & Maintenance Costs</span>
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
                        : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => setConfig({ ...config, opexChangePercent: val })}
                  >
                    {val === 0 ? 'Normal Budget' : val > 0 ? `+${val}% (Inflation)` : `${val}% (Savings)`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Lever 4: Lease Renewals Success */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800">4. Lease Renewal Retention Rate</span>
                <span className="font-mono font-bold text-purple-700">
                  {config.renewalRatePercent}% Target
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
                        : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => setConfig({ ...config, renewalRatePercent: val })}
                  >
                    {val}% Renewals
                  </Button>
                ))}
              </div>
            </div>

            {/* Lever 5: Growth Plan (Units Added) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-800">5. Growth Plan (Vacant Units Absorbed)</span>
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
                        : 'text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => setConfig({ ...config, additionalUnitsPlanted: val })}
                  >
                    {val === 0 ? 'No Change' : `+${val} Leased Unit${val > 1 ? 's' : ''}`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* OUTCOME ASSESSMENT PANEL (5 COLS) */}
        <Card className="lg:col-span-5 p-4 border-slate-200 bg-slate-50/80 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Projected Model Outcome
              </span>
              <Badge variant="outline" className={`font-mono text-[10px] ${
                netDelta >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {netDelta >= 0 ? '+ Expansion' : '- Contraction'}
              </Badge>
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Projected Monthly Revenue
                </span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xl font-mono font-bold text-slate-900">
                    RWF {(projectedGross / 1000000).toFixed(2)}M
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    (Baseline RWF 31.50M)
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Projected Net Operating Income (NOI)
                </span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xl font-mono font-bold text-emerald-700">
                    RWF {(projectedNOI / 1000000).toFixed(2)}M
                  </span>
                  <span className={`text-xs font-mono font-bold ${
                    netDelta >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {netDelta >= 0 ? `+RWF ${(netDelta / 1000000).toFixed(2)}M` : `-RWF ${(Math.abs(netDelta) / 1000000).toFixed(2)}M`}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Projected Portfolio Capacity
                </span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg font-mono font-bold text-slate-900">
                    {projectedOccupancy}% Occupancy
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono bg-blue-50 text-blue-700 border-blue-200">
                    {projectedOccupancy >= 95 ? 'Target Met' : 'Below 95%'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded text-xs space-y-1">
            <span className="text-[10px] font-bold text-blue-900 uppercase">Planning Takeaway:</span>
            <p className="text-blue-950 text-[11px] font-medium leading-relaxed">
              {netDelta >= 0
                ? `Securing ${config.rentAdjustmentPercent}% indexation and placing ${config.additionalUnitsPlanted} new unit(s) expands annual Net Operating Income by +RWF ${(netDelta * 12 / 1000000).toFixed(1)}M without exceeding maintenance capacity.`
                : 'Expense inflation outpaces rent adjustments under this scenario. Proactive lease renewal terms and vendor cost controls are recommended.'}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
