// src/components/transactions/TransactionStatementModal.tsx
// FishGate Design Constitution v1.0 - Official Financial Statement Generator

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { FileText, Download, Printer, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { TransactionRecord } from './types';
import { downloadCsv } from '@/lib/download';
import { openPrintHtml } from '@/lib/pdfService';
import { Property } from '@/hooks/useProperties';

interface TransactionStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: TransactionRecord[];
  properties: Property[];
  companyName?: string;
  currency?: string;
}

export function TransactionStatementModal({
  open,
  onOpenChange,
  transactions,
  properties,
  companyName = 'FishGate Real Estate Rwanda Ltd',
  currency = 'RWF',
}: TransactionStatementModalProps) {
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'last_90' | 'ytd' | 'all'>('this_month');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  // Filtered transactions for the statement
  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      // Property filter
      if (selectedPropertyId !== 'all') {
        if (t.propertyId !== selectedPropertyId) return false;
      }

      // Period filter
      const tDate = new Date(t.date);
      if (period === 'this_month') {
        return (
          tDate.getFullYear() === now.getFullYear() &&
          tDate.getMonth() === now.getMonth()
        );
      }
      if (period === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return tDate.getFullYear() === year && tDate.getMonth() === lastMonth;
      }
      if (period === 'last_90') {
        const diffMs = now.getTime() - tDate.getTime();
        return diffMs <= 90 * 24 * 60 * 60 * 1000;
      }
      if (period === 'ytd') {
        return tDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, selectedPropertyId, period]);

  const totalIn = filtered
    .filter((t) => t.direction === 'in')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalOut = filtered
    .filter((t) => t.direction === 'out')
    .reduce((acc, t) => acc + t.amount, 0);

  const netCashFlow = totalIn - totalOut;

  const handleExportCsv = () => {
    const rows = filtered.map((t) => ({
      Reference: t.reference,
      Date: format(new Date(t.date), 'yyyy-MM-dd'),
      Type: t.type,
      Direction: t.direction,
      Amount: t.amount,
      Currency: t.currency,
      Status: t.status,
      Description: t.description,
      Source: t.source,
      SourceReference: t.sourceReference || '',
      Property: t.propertyName || 'Corporate General',
      Unit: t.unitNumber || '',
      Tenant: t.tenantName || '',
      Vendor: t.vendorName || '',
      Reconciled: t.reconciled ? 'Yes' : 'No',
      CreatedBy: t.createdBy,
    }));

    downloadCsv(`financial-statement-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({
      title: 'Statement Exported',
      description: `Downloaded ${rows.length} transaction entries to CSV.`,
    });
  };

  const handlePrintPdf = () => {
    const propLabel =
      selectedPropertyId === 'all'
        ? 'Consolidated Portfolio (All Properties)'
        : properties.find((p) => p.id === selectedPropertyId)?.name || 'Specified Property';

    const periodLabel =
      period === 'this_month'
        ? 'Current Month Statement'
        : period === 'last_month'
        ? 'Previous Month Statement'
        : period === 'last_90'
        ? 'Trailing 90 Days Statement'
        : period === 'ytd'
        ? 'Year to Date (YTD) Statement'
        : 'All-Time Financial Statement';

    const rowsHtml = filtered
      .map(
        (t) => `
      <tr>
        <td style="font-family: monospace; font-weight: bold; color: #1e40af;">${t.reference}</td>
        <td>${format(new Date(t.date), 'yyyy-MM-dd')}</td>
        <td style="text-transform: capitalize;">${t.type}</td>
        <td>${t.propertyName || 'Corporate'} ${t.unitNumber ? `(#${t.unitNumber})` : ''}</td>
        <td>${t.tenantName || t.vendorName || 'Internal Ledger'}</td>
        <td>${t.description}</td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; color: ${
          t.direction === 'in' ? '#047857' : '#0f172a'
        }">
          ${t.direction === 'in' ? '+' : '-'}${currency} ${t.amount.toLocaleString()}
        </td>
        <td style="text-transform: capitalize;">${t.status}</td>
        <td>${t.reconciled ? 'Reconciled' : 'Pending'}</td>
      </tr>
    `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Financial Statement - ${periodLabel}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 36px; color: #0f172a; line-height: 1.45; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-boxes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 12px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
    .box-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
    .box-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 700; color: #475569; border-bottom: 1.5px solid #cbd5e1; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
    .sig-line { border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">OFFICIAL FINANCIAL STATEMENT</h1>
      <div style="font-size: 12px; font-weight: 600; color: #2563eb; margin-top: 2px;">${periodLabel}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Entity: ${companyName} • Scope: ${propLabel}</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748b;">
      <div><strong>Statement Date:</strong> ${format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
      <div><strong>Records Included:</strong> ${filtered.length} entries</div>
    </div>
  </div>

  <div class="meta-boxes">
    <div class="box">
      <div class="box-label">Total Realized Inflow</div>
      <div class="box-val" style="color: #047857;">${currency} ${totalIn.toLocaleString()}</div>
    </div>
    <div class="box">
      <div class="box-label">Total Operational Outflow</div>
      <div class="box-val">${currency} ${totalOut.toLocaleString()}</div>
    </div>
    <div class="box">
      <div class="box-label">Net Operating Spread</div>
      <div class="box-val" style="color: #2563eb;">${currency} ${netCashFlow.toLocaleString()}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Reference</th>
        <th>Date</th>
        <th>Type</th>
        <th>Premises</th>
        <th>Counterparty</th>
        <th>Description</th>
        <th style="text-align: right;">Amount</th>
        <th>Status</th>
        <th>Reconciliation</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="signatures">
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Prepared by / Financial Controller</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div style="text-align: center; color: #64748b;">Approved by / Managing Director</div>
    </div>
  </div>
</body>
</html>`;

    openPrintHtml(html, `Financial-Statement-${period}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Generate Financial Statement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Produce executive statements with statutory reconciliation headers.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Statement Period</Label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="this_month">Current Month (Nov 2026)</option>
                <option value="last_month">Previous Month (Oct 2026)</option>
                <option value="last_90">Trailing 90 Days</option>
                <option value="ytd">Year to Date (2026)</option>
                <option value="all">Complete Financial History</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Premises / Property</Label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
              >
                <option value="all">All Properties (Consolidated)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Statement Preview Stat Box */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total In</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                {currency} {totalIn.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Out</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {currency} {totalOut.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Flow</span>
              <span className="text-sm font-bold text-blue-700 font-mono">
                {currency} {netCashFlow.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            Selected statement will compile <strong className="text-slate-800">{filtered.length}</strong> audited transactions.
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-medium"
              onClick={handleExportCsv}
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
              onClick={handlePrintPdf}
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
