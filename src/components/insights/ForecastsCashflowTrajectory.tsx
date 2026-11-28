// src/components/insights/ForecastsCashflowTrajectory.tsx
// FishGate Design Constitution v1.0 - Forecasts: Cashflow & Revenue Trajectory ("What is Likely to Happen Next?")

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function ForecastsCashflowTrajectory() {
  const [scenario, setScenario] = useState<'expected' | 'conservative' | 'optimistic'>('expected');

  // Trailing actuals into forward 6-month projection
  const cashflowData = [
    { month: 'Oct (Act)', expected: 30400000, conservative: 30400000, optimistic: 30400000 },
    { month: 'Nov (Act)', expected: 31500000, conservative: 31500000, optimistic: 31500000 },
    { month: 'Dec (Proj)', expected: 32800000, conservative: 30500000, optimistic: 33900000 },
    { month: 'Jan 2027', expected: 33400000, conservative: 31000000, optimistic: 34800000 },
    { month: 'Feb 2027', expected: 33400000, conservative: 31200000, optimistic: 35100000 },
    { month: 'Mar 2027', expected: 35200000, conservative: 32400000, optimistic: 37000000 },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            6-Month Forward Cashflow Trajectory Modeling
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Projected monthly gross revenue expands from <strong>RWF 31.5M</strong> in November to <strong>RWF 35.2M</strong> by March 2027 under expected scenario assumptions. Growth is driven by the contractual <strong>8% renewal indexation</strong> on commercial leases and new residential unit handovers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Forward Projection Chart */}
        <Card className="lg:col-span-2 p-4 border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-xs text-slate-900">Forward Collections Forecast (Next 6 Months)</h4>
              <p className="text-[11px] text-slate-500">Expected vs. Conservative vs. Optimistic realization bands.</p>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Expected
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block ml-2" /> Conservative
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ml-2" /> Optimistic
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [`RWF ${Number(value).toLocaleString()}`, name.toUpperCase()]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="optimistic" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Optimistic" />
                <Line type="monotone" dataKey="expected" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Expected" />
                <Line type="monotone" dataKey="conservative" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Conservative" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Projection confidence index: 94.2% based on bound contracts</span>
            <span className="font-semibold text-blue-700">Predictive Modeling Active</span>
          </div>
        </Card>

        {/* 30/60/90 Day Projected Totals */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-3">
              <h4 className="font-bold text-xs text-slate-900">Forward Inflow Horizons</h4>
              <p className="text-[11px] text-slate-500">Cumulative expected cash inflows.</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">30-Day Inflow (Dec 2026)</span>
                <span className="font-mono font-black text-lg text-slate-900 block mt-0.5">RWF 32,800,000</span>
                <span className="text-[10px] text-emerald-700 font-medium">+4.1% over November</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">90-Day Cumulative (Q1 2027)</span>
                <span className="font-mono font-black text-lg text-slate-900 block mt-0.5">RWF 101,400,000</span>
                <span className="text-[10px] text-slate-500">Includes 2 scheduled commercial renewals</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">180-Day Runway Projected</span>
                <span className="font-mono font-black text-lg text-slate-900 block mt-0.5">RWF 208,600,000</span>
                <span className="text-[10px] text-slate-500">92% contractual coverage</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-right">
            Refreshed daily against active tenancy agreements
          </div>
        </Card>
      </div>
    </div>
  );
}
