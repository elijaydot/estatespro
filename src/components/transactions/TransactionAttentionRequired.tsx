// src/components/transactions/TransactionAttentionRequired.tsx
// FishGate Design Constitution v1.0 - Section 3: Financial Integrity & Attention Required

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, FileWarning, RefreshCw, FileText } from 'lucide-react';
import { AttentionItem, TransactionRecord } from './types';

interface TransactionAttentionRequiredProps {
  attentionItems: AttentionItem[];
  currency?: string;
  onSelectTransaction: (transactionId: string) => void;
  onResolveItem: (itemId: string, action: string) => void;
}

export function TransactionAttentionRequired({
  attentionItems,
  currency = 'RWF',
  onSelectTransaction,
  onResolveItem,
}: TransactionAttentionRequiredProps) {
  if (attentionItems.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
        <CardContent className="py-4 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                Financial Integrity Verified
              </p>
              <p className="text-xs text-emerald-800">
                All collections, disbursements, transfers, and adjustments are fully reconciled with supporting evidence.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-800 text-xs font-medium">
            Audit Ready
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const getIssueIcon = (type: AttentionItem['type']) => {
    switch (type) {
      case 'failed_payment':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'duplicate':
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
      case 'missing_docs':
        return <FileWarning className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getIssueBadgeVariant = (type: AttentionItem['type']) => {
    switch (type) {
      case 'failed_payment':
        return 'destructive';
      case 'duplicate':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="border-amber-200/90 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 shadow-xs">
      <CardHeader className="py-3 px-5 border-b border-amber-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-sm font-bold text-slate-900">
            Attention Required • Financial Integrity ({attentionItems.length})
          </CardTitle>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Prioritized by financial risk & reconciliation impact
        </span>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {attentionItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all gap-4 text-xs"
          >
            {/* Left Info: Icon, Ref & Issue */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-md bg-slate-50 border border-slate-200 mt-0.5 shrink-0">
                {getIssueIcon(item.type)}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-900 hover:text-blue-600 cursor-pointer" onClick={() => onSelectTransaction(item.transactionId)}>
                    {item.reference}
                  </span>
                  <Badge variant={getIssueBadgeVariant(item.type)} className="text-[10px] font-semibold">
                    {item.issue}
                  </Badge>
                  <span className="font-bold text-slate-900 ml-1">
                    {currency} {item.amount.toLocaleString()}
                  </span>
                </div>
                <div className="text-slate-600 flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400">Impact:</span>
                  <span className="text-slate-700 font-medium">{item.impact}</span>
                </div>
              </div>
            </div>

            {/* Right Action */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium text-slate-700"
                onClick={() => onSelectTransaction(item.transactionId)}
              >
                Inspect
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => onResolveItem(item.id, item.recommendedAction)}
              >
                {item.recommendedAction}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
