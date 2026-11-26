// src/components/expenses/ExpenseAttentionRequired.tsx
// FishGate Design Constitution v1.0 - Section 3: Financial Control Attention Center

import {
  AlertTriangle,
  Clock,
  FileQuestion,
  CalendarClock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ExpenseAttentionItem } from './types';

interface ExpenseAttentionRequiredProps {
  items: ExpenseAttentionItem[];
  onAction: (item: ExpenseAttentionItem) => void;
  currency?: string;
}

export function ExpenseAttentionRequired({
  items,
  onAction,
  currency = 'RWF',
}: ExpenseAttentionRequiredProps) {
  if (items.length === 0) {
    return (
      <Card className="border border-emerald-200 bg-emerald-50/50 shadow-2xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              Financial Controls In Order
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              No budget variances, overdue invoices, missing receipts, or pending approvals requiring immediate action.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIssueIcon = (type: ExpenseAttentionItem['issueType']) => {
    switch (type) {
      case 'budget_exceeded':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'approval_required':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'missing_receipt':
        return <FileQuestion className="w-4 h-4 text-amber-600" />;
      case 'recurring_due':
        return <CalendarClock className="w-4 h-4 text-blue-600" />;
      case 'invoice_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'unassigned':
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getBadgeStyle = (severity: ExpenseAttentionItem['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className="border border-slate-200 shadow-2xs bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Attention Required • Financial Controls ({items.length})
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">Prioritized for operational control</span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  item.severity === 'critical' ? 'bg-rose-50' : item.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                )}
              >
                {getIssueIcon(item.issueType)}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  <Badge variant="outline" className={cn('text-[10px] uppercase font-bold px-1.5 py-0', getBadgeStyle(item.severity))}>
                    {item.issueType.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500">• {item.propertyName}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{item.issueDescription}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <div className="text-left sm:text-right">
                <span className="text-sm font-bold text-slate-900 block">
                  {currency} {item.amount.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Recorded outlay</span>
              </div>

              <Button
                size="sm"
                className={cn(
                  'font-semibold text-xs h-8 gap-1.5 shadow-2xs',
                  item.actionType === 'approve'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : item.actionType === 'pay'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
                onClick={() => onAction(item)}
              >
                <span>{item.recommendedAction}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
