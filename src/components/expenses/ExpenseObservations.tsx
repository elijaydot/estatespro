// src/components/expenses/ExpenseObservations.tsx
// FishGate Design Constitution v1.0 - Section 7: Expense Observations (Human-Centered, Max 3)

import { TrendingUp, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ExpenseObservations() {
  const observations = [
    {
      id: 'obs-1',
      icon: TrendingUp,
      title: 'Maintenance Cost Velocity',
      text: 'Maintenance expenses increased by 12% this month following scheduled HVAC preventive servicing and backup generator overhaul across Vision City.',
    },
    {
      id: 'obs-2',
      icon: FileSpreadsheet,
      title: 'Utility Consumption Benchmark',
      text: 'Water and electricity utility charges remain 8.5% above seasonal average at Riverside Towers due to dry season common area irrigation and security lighting.',
    },
    {
      id: 'obs-3',
      icon: ShieldCheck,
      title: 'Recurring Contract Concentration',
      text: 'Three long-term service agreements (Physical Security, Specialized Waste Disposal, and Elevator Maintenance) account for 45% of committed monthly operating outlays.',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Monthly Expense Observations
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">Financial Controller Review</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {observations.map((obs) => {
          const Icon = obs.icon;
          return (
            <Card key={obs.id} className="border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{obs.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{obs.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
