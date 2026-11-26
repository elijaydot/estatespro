// src/components/transactions/TransactionExplorer.tsx
// FishGate Design Constitution v1.0 - Section 4: Transaction Explorer Primary Workspace

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pagination } from '@/components/shared/Pagination';
import {
  Search,
  Filter,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Printer,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Download,
  Building2,
  Users,
  Building,
} from 'lucide-react';
import { TransactionRecord, TransactionType, TransactionDirection, TransactionStatus } from './types';
import { ReconciliationCenter } from './ReconciliationCenter';

interface TransactionExplorerProps {
  transactions: TransactionRecord[];
  currency?: string;
  onSelectTransaction: (transaction: TransactionRecord) => void;
  onToggleReconciled: (transactionId: string) => void;
  onPrintVoucher: (transaction: TransactionRecord) => void;
  onOpenImportModal: () => void;
  onMatchTransaction: (statementItemId: string, transactionId: string) => void;
}

type TabMode = 'all' | 'incoming' | 'outgoing' | 'adjustments' | 'refunds' | 'transfers' | 'reconciliation';

export function TransactionExplorer({
  transactions,
  currency = 'RWF',
  onSelectTransaction,
  onToggleReconciled,
  onPrintVoucher,
  onOpenImportModal,
  onMatchTransaction,
}: TransactionExplorerProps) {
  const [activeTab, setActiveTab] = useState<TabMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Derive unique properties
  const propertyOptions = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.propertyName) set.add(t.propertyName);
    });
    return Array.from(set);
  }, [transactions]);

  // Handle Tab Switch
  const handleTabChange = (val: string) => {
    setActiveTab(val as TabMode);
    setPage(1);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Tab filter
      if (activeTab === 'incoming' && t.direction !== 'in') return false;
      if (activeTab === 'outgoing' && t.direction !== 'out') return false;
      if (activeTab === 'adjustments' && t.type !== 'adjustment') return false;
      if (activeTab === 'refunds' && t.type !== 'refund') return false;
      if (activeTab === 'transfers' && t.type !== 'transfer') return false;

      // Dropdown filters
      if (propertyFilter !== 'all' && t.propertyName !== propertyFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;

      // Instant search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = t.reference.toLowerCase().includes(q);
        const descMatch = t.description.toLowerCase().includes(q);
        const tenantMatch = (t.tenantName || '').toLowerCase().includes(q);
        const vendorMatch = (t.vendorName || '').toLowerCase().includes(q);
        const propMatch = (t.propertyName || '').toLowerCase().includes(q);
        const unitMatch = (t.unitNumber || '').toLowerCase().includes(q);
        const sourceRefMatch = (t.sourceReference || '').toLowerCase().includes(q);
        const notesMatch = (t.notes || '').toLowerCase().includes(q);

        if (
          !refMatch &&
          !descMatch &&
          !tenantMatch &&
          !vendorMatch &&
          !propMatch &&
          !unitMatch &&
          !sourceRefMatch &&
          !notesMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, activeTab, propertyFilter, statusFilter, typeFilter, sourceFilter, searchQuery]);

  // Paginated slice
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const startIndex = (safePage - 1) * pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + pageSize);

  // Tab counts
  const incomingCount = transactions.filter((t) => t.direction === 'in').length;
  const outgoingCount = transactions.filter((t) => t.direction === 'out').length;
  const adjustmentsCount = transactions.filter((t) => t.type === 'adjustment').length;
  const refundsCount = transactions.filter((t) => t.type === 'refund').length;
  const transfersCount = transactions.filter((t) => t.type === 'transfer').length;

  const getTypeBadge = (type: TransactionType) => {
    switch (type) {
      case 'collection':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-semibold">Collection</Badge>;
      case 'expense':
        return <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-semibold">Expense</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">Refund</Badge>;
      case 'adjustment':
        return <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-semibold">Adjustment</Badge>;
      case 'transfer':
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-semibold">Transfer</Badge>;
      case 'deposit':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] font-semibold">Deposit</Badge>;
      case 'penalty':
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 text-[10px] font-semibold">Penalty</Badge>;
      case 'utility':
        return <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 text-[10px] font-semibold">Utility Charge</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-semibold">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold gap-1">
            <RotateCcw className="w-3 h-3 animate-spin" /> Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </Badge>
        );
      case 'disputed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-semibold gap-1">
            <AlertTriangle className="w-3 h-3" /> Disputed
          </Badge>
        );
      case 'refunded':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold">
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px] font-semibold">{status}</Badge>;
    }
  };

  const formatSource = (source: TransactionRecord['source']) => {
    switch (source) {
      case 'gateway': return 'Payment Gateway';
      case 'bank_transfer': return 'Bank Transfer';
      case 'mtn_momo': return 'MTN MoMo';
      case 'airtel_money': return 'Airtel Money';
      case 'cash': return 'Cash Receipt';
      case 'cheque': return 'Bank Cheque';
      case 'manual': return 'Manual Ledger';
      case 'system': return 'System Automatic';
      default: return source;
    }
  };

  return (
    <Card className="border-slate-200 shadow-xs overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Workspace Tab Bar */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 pt-3 pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList className="bg-slate-200/60 p-1 h-auto flex flex-wrap gap-1">
            <TabsTrigger value="all" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              All Transactions <span className="text-[10px] opacity-70">({transactions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="incoming" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Incoming <span className="text-[10px] opacity-70">({incomingCount})</span>
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Outgoing <span className="text-[10px] opacity-70">({outgoingCount})</span>
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Adjustments <span className="text-[10px] opacity-70">({adjustmentsCount})</span>
            </TabsTrigger>
            <TabsTrigger value="refunds" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Refunds <span className="text-[10px] opacity-70">({refundsCount})</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs">
              Transfers <span className="text-[10px] opacity-70">({transfersCount})</span>
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-xs text-blue-700">
              <ShieldCheck className="w-3.5 h-3.5" /> Reconciliation Center
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-slate-500 font-medium hidden lg:inline">
            FishGate Unified Financial Ledger Workspace
          </span>
        </div>

        {/* View Mode: Reconciliation Center */}
        <TabsContent value="reconciliation" className="m-0 p-0">
          <ReconciliationCenter
            transactions={transactions}
            currency={currency}
            onOpenImportModal={onOpenImportModal}
            onMatchTransaction={onMatchTransaction}
          />
        </TabsContent>

        {/* View Modes: Tables */}
        {activeTab !== 'reconciliation' && (
          <div className="p-4 space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search by ref, tenant, vendor, property, unit, description, or notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Property Filter */}
                <select
                  value={propertyFilter}
                  onChange={(e) => {
                    setPropertyFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="all">All Properties</option>
                  {propertyOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                  <option value="disputed">Disputed</option>
                  <option value="refunded">Refunded</option>
                </select>

                {/* Type Filter */}
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="all">All Types</option>
                  <option value="collection">Collection</option>
                  <option value="expense">Expense</option>
                  <option value="refund">Refund</option>
                  <option value="deposit">Deposit</option>
                  <option value="transfer">Transfer</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="penalty">Penalty</option>
                  <option value="utility">Utility</option>
                </select>

                {/* Source Filter */}
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="all">All Sources</option>
                  <option value="gateway">Payment Gateway</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mtn_momo">MTN MoMo</option>
                  <option value="cash">Cash</option>
                  <option value="manual">Manual Ledger</option>
                </select>

                {(searchQuery || propertyFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || sourceFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs font-medium text-slate-500 hover:text-slate-900"
                    onClick={() => {
                      setSearchQuery('');
                      setPropertyFilter('all');
                      setStatusFilter('all');
                      setTypeFilter('all');
                      setSourceFilter('all');
                      setPage(1);
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-700">Reference</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Date</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Type</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Property & Space</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Counterparty</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Description & Source</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Audit / Rec</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-36 text-center text-xs text-slate-500">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No financial transactions matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((t) => (
                      <TableRow
                        key={t.id}
                        className="text-xs hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => onSelectTransaction(t)}
                      >
                        {/* Reference */}
                        <TableCell className="font-mono font-bold text-blue-700">
                          {t.reference}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-slate-600 whitespace-nowrap">
                          {format(new Date(t.date), 'MMM d, yyyy')}
                        </TableCell>

                        {/* Type */}
                        <TableCell>{getTypeBadge(t.type)}</TableCell>

                        {/* Property & Space */}
                        <TableCell className="max-w-[170px]">
                          <div className="font-semibold text-slate-900 truncate">
                            {t.propertyName || 'Platform Corporate'}
                          </div>
                          {t.unitNumber && (
                            <div className="text-[10px] text-slate-500">
                              Unit {t.unitNumber}
                            </div>
                          )}
                        </TableCell>

                        {/* Counterparty (Tenant or Vendor) */}
                        <TableCell className="max-w-[150px]">
                          {t.tenantName ? (
                            <div>
                              <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-400" />
                                {t.tenantName}
                              </div>
                              <span className="text-[10px] text-slate-500">Resident</span>
                            </div>
                          ) : t.vendorName ? (
                            <div>
                              <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-400" />
                                {t.vendorName}
                              </div>
                              <span className="text-[10px] text-slate-500">{t.vendorCategory || 'Vendor'}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Internal Ledger</span>
                          )}
                        </TableCell>

                        {/* Description & Source */}
                        <TableCell className="max-w-[220px]">
                          <div className="font-medium text-slate-800 truncate" title={t.description}>
                            {t.description}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span>{formatSource(t.source)}</span>
                            {t.sourceReference && (
                              <span className="font-mono text-slate-400">• {t.sourceReference}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-bold flex items-center justify-end gap-0.5 ${
                              t.direction === 'in'
                                ? 'text-emerald-700'
                                : t.direction === 'out'
                                ? 'text-slate-900'
                                : 'text-blue-700'
                            }`}
                          >
                            {t.direction === 'in' ? '+' : t.direction === 'out' ? '-' : ''}
                            {currency} {t.amount.toLocaleString()}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(t.status)}</TableCell>

                        {/* Audit / Rec */}
                        <TableCell>
                          {t.reconciled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Reconciled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Pending
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem onClick={() => onSelectTransaction(t)} className="gap-2">
                                <Eye className="h-3.5 w-3.5 text-slate-500" /> View Profile & Audit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onToggleReconciled(t.id)} className="gap-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                {t.reconciled ? 'Unmark Reconciled' : 'Mark as Reconciled'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onPrintVoucher(t)} className="gap-2">
                                <Printer className="h-3.5 w-3.5 text-blue-600" /> Print Official Voucher
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Resilient Pagination */}
            <div className="pt-2 flex justify-end">
              <Pagination
                page={safePage}
                total={filteredTransactions.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </Tabs>
    </Card>
  );
}
