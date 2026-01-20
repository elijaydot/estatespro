import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { useSettings } from '@/contexts/SettingsContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useInvoices, useCreateInvoice, useUpdateInvoice } from '@/hooks/useInvoices';
import { useTenants } from '@/hooks/useTenants';
import { format } from 'date-fns';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle className="h-3 w-3" /> Paid
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="bg-info/10 text-info border-info/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Partial
        </Badge>
      );
    case 'overdue':
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <XCircle className="h-3 w-3" /> Overdue
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-muted text-muted-foreground gap-1">
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return null;
  }
};

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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

  const { data: invoices = [], isLoading } = useInvoices();
  const { data: tenants = [] } = useTenants();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const tenantOptions = tenants.map((tenant: any) => ({
    value: tenant.id,
    label: tenant.name,
    description: tenant.units ? `Unit ${tenant.units.unit_number}` : tenant.email,
  }));

  const stats = {
    totalInvoiced: invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0),
    totalPaid: invoices.reduce((sum: number, inv: any) => sum + inv.paid_amount, 0),
    overdueAmount: invoices
      .filter((inv: any) => inv.status === 'overdue')
      .reduce((sum: number, inv: any) => sum + inv.amount - inv.paid_amount, 0),
    pendingCount: invoices.filter((inv: any) => inv.status === 'pending' || inv.status === 'partial').length,
  };

  const filteredInvoices = invoices.filter(
    (invoice: any) =>
      invoice.tenants?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.properties?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    downloadCsv(
      'invoices-export.csv',
      invoices.map((inv: any) => ({
        invoice_number: inv.invoice_number,
        tenant: inv.tenants?.name || '',
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

  const handleCreate = async () => {
    if (!formData.tenant_id || !formData.description || !formData.amount || !formData.due_date) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const selectedTenant = tenants.find((t: any) => t.id === formData.tenant_id);
    
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

  const openEdit = (invoice: any) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">Create and manage tenant invoices</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
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
        <Card className="card-shadow-md">
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
        <Card className="card-shadow-md">
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
        <Card className="card-shadow-md">
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tenant, invoice number, or property..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Invoices Table */}
      {!isLoading && (
        <Card className="card-shadow-md">
          <CardContent className="p-0">
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
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <button
                          className="hover:text-primary transition-colors"
                          onClick={() => navigate(`/tenants/${invoice.tenant_id}`)}
                        >
                          {invoice.tenants?.name || 'Unknown'}
                        </button>
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
                              onSelect={() => toast({ title: 'Download', description: 'Invoice downloaded.' })}
                            >
                              <Download className="h-4 w-4 mr-2" /> Download PDF
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
