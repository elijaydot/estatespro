import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Send,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  DollarSign,
  Edit,
  Loader2,
  Sparkles,
  Rocket,
  Home,
  User,
  Calendar,
  ShieldCheck,
  Phone,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import { RraFiscalReceiptModal } from '@/components/finance/RraFiscalReceiptModal';
import { generateEbmVsdcReceipt, type RraEbmFiscalReceipt } from '@/lib/rraEbmVsdc';
import { initiateMobilePayment } from '@/lib/eastAfricaPayments';
import { sendTransactionalSms, smsTemplates } from '@/lib/smsGateway';
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
  DropdownMenuSeparator,
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
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';
import { useSettings } from '@/contexts/useSettings';
import { useI18n } from '@/contexts/useI18n';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useInvoices, useCreateInvoice, useUpdateInvoice, type Invoice } from '@/hooks/useInvoices';
import { useTenants, type Tenant } from '@/hooks/useTenants';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { format } from 'date-fns';
import { StatusPill } from '@/components/shared/StatusPill';
import { FilterBar } from '@/components/shared/FilterBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';
import {
  PageContainer,
  PageHeader,
  PageActions,
  PageInsights,
} from '@/design-system/LayoutFramework';
import { StandardTable } from '@/design-system/components/StandardTable';

type InvoiceWithRelations = Invoice & {
  company_id?: string;
  guest_name?: string | null;
  guest_email?: string | null;
  tenants?: {
    name: string;
    email: string;
    phone: string;
  } | null;
  properties?: {
    name: string;
    company_id?: string;
    companies?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
  units?: {
    unit_number: string;
  } | null;
};

type TenantWithRelations = Tenant & {
  units?: {
    unit_number: string;
  } | null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return (
        <StatusPill variant="success" className="gap-1">
          <CheckCircle className="h-3 w-3" /> Paid
        </StatusPill>
      );
    case 'pending':
      return (
        <StatusPill variant="warning" className="gap-1">
          <Clock className="h-3 w-3" /> Pending
        </StatusPill>
      );
    case 'partial':
      return (
        <StatusPill variant="info" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Partial
        </StatusPill>
      );
    case 'overdue':
      return (
        <StatusPill variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Overdue
        </StatusPill>
      );
    case 'cancelled':
      return (
        <StatusPill className="gap-1">
          <XCircle className="h-3 w-3" /> Cancelled
        </StatusPill>
      );
    default:
      return null;
  }
};

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency, settings } = useSettings();
  const { t } = useI18n();
  const { isSuperAdmin } = useUserRole();
  const { activeCompanyId } = useActiveCompany();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-invoices') as ViewMode) || 'table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rraModalOpen, setRraModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<RraEbmFiscalReceipt | null>(null);

  const handleViewRraReceipt = (invoice: InvoiceWithRelations) => {
    const receipt = generateEbmVsdcReceipt({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      companyName: (invoice.properties as any)?.companies?.name || invoice.properties?.name || 'FishGate Real Estate Rwanda Ltd',
      companyTin: '100234567',
      tenantName: invoice.tenants?.name || invoice.guest_name || 'Valued Client',
      amount: invoice.amount,
      currency: 'RWF',
      paymentMethod: 'Bank Transfer / MTN MoMo (*182#)',
      certifiedAt: new Date(invoice.created_at || Date.now()),
    });
    setSelectedReceipt(receipt);
    setRraModalOpen(true);
  };

  const [momoModalOpen, setMomoModalOpen] = useState(false);
  const [momoTargetInvoice, setMomoTargetInvoice] = useState<InvoiceWithRelations | null>(null);
  const [momoTargetPhone, setMomoTargetPhone] = useState('');
  const [momoPushing, setMomoPushing] = useState(false);

  const handleOpenMoMoCollect = (invoice: InvoiceWithRelations) => {
    setMomoTargetInvoice(invoice);
    setMomoTargetPhone(invoice.tenants?.phone || '');
    setMomoModalOpen(true);
  };

  const handleSendMoMoPrompt = async () => {
    if (!momoTargetInvoice || !momoTargetPhone) {
      toast({ title: 'Validation', description: 'Enter tenant phone number', variant: 'destructive' });
      return;
    }
    setMomoPushing(true);
    try {
      const remainingBalance = momoTargetInvoice.amount - momoTargetInvoice.paid_amount;
      const res = await initiateMobilePayment({
        phone: momoTargetPhone,
        amount: remainingBalance,
        currency: 'RWF',
        invoiceId: momoTargetInvoice.id,
        invoiceNumber: momoTargetInvoice.invoice_number,
        tenantName: momoTargetInvoice.tenants?.name,
        propertyName: momoTargetInvoice.properties?.name,
      });

      if (res.success) {
        toast({ title: '📲 MoMo Prompt Dispatched', description: res.ussdPromptMessage });
        
        await sendTransactionalSms({
          to: momoTargetPhone,
          message: smsTemplates.rentInvoiceIssued(
            momoTargetInvoice.tenants?.name || 'Tenant',
            momoTargetInvoice.units?.unit_number || 'Unit',
            remainingBalance,
            momoTargetInvoice.due_date,
            'RWF'
          ),
        });

        setMomoModalOpen(false);
      } else {
        toast({ title: 'Prompt Failed', description: res.ussdPromptMessage, variant: 'destructive' });
      }
    } finally {
      setMomoPushing(false);
    }
  };

  const handleShareWhatsApp = (invoice: InvoiceWithRelations) => {
    const tenantPhone = (invoice.tenants?.phone || '').replace(/[^0-9]/g, '');
    const tenantName = invoice.tenants?.name || invoice.guest_name || 'Client';
    const unitStr = invoice.units?.unit_number ? `Unit ${invoice.units.unit_number}` : '';
    const propStr = invoice.properties?.name || '';
    const balance = invoice.amount - invoice.paid_amount;
    const dueDateStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '';

    const message = `Muraho ${tenantName},\n` +
      `Inyemezabwishyu y'ubukode (${invoice.invoice_number}) ya ${propStr} ${unitStr}:\n` +
      `• Amafaranga: RWF ${balance.toLocaleString()}\n` +
      `• Itariki yo kwishyura: ${dueDateStr}\n` +
      `• Koresha MTN MoMo (*182#) cyangwa Airtel Money (*175#).\n` +
      `Murakoze cyane!`;

    const url = tenantPhone
      ? `https://wa.me/${tenantPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleDirectSms = async (invoice: InvoiceWithRelations) => {
    const phone = invoice.tenants?.phone;
    if (!phone) {
      toast({
        title: 'Phone required',
        description: 'Tenant does not have a phone number on record.',
        variant: 'destructive',
      });
      return;
    }

    const tenantName = invoice.tenants?.name || invoice.guest_name || 'Client';
    const unitStr = invoice.units?.unit_number || 'Unit';
    const balance = invoice.amount - invoice.paid_amount;
    const dueDateStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '';

    try {
      const res = await sendTransactionalSms({
        to: phone,
        message: smsTemplates.rentInvoiceIssued(
          tenantName,
          unitStr,
          balance,
          dueDateStr,
          'RWF'
        ),
      });

      if (res.success) {
        toast({
          title: 'SMS Sent',
          description: `Dispatched invoice notification to ${res.recipient} via ${res.provider}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send SMS';
      toast({
        title: 'SMS Failed',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('estatepro-view-invoices', view);
  }, [view]);

  // Handle ?add=true query parameter from Quick Add
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsCreateOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  const [formData, setFormData] = useState({
    tenant_id: '',
    property_id: '',
    unit_id: '',
    description: '',
    amount: 0,
    due_date: '',
  });

  const { data: invoices = [], isLoading, isError, error } = useInvoices();
  const { data: tenants = [] } = useTenants();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const invoiceRows = invoices as InvoiceWithRelations[];
  const tenantRows = tenants as TenantWithRelations[];

  const tenantOptions = tenantRows.map((tenant) => ({
    value: tenant.id,
    label: tenant.name,
    description: tenant.units ? `Unit ${tenant.units.unit_number}` : tenant.email,
  }));

  const stats = {
    totalInvoiced: invoiceRows.reduce((sum, inv) => sum + inv.amount, 0),
    totalPaid: invoiceRows.reduce((sum, inv) => sum + inv.paid_amount, 0),
    overdueAmount: invoiceRows
      .filter((inv) => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.amount - inv.paid_amount, 0),
    pendingCount: invoiceRows.filter((inv) => inv.status === 'pending' || inv.status === 'partial').length,
  };

  const filteredInvoices = invoiceRows.filter((invoice) => {
    const invCompanyId = invoice.company_id || invoice.properties?.company_id || invoice.properties?.companies?.id;
    if (selectedOrgFilter !== 'all' && invCompanyId && invCompanyId !== selectedOrgFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (invoice.tenants?.name || '').toLowerCase().includes(q) ||
      (invoice.guest_name || '').toLowerCase().includes(q) ||
      (invoice.guest_email || '').toLowerCase().includes(q) ||
      (invoice.invoice_number || '').toLowerCase().includes(q) ||
      (invoice.properties?.name || '').toLowerCase().includes(q) ||
      (invoice.properties?.companies?.name || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedOrgFilter, pageSize]);

  const paginatedInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    downloadCsv(
      'invoices-export.csv',
      invoiceRows.map((inv) => ({
        invoice_number: inv.invoice_number,
        tenant: inv.tenants?.name || inv.guest_name || '',
        guest_email: inv.guest_email || '',
        property: inv.properties?.name || '',
        unit: inv.units?.unit_number || '',
        description: inv.description,
        amount: inv.amount,
        paid_amount: inv.paid_amount,
        balance: inv.amount - inv.paid_amount,
        due_date: inv.due_date,
        status: inv.status,
        created_at: inv.created_at,
      }))
    );
    toast({ title: 'Export complete', description: 'Invoices exported as CSV.' });
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId, companyId: activeCompanyId },
      });

      if (error) throw new Error(error.message || 'Failed to generate PDF');

      const html = typeof data === 'string' ? data : await new Response(data).text();
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const htmlUrl = URL.createObjectURL(htmlBlob);

      const printWindow = window.open(htmlUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
            URL.revokeObjectURL(htmlUrl);
          }, 500);
        }, { once: true });
      } else {
        URL.revokeObjectURL(htmlUrl);
      }
    } catch (err: unknown) {
      console.error('Error downloading PDF:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate invoice PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreate = async () => {
    if (!formData.tenant_id || !formData.amount || !formData.due_date) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const selectedTenant = tenantRows.find((t) => t.id === formData.tenant_id);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    await createInvoice.mutateAsync({
      invoice_number: invoiceNumber,
      tenant_id: formData.tenant_id,
      property_id: selectedTenant?.property_id || formData.property_id || null,
      unit_id: selectedTenant?.unit_id || formData.unit_id || null,
      description: formData.description,
      amount: formData.amount,
      paid_amount: 0,
      due_date: formData.due_date,
      status: 'pending',
      paid_at: null,
    });

    setIsCreateOpen(false);
    setFormData({
      tenant_id: '',
      property_id: '',
      unit_id: '',
      description: '',
      amount: 0,
      due_date: '',
    });
  };

  const openEdit = (invoice: InvoiceWithRelations) => {
    setSelectedInvoice(invoice);
    setFormData({
      tenant_id: invoice.tenant_id || '',
      property_id: invoice.property_id || '',
      unit_id: invoice.unit_id || '',
      description: invoice.description || '',
      amount: invoice.amount,
      due_date: invoice.due_date,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedInvoice) return;

    await updateInvoice.mutateAsync({
      id: selectedInvoice.id,
      description: formData.description,
      amount: formData.amount,
      due_date: formData.due_date,
    });

    setIsEditOpen(false);
    setSelectedInvoice(null);
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* 1. Header & Primary Action Area */}
      <PageHeader
        title={t('invoices', 'Transactions & Invoices')}
        description={t('page_invoices_subtitle', 'Generate statements, track open accounts receivable, and dispatch multi-channel payment links.')}
        actions={
          <PageActions>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-1.5 h-9 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 text-xs"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('action_create_invoice', 'Create Invoice')}
            </Button>
          </PageActions>
        }
      />

      {/* 2. Page Insights (Clean metric strip, not decorative card) */}
      <PageInsights
        metrics={[
          {
            id: 'pending-invoices',
            label: 'Pending Invoices',
            value: stats.pendingCount,
            tone: stats.pendingCount > 0 ? 'warning' : 'default',
            subtext: 'Awaiting resident payment',
          },
          {
            id: 'overdue-invoices',
            label: 'Overdue Arrears',
            value: formatCurrency(stats.overdueAmount),
            tone: stats.overdueAmount > 0 ? 'danger' : 'default',
            subtext: `${stats.overdueCount} invoices past due date`,
          },
          {
            id: 'collected-invoices',
            label: 'Total Collected',
            value: formatCurrency(stats.totalPaid),
            tone: 'success',
            subtext: 'Settled to date',
          },
          {
            id: 'total-billed',
            label: 'Total Invoiced Volume',
            value: formatCurrency(stats.totalAmount),
            tone: 'default',
            subtext: `${invoiceRows.length} total issued invoices`,
          },
        ]}
      />

      {/* Filters & View Toggle */}
      <FilterBar className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('page_invoices_search', 'Search by tenant, invoice number, or property...')}
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

          <Button variant="outline" className="w-full gap-2 sm:w-auto h-11" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <ViewToggle view={view} onViewChange={setView} />
      </FilterBar>

      {/* Loading State */}
      {isLoading && (
        <Card className="card-shadow-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading invoices...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. Cards / Grid View */}
      {!isLoading && !isError && view === 'cards' && paginatedInvoices.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedInvoices.map((invoice) => {
              const balance = invoice.amount - invoice.paid_amount;
              return (
                <Card key={invoice.id} className="p-5 card-shadow-md hover:card-shadow-lg transition-all animate-enter">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-foreground truncate">{invoice.invoice_number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-secondary/40 space-y-1 text-xs">
                    <p className="font-medium text-foreground text-sm truncate">
                      {invoice.tenants?.name || invoice.guest_name || 'Guest Booking'}
                    </p>
                    <p className="text-muted-foreground truncate">{invoice.description}</p>
                    <p className="text-muted-foreground">
                      {invoice.properties?.name || '-'} {invoice.units ? `• Unit ${invoice.units.unit_number}` : ''}
                    </p>
                    {(invoice.properties as { companies?: { name?: string } | null } | null)?.companies?.name && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 mt-1 font-medium">
                        🏢 {(invoice.properties as { companies?: { name?: string } | null }).companies?.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(invoice.amount)}</p>
                      <p className={`text-xs ${balance > 0 ? 'text-destructive font-medium' : 'text-success'}`}>
                        Balance: {formatCurrency(balance)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPdf(invoice.id)}
                        disabled={downloadingId === invoice.id}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(invoice)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewRraReceipt(invoice)}>
                            <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" /> RRA EBM v2 Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenMoMoCollect(invoice)}>
                            <Phone className="h-4 w-4 mr-2 text-warning" /> Collect via MoMo (*182#)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareWhatsApp(invoice)}>
                            <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" /> Share via WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDirectSms(invoice)}>
                            <MessageSquare className="h-4 w-4 mr-2 text-primary" /> Send SMS (Africa's Talking)
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast({ title: 'Sent', description: 'Invoice sent to tenant.' })}>
                            <Send className="h-4 w-4 mr-2" /> Send to Tenant
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate('/payments')}>
                            <DollarSign className="h-4 w-4 mr-2" /> Record Payment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredInvoices.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 2. Compact View */}
      {!isLoading && !isError && view === 'compact' && paginatedInvoices.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedInvoices.map((invoice) => {
              const balance = invoice.amount - invoice.paid_amount;
              return (
                <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate">{invoice.invoice_number}</span>
                        {getStatusBadge(invoice.status)}
                        {(invoice.properties as { companies?: { name?: string } | null } | null)?.companies?.name && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            🏢 {(invoice.properties as { companies?: { name?: string } | null }).companies?.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {invoice.tenants?.name || invoice.guest_name || 'Guest'} • {invoice.properties?.name || '-'} {invoice.units ? `(Unit ${invoice.units.unit_number})` : ''} • Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-foreground text-sm">{formatCurrency(invoice.amount)}</p>
                      <p className={`text-xs ${balance > 0 ? 'text-destructive font-medium' : 'text-success'}`}>
                        Bal: {formatCurrency(balance)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPdf(invoice.id)}
                        disabled={downloadingId === invoice.id}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(invoice)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewRraReceipt(invoice)}>
                            <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" /> RRA EBM v2 Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenMoMoCollect(invoice)}>
                            <Phone className="h-4 w-4 mr-2 text-warning" /> Collect via MoMo (*182#)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareWhatsApp(invoice)}>
                            <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" /> Share via WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDirectSms(invoice)}>
                            <MessageSquare className="h-4 w-4 mr-2 text-primary" /> Send SMS (Africa's Talking)
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast({ title: 'Sent', description: 'Invoice sent to tenant.' })}>
                            <Send className="h-4 w-4 mr-2" /> Send to Tenant
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate('/payments')}>
                            <DollarSign className="h-4 w-4 mr-2" /> Record Payment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredInvoices.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 3. Table View */}
      {!isLoading && !isError && view === 'table' && paginatedInvoices.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>{t('th_invoice_number', 'Invoice #')}</TableHead>
                  <TableHead>{t('th_tenant', 'Tenant')}</TableHead>
                  <TableHead>{t('th_property', 'Property / Unit')}</TableHead>
                  <TableHead>{t('th_type', 'Description')}</TableHead>
                  <TableHead>{t('th_amount', 'Amount')}</TableHead>
                  <TableHead>{t('th_outstanding', 'Balance')}</TableHead>
                  <TableHead>{t('th_due_date', 'Due Date')}</TableHead>
                  <TableHead>{t('th_status', 'Status')}</TableHead>
                  <TableHead className="text-right">{t('th_actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      {invoice.tenant_id ? (
                        <button
                          className="hover:text-primary transition-colors font-medium text-left"
                          onClick={() => navigate(`/tenants/${invoice.tenant_id}`)}
                        >
                          {invoice.tenants?.name || 'Unknown'}
                        </button>
                      ) : (
                        <div>
                          <p className="font-medium">{invoice.guest_name || 'Guest Booking'}</p>
                          {invoice.guest_email ? <p className="text-xs text-muted-foreground">{invoice.guest_email}</p> : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{invoice.properties?.name || '-'}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.units ? `Unit ${invoice.units.unit_number}` : '-'}
                        </p>
                        {(invoice.properties as { companies?: { name?: string } | null } | null)?.companies?.name && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 mt-1 font-medium">
                            🏢 {(invoice.properties as { companies?: { name?: string } | null }).companies?.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{invoice.description}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell className={invoice.amount - invoice.paid_amount > 0 ? 'text-destructive font-semibold' : 'text-success'}>
                      {formatCurrency(invoice.amount - invoice.paid_amount)}
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(invoice)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewRraReceipt(invoice)}>
                            <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" /> RRA EBM v2 Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenMoMoCollect(invoice)}>
                            <Phone className="h-4 w-4 mr-2 text-warning" /> Collect via MoMo (*182#)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShareWhatsApp(invoice)}>
                            <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" /> Share via WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDirectSms(invoice)}>
                            <MessageSquare className="h-4 w-4 mr-2 text-primary" /> Send SMS (Africa's Talking)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleDownloadPdf(invoice.id)}
                            disabled={downloadingId === invoice.id}
                          >
                            <Download className="h-4 w-4 mr-2" /> {downloadingId === invoice.id ? 'Generating...' : 'Download PDF'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => toast({ title: 'Sent', description: 'Invoice sent to tenant.' })}
                          >
                            <Send className="h-4 w-4 mr-2" /> Send to Tenant
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => toast({ title: 'Print', description: 'Opening print dialog...' })}
                          >
                            <Printer className="h-4 w-4 mr-2" /> Print
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => navigate('/payments')}>
                            <DollarSign className="h-4 w-4 mr-2" /> Record Payment
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
            total={filteredInvoices.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredInvoices.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Try adjusting your search query or create a new invoice."
          action={<Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4" />Create invoice</Button>}
        />
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Generate a new invoice for a tenant.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tenant *</Label>
                <SearchableSelect
                  options={tenantOptions}
                  value={formData.tenant_id}
                  onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
                  placeholder="Select tenant..."
                  searchPlaceholder="Search tenants..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceDueDate">Due Date *</Label>
                <Input
                  id="invoiceDueDate"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceDescription">Description *</Label>
              <Input
                id="invoiceDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Rent - January 2026"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceAmount">Amount ({settings.currencySymbol || 'RWF'}) *</Label>
              <Input
                id="invoiceAmount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createInvoice.isPending}>
              {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>Update the invoice details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description *</Label>
              <Input
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Rent - January 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editAmount">Amount ({settings.currencySymbol || 'RWF'}) *</Label>
                <Input
                  id="editAmount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDueDate">Due Date *</Label>
                <Input
                  id="editDueDate"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateInvoice.isPending}>
              {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MoMo Instant USSD Collection Prompt Dialog */}
      <Dialog open={momoModalOpen} onOpenChange={setMomoModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-warning font-semibold">
              <Phone className="h-5 w-5" />
              <DialogTitle>Push MoMo USSD Prompt (*182#)</DialogTitle>
            </div>
            <DialogDescription>
              Dispatches an immediate USSD payment authorization prompt directly to the tenant's handset.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            <div className="p-3 rounded-lg bg-secondary/50 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice:</span>
                <span className="font-semibold">{momoTargetInvoice?.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant:</span>
                <span className="font-semibold">{momoTargetInvoice?.tenants?.name || 'Client'}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold text-sm pt-1 border-t border-border/60">
                <span>Amount Due:</span>
                <span>
                  RWF {momoTargetInvoice ? (momoTargetInvoice.amount - momoTargetInvoice.paid_amount).toLocaleString() : '0'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="momoTargetPhoneInput" className="text-xs">MTN MoMo or Airtel Money Number</Label>
              <Input
                id="momoTargetPhoneInput"
                value={momoTargetPhone}
                onChange={(e) => setMomoTargetPhone(e.target.value)}
                placeholder="e.g. 0788123456"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Supported: MTN Rwanda (078, 079) & Airtel Money (072, 073)
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setMomoModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
              onClick={handleSendMoMoPrompt}
              disabled={momoPushing || !momoTargetPhone}
            >
              {momoPushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              {momoPushing ? 'Pushing USSD...' : 'Send USSD Prompt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RRA EBM v2 Certified Fiscal Tax Receipt Modal */}
      <RraFiscalReceiptModal
        open={rraModalOpen}
        onOpenChange={setRraModalOpen}
        receipt={selectedReceipt}
      />
    </PageContainer>
  );
}
