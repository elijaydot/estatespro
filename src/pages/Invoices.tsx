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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { downloadCsv } from '@/lib/download';
import { useSettings } from '@/contexts/useSettings';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useInvoices, useCreateInvoice, useUpdateInvoice, type Invoice } from '@/hooks/useInvoices';
import { useTenants, type Tenant } from '@/hooks/useTenants';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { format } from 'date-fns';
import { StatusPill } from '@/components/shared/StatusPill';
import { FilterBar } from '@/components/shared/FilterBar';
import { EmptyState } from '@/components/shared/EmptyState';

type TenantWithRelations = Tenant & {
  units?: { unit_number: string | null } | null;
};

type InvoiceWithRelations = Invoice & {
  tenants?: { name: string | null } | null;
  properties?: { name: string | null } | null;
  units?: { unit_number: string | null } | null;
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
  const { formatCurrency } = useSettings();
  const { activeCompanyId } = useActiveCompany();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (invoice.tenants?.name || '').toLowerCase().includes(q) ||
      (invoice.guest_name || '').toLowerCase().includes(q) ||
      (invoice.guest_email || '').toLowerCase().includes(q) ||
      (invoice.invoice_number || '').toLowerCase().includes(q) ||
      (invoice.properties?.name || '').toLowerCase().includes(q)
    );
  });

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
    } catch (error: unknown) {
      console.error('Error downloading PDF:', error);
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to generate invoice PDF'), variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCreate = async () => {
    if (!formData.tenant_id || !formData.description || !formData.amount || !formData.due_date) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const selectedTenant = tenantRows.find((t) => t.id === formData.tenant_id);
    
    await createInvoice.mutateAsync({
      tenant_id: formData.tenant_id,
      property_id: selectedTenant?.property_id || null,
      unit_id: selectedTenant?.unit_id || null,
      description: formData.description,
      amount: formData.amount,
      due_date: formData.due_date,
      status: 'pending',
      paid_amount: 0,
      paid_at: null,
    });

    setIsCreateOpen(false);
    resetForm();
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
    resetForm();
  };

  const resetForm = () => {
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
      tenant_id: invoice.tenant_id,
      property_id: invoice.property_id || '',
      unit_id: invoice.unit_id || '',
      description: invoice.description,
      amount: invoice.amount,
      due_date: invoice.due_date,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Revenue command
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">Create, track, and settle tenant billing in one flow</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto rounded-full px-5" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <Card className="border border-border/70 bg-card/85 backdrop-blur-sm card-shadow-md overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Billing cockpit
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Move from invoice creation to payment reconciliation faster.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 border-warning/30 text-warning">Pending {stats.pendingCount}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 border-destructive/30 text-destructive">
              Overdue {formatCurrency(stats.overdueAmount)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 border-success/30 text-success">
              Collected {formatCurrency(stats.totalPaid)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-1">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoiced</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalInvoiced)}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-3">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(stats.overdueAmount)}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md border-border/60 hover:shadow-lg transition-shadow animate-enter stagger-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">{stats.pendingCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <FilterBar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tenant, invoice number, or property..."
            className="pl-10 h-11 border-border/70 bg-card/80"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sm:flex">
          <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
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

      {isError && !isLoading && (
        <Card className="card-shadow-md border-destructive/20">
          <CardContent className="py-10 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="font-medium">Could not load invoices</p>
            <p className="text-sm text-muted-foreground">
              {(error as Error)?.message || 'Please check your connection and try again.'}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invoices Table */}
      {!isLoading && !isError && (
        <Card className="card-shadow-md border-border/70 animate-enter stagger-2">
          <CardContent className="p-0">
            <div className="md:hidden divide-y">
              {filteredInvoices.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No invoices found"
                  description="Try adjusting your search query or create a new invoice."
                  action={<Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4" />Create invoice</Button>}
                />
              ) : (
                filteredInvoices.map((invoice, index) => (
                  <div key={invoice.id} className={`p-4 space-y-3 animate-enter ${index < 5 ? `stagger-${(index % 5) + 1}` : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{invoice.tenants?.name || invoice.guest_name || 'Guest Booking'}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{invoice.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.properties?.name || '-'} {invoice.units ? `• Unit ${invoice.units.unit_number}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{formatCurrency(invoice.amount)}</p>
                        <p className={`text-xs ${invoice.amount - invoice.paid_amount > 0 ? 'text-destructive' : 'text-success'}`}>
                          Balance {formatCurrency(invoice.amount - invoice.paid_amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(invoice.id)}
                          disabled={downloadingId === invoice.id}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(invoice)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property / Unit</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <EmptyState
                        icon={FileText}
                        title="No invoices found"
                        action={<Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4" />Create invoice</Button>}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {invoice.tenant_id ? (
                          <button
                            className="hover:text-primary transition-colors"
                            onClick={() => navigate(`/tenants/${invoice.tenant_id}`)}
                          >
                            {invoice.tenants?.name || invoice.guest_name || 'Unknown'}
                          </button>
                        ) : (
                          <div>
                            <p>{invoice.guest_name || 'Guest Booking'}</p>
                            {invoice.guest_email ? <p className="text-xs text-muted-foreground">{invoice.guest_email}</p> : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{invoice.properties?.name || '-'}</p>
                          <p className="text-muted-foreground">
                            {invoice.units ? `Unit ${invoice.units.unit_number}` : '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{invoice.description}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell className={invoice.amount - invoice.paid_amount > 0 ? 'text-destructive font-semibold' : 'text-success'}>
                        {formatCurrency(invoice.amount - invoice.paid_amount)}
                      </TableCell>
                      <TableCell>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(invoice)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit Invoice
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
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
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
              <Label htmlFor="invoiceAmount">Amount *</Label>
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
                <Label htmlFor="editAmount">Amount *</Label>
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
    </div>
  );
}
