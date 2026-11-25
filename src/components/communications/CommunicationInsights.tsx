import { TrendingUp, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CommunicationInsightsProps {
  observations?: string[];
}

export function CommunicationInsights({ observations }: CommunicationInsightsProps) {
  const defaultObservations = [
    'Most resident communications across the portfolio this week related to scheduled maintenance and facility updates.',
    'Lease renewal discussions and resident inquiries increased by 22% entering the upcoming quarter.',
    'Average staff response time across all active properties improved to under 3.5 hours compared to last month.',
  ];

  const items = observations && observations.length > 0 ? observations.slice(0, 3) : defaultObservations;

  return (
    <Card className="border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Portfolio Communication Observations
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Monthly Portfolio Summary</span>
      </div>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((obs, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs flex items-start gap-3"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
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
