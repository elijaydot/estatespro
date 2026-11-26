// src/components/transactions/TransactionImportModal.tsx
// FishGate Design Constitution v1.0 - Bank & Statement Transaction Import Modal

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { TransactionRecord } from './types';

interface TransactionImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportTransactions: (transactions: TransactionRecord[]) => void;
  currency?: string;
}

export function TransactionImportModal({
  open,
  onOpenChange,
  onImportTransactions,
  currency = 'RWF',
}: TransactionImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const sampleCsv = `Reference,Date,Description,Amount,Direction,Source
BK-99120,2026-11-26,MTN Momo Cash In,450000,in,mtn_momo
BK-99121,2026-11-25,Kigali Heights AC Repair,120000,out,bank_transfer
BK-99122,2026-11-24,Tenant Parking Fee,25000,in,cash`;

  const handlePasteSample = () => {
    setCsvText(sampleCsv);
  };

  const handleImport = () => {
    if (!csvText.trim()) {
      toast({ title: 'CSV Content Required', description: 'Please paste CSV transaction rows or upload a file.', variant: 'destructive' });
      return;
    }

    try {
      setIsParsing(true);
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        toast({ title: 'Invalid CSV', description: 'CSV must have at least one header and one data row.', variant: 'destructive' });
        return;
      }

      const parsed: TransactionRecord[] = [];
      const header = lines[0].toLowerCase().split(',');

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 4) continue;

        const ref = row[0]?.trim() || `TRX-IMP-${Date.now()}-${i}`;
        const date = row[1]?.trim() || new Date().toISOString();
        const desc = row[2]?.trim() || 'Imported Statement Transaction';
        const amt = parseFloat(row[3]?.trim()) || 0;
        const dir = (row[4]?.trim()?.toLowerCase() === 'out' ? 'out' : 'in') as any;
        const src = (row[5]?.trim()?.toLowerCase() || 'bank_transfer') as any;

        if (amt > 0) {
          parsed.push({
            id: `trx-imp-${Date.now()}-${i}`,
            reference: ref,
            date,
            type: dir === 'in' ? 'collection' : 'expense',
            direction: dir,
            status: 'completed',
            amount: amt,
            currency,
            description: desc,
            source: src,
            createdBy: 'CSV Statement Importer',
            createdAt: new Date().toISOString(),
            reconciled: true,
            documents: [],
            auditTrail: [
              {
                id: `audit-${Date.now()}-${i}`,
                timestamp: new Date().toISOString(),
                actor: 'Statement Importer',
                action: 'Imported from Bank CSV',
                details: `Imported with reference ${ref} for ${currency} ${amt.toLocaleString()}`,
                newStatus: 'completed',
              },
            ],
          });
        }
      }

      if (parsed.length === 0) {
        toast({ title: 'No Valid Transactions', description: 'Could not extract valid records from CSV.', variant: 'destructive' });
        return;
      }

      onImportTransactions(parsed);
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${parsed.length} transaction(s) into the unified ledger.`,
      });
      setCsvText('');
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err?.message || 'Failed to parse CSV.', variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Import Bank or Gateway Statement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Batch import financial records from CSV feeds or bank exports.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700">Paste CSV Content</Label>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-blue-600"
              onClick={handlePasteSample}
            >
              Paste Sample Format
            </Button>
          </div>

          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Reference,Date,Description,Amount,Direction,Source..."
            rows={7}
            className="font-mono text-xs"
          />

          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">Required CSV Columns:</span>
            <code>Reference, Date (YYYY-MM-DD), Description, Amount, Direction (in/out), Source</code>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            onClick={handleImport}
            disabled={isParsing || !csvText.trim()}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Parse & Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
