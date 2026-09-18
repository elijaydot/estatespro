import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  PieChart,
  List,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OfficialSubscriptionInvoiceModal, type OfficialInvoiceData } from '@/components/billing/OfficialSubscriptionInvoiceModal';
import { format } from 'date-fns';

type SuperAdminInvoiceRow = {
  id: string;
  invoice_number?: string;
  company_id: string;
  subscription_id?: string;
  product_id?: string;
  invoice_kind: string;
  invoice_status: string;
  amount_minor: number;
  currency_code: string;
  external_reference?: string | null;
  customer_details?: any;
  billing_details?: any;
  metadata?: any;
  created_at: string;
  paid_at?: string | null;
  due_at?: string | null;
  companies?: {
    id: string;
    name: string;
    email?: string;
    country?: string;
  } | null;
};

interface SuperAdminMonetizationInvoicesProps {
  selectedCompanyId?: string;
  onSelectCompany?: (companyId: string) => void;
}

export const SuperAdminMonetizationInvoices: React.FC<SuperAdminMonetizationInvoicesProps> = ({
  selectedCompanyId,
  onSelectCompany,
}) => {
  const queryClient = useQueryClient();

  // View state: 'table' | 'grouped' | 'analytics'
  const [activeView, setActiveView] = useState<'table' | 'grouped' | 'analytics'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'open' | 'void'>('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals state
  const [activeInvoiceForModal, setActiveInvoiceForModal] = useState<OfficialInvoiceData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Settlement dialogs
  const [settleInvoice, setSettleInvoice] = useState<SuperAdminInvoiceRow | null>(null);
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  // Void dialog
  const [voidInvoice, setVoidInvoice] = useState<SuperAdminInvoiceRow | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Fetch all invoices
  const { data: invoices = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['superadmin-global-saas-invoices', selectedCompanyId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('saas_subscription_invoices' as never)
        .select(`
          id,
          invoice_number,
          company_id,
          subscription_id,
          product_id,
          invoice_kind,
          invoice_status,
          amount_minor,
          currency_code,
          external_reference,
          customer_details,
          billing_details,
          metadata,
          created_at,
          paid_at,
          due_at,
          companies:company_id (
            id,
            name,
            email,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedCompanyId) {
        query = query.eq('company_id', selectedCompanyId);
      }
      if (statusFilter !== 'all') {
        query = query.eq('invoice_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SuperAdminInvoiceRow[];
    },
  });

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      if (currencyFilter !== 'all' && item.currency_code !== currencyFilter) return false;
      if (!search) return true;

      const q = search.toLowerCase();
      const num = (item.invoice_number || '').toLowerCase();
      const compName = (item.customer_details?.company_name || item.companies?.name || '').toLowerCase();
      const email = (item.customer_details?.email || item.companies?.email || '').toLowerCase();
      const ref = (item.external_reference || '').toLowerCase();
      const kind = (item.invoice_kind || '').toLowerCase();

      return num.includes(q) || compName.includes(q) || email.includes(q) || ref.includes(q) || kind.includes(q);
    });
  }, [invoices, currencyFilter, search]);

  // Unique currencies list
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.currency_code) set.add(inv.currency_code);
    });
    return Array.from(set).sort();
  }, [invoices]);

  // Grouped by company
  const companyGroupedRows = useMemo(() => {
    const map = new Map<string, {
      company_id: string;
      company_name: string;
      email: string;
      country: string;
      total_invoices: number;
      paid_invoices: number;
      open_invoices: number;
      total_collected_minor: number;
      total_open_minor: number;
      currencies: Set<string>;
      latest_invoice_at: string;
    }>();

    filteredInvoices.forEach((inv) => {
      const compId = inv.company_id;
      const compName = inv.customer_details?.company_name || inv.companies?.name || 'Customer Entity';
      const email = inv.customer_details?.email || inv.companies?.email || '';
      const country = inv.customer_details?.country || inv.companies?.country || 'Rwanda';

      if (!map.has(compId)) {
        map.set(compId, {
          company_id: compId,
          company_name: compName,
          email,
          country,
          total_invoices: 0,
          paid_invoices: 0,
          open_invoices: 0,
          total_collected_minor: 0,
          total_open_minor: 0,
          currencies: new Set(),
          latest_invoice_at: inv.created_at,
        });
      }

      const item = map.get(compId)!;
      item.total_invoices += 1;
      item.currencies.add(inv.currency_code);

      if (inv.invoice_status === 'paid') {
        item.paid_invoices += 1;
        item.total_collected_minor += inv.amount_minor;
      } else if (inv.invoice_status === 'open') {
        item.open_invoices += 1;
        item.total_open_minor += inv.amount_minor;
      }

      if (new Date(inv.created_at).getTime() > new Date(item.latest_invoice_at).getTime()) {
        item.latest_invoice_at = inv.created_at;
      }
    });

    return Array.from(map.values());
  }, [filteredInvoices]);

  // Analytics Metrics
  const analytics = useMemo(() => {
    let totalInvoices = 0;
    let paidCount = 0;
    let openCount = 0;
    let voidCount = 0;
    const currencyTotals: Record<string, { collectedMinor: number; openMinor: number }> = {};
    const gatewayBreakdown: Record<string, number> = {};

    invoices.forEach((inv) => {
      totalInvoices += 1;
      const curr = inv.currency_code || 'USD';
      if (!currencyTotals[curr]) {
        currencyTotals[curr] = { collectedMinor: 0, openMinor: 0 };
      }

      const gw = (inv.metadata?.gateway || 'paystack').toLowerCase();
      gatewayBreakdown[gw] = (gatewayBreakdown[gw] || 0) + 1;

      if (inv.invoice_status === 'paid') {
        paidCount += 1;
        currencyTotals[curr].collectedMinor += inv.amount_minor;
      } else if (inv.invoice_status === 'open') {
        openCount += 1;
        currencyTotals[curr].openMinor += inv.amount_minor;
      } else if (inv.invoice_status === 'void') {
        voidCount += 1;
      }
    });

    const collectionRate = totalInvoices > 0 ? Math.round((paidCount / totalInvoices) * 100) : 0;

    return {
      totalInvoices,
      paidCount,
      openCount,
      voidCount,
      collectionRate,
      currencyTotals,
      gatewayBreakdown,
    };
  }, [invoices]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredInvoices.length) {
      toast.info('No invoice records to export');
      return;
    }

    const headers = ['Invoice Number', 'Created At', 'Company Name', 'Customer Email', 'Status', 'Currency', 'Amount', 'Gateway Ref', 'Due Date', 'Paid Date'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number || `FG-INV-${format(new Date(inv.created_at), 'yyyy')}-${inv.id.slice(0, 6).toUpperCase()}`,
      inv.created_at,
      inv.customer_details?.company_name || inv.companies?.name || '',
      inv.customer_details?.email || inv.companies?.email || '',
      inv.invoice_status,
      inv.currency_code,
      (inv.amount_minor / 100).toFixed(2),
      inv.external_reference || '',
      inv.due_at || '',
      inv.paid_at || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FishGate-Platform-Invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Invoices exported to CSV');
  };

  // Export to JSON
  const handleExportJson = () => {
    if (!filteredInvoices.length) {
      toast.info('No invoice records to export');
      return;
    }

    const dataStr = JSON.stringify(filteredInvoices, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FishGate-Platform-Invoices-${format(new Date(), 'yyyy-MM-dd')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Invoices exported to JSON');
  };

  // Offline Wire Settlement (Mark as Paid)
  const handleMarkAsPaid = async () => {
    if (!settleInvoice) return;
    setIsSettling(true);
    try {
      const ref = settleRef.trim() || `WIRE-${Date.now()}`;
      const { error } = await supabase.rpc('saas_admin_mark_invoice_paid', {
        p_invoice_id: settleInvoice.id,
        p_payment_reference: ref,
        p_notes: settleNotes.trim() || 'Manual wire payment reconciliation by SuperAdmin',
      });

      if (error) throw error;

      toast.success(`Invoice ${settleInvoice.invoice_number || settleInvoice.id.slice(0, 8)} marked as PAID!`);
      setSettleInvoice(null);
      setSettleRef('');
      setSettleNotes('');
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ['superadmin-global-saas-invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['revenue-metrics'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark invoice as paid';
      toast.error(`Reconciliation failed: ${msg}`);
    } finally {
      setIsSettling(false);
    }
  };

  // Void Invoice
  const handleVoidInvoice = async () => {
    if (!voidInvoice) return;
    setIsVoiding(true);
    try {
      const reason = voidReason.trim() || 'Voided by SuperAdmin operator';
      const { error } = await supabase.rpc('saas_admin_void_invoice', {
        p_invoice_id: voidInvoice.id,
        p_reason: reason,
      });

      if (error) throw error;

      toast.success(`Invoice ${voidInvoice.invoice_number || voidInvoice.id.slice(0, 8)} voided successfully.`);
      setVoidInvoice(null);
      setVoidReason('');
      await refetch();
      void queryClient.invalidateQueries({ queryKey: ['superadmin-global-saas-invoices'] });
      void queryClient.invalidateQueries({ queryKey: ['revenue-metrics'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to void invoice';
      toast.error(`Void failed: ${msg}`);
    } finally {
      setIsVoiding(false);
    }
  };

  const handleOpenPdfModal = (inv: SuperAdminInvoiceRow) => {
    setActiveInvoiceForModal(inv as unknown as OfficialInvoiceData);
    setIsInvoiceModalOpen(true);
  };

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                FishGate SaaS Invoicing & Multi-Company Ledger
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                Platform Monetization
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              Global ledger of FishGate Technologies Ltd invoices, offline wire reconciliation, sequential tax receipts, and accounting audit.
            </CardDescription>
          </div>

          {/* View Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60">
            <Button
              variant={activeView === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('table')}
              className="h-8 text-xs gap-1.5"
            >
              <List className="h-3.5 w-3.5" />
              Global Ledger
            </Button>
            <Button
              variant={activeView === 'grouped' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('grouped')}
              className="h-8 text-xs gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" />
              Company Grouped
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('analytics')}
              className="h-8 text-xs gap-1.5"
            >
              <PieChart className="h-3.5 w-3.5" />
              Gateway Analytics
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Controls Bar: Search, Status, Currency, Export Tools */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, company, ref..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={(val: any) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid & Settled</SelectItem>
                <SelectItem value="open">Open / Unpaid</SelectItem>
                <SelectItem value="void">Void / Superseded</SelectItem>
              </SelectContent>
            </Select>

            {availableCurrencies.length > 0 && (
              <Select value={currencyFilter} onValueChange={(val: any) => { setCurrencyFilter(val); setPage(1); }}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {availableCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Export Options */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs gap-1.5 border-border/70"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="h-8 text-xs gap-1.5 border-border/70"
            >
              <Download className="h-3.5 w-3.5 text-sky-600" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* VIEW 1: Global Multi-Company Ledger Table */}
        {activeView === 'table' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Loading global invoices ledger...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center space-y-2 bg-muted/10 rounded-xl border border-dashed border-border">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                <p className="text-sm font-semibold text-muted-foreground">No invoices matching the selected filters.</p>
                <p className="text-xs text-muted-foreground">Adjust filters or search parameters above.</p>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border/70 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Invoice #</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Customer Entity</TableHead>
                        <TableHead className="text-xs">Plan Tier</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Gateway / Ref</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.slice((page - 1) * pageSize, page * pageSize).map((inv) => {
                        const invNumber = inv.invoice_number || `FG-INV-${format(new Date(inv.created_at), 'yyyy')}-${inv.id.slice(0, 6).toUpperCase()}`;
                        const isPaid = inv.invoice_status === 'paid';
                        const isVoid = inv.invoice_status === 'void';
                        const isOpen = inv.invoice_status === 'open';
                        const compName = inv.customer_details?.company_name || inv.companies?.name || 'Customer Entity';

                        return (
                          <TableRow key={inv.id} className="hover:bg-muted/20">
                            <TableCell className="font-mono text-xs font-bold text-foreground">
                              {invNumber}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(inv.created_at), 'dd MMM yyyy, HH:mm')}
                            </TableCell>
                            <TableCell className="text-xs">
                              <p className="font-semibold text-foreground">{compName}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {inv.customer_details?.email || inv.companies?.email || '-'}
                              </p>
                            </TableCell>
                            <TableCell className="text-xs capitalize font-medium">
                              {inv.metadata?.plan_name || inv.metadata?.plan_code?.replace('fishgate_', '') || inv.invoice_kind.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-bold whitespace-nowrap">
                              {inv.currency_code} {(inv.amount_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[130px] truncate text-muted-foreground">
                              {inv.external_reference || '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isPaid
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                    : isVoid
                                      ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                }`}
                              >
                                {inv.invoice_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right whitespace-nowrap space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => handleOpenPdfModal(inv)}
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>

                              {isOpen && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2 gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                                    onClick={() => setSettleInvoice(inv)}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Mark Paid
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2 gap-1 border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                                    onClick={() => setVoidInvoice(inv)}
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                    Void
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  total={filteredInvoices.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                />
              </>
            )}
          </div>
        )}

        {/* VIEW 2: Company-Grouped View */}
        {activeView === 'grouped' && (
          <div className="space-y-3">
            {companyGroupedRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No grouped company invoices available.</div>
            ) : (
              <div className="rounded-xl border border-border/70 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Company / Customer</TableHead>
                      <TableHead className="text-xs">Country</TableHead>
                      <TableHead className="text-xs text-center">Invoices (Total)</TableHead>
                      <TableHead className="text-xs text-center">Settled / Paid</TableHead>
                      <TableHead className="text-xs text-center">Open Balance</TableHead>
                      <TableHead className="text-xs">Currencies</TableHead>
                      <TableHead className="text-xs">Latest Invoice</TableHead>
                      <TableHead className="text-xs text-right">Inspect</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyGroupedRows.map((row) => (
                      <TableRow key={row.company_id} className="hover:bg-muted/20">
                        <TableCell className="text-xs">
                          <p className="font-bold text-foreground">{row.company_name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{row.email || row.company_id.slice(0, 8)}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.country}</TableCell>
                        <TableCell className="text-xs text-center font-bold">{row.total_invoices}</TableCell>
                        <TableCell className="text-xs text-center font-semibold text-emerald-600">{row.paid_invoices}</TableCell>
                        <TableCell className="text-xs text-center font-semibold text-amber-600">{row.open_invoices}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {Array.from(row.currencies).join(', ')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(row.latest_invoice_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              onSelectCompany?.(row.company_id);
                              setActiveView('table');
                            }}
                          >
                            Filter Company <ChevronRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: Gateway & Revenue Analytics */}
        {activeView === 'analytics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Invoices Issued</span>
                <p className="text-2xl font-black text-foreground">{analytics.totalInvoices}</p>
                <p className="text-xs text-muted-foreground">{analytics.paidCount} paid • {analytics.openCount} open</p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Collection Efficiency</span>
                <p className="text-2xl font-black text-emerald-600">{analytics.collectionRate}%</p>
                <p className="text-xs text-muted-foreground">Paid vs open invoice volume</p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Open Payment Backlog</span>
                <p className="text-2xl font-black text-amber-600">{analytics.openCount}</p>
                <p className="text-xs text-muted-foreground">Pending landlord checkout or wire</p>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Void / Superseded</span>
                <p className="text-2xl font-black text-rose-600">{analytics.voidCount}</p>
                <p className="text-xs text-muted-foreground">Replaced checkout drafts</p>
              </div>
            </div>

            {/* Currency Ledger Breakdown */}
            <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Multi-Currency Collections Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(analytics.currencyTotals).map(([curr, stats]) => (
                  <div key={curr} className="rounded-lg border border-border bg-card p-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-bold text-foreground">{curr}</span>
                      <Badge variant="outline" className="text-[10px]">Native</Badge>
                    </div>
                    <div className="text-xs space-y-0.5 pt-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Settled:</span>
                        <span className="font-bold text-emerald-600">
                          {curr} {(stats.collectedMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Outstanding:</span>
                        <span className="font-bold text-amber-600">
                          {curr} {(stats.openMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Offline Wire Settlement Dialog */}
      <Dialog open={Boolean(settleInvoice)} onOpenChange={(open) => !open && setSettleInvoice(null)}>
        <DialogContent className="max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              Reconcile Wire Settlement (Mark as Paid)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Verify incoming bank transfer or offline wire from landlord and immediately activate the subscription plan.
            </DialogDescription>
          </DialogHeader>

          {settleInvoice && (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Number:</span>
                  <span className="font-mono font-bold text-foreground">{settleInvoice.invoice_number || settleInvoice.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer Company:</span>
                  <span className="font-semibold text-foreground">{settleInvoice.customer_details?.company_name || settleInvoice.companies?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-emerald-600">
                    {settleInvoice.currency_code} {(settleInvoice.amount_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wire-ref" className="text-xs">Bank Wire / Transfer Reference</Label>
                <Input
                  id="wire-ref"
                  placeholder="e.g. BK-TRF-928174 or MTN-CASH-8812"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wire-notes" className="text-xs">Internal Audit Notes</Label>
                <Input
                  id="wire-notes"
                  placeholder="e.g. Verified against Bank of Kigali statement 18 Sept"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setSettleInvoice(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              disabled={isSettling}
              onClick={handleMarkAsPaid}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isSettling ? 'Reconciling...' : 'Confirm Payment & Activate Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Invoice Dialog */}
      <Dialog open={Boolean(voidInvoice)} onOpenChange={(open) => !open && setVoidInvoice(null)}>
        <DialogContent className="max-w-md p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-4 w-4" />
              Void Subscription Invoice
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Voiding cancels this invoice and permanently removes it from the landlord's outstanding balance.
            </DialogDescription>
          </DialogHeader>

          {voidInvoice && (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground">
                Are you sure you want to void invoice <strong className="text-foreground">{voidInvoice.invoice_number || voidInvoice.id.slice(0, 8)}</strong> for{' '}
                <strong className="text-foreground">{voidInvoice.customer_details?.company_name || voidInvoice.companies?.name}</strong>?
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="void-reason" className="text-xs">Reason for Voiding</Label>
                <Input
                  id="void-reason"
                  placeholder="e.g. Abandoned checkout, test invoice, customer request"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setVoidInvoice(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isVoiding}
              onClick={handleVoidInvoice}
            >
              {isVoiding ? 'Voiding...' : 'Confirm Void Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Official Subscription Tax Invoice Modal */}
      <OfficialSubscriptionInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoice={activeInvoiceForModal}
      />
    </Card>
  );
};
