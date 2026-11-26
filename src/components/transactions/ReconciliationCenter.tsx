// src/components/transactions/ReconciliationCenter.tsx
// FishGate Design Constitution v1.0 - Section 7: Bank & Financial Statement Reconciliation Center

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  UploadCloud,
  FileCheck,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ReconciliationStatementItem, TransactionRecord } from './types';

interface ReconciliationCenterProps {
  transactions: TransactionRecord[];
  currency?: string;
  onOpenImportModal: () => void;
  onMatchTransaction: (statementItemId: string, transactionId: string) => void;
}

export function ReconciliationCenter({
  transactions,
  currency = 'RWF',
  onOpenImportModal,
  onMatchTransaction,
}: ReconciliationCenterProps) {
  const [statementItems, setStatementItems] = useState<ReconciliationStatementItem[]>([
    {
      id: 'stmt-1',
      externalRef: 'BK-MTN-998234',
      date: '2026-11-25',
      description: 'MTN Mobile Money Disb: Wasac Plumbing Services Ltd',
      amount: 75000,
      direction: 'out',
      bankAccount: 'Bank of Kigali - Operating #9921',
      matchedTransactionId: 'trx-exp-4',
      status: 'matched',
    },
    {
      id: 'stmt-2',
      externalRef: 'BK-TRF-441209',
      date: '2026-11-24',
      description: 'Direct Inward Transfer: Eric Habimana Unit B-104 Rent',
      amount: 820000,
      direction: 'in',
      bankAccount: 'Bank of Kigali - Collections #3301',
      matchedTransactionId: 'trx-col-1',
      status: 'matched',
    },
    {
      id: 'stmt-3',
      externalRef: 'BK-UNM-889120',
      date: '2026-11-23',
      description: 'Cheque Deposit Ref #99401 - Unidentified Remitter',
      amount: 450000,
      direction: 'in',
      bankAccount: 'Bank of Kigali - Collections #3301',
      matchedTransactionId: null,
      status: 'unmatched',
    },
    {
      id: 'stmt-4',
      externalRef: 'BK-CHG-102931',
      date: '2026-11-20',
      description: 'BK Monthly Commercial Account Maintenance & SMS Alert Fee',
      amount: 15000,
      direction: 'out',
      bankAccount: 'Bank of Kigali - Operating #9921',
      matchedTransactionId: null,
      status: 'exception',
    },
    {
      id: 'stmt-5',
      externalRef: 'BK-ELEC-44219',
      date: '2026-11-18',
      description: 'RTGS Settlement: ElectroPower Rwanda Ltd Invoice 902',
      amount: 1450000,
      direction: 'out',
      bankAccount: 'I&M Bank - Capital Works #8812',
      matchedTransactionId: 'trx-exp-2',
      status: 'matched',
    },
  ]);

  const [search, setSearch] = useState('');

  const matchedCount = statementItems.filter((s) => s.status === 'matched').length;
  const unmatchedCount = statementItems.filter((s) => s.status === 'unmatched').length;
  const exceptionCount = statementItems.filter((s) => s.status === 'exception').length;
  const matchPercentage = Math.round((matchedCount / statementItems.length) * 100);

  const handleManualMatch = (statementId: string) => {
    // Find closest amount transaction
    const targetStatement = statementItems.find((s) => s.id === statementId);
    if (!targetStatement) return;

    const candidate = transactions.find(
      (t) => Math.abs(t.amount - targetStatement.amount) < 100 && t.direction === targetStatement.direction
    );

    if (candidate) {
      setStatementItems((prev) =>
        prev.map((s) => (s.id === statementId ? { ...s, status: 'matched', matchedTransactionId: candidate.id } : s))
      );
      onMatchTransaction(statementId, candidate.id);
      toast({
        title: 'Reconciled Successfully',
        description: `Statement item ${targetStatement.externalRef} matched with ${candidate.reference}.`,
      });
    } else {
      toast({
        title: 'No Direct Ledger Match Found',
        description: 'Create an offsetting manual adjustment or import a detailed ledger feed.',
        variant: 'destructive',
      });
    }
  };

  const handleResolveException = (statementId: string) => {
    setStatementItems((prev) =>
      prev.map((s) => (s.id === statementId ? { ...s, status: 'matched' } : s))
    );
    toast({
      title: 'Exception Marked Resolved',
      description: 'Bank service fee ledger entry booked and balanced.',
    });
  };

  const filteredItems = statementItems.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.externalRef.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.bankAccount.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 p-4">
      {/* Top Reconciliation Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Reconciliation Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-slate-900">{matchPercentage}%</span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> High Integrity
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Matched Items
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-600">{matchedCount}</span>
            <span className="text-xs text-slate-400">verified against bank</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Unmatched Feeds
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-amber-600">{unmatchedCount}</span>
            <span className="text-xs text-slate-400">require identification</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Exceptions
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold text-red-600">{exceptionCount}</span>
            <span className="text-xs text-slate-400">discrepancy or fee</span>
          </div>
        </div>
      </div>

      {/* Action and Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search bank reference, description or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-medium gap-1.5"
            onClick={onOpenImportModal}
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            Upload Bank Statement
          </Button>
        </div>
      </div>

      {/* Statement Feeds Matching Table */}
      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700">Bank Reference</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Statement Date</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Description & Account</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Amount</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Ledger Match</TableHead>
              <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id} className="text-xs hover:bg-slate-50/60">
                <TableCell className="font-mono font-semibold text-slate-900">
                  {item.externalRef}
                </TableCell>
                <TableCell className="text-slate-600">{item.date}</TableCell>
                <TableCell className="max-w-[280px]">
                  <div className="font-medium text-slate-900 truncate">{item.description}</div>
                  <div className="text-[10px] text-slate-500">{item.bankAccount}</div>
                </TableCell>
                <TableCell className="font-mono font-bold">
                  <span
                    className={
                      item.direction === 'in'
                        ? 'text-emerald-700 flex items-center gap-0.5'
                        : 'text-slate-900 flex items-center gap-0.5'
                    }
                  >
                    {item.direction === 'in' ? (
                      <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="w-3 h-3 text-slate-500" />
                    )}
                    {currency} {item.amount.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  {item.matchedTransactionId ? (
                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-blue-700 border-blue-200">
                      {item.matchedTransactionId.toUpperCase()}
                    </Badge>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">No ledger link</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.status === 'matched' && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Reconciled
                    </Badge>
                  )}
                  {item.status === 'unmatched' && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Unmatched
                    </Badge>
                  )}
                  {item.status === 'exception' && (
                    <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
                      Exception
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.status === 'unmatched' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-semibold gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleManualMatch(item.id)}
                    >
                      <Check className="w-3 h-3" /> Auto-Match
                    </Button>
                  )}
                  {item.status === 'exception' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-semibold gap-1 text-slate-700 hover:bg-slate-100"
                      onClick={() => handleResolveException(item.id)}
                    >
                      Resolve Fee
                    </Button>
                  )}
                  {item.status === 'matched' && (
                    <span className="text-slate-400 text-[11px] flex items-center justify-end gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
