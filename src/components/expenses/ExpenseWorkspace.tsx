// src/components/expenses/ExpenseWorkspace.tsx
// FishGate Design Constitution v1.0 - Section 4: Expense Management Workspace

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  Receipt,
  Clock,
  Repeat,
  Building2,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Download,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  X,
  PieChart,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pagination } from '@/components/shared/Pagination';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ExpenseRecord,
  RecurringExpenseItem,
  VendorSummaryItem,
  BudgetAnalysisItem,
} from './types';

interface ExpenseWorkspaceProps {
  expenses: ExpenseRecord[];
  recurringExpenses: RecurringExpenseItem[];
  vendorSummaries: VendorSummaryItem[];
  budgetItems: BudgetAnalysisItem[];
  onApproveExpense: (expense: ExpenseRecord) => void;
  onRejectExpense: (expense: ExpenseRecord) => void;
  onRequestClarification: (expense: ExpenseRecord) => void;
  onRecordPaymentForVendor: (vendorId: string) => void;
  onViewExpenseDetail?: (expense: ExpenseRecord) => void;
  currency?: string;
}

export function ExpenseWorkspace({
  expenses,
  recurringExpenses,
  vendorSummaries,
  budgetItems,
  onApproveExpense,
  onRejectExpense,
  onRequestClarification,
  onRecordPaymentForVendor,
  onViewExpenseDetail,
  currency = 'RWF',
}: ExpenseWorkspaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || searchParams.get('view');
  const validTabs = ['all', 'pending', 'recurring', 'vendors', 'budget'] as const;
  type TabType = typeof validTabs[number];

  const initialTab: TabType = validTabs.includes(urlTab as any) ? (urlTab as TabType) : 'all';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Global Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Synchronize active tab when URL changes
  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab as any) && urlTab !== activeTab) {
      setActiveTab(urlTab as TabType);
      setPage(1);
    }
  }, [urlTab]);

  const handleTabChange = (val: string) => {
    const nextTab = val as TabType;
    setActiveTab(nextTab);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', nextTab);
    setSearchParams(newParams, { replace: true });
  };

  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  // Filter options derived from data
  const propertyOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.propertyName) set.add(e.propertyName);
    });
    return Array.from(set);
  }, [expenses]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [expenses]);

  const vendorOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.vendorName) set.add(e.vendorName);
    });
    return Array.from(set);
  }, [expenses]);

  // 1. FILTERED ALL EXPENSES
  const filteredAllExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (propertyFilter !== 'all' && e.propertyName !== propertyFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (vendorFilter !== 'all' && e.vendorName !== vendorFilter) return false;
      if (statusFilter !== 'all' && e.paymentStatus !== statusFilter) return false;
      if (approvalStatusFilter !== 'all' && e.approvalStatus !== approvalStatusFilter) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.reference.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q) ||
        e.propertyName.toLowerCase().includes(q) ||
        (e.invoiceNumber || '').toLowerCase().includes(q)
      );
    });
  }, [expenses, propertyFilter, categoryFilter, vendorFilter, statusFilter, approvalStatusFilter, searchQuery]);

  // 2. FILTERED PENDING APPROVAL EXPENSES
  const pendingApprovalExpenses = useMemo(() => {
    return expenses.filter((e) => e.approvalStatus === 'pending');
  }, [expenses]);

  const filteredPendingApproval = useMemo(() => {
    return pendingApprovalExpenses.filter((e) => {
      if (propertyFilter !== 'all' && e.propertyName !== propertyFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.submittedBy.toLowerCase().includes(q) ||
        e.propertyName.toLowerCase().includes(q) ||
        e.vendorName.toLowerCase().includes(q)
      );
    });
  }, [pendingApprovalExpenses, propertyFilter, categoryFilter, searchQuery]);

  // 3. FILTERED RECURRING EXPENSES
  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter((r) => {
      if (propertyFilter !== 'all' && r.propertyName !== propertyFilter) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        r.vendorName.toLowerCase().includes(q) ||
        r.propertyName.toLowerCase().includes(q) ||
        r.serviceCategory.toLowerCase().includes(q)
      );
    });
  }, [recurringExpenses, propertyFilter, searchQuery]);

  // 4. FILTERED VENDORS
  const filteredVendors = useMemo(() => {
    return vendorSummaries.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        v.vendorName.toLowerCase().includes(q) ||
        v.vendorType.toLowerCase().includes(q) ||
        v.services.toLowerCase().includes(q) ||
        v.contactName.toLowerCase().includes(q)
      );
    });
  }, [vendorSummaries, searchQuery]);

  // 5. FILTERED BUDGET ANALYSIS
  const filteredBudget = useMemo(() => {
    return budgetItems.filter((b) => {
      if (propertyFilter !== 'all' && b.propertyName !== propertyFilter) return false;
      if (categoryFilter !== 'all' && b.category !== categoryFilter) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return b.category.toLowerCase().includes(q) || b.propertyName.toLowerCase().includes(q);
    });
  }, [budgetItems, propertyFilter, categoryFilter, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setPropertyFilter('all');
    setCategoryFilter('all');
    setVendorFilter('all');
    setStatusFilter('all');
    setApprovalStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    propertyFilter !== 'all' ||
    categoryFilter !== 'all' ||
    vendorFilter !== 'all' ||
    statusFilter !== 'all' ||
    approvalStatusFilter !== 'all';

  return (
    <Card className="border border-slate-200 shadow-2xs bg-white overflow-hidden">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Workspace Tab Header */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <TabsList className="bg-slate-200/60 p-1 h-9 rounded-lg">
            <TabsTrigger
              value="all"
              className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
            >
              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
              All Expenses ({expenses.length})
            </TabsTrigger>

            <TabsTrigger
              value="pending"
              className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pending Approval ({pendingApprovalExpenses.length})
            </TabsTrigger>

            <TabsTrigger
              value="recurring"
              className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
            >
              <Repeat className="w-3.5 h-3.5 text-emerald-600" />
              Recurring Expenses ({recurringExpenses.length})
            </TabsTrigger>

            <TabsTrigger
              value="vendors"
              className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Vendor Expenses ({vendorSummaries.length})
            </TabsTrigger>

            <TabsTrigger
              value="budget"
              className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-2xs"
            >
              <PieChart className="w-3.5 h-3.5 text-slate-700" />
              Budget Analysis ({budgetItems.length})
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-slate-500 font-medium hidden lg:inline">
            FishGate Operational Cost-Management Center
          </span>
        </div>

        {/* Global Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search expenses by title, ref, vendor, property..."
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

          {/* Category Filter */}
          <div className="w-40">
            <select
              className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter (All Expenses View) */}
          {activeTab === 'all' && (
            <div className="w-36">
              <select
                className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partial</option>
              </select>
            </div>
          )}

          {/* Approval Filter (All Expenses View) */}
          {activeTab === 'all' && (
            <div className="w-36">
              <select
                className="w-full text-xs h-9 border border-slate-200 rounded-md px-3 bg-white"
                value={approvalStatusFilter}
                onChange={(e) => {
                  setApprovalStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Approvals</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="draft">Draft</option>
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
              Reset
            </Button>
          )}
        </div>

        {/* =====================================================================
            VIEW 1: ALL EXPENSES VIEW
            ===================================================================== */}
        <TabsContent value="all" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Reference</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Expense Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Property & Space</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Category</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Vendor</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Receipt</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Created By</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-xs">
                      No operational expenses match your query or filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAllExpenses.slice((safePage - 1) * pageSize, safePage * pageSize).map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-blue-700">
                        {exp.reference}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {format(new Date(exp.expenseDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        <div>
                          <span>{exp.propertyName}</span>
                          {exp.unitNumber && (
                            <span className="text-[10px] text-slate-400 block">Unit {exp.unitNumber}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200">
                          {exp.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800">
                        {exp.vendorName}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900">
                        {currency} {exp.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            exp.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {exp.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {exp.hasReceipt ? (
                          <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-semibold text-amber-600 gap-1">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Missing
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {exp.submittedBy}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-semibold text-slate-700"
                          onClick={() => onViewExpenseDetail && onViewExpenseDetail(exp)}
                        >
                          Details
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
              page={safePage}
              total={filteredAllExpenses.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 2: PENDING APPROVAL VIEW (FINANCIAL GOVERNANCE)
            ===================================================================== */}
        <TabsContent value="pending" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Expense Details</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Requester</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Amount</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Property</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Approval Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Submitted Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPendingApproval.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      All expense submissions have been reviewed and approved.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPendingApproval.slice((safePage - 1) * pageSize, safePage * pageSize).map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-900">{exp.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{exp.reference} • {exp.vendorName}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        {exp.submittedBy}
                        <span className="text-[10px] text-slate-400 block">{exp.department}</span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900">
                        {currency} {exp.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {exp.propertyName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                          PENDING REVIEW
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {format(new Date(exp.submittedDate), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => onApproveExpense(exp)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border-rose-200"
                            onClick={() => onRejectExpense(exp)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-blue-700"
                            onClick={() => onRequestClarification(exp)}
                          >
                            Clarify
                          </Button>
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
              page={safePage}
              total={filteredPendingApproval.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 3: RECURRING EXPENSES VIEW
            ===================================================================== */}
        <TabsContent value="recurring" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Vendor / Service</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Property</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Frequency</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Committed Outlay</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Next Billing Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecurring.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      No recurring operational contracts recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecurring.slice((safePage - 1) * pageSize, safePage * pageSize).map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs">
                        <span className="font-bold text-slate-900 block">{rec.vendorName}</span>
                        <span className="text-[11px] text-slate-500 font-medium">{rec.serviceCategory}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {rec.propertyName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 uppercase font-semibold">
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">
                          {rec.frequency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900">
                        {currency} {rec.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {rec.nextBillingDate}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            rec.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {rec.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => onRecordPaymentForVendor(rec.vendorId)}
                        >
                          Pay Contract
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
              page={safePage}
              total={filteredRecurring.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 4: VENDOR EXPENSES VIEW
            ===================================================================== */}
        <TabsContent value="vendors" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Vendor</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Primary Services</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Expense Total</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Active Contracts</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Last Payment</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Risk Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      No operational vendors match your query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.slice((safePage - 1) * pageSize, safePage * pageSize).map((vendor) => (
                    <TableRow key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs">
                        <span className="font-bold text-slate-900 block">{vendor.vendorName}</span>
                        <span className="text-[11px] text-slate-400 block">{vendor.contactName} • {vendor.phone}</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {vendor.services}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900">
                        {currency} {vendor.totalSpend.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-slate-800">
                        {vendor.activeContracts}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {vendor.lastPaymentDate}
                        <span className="text-[10px] text-slate-400 block">{currency} {vendor.lastPaymentAmount.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            vendor.riskStatus === 'low'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : vendor.riskStatus === 'moderate'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}
                        >
                          {vendor.riskStatus} risk
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-semibold text-slate-700"
                          onClick={() => onRecordPaymentForVendor(vendor.id)}
                        >
                          Record Payment
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
              page={safePage}
              total={filteredVendors.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        {/* =====================================================================
            VIEW 5: BUDGET ANALYSIS VIEW
            ===================================================================== */}
        <TabsContent value="budget" className="m-0 p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Category & Budget</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600">Property</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Allocated</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actual Spend</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Remaining</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Utilization %</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudget.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      No budget allocations match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBudget.slice((safePage - 1) * pageSize, safePage * pageSize).map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {item.category}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {item.propertyName}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-slate-700">
                        {currency} {item.allocatedBudget.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900">
                        {currency} {item.actualSpend.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-slate-700">
                        {currency} {item.remainingBudget.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-xs font-bold">{item.utilizationPercent.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            item.status === 'on_track'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'warning'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}
                        >
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              page={safePage}
              total={filteredBudget.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
