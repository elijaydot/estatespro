// src/components/insights/AnalyticsRevenueDrivers.tsx
// FishGate Design Constitution v1.0 - Analytics: Revenue & Collection Drivers ("Why Did It Happen?")

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Building,
  CheckCircle2,
  DollarSign,
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

export function AnalyticsRevenueDrivers() {
  // Arrears by Age Bracket & Root Cause
  const arrearsDrivers = [
    { bracket: 'Current (0-15d)', amount: 14200000, cause: 'Standard corporate payroll timing' },
    { bracket: 'Grace (16-30d)', amount: 4800000, cause: 'Quarterly VAT invoice processing delays' },
    { bracket: 'Overdue (31-60d)', amount: 1850000, cause: 'Tenant cashflow restructuring (Unit A-201)' },
    { bracket: 'Critical (61d+)', amount: 650000, cause: 'Promissory note negotiation underway' },
  ];

  // Collection Variance Drivers
  const collectionVariance = [
    { month: 'Jul', target: 28000000, realized: 27800000, variance: '-0.7%' },
    { month: 'Aug', target: 28000000, realized: 28200000, variance: '+0.7%' },
    { month: 'Sep', target: 29500000, realized: 29100000, variance: '-1.3%' },
    { month: 'Oct', target: 30000000, realized: 30400000, variance: '+1.3%' },
    { month: 'Nov', target: 31200000, realized: 31500000, variance: '+0.9%' },
  ];

  return (
    <div className="space-y-4">
      {/* Narrative Root Cause Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <h4 className="font-bold text-xs text-slate-900">
            Primary Revenue Variance Findings (Nov 2026)
          </h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed pl-6">
          Collections reached <strong>101.0%</strong> of statutory target this month. The positive variance was driven by an <strong>8% contractual indexation</strong> realized at Vision City Commercial Hub, offsetting an overdue RWF 650,000 promissory balance at Riverside Luxury Suites.
        </p>
      </div>

      {/* Visual Chart: Arrears Aging Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="mb-3">
            <h4 className="font-bold text-xs text-slate-900">Arrears Concentration by Aging Horizon</h4>
            <p className="text-[11px] text-slate-500">Why are funds delayed? Analyzed by statutory debt tier.</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arrearsDrivers} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="bracket" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value: any) => [`RWF ${Number(value).toLocaleString()}`, 'Outstanding']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>72% of arrears are within normal 15-day corporate clearance</span>
            <span className="font-mono font-bold text-slate-700">Total: RWF 21.5M</span>
          </div>
        </Card>

        {/* Realization Target Variance */}
        <Card className="p-4 border-slate-200 bg-white shadow-2xs">
          <div className="mb-3">
            <h4 className="font-bold text-xs text-slate-900">Realization vs. Contractual Target (Trailing 5 Months)</h4>
            <p className="text-[11px] text-slate-500">Explains predictability and collection cadence over time.</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionVariance} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [`RWF ${Number(value).toLocaleString()}`, name === 'realized' ? 'Realized' : 'Target']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="target" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="realized" fill="#10b981" radius={[4, 4, 0, 0]} name="Realized" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Collection efficiency index: 99.4% average realization</span>
            <span className="font-semibold text-emerald-700">Strong Governance</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
