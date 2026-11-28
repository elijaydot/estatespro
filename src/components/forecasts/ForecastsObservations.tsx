// src/components/forecasts/ForecastsObservations.tsx
// FishGate Design Constitution v1.0 - Observations Section
// Display 3-5 planning observations presented naturally.
// Strictly NEVER mention AI, prediction engines, telemetry, or machine learning.

import { Card } from '@/components/ui/card';
import { Eye, Building, DollarSign, Wrench, FileText } from 'lucide-react';

interface ForecastsObservationsProps {
  observations?: string[];
}

export function ForecastsObservations({
  observations,
}: ForecastsObservationsProps) {
  const defaultObservations = [
    {
      id: 'fobs-1',
      icon: Building,
      text: 'Renewing five strategic leases across Riverside and Vision City will maintain portfolio occupancy safely above 95% through Q2 2027.',
    },
    {
      id: 'fobs-2',
      icon: DollarSign,
      text: 'Upcoming lease expirations concentrated in January could temporarily soften monthly collections by RWF 1.6M if renewal terms are not confirmed 30 days ahead.',
    },
    {
      id: 'fobs-3',
      icon: Wrench,
      text: 'Maintenance demand is expected to increase during the December statutory inspection season, requiring advance vendor reservation to avoid turnaround delays.',
    },
    {
      id: 'fobs-4',
      icon: FileText,
      text: 'Full absorption of the two pending units at Kigali Heights will add RWF 2,400,000 in monthly recurring rental cashflow.',
    },
  ];

  return (
    <Card className="p-4 border-slate-200 bg-slate-50/80 shadow-2xs">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1 rounded bg-blue-100 text-blue-700">
          <Eye className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
          Planning Observations
        </h3>
        <span className="text-[11px] text-slate-400">Operational forward context</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {defaultObservations.map((obs) => {
          const Icon = obs.icon;
          return (
            <div
              key={obs.id}
              className="p-3 bg-white border border-slate-200 rounded-md flex items-start gap-2.5 hover:border-slate-300 transition-colors"
            >
              <div className="mt-0.5 p-1 rounded bg-slate-100 text-slate-600 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {obs.text}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
