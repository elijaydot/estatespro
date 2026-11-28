// src/components/forecasts/ForecastsHeader.tsx
// FishGate Design Constitution v1.0 - Section 1: Header (Title, Subtitle & Forward Planning Actions)

import { Button } from '@/components/ui/button';
import {
  Compass,
  Download,
  Bookmark,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface ForecastsHeaderProps {
  onExport: () => void;
  onSaveScenario: () => void;
  onCreateScenario: () => void;
}

export function ForecastsHeader({
  onExport,
  onSaveScenario,
  onCreateScenario,
}: ForecastsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Compass className="w-6 h-6 text-blue-600" />
          <span>Forecasts</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Plan for future revenue, occupancy, operations and portfolio growth.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
          onClick={onCreateScenario}
        >
          <Sliders className="w-4 h-4" />
          Create Scenario
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-semibold gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-slate-50"
          onClick={onSaveScenario}
        >
          <Bookmark className="w-4 h-4 text-purple-600" />
          Save Scenario
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-medium gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-slate-50"
          onClick={onExport}
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Forecast
        </Button>
      </div>
    </div>
  );
}
