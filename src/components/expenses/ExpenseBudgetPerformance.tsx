// src/components/expenses/ExpenseBudgetPerformance.tsx
// FishGate Design Constitution v1.0 - Section 5: Budget Performance & Cost Control

import { PieChart, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BudgetAnalysisItem } from './types';

interface ExpenseBudgetPerformanceProps {
  budgetItems: BudgetAnalysisItem[];
  currency?: string;
}

export function ExpenseBudgetPerformance({
  budgetItems,
  currency = 'RWF',
}: ExpenseBudgetPerformanceProps) {
  const totalAllocated = budgetItems.reduce((acc, item) => acc + item.allocatedBudget, 0);
  const totalSpent = budgetItems.reduce((acc, item) => acc + item.actualSpend, 0);
  const overallUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const isOverallExceeded = overallUtilization > 100;
  const isOverallWarning = overallUtilization > 85;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Overview Card */}
      <Card className="border border-slate-200 shadow-2xs bg-white lg:col-span-1">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
            <span>Portfolio Budget Health</span>
            <PieChart className="w-4 h-4 text-slate-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium">Overall Consumption</span>
              <span
                className={cn(
                  'font-bold',
                  isOverallExceeded ? 'text-rose-600' : isOverallWarning ? 'text-amber-600' : 'text-slate-900'
                )}
              >
                {overallUtilization.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, overallUtilization)}
              className={cn(
                'h-2',
                isOverallExceeded
                  ? '[&>div]:bg-rose-600'
                  : isOverallWarning
                  ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-blue-600'
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Budget</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {currency} {totalAllocated.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Actual Spend</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {currency} {totalSpent.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <span className="font-semibold block">Remaining Operational Buffer</span>
              <span className="text-[11px] text-emerald-700">
                {currency} {Math.max(0, totalAllocated - totalSpent).toLocaleString()} available before fiscal month-end.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="border border-slate-200 shadow-2xs bg-white lg:col-span-2">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
            <span>Departmental & Category Spend Velocity</span>
            <span className="text-xs text-slate-400 font-normal">Active Fiscal Period</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {budgetItems.slice(0, 5).map((item) => {
            const isExceeded = item.utilizationPercent > 100;
            const isWarning = item.utilizationPercent > 80;

            return (
              <div key={item.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.category}</span>
                    <span className="text-slate-400 font-normal">• {item.propertyName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {currency} {item.actualSpend.toLocaleString()} / {currency} {item.allocatedBudget.toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0',
                        isExceeded
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      )}
                    >
                      {item.utilizationPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                <Progress
                  value={Math.min(100, item.utilizationPercent)}
                  className={cn(
                    'h-1.5',
                    isExceeded
                      ? '[&>div]:bg-rose-600'
                      : isWarning
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-emerald-600'
                  )}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
