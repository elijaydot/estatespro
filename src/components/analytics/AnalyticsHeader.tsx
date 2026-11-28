// src/components/analytics/AnalyticsHeader.tsx
// FishGate Design Constitution v1.0 - Section 1: Header (Title, Subtitle & Business Actions)

import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Download,
  Bookmark,
  GitCompare,
  Calendar,
} from 'lucide-react';

interface AnalyticsHeaderProps {
  onExport: () => void;
  onSaveView: () => void;
  onCreateComparison: () => void;
}

export function AnalyticsHeader({
  onExport,
  onSaveView,
  onCreateComparison,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span>Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Understand performance trends across properties, residents, finances and operations.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 h-9"
          onClick={onCreateComparison}
        >
          <GitCompare className="w-4 h-4" />
          Create Comparison
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-semibold gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-slate-50"
          onClick={onSaveView}
        >
          <Bookmark className="w-4 h-4 text-purple-600" />
          Save View
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-medium gap-1.5 text-slate-700 h-9 border-slate-200 hover:bg-slate-50"
          onClick={onExport}
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Analysis
        </Button>
      </div>
    </div>
  );
}
