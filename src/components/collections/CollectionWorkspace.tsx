import { useState, useMemo } from 'react';
import {
  Users,
  CreditCard,
  AlertTriangle,
  FileText,
  Receipt,
  Search,
  Filter,
  Download,
  Send,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  X,
  Building2,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pagination } from '@/components/shared/Pagination';
import { format } from 'date-fns';
import {
  CollectionAccount,
  CollectionPaymentRecord,
  OutstandingBalanceItem,
  PaymentPlanItem,
  ReceiptItem,
} from './types';

interface CollectionWorkspaceProps {
  accounts: CollectionAccount[];
  payments: CollectionPaymentRecord[];
  outstandingBalances: OutstandingBalanceItem[];
  paymentPlans: PaymentPlanItem[];
  receipts: ReceiptItem[];
  onRecordPaymentForTenant: (tenantId: string, invoiceId?: string | null) => void;
  onSendReminderForTenant: (tenantId: string, amount: number) => void;
  onDownloadReceipt: (paymentId: string) => void;
  onEmailReceipt?: (paymentId: string) => void;
  onViewTenantLease?: (leaseId: string) => void;
  currency?: string;
}

export function CollectionWorkspace({
  accounts,
  payments,
  outstandingBalances,
  paymentPlans,
  receipts,
  onRecordPaymentForTenant,
  onSendReminderForTenant,
  onDownloadReceipt,
  onEmailReceipt,
  onViewTenantLease,
  currency = 'RWF',
}: CollectionWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'payments' | 'outstanding' | 'plans' | 'receipts'>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Extract unique properties for filter dropdown
  const propertyOptions = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.propertyName) set.add(a.propertyName);
    });
    return Array.from(set);
  }, [accounts]);

  // Reset page on filter changes
  const handleTabChange = (val: string) => {
    setActiveTab(val as any);
    setPage(1);
  };

  // 1. FILTERED ACCOUNTS
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (propertyFilter !== 'all' && acc.propertyName !== propertyFilter) return false;
      if (statusFilter !== 'all' && acc.paymentStatus !== statusFilter) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        acc.tenantName.toLowerCase().includes(q) ||
        acc.propertyName.toLowerCase().includes(q) ||
        acc.unitNumber.toLowerCase().includes(q)
      );
    });
  }, [accounts, propertyFilter, statusFilter, searchQuery]);

  // 2. FILTERED PAYMENTS
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (propertyFilter !== 'all' && p.property_name !== propertyFilter) return false;
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        p.tenant_name.toLowerCase().includes(q) ||
        p.property_name.toLowerCase().includes(q) ||
        (p.receipt_number || '').toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q)
      );
    });
  }, [payments, propertyFilter, methodFilter, searchQuery]);

  // 3. FILTERED OUTSTANDING BALANCES
  const filteredOutstanding = useMemo(() => {
    return outstandingBalances.filter((item) => {
      if (propertyFilter !== 'all' && item.propertyName !== propertyFilter) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        item.tenantName.toLowerCase().includes(q) ||
        item.propertyName.toLowerCase().includes(q) ||
        item.unitNumber.toLowerCase().includes(q)
      );
    });
  }, [outstandingBalances, propertyFilter, searchQuery]);

  // 4. FILTERED PAYMENT PLANS
  const filteredPlans = useMemo(() => {
    return paymentPlans.filter((plan) => {
      if (propertyFilter !== 'all' && plan.propertyName !== propertyFilter) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        plan.tenantName.toLowerCase().includes(q) ||
        plan.propertyName.toLowerCase().includes(q) ||
        plan.unitNumber.toLowerCase().includes(q)
      );
    });
  }, [paymentPlans, propertyFilter, searchQuery]);

  // 5. FILTERED RECEIPTS
  const filteredReceipts = useMemo(() => {
    return receipts.filter((rec) => {
      if (propertyFilter !== 'all' && rec.propertyName !== propertyFilter) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        rec.receiptNumber.toLowerCase().includes(q) ||
        rec.tenantName.toLowerCase().includes(q) ||
        rec.paymentReference.toLowerCase().includes(q)
      );
    });
  }, [receipts, propertyFilter, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setPropertyFilter('all');
    setStatusFilter('all');
    setMethodFilter('all');
    setPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || propertyFilter !== 'all' || statusFilter !== 'all' || methodFilter !== 'all';

  return (
    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Workspace Tab Header */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <TabsList className="bg-slate-200/60 p-1 h-9 rounded-lg">
            <TabsTrigger value="accounts" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Accounts View ({accounts.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              Payments View ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="outstanding" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Outstanding Balances ({outstandingBalances.length})
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Payment Plans ({paymentPlans.length})
            </TabsTrigger>
            <TabsTrigger value="receipts" className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs">
              <Receipt className="w-3.5 h-3.5 text-slate-700" />
              Receipts View ({receipts.length})
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-slate-500 font-medium hidden lg:inline">
            FishGate Centralized Collection Management Workspace
          </span>
        </div>

        {/* Global Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search by resident name, unit, property, receipt ref..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200"
            />
          </div>

          {/* Property Filter */}
          <div className="w-44">
            <select
              className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Properties</option>
              {propertyOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (Accounts / Outstanding) */}
          {activeTab === 'accounts' && (
            <div className="w-40">
              <select
                className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Collection Status</option>
                <option value="paid">Paid Up</option>
                <option value="overdue">Overdue</option>
                <option value="grace_period">Grace Period</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          )}

          {/* Method Filter (Payments) */}
          {activeTab === 'payments' && (
            <div className="w-40">
              <select
                className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Payment Methods</option>
                <option value="mtn_momo">Mobile Money (MoMo)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash Settlement</option>
                <option value="credit_card">Card Payment</option>
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-xs text-slate-500 hover:text-slate-800 gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
        </div>

        {/* =====================================================================
            VIEW 1: ACCOUNTS VIEW
            ===================================================================== */}
        <TabsContent value="accounts" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Tenant / Resident</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Premises</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Current Balance</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Monthly Rent</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Days Overdue</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Last Payment</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      No resident accounts match your filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.slice((page - 1) * pageSize, page * pageSize).map((acc) => {
                    const isOverdue = acc.currentBalance > 0;
                    return (
                      <TableRow key={acc.tenantId} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          <div>
                            <span>{acc.tenantName}</span>
                            <p className="text-[11px] text-slate-400 font-normal">{acc.tenantPhone || acc.tenantEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          <div>
                            <span className="font-medium text-slate-900">{acc.propertyName}</span>
                            <p className="text-[11px] text-slate-500 font-medium">Unit {acc.unitNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold">
                          {acc.currentBalance > 0 ? (
                            <span className="text-rose-600">{currency} {acc.currentBalance.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-700">Settled (RWF 0)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-slate-800">
                          {currency} {acc.monthlyRent.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              acc.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold'
                                : acc.paymentStatus === 'overdue'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold'
                                : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold'
                            }
                          >
                            {acc.paymentStatus.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold">
                          {acc.daysOutstanding > 0 ? (
                            <span className="text-rose-600 font-bold">{acc.daysOutstanding}d</span>
                          ) : (
                            <span className="text-slate-400">Current</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {acc.lastPaymentDate ? (
                            <div>
                              <span>{acc.lastPaymentDate}</span>
                              {acc.lastPaymentAmount && (
                                <p className="text-[10px] text-slate-400">{currency} {acc.lastPaymentAmount.toLocaleString()}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No payments yet</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              onClick={() => onRecordPaymentForTenant(acc.tenantId, acc.activeInvoiceId)}
                            >
                              <CreditCard className="w-3 h-3" />
                              Record
                            </Button>
                            {isOverdue && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1"
                                onClick={() => onSendReminderForTenant(acc.tenantId, acc.currentBalance)}
                              >
                                <Send className="w-3 h-3" />
                                Remind
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={page}
              totalCount={filteredAccounts.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 2: PAYMENTS VIEW
            ===================================================================== */}
        <TabsContent value="payments" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Payment Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Tenant / Resident</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Premises</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Channel / Method</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Reference</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Receipt Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      No payment transactions match your query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.slice((page - 1) * pageSize, page * pageSize).map((p) => {
                    const isSuccess = p.status === 'completed';
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                          {format(new Date(p.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          {p.tenant_name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {p.property_name} • Unit {p.unit_number}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-emerald-700">
                          {currency} {p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 uppercase font-medium">
                          {p.method.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {p.reference || p.receipt_number || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold'
                                : 'bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold'
                            }
                          >
                            {isSuccess ? 'CONFIRMED' : 'FAILED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-semibold text-slate-700 gap-1"
                              onClick={() => onDownloadReceipt(p.id)}
                            >
                              <Download className="w-3 h-3 text-blue-600" />
                              PDF
                            </Button>
                            {onEmailReceipt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 gap-1"
                                onClick={() => onEmailReceipt(p.id)}
                              >
                                <Send className="w-3 h-3" />
                                Email
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={page}
              totalCount={filteredPayments.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 3: OUTSTANDING BALANCES VIEW (REVENUE RECOVERY)
            ===================================================================== */}
        <TabsContent value="outstanding" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Resident / Tenant</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Property & Space</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Outstanding Arrears</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Days Overdue</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Aging Risk Level</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Recommended Action</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOutstanding.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      Zero delinquent accounts! All rent receivables are collected.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOutstanding.slice((page - 1) * pageSize, page * pageSize).map((item) => {
                    const isSevere = item.daysOverdue > 30;
                    return (
                      <TableRow key={item.tenantId} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-bold text-slate-900 text-xs">
                          {item.tenantName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {item.propertyName} • Unit {item.unitNumber}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-rose-600">
                          {currency} {item.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-rose-700">
                          {item.daysOverdue} Days
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isSevere ? 'destructive' : 'outline'}
                            className={!isSevere ? 'bg-amber-50 text-amber-800 border-amber-300 text-[10px]' : 'text-[10px]'}
                          >
                            {isSevere ? 'CRITICAL RISK (>30D)' : 'MODERATE ARREARS (1-30D)'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 font-medium">
                          {item.recommendedAction}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                              onClick={() => onSendReminderForTenant(item.tenantId, item.amount)}
                            >
                              <Send className="w-3 h-3" />
                              Send Notice
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] font-semibold text-slate-700"
                              onClick={() => onRecordPaymentForTenant(item.tenantId, item.invoiceId)}
                            >
                              Collect
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={page}
              totalCount={filteredOutstanding.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 4: PAYMENT PLANS VIEW
            ===================================================================== */}
        <TabsContent value="plans" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Resident / Tenant</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Premises</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Agreed Arrears</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Remaining Balance</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Installment Progress</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Next Installment</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Plan Health</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      No active structured payment agreements recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.slice((page - 1) * pageSize, page * pageSize).map((plan) => (
                    <TableRow key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {plan.tenantName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {plan.propertyName} • Unit {plan.unitNumber}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-slate-800">
                        {currency} {plan.originalBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-rose-600">
                        {currency} {plan.remainingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">
                        <span className="text-blue-700 font-bold">{plan.installmentsPaid}</span> / {plan.installmentsTotal} Paid
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        <div>
                          <span className="font-semibold text-slate-900">{currency} {plan.nextInstallmentAmount.toLocaleString()}</span>
                          <p className="text-[10px] text-slate-400">Due {plan.nextInstallmentDate}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            plan.riskStatus === 'on_track'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold'
                              : 'bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold'
                          }
                        >
                          {plan.riskStatus === 'on_track' ? 'ON TRACK' : 'INSTALLMENT BREACH'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onRecordPaymentForTenant(plan.tenantId)}
                        >
                          Log Installment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={page}
              totalCount={filteredPlans.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 5: RECEIPTS VIEW (FINANCIAL AUDIT TRAIL)
            ===================================================================== */}
        <TabsContent value="receipts" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Receipt Ref</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Resident / Tenant</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Property & Space</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Amount Settled</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Issue Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Payment Channel</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Delivery Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      No receipt documents generated yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.slice((page - 1) * pageSize, page * pageSize).map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-blue-700">
                        {rec.receiptNumber}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        {rec.tenantName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {rec.propertyName} • Unit {rec.unitNumber}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-emerald-700">
                        {currency} {rec.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {rec.issuedDate}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 uppercase font-medium">
                        {rec.paymentMethod.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          DELIVERED
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-semibold text-slate-700 gap-1"
                            onClick={() => onDownloadReceipt(rec.paymentId)}
                          >
                            <Download className="w-3 h-3 text-blue-600" />
                            PDF Receipt
                          </Button>
                          {onEmailReceipt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 gap-1"
                              onClick={() => onEmailReceipt(rec.paymentId)}
                            >
                              <Send className="w-3 h-3" />
                              Resend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={page}
              totalCount={filteredReceipts.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
