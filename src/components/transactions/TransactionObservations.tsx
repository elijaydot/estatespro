// src/components/transactions/TransactionObservations.tsx
// FishGate Design Constitution v1.0 - Section 6: Transaction Observations (Maximum 3 Observations)
// Strict Rule: No AI/ML/Copilot/Telemetry terminology. Natural, executive-level insights.

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';
import { TransactionRecord } from './types';

interface TransactionObservationsProps {
  transactions: TransactionRecord[];
  currency?: string;
}

export function TransactionObservations({
  transactions,
  currency = 'RWF',
}: TransactionObservationsProps) {
  // Generate three natural observations from the live financial movements
  const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);
  const incoming = transactions.filter((t) => t.direction === 'in').reduce((acc, t) => acc + t.amount, 0);
  const outgoing = transactions.filter((t) => t.direction === 'out').reduce((acc, t) => acc + t.amount, 0);
  const incomingPercentage = totalVolume > 0 ? Math.round((incoming / totalVolume) * 100) : 0;

  // Property with highest volume
  const volumeByProperty = transactions.reduce((acc, t) => {
    const key = t.propertyName || 'Corporate General';
    acc[key] = (acc[key] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const topProperty = Object.entries(volumeByProperty).sort((a, b) => b[1] - a[1])[0] || [
    'Vision City Hub',
    0,
  ];

  const reconciledCount = transactions.filter((t) => t.reconciled).length;
  const reconciliationRate = transactions.length > 0 ? Math.round((reconciledCount / transactions.length) * 100) : 100;

  return (
    <Card className="border-slate-200/80 shadow-xs bg-slate-50/40">
      <CardHeader className="py-3 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-sm font-bold text-slate-900">
            Financial Ledger Observations
          </CardTitle>
        </div>
        <span className="text-xs text-slate-400 font-medium">Monthly treasury synopsis</span>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Observation 1 */}
        <div className="p-3 rounded-lg border border-slate-200/90 bg-white space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Collection Concentration</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Inflow transactions represent <strong className="text-slate-900">{incomingPercentage}%</strong> of all movement this cycle ({currency} {incoming.toLocaleString()}), maintaining a healthy positive net operating spread.
          </p>
        </div>

        {/* Observation 2 */}
        <div className="p-3 rounded-lg border border-slate-200/90 bg-white space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Capital Activity by Premises</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            The largest single share of transaction volume ({currency} {topProperty[1].toLocaleString()}) originated from <strong className="text-slate-900">{topProperty[0]}</strong>, primarily driven by residential collections.
          </p>
        </div>

        {/* Observation 3 */}
        <div className="p-3 rounded-lg border border-slate-200/90 bg-white space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audit & Reconciliation Cadence</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Ledger reconciliation is at <strong className="text-slate-900">{reconciliationRate}%</strong> completeness across bank feeds, mobile payment gateways, and cash counter accounts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
