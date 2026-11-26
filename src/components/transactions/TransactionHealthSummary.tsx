// src/components/transactions/TransactionHealthSummary.tsx
// FishGate Design Constitution v1.0 - Financial Activity Summary (Maximum 4 Cards)

import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Clock, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TransactionRecord } from './types';

interface TransactionHealthSummaryProps {
  transactions: TransactionRecord[];
  currency?: string;
  onFilterReview?: () => void;
  onFilterIncoming?: () => void;
  onFilterOutgoing?: () => void;
  onResetFilters?: () => void;
}

export function TransactionHealthSummary({
  transactions,
  currency = 'RWF',
  onFilterReview,
  onFilterIncoming,
  onFilterOutgoing,
  onResetFilters,
}: TransactionHealthSummaryProps) {
  // Current month transactions
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthTransactions = transactions.filter((t) => t.date.startsWith(currentMonthStr));
  const totalVolume = transactions.reduce((acc, t) => acc + t.amount, 0);

  // Money In: completed or processing incoming transactions
  const moneyIn = transactions
    .filter((t) => t.direction === 'in' && t.status !== 'failed' && t.status !== 'cancelled')
    .reduce((acc, t) => acc + t.amount, 0);

  // Money Out: completed or processing outgoing transactions
  const moneyOut = transactions
    .filter((t) => t.direction === 'out' && t.status !== 'failed' && t.status !== 'cancelled')
    .reduce((acc, t) => acc + t.amount, 0);

  // Transactions requiring review: failed, disputed, flagged, or pending refund/review
  const reviewCount = transactions.filter(
    (t) =>
      t.status === 'failed' ||
      t.status === 'disputed' ||
      t.flagged ||
      (t.type === 'refund' && t.status === 'pending') ||
      !t.reconciled
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Transactions This Month */}
      <Card
        onClick={onResetFilters}
        className="cursor-pointer border-slate-200/80 shadow-xs hover:border-slate-300 transition-all bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Transactions This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {thisMonthTransactions.length}{' '}
              <span className="text-xs font-normal text-slate-500">
                ({transactions.length} total)
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>{currency} {totalVolume.toLocaleString()} cumulative</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Money In */}
      <Card
        onClick={onFilterIncoming}
        className="cursor-pointer border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Money In (Collections)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {currency} {moneyIn.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>Rental receipts, deposits & credits</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Money Out */}
      <Card
        onClick={onFilterOutgoing}
        className="cursor-pointer border-slate-200/80 shadow-xs hover:border-slate-400 transition-all bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Money Out (Expenses)
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {currency} {moneyOut.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>Operating outlays, vendors & refunds</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Transactions Requiring Review */}
      <Card
        onClick={onFilterReview}
        className="cursor-pointer border-slate-200/80 shadow-xs hover:border-amber-300 transition-all bg-card"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Requiring Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-amber-700 tracking-tight">
              {reviewCount}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>{reviewCount === 0 ? 'All transactions reconciled' : 'Exceptions, disputes & pending'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
