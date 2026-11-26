import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CollectionObservationsProps {
  observations?: string[];
}

export function CollectionObservations({ observations }: CollectionObservationsProps) {
  const defaultObservations = [
    'Portfolio collection rate improved by 4.8% over the previous cycle, driven by automated MoMo reminders.',
    'Overdue balances remain primarily concentrated in commercial suites at Vision City Hub.',
    'Three accounts represent 42% of total overdue arrears and have been flagged for structured payment plans.',
  ];

  const items = observations && observations.length > 0 ? observations.slice(0, 3) : defaultObservations;

  return (
    <Card className="border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Collection Performance Observations
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Monthly Financial Audit</span>
      </div>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((obs, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex items-start gap-3"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                {idx + 1}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {obs}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
