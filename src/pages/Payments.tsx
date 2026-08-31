import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Receipt,
  Phone,
  CreditCard,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  Send,
  Sparkles,
  Rocket,
  User,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';
import { useSettings } from '@/contexts/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usePayments, useCreatePayment } from '@/hooks/usePayments';
import { useInvoices } from '@/hooks/useInvoices';
import { useTenants } from '@/hooks/useTenants';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useStepUpGuard } from '@/hooks/useStepUpGuard';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { StatusPill } from '@/components/shared/StatusPill';
import { FilterBar } from '@/components/shared/FilterBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  receipt_number?: string | null;
  created_at: string;
  tenant_id?: string | null;
  payer_name?: string | null;
  payer_email?: string | null;
  momo_phone?: string | null;
  reference?: string | null;
  company_id?: string | null;
  invoices?: {
    invoice_number?: string | null;
    properties?: {
      name?: string | null;
      company_id?: string | null;
      companies?: {
        id?: string;
        name?: string;
      } | null;
    } | null;
  } | null;
  tenants?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  status: string;
  tenant_id?: string | null;
};

type TenantRow = {
  id: string;
  name: string;
  email: string;
};

function getPaymentId(payment: unknown): string | null {
  if (!payment) return null;
  if (typeof payment === 'string') return payment;
  if (payment && typeof payment === 'object' && 'id' in payment) {
    const candidate = (payment as { id?: unknown }).id;
    return typeof candidate === 'string' ? candidate : null;
  }
  return null;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return <StatusPill variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Completed</StatusPill>;
    case 'pending': return <StatusPill variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</StatusPill>;
    case 'failed': return <StatusPill variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</StatusPill>;
    case 'refunded': return <StatusPill variant="info" className="gap-1"><AlertCircle className="h-3 w-3" /> Refunded</StatusPill>;
    default: return null;
  }
};

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'mtn_momo': return <Phone className="h-4 w-4 text-warning" />;
    case 'bank_transfer': return <Building2 className="h-4 w-4 text-info" />;
    case 'card': return <CreditCard className="h-4 w-4 text-primary" />;
    case 'cash': return <DollarSign className="h-4 w-4 text-success" />;
    default: return <DollarSign className="h-4 w-4" />;
  }
};

const getMethodLabel = (method: string) => {
  switch (method) {
    case 'mtn_momo': return 'MTN MoMo';
    case 'bank_transfer': return 'Bank Transfer';
    case 'card': return 'Card';
    case 'cash': return 'Cash';
    default: return 'Other';
  }
};

const paymentMethodOptions = [
  { value: 'mtn_momo', label: 'MTN Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card Payment' },
  { value: 'cash', label: 'Cash' },
];

export default function Payments() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const { isSuperAdmin } = useUserRole();
  const { activeCompanyId } = useActiveCompany();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'failed' | 'completed' | 'mtn_momo'>('all');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-payments') as ViewMode) || 'table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [checkoutGateway, setCheckoutGateway] = useState<'paystack' | 'flutterwave'>('paystack');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: '',
    invoice_id: '',
    amount: 0,
    method: 'mtn_momo',
    momo_phone: '',
    momo_transaction_id: '',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    localStorage.setItem('estatepro-view-payments', view);
  }, [view]);

  const { data: payments = [], isLoading } = usePayments();
  const { data: invoices = [] } = useInvoices();
  const { data: tenants = [] } = useTenants();

  const typedPayments = payments as PaymentRow[];
  const typedInvoices = invoices as InvoiceRow[];
  const typedTenants = tenants as TenantRow[];
  const createPayment = useCreatePayment();
  const { ensureAal2 } = useStepUpGuard();

  const tenantOptions = typedTenants.map((t) => ({ value: t.id, label: t.name }));
  const invoiceOptions = typedInvoices
    .filter((inv) => !formData.tenant_id || inv.tenant_id === formData.tenant_id)
    .filter((inv) => inv.status !== 'paid')
    .map((inv) => ({ value: inv.id, label: inv.invoice_number }));

  const stats = {
    totalReceived: typedPayments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: typedPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    failedCount: typedPayments.filter((p) => p.status === 'failed').length,
  };

  const filteredPayments = typedPayments.filter((payment) => {
    const payCompanyId = payment.company_id || payment.invoices?.properties?.company_id;
    if (selectedOrgFilter !== 'all' && payCompanyId && payCompanyId !== selectedOrgFilter) return false;
    
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      (payment.tenants?.name || '').toLowerCase().includes(q) ||
      (payment.payer_name || '').toLowerCase().includes(q) ||
      (payment.receipt_number || '').toLowerCase().includes(q) ||
      (payment.invoices?.invoice_number || '').toLowerCase().includes(q)
    );

    if (!matchesSearch) return false;

    if (activeFilter === 'pending') return payment.status === 'pending';
    if (activeFilter === 'failed') return payment.status === 'failed';
    if (activeFilter === 'completed') return payment.status === 'completed';
    if (activeFilter === 'mtn_momo') return payment.method === 'mtn_momo';
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedOrgFilter, pageSize, activeFilter]);

  const paginatedPayments = filteredPayments.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    downloadCsv(
      'payments-export.csv',
      typedPayments.map((p) => ({
        receipt_number: p.receipt_number || '',
        date: p.created_at,
        tenant: p.tenants?.name || p.payer_name || '',
        payer_email: p.payer_email || '',
        invoice: p.invoices?.invoice_number || '',
        method: p.method,
        amount: p.amount,
        status: p.status,
      }))
    );
    toast({ title: 'Export complete', description: 'Payments exported as CSV.' });
  };

  const handleRecord = async () => {
    const canProceed = await ensureAal2('payments.record_manual');
    if (!canProceed) return;

    if (!formData.tenant_id || !formData.amount || !formData.method) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;

    await createPayment.mutateAsync({
      receipt_number: receiptNumber,
      tenant_id: formData.tenant_id,
      invoice_id: formData.invoice_id || null,
      amount: formData.amount,
      method: formData.method,
      momo_phone: formData.method === 'mtn_momo' ? formData.momo_phone : null,
      momo_transaction_id: formData.method === 'mtn_momo' ? formData.momo_transaction_id : null,
      reference: formData.reference || null,
      notes: formData.notes || null,
      status: 'completed',
    });

    await logSecurityEvent('manual_payment_recorded', {
      tenantId: formData.tenant_id,
      amount: formData.amount,
      method: formData.method,
    });

    setIsRecordOpen(false);
    setFormData({ tenant_id: '', invoice_id: '', amount: 0, method: 'mtn_momo', momo_phone: '', momo_transaction_id: '', reference: '', notes: '' });
  };

  const handleGenerateCheckoutLink = async () => {
    const canProceed = await ensureAal2('payments.generate_checkout_link');
    if (!canProceed) return;

    if (!formData.invoice_id) {
      toast({ title: 'Error', description: 'Please select an invoice first', variant: 'destructive' });
      return;
    }

    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment-checkout', {
        body: {
          invoiceId: formData.invoice_id,
          gateway: checkoutGateway,
          amount: formData.amount,
        },
      });

      if (error) throw new Error(error.message);
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(data.checkoutUrl);
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      toast({ title: 'Checkout Link Ready', description: 'Payment link generated and copied to clipboard.' });
    } catch (err: unknown) {
      toast({ title: 'Checkout Link Error', description: err instanceof Error ? err.message : 'Failed to generate', variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDownloadReceipt = async (payment: unknown) => {
    const paymentId = getPaymentId(payment);
    if (!paymentId) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-receipt-pdf', {
        body: { paymentId, companyId: activeCompanyId },
      });

      if (error) throw new Error(error.message);

      const html = typeof data === 'string' ? data : await new Response(data).text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) {
        win.addEventListener('load', () => setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 500), { once: true });
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const handleSendReceipt = async (payment: unknown) => {
    const paymentId = getPaymentId(payment);
    if (!paymentId) return;

    try {
      const { error } = await supabase.functions.invoke('send-receipt-email', { body: { paymentId } });
      if (error) throw new Error(error.message);
      toast({ title: 'Receipt Sent', description: 'The payment receipt has been emailed to the tenant.' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to send receipt email', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Track and record tenant payments</p>
        </div>
        <Button className="gap-2" onClick={() => setIsRecordOpen(true)}>
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalReceived)}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-3">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Payments</p>
                <p className="text-2xl font-bold text-destructive">{stats.failedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterBar className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant, receipt, or invoice..."
              className="pl-10 h-11 border-border/70 bg-card/80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isSuperAdmin && companiesList.length > 0 && (
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="All Organizations (Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Organizations (Global)</SelectItem>
                  {companiesList.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" className="w-full sm:w-auto h-11" onClick={() => setSearchQuery('')}>
              Reset
            </Button>
            <Button variant="outline" className="w-full gap-2 sm:w-auto h-11" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <ViewToggle view={view} onViewChange={setView} />
      </FilterBar>

      {!isLoading && view === 'cards' && paginatedPayments.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPayments.map((payment) => (
              <Card key={payment.id} className="p-5 card-shadow-md hover:card-shadow-lg transition-all animate-enter">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">{payment.receipt_number || 'No receipt #'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-secondary/40 space-y-1.5 text-xs">
                  <p className="font-medium text-foreground text-sm truncate">
                    {payment.tenants?.name || payment.payer_name || 'Guest'}
                  </p>
                  {payment.payer_email && <p className="text-muted-foreground truncate">{payment.payer_email}</p>}
                  <p className="text-muted-foreground">Invoice: {payment.invoices?.invoice_number || '-'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getMethodIcon(payment.method)}
                      <span>{getMethodLabel(payment.method)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(payment)}>
                      <Receipt className="h-3.5 w-3.5 mr-1" />
                      Receipt
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleDownloadReceipt(payment)}>
                          <Receipt className="h-4 w-4 mr-2" /> Download Receipt
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void handleSendReceipt(payment)}>
                          <Send className="h-4 w-4 mr-2" /> Send Receipt to Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredPayments.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {!isLoading && view === 'compact' && paginatedPayments.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedPayments.map((payment) => (
              <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{payment.receipt_number || '-'}</span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {payment.tenants?.name || payment.payer_name || 'Guest'} • Invoice {payment.invoices?.invoice_number || '-'} • {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-foreground text-sm">{formatCurrency(payment.amount)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground sm:justify-end">
                      {getMethodIcon(payment.method)}
                      <span>{getMethodLabel(payment.method)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(payment)}>
                      <Receipt className="h-3.5 w-3.5 mr-1" />
                      Receipt
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredPayments.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {!isLoading && view === 'table' && paginatedPayments.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{payment.receipt_number || '-'}</TableCell>
                    <TableCell className="text-sm">{format(new Date(payment.created_at), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <p className="font-medium">{payment.tenants?.name || payment.payer_name || 'Guest'}</p>
                      {payment.payer_email ? <p className="text-xs text-muted-foreground">{payment.payer_email}</p> : null}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{payment.invoices?.invoice_number || '-'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.method)}
                        <span>{getMethodLabel(payment.method)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleDownloadReceipt(payment)}>
                            <Receipt className="h-4 w-4 mr-2" /> Download Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void handleSendReceipt(payment)}>
                            <Send className="h-4 w-4 mr-2" /> Send Receipt to Tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredPayments.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a new payment from a tenant.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tenant *</Label>
                <SearchableSelect
                  options={tenantOptions}
                  value={formData.tenant_id}
                  onValueChange={(value) => setFormData({ ...formData, tenant_id: value, invoice_id: '' })}
                  placeholder="Select tenant..."
                  searchPlaceholder="Search tenants..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Invoice *</Label>
                <SearchableSelect
                  options={invoiceOptions}
                  value={formData.invoice_id}
                  onValueChange={(value) => setFormData({ ...formData, invoice_id: value })}
                  placeholder="Select invoice..."
                  searchPlaceholder="Search invoices..."
                  disabled={!formData.tenant_id}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paymentAmount">Amount *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label>Payment Method *</Label>
                <SearchableSelect
                  options={paymentMethodOptions}
                  value={formData.method}
                  onValueChange={(value) => setFormData({ ...formData, method: value })}
                  placeholder="Select method..."
                  searchPlaceholder="Search methods..."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Checkout Gateway</Label>
              <SearchableSelect
                options={[
                  { value: 'paystack', label: 'Paystack', description: 'Hosted checkout' },
                  { value: 'flutterwave', label: 'Flutterwave', description: 'Hosted checkout' },
                ]}
                value={checkoutGateway}
                onValueChange={(value) => setCheckoutGateway(value as 'paystack' | 'flutterwave')}
                placeholder="Select gateway..."
                searchPlaceholder="Search gateway..."
              />
            </div>

            {formData.method === 'mtn_momo' && (
              <>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-5 w-5 text-warning" />
                    <span className="font-medium text-warning">MTN Mobile Money</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the MoMo details for this payment.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="momoPhone">MoMo Phone Number</Label>
                    <Input
                      id="momoPhone"
                      value={formData.momo_phone}
                      onChange={(e) => setFormData({ ...formData, momo_phone: e.target.value })}
                      placeholder="+250 XXX XXX XXX"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="momoTransactionId">Transaction ID</Label>
                    <Input
                      id="momoTransactionId"
                      value={formData.momo_transaction_id}
                      onChange={(e) => setFormData({ ...formData, momo_transaction_id: e.target.value })}
                      placeholder="e.g., TXN123456789"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.method === 'bank_transfer' && (
              <div className="grid gap-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="Bank transfer reference"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => void handleGenerateCheckoutLink()} disabled={checkoutLoading}>
              {checkoutLoading ? 'Generating...' : 'Generate Checkout Link'}
            </Button>
            <Button onClick={handleRecord} disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
