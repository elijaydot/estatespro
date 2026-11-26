import { TrendingUp, PieChart, Building2, Smartphone, Landmark, Banknote, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PropertyPerformance {
  propertyName: string;
  collected: number;
  expected: number;
  rate: number;
}

interface CollectionPerformanceProps {
  propertyStats: PropertyPerformance[];
  channelDistribution: {
    momo: number;
    bank: number;
    cash: number;
    card: number;
  };
  currency?: string;
}

export function CollectionPerformance({
  propertyStats,
  channelDistribution,
  currency = 'RWF',
}: CollectionPerformanceProps) {
  const totalVolume =
    channelDistribution.momo +
    channelDistribution.bank +
    channelDistribution.cash +
    channelDistribution.card || 1;

  const momoPct = Math.round((channelDistribution.momo / totalVolume) * 100);
  const bankPct = Math.round((channelDistribution.bank / totalVolume) * 100);
  const cashPct = Math.round((channelDistribution.cash / totalVolume) * 100);
  const cardPct = Math.round((channelDistribution.card / totalVolume) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Property-by-Property Performance */}
      <Card className="lg:col-span-2 border border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Property Collection Velocity
            </CardTitle>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Ranked by on-time yield</span>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {propertyStats.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">No property collection data available.</p>
          ) : (
            propertyStats.map((p) => (
              <div key={p.propertyName} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">{p.propertyName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">
                      {currency} {p.collected.toLocaleString()} / {currency} {p.expected.toLocaleString()}
                    </span>
                    <span className="font-bold text-blue-700 w-12 text-right">{p.rate.toFixed(1)}%</span>
                  </div>
                </div>
                <Progress value={Math.min(100, p.rate)} className="h-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Payment Channels Distribution */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Payment Channels
            </CardTitle>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Portfolio Split</span>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-3 text-xs">
            {/* MoMo */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/70 border border-amber-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-950">MTN Mobile Money</span>
              </div>
              <span className="font-bold text-amber-900">{momoPct}%</span>
            </div>

            {/* Bank Transfer */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/70 border border-blue-100">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-950">Bank Transfer</span>
              </div>
              <span className="font-bold text-blue-900">{bankPct}%</span>
            </div>

            {/* Cash */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-950">Cash Collection</span>
              </div>
              <span className="font-bold text-emerald-900">{cashPct}%</span>
            </div>

            {/* Card */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-indigo-950">Card Gateway</span>
              </div>
              <span className="font-bold text-indigo-900">{cardPct}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
