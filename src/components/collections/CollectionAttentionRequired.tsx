import { AlertTriangle, Clock, ArrowRight, CheckCircle2, ShieldAlert, Send, DollarSign, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CollectionAttentionItem } from './types';

interface CollectionAttentionRequiredProps {
  items: CollectionAttentionItem[];
  onAction: (item: CollectionAttentionItem) => void;
  currency?: string;
}

export function CollectionAttentionRequired({
  items,
  onAction,
  currency = 'RWF',
}: CollectionAttentionRequiredProps) {
  if (items.length === 0) {
    return (
      <Card className="border border-emerald-100 bg-emerald-50/50">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                All Rent Collections are Current
              </p>
              <p className="text-xs text-emerald-700">
                Zero delinquent leases, failed transactions, or payment plan breaches across your portfolio.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200">
            100% On-Time Performance
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-rose-200 bg-rose-50/30 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-rose-100 bg-rose-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-950">
            Attention Required • Immediate Collection Actions ({items.length})
          </h3>
        </div>
        <span className="text-xs text-rose-700 font-medium">Prioritized by business risk</span>
      </div>

      <div className="divide-y divide-rose-100/60 bg-white">
        {items.map((item) => {
          const isCritical = item.daysOutstanding > 30 || item.amount > 1500000;

          return (
            <div
              key={item.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold',
                    isCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{item.tenantName}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {item.propertyName} • Unit {item.unitNumber}
                    </span>
                    <Badge
                      variant={isCritical ? 'destructive' : 'outline'}
                      className={cn(
                        'text-[10px] px-1.5 py-0 h-4 uppercase font-bold',
                        !isCritical && 'text-amber-800 border-amber-300 bg-amber-50'
                      )}
                    >
                      {item.daysOutstanding} Days Overdue
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="font-bold text-rose-600">
                      {currency} {item.amount.toLocaleString()} overdue
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">{item.businessImpact}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  className={cn(
                    'h-8 text-xs font-semibold gap-1.5',
                    isCritical
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  )}
                  onClick={() => onAction(item)}
                >
                  {item.actionType === 'remind' && <Send className="w-3.5 h-3.5" />}
                  {item.actionType === 'record' && <DollarSign className="w-3.5 h-3.5" />}
                  {item.actionType === 'resolve' && <RefreshCw className="w-3.5 h-3.5" />}
                  {item.recommendedAction}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
