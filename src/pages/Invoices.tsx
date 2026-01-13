import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Mock invoices data
const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-20250101-0001',
    tenantName: 'Sarah Johnson',
    tenantId: '1',
    propertyName: 'Sunset Apartments',
    unitNumber: '204',
    amount: 1500,
    paidAmount: 1500,
    dueDate: '2025-01-15',
    status: 'paid',
    description: 'Rent - January 2025',
    createdAt: '2025-01-01',
  },
  {
    id: '2',
    invoiceNumber: 'INV-20250101-0002',
    tenantName: 'Michael Brown',
    tenantId: '2',
    propertyName: 'Sunset Apartments',
    unitNumber: '103',
    amount: 2200,
    paidAmount: 0,
    dueDate: '2025-01-15',
    status: 'pending',
    description: 'Rent - January 2025',
    createdAt: '2025-01-01',
  },
  {
    id: '3',
    invoiceNumber: 'INV-20250101-0003',
    tenantName: 'Emma Wilson',
    tenantId: '3',
    propertyName: 'Harbor View',
    unitNumber: '501',
    amount: 1800,
    paidAmount: 900,
    dueDate: '2025-01-10',
    status: 'partial',
    description: 'Rent - January 2025',
    createdAt: '2025-01-01',
  },
  {
    id: '4',
    invoiceNumber: 'INV-20241215-0001',
    tenantName: 'David Lee',
    tenantId: '4',
    propertyName: 'Palm Heights',
    unitNumber: '302',
    amount: 1100,
    paidAmount: 0,
    dueDate: '2024-12-31',
    status: 'overdue',
    description: 'Rent - December 2024',
    createdAt: '2024-12-15',
  },
  {
    id: '5',
    invoiceNumber: 'INV-20250101-0004',
    tenantName: 'Lisa Chen',
    tenantId: '5',
    propertyName: 'Sunset Apartments',
    unitNumber: '401',
    amount: 1950,
    paidAmount: 1950,
    dueDate: '2025-01-15',
    status: 'paid',
    description: 'Rent - January 2025',
    createdAt: '2025-01-01',
  },
  {
    id: '6',
    invoiceNumber: 'INV-20250101-0005',
    tenantName: 'James Wilson',
    tenantId: '6',
    propertyName: 'Harbor View',
    unitNumber: '301',
    amount: 2100,
    paidAmount: 0,
    dueDate: '2025-01-20',
    status: 'pending',
    description: 'Rent - January 2025',
    createdAt: '2025-01-01',
  },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const stats = {
    totalInvoiced: mockInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    totalPaid: mockInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
    overdueAmount: mockInvoices.filter((inv) => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount - inv.paidAmount, 0),
    pendingCount: mockInvoices.filter((inv) => inv.status === 'pending' || inv.status === 'partial').length,
  };

  const filteredInvoices = mockInvoices.filter(
    (invoice) =>
      invoice.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    downloadCsv(
      'invoices-export.csv',
      mockInvoices.map((inv) => ({
        invoice_number: inv.invoiceNumber,
        tenant: inv.tenantName,
        property: inv.propertyName,
        unit: inv.unitNumber,
        description: inv.description,
        amount: inv.amount,
        paid_amount: inv.paidAmount,
        balance: inv.amount - inv.paidAmount,
        due_date: inv.dueDate,
        status: inv.status,
        created_at: inv.createdAt,
      }))
    );
    toast({ title: 'Export complete', description: 'Invoices exported as CSV.' });
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
                <p className="text-2xl font-bold text-foreground">GHS {stats.totalInvoiced.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-success">GHS {stats.totalPaid.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-destructive">GHS {stats.overdueAmount.toLocaleString()}</p>
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

      {/* Invoices Table */}
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
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <button
                      className="hover:text-primary transition-colors"
                      onClick={() => navigate(`/tenants/${invoice.tenantId}`)}
                    >
                      {invoice.tenantName}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{invoice.propertyName}</p>
                      <p className="text-muted-foreground">Unit {invoice.unitNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{invoice.description}</TableCell>
                  <TableCell className="font-semibold">GHS {invoice.amount.toLocaleString()}</TableCell>
                  <TableCell className={invoice.amount - invoice.paidAmount > 0 ? 'text-destructive font-semibold' : 'text-success'}>
                    GHS {(invoice.amount - invoice.paidAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                        <DropdownMenuItem
                          onSelect={() => navigate('/payments')}
                        >
                          <DollarSign className="h-4 w-4 mr-2" /> Record Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                <Label htmlFor="invoiceTenant">Tenant *</Label>
                <select
                  id="invoiceTenant"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select tenant...</option>
                  <option value="1">Sarah Johnson - Unit 204</option>
                  <option value="2">Michael Brown - Unit 103</option>
                  <option value="3">Emma Wilson - Unit 501</option>
                  <option value="4">David Lee - Unit 302</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceDueDate">Due Date *</Label>
                <Input id="invoiceDueDate" type="date" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceDescription">Description *</Label>
              <Input id="invoiceDescription" placeholder="e.g., Rent - January 2025" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invoiceAmount">Amount (GHS) *</Label>
                <Input id="invoiceAmount" type="number" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <select
                  id="invoiceType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="rent">Rent</option>
                  <option value="utility">Utility</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="deposit">Security Deposit</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceNotes">Additional Notes</Label>
              <Textarea id="invoiceNotes" placeholder="Any additional information..." rows={3} />
            </div>

            <div className="flex items-center gap-2 p-4 rounded-lg bg-info/10 border border-info/20">
              <input type="checkbox" id="sendEmail" className="rounded" />
              <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
                Send invoice to tenant via email
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({ title: 'Invoice created', description: 'The invoice has been created successfully.' });
                setIsCreateOpen(false);
              }}
            >
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
