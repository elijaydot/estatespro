// src/components/expenses/ExpenseHealthSummary.tsx
// FishGate Design Constitution v1.0 - Section 2: Expense Health Summary (Max 4 Cards)

import { DollarSign, PieChart, Clock, Repeat, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ExpenseHealthSummaryProps {
  expensesThisMonth: number;
  monthlyBudget: number;
  budgetUtilizationPercent: number;
  pendingApprovalsCount: number;
  pendingApprovalsAmount: number;
  recurringExpensesTotal: number;
  currency?: string;
  momGrowthPercent?: number;
}

export function ExpenseHealthSummary({
  expensesThisMonth,
  monthlyBudget,
  budgetUtilizationPercent,
  pendingApprovalsCount,
  pendingApprovalsAmount,
  recurringExpensesTotal,
  currency = 'RWF',
  momGrowthPercent = 4.2,
}: ExpenseHealthSummaryProps) {
  const isBudgetWarning = budgetUtilizationPercent > 85;
  const isBudgetExceeded = budgetUtilizationPercent > 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Expenses This Month */}
      <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Expenses This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {currency} {expensesThisMonth.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {momGrowthPercent >= 0 ? (
              <span className="inline-flex items-center text-rose-600 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                +{momGrowthPercent}%
              </span>
            ) : (
              <span className="inline-flex items-center text-emerald-600 font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {momGrowthPercent}%
              </span>
            )}
            <span>vs previous month</span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Budget Utilization */}
      <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Budget Utilization
            </span>
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                isBudgetExceeded
                  ? 'bg-rose-100 text-rose-700'
                  : isBudgetWarning
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              )}
            >
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                'text-2xl font-bold tracking-tight',
                isBudgetExceeded ? 'text-rose-700' : isBudgetWarning ? 'text-amber-700' : 'text-slate-900'
              )}
            >
              {budgetUtilizationPercent.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 font-medium">of {currency} {monthlyBudget.toLocaleString()}</span>
          </div>
          <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all rounded-full',
                isBudgetExceeded ? 'bg-rose-600' : isBudgetWarning ? 'bg-amber-500' : 'bg-blue-600'
              )}
              style={{ width: `${Math.min(100, budgetUtilizationPercent)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Pending Approvals */}
      <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                pendingApprovalsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              )}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {pendingApprovalsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              requests ({currency} {pendingApprovalsAmount.toLocaleString()})
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {pendingApprovalsCount === 0 ? 'All submissions approved' : 'Requires operational sign-off'}
          </p>
        </CardContent>
      </Card>

      {/* 4. Recurring Expenses */}
      <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recurring Expenses
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {currency} {recurringExpensesTotal.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Committed monthly operational contracts
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
