// src/components/analytics/AnalyticsObservations.tsx
// FishGate Design Constitution v1.0 - Observations Section
// Display strictly 3-5 human operational observations.
// Strictly NEVER reference AI, machine learning, telemetry, or algorithms.

import { Card } from '@/components/ui/card';
import { Eye, CheckCircle2, Building, DollarSign, Users, Wrench } from 'lucide-react';

interface AnalyticsObservationsProps {
  observations?: string[];
}

export function AnalyticsObservations({
  observations,
}: AnalyticsObservationsProps) {
  const defaultObservations = [
    {
      id: 'obs-1',
      icon: Building,
      text: 'Lease renewals remain strongest at Riverside Luxury Suites, supported by multi-year diplomatic and corporate contracts.',
    },
    {
      id: 'obs-2',
      icon: DollarSign,
      text: 'Most revenue growth originated from residential properties at Kigali Heights following the recent occupancy expansion.',
    },
    {
      id: 'obs-3',
      icon: Wrench,
      text: 'Maintenance expenditure has stabilized across all premises after preventative HVAC overhauls concluded in early November.',
    },
    {
      id: 'obs-4',
      icon: Users,
      text: 'Collection discipline reached 99.4% on-time realization, driven by automated mobile money invoice reconciliation.',
    },
  ];

  return (
    <Card className="p-4 border-slate-200 bg-slate-50/80 shadow-2xs">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="p-1 rounded bg-blue-100 text-blue-700">
          <Eye className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
          Operational Observations
        </h3>
        <span className="text-[11px] text-slate-400">Ground-level portfolio intelligence</span>
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
