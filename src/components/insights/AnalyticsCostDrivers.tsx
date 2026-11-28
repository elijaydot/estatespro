// src/components/insights/AnalyticsCostDrivers.tsx
// FishGate Design Constitution v1.0 - Analytics: Cost & Variance Drivers ("Why Did It Happen?")

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function AnalyticsCostDrivers() {
  const costVariance = [
    { category: 'Maintenance', budgeted: 1800000, actual: 1950000, variance: '+8.3%', rootCause: 'Unbudgeted elevator hoist inverter failure' },
    { category: 'Utilities', budgeted: 1500000, actual: 1680000, variance: '+12.0%', rootCause: 'Peak dry season chiller power consumption' },
    { category: 'Security', budgeted: 850000, actual: 820000, variance: '-3.5%', rootCause: 'Renegotiated quarterly contract with Intersec' },
    { category: 'Cleaning & Waste', budgeted: 500000, actual: 480000, variance: '-4.0%', rootCause: 'Bulk sanitation chemical procurement' },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            Primary Cost Variance Drivers (Nov 2026)
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Portfolio OPEX totaled <strong>RWF 4,930,000</strong> against a budgeted allocation of <strong>RWF 4,650,000</strong> (+6.0% variance). The overrun is strictly concentrated in two events: an statutory <strong>elevator inverter replacement</strong> at Kigali Heights (RWF 1.95M) and seasonal chiller loads during commercial peak hours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budget vs Actual Chart */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="mb-3">
            <h4 className="font-bold text-xs text-slate-900">Budgeted vs. Actual Expenditure by Cost Category</h4>
            <p className="text-[11px] text-slate-500">Highlights where capital deviated from baseline allocations.</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costVariance} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [`RWF ${Number(value).toLocaleString()}`, name === 'actual' ? 'Actual' : 'Budgeted']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="budgeted" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Budgeted" />
                <Bar dataKey="actual" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Maintenance and utilities comprise 73.6% of monthly outlays</span>
            <span className="font-mono text-amber-700 font-bold">+RWF 280,000 Overrun</span>
          </div>
        </Card>

        {/* Cost Breakdown Table with Root Causes */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
          <div>
            <div className="mb-3">
              <h4 className="font-bold text-xs text-slate-900">Category Root Cause Analysis</h4>
              <p className="text-[11px] text-slate-500">Explanatory audit of variances against operational SLAs.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {costVariance.map((c) => (
                <div key={c.category} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block">{c.category}</span>
                    <span className="text-[11px] text-slate-500">{c.rootCause}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-800 block">
                      RWF {c.actual.toLocaleString()}
                    </span>
                    <span
                      className={`text-[10px] font-bold font-mono ${
                        c.variance.startsWith('+') ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {c.variance} vs budget
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Vendor SLA renegotiation saved RWF 50,000</span>
            <span className="font-semibold text-blue-700">Audit Ready</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
