import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
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

// Mock payments data
const mockPayments = [
  {
    id: '1',
    receiptNumber: 'RCP-20250113-0001',
    tenantName: 'Sarah Johnson',
    tenantId: '1',
    propertyName: 'Sunset Apartments',
    unitNumber: '204',
    invoiceNumber: 'INV-20250101-0001',
    amount: 1500,
    method: 'mtn_momo',
    momoPhone: '+233 24 123 4567',
    momoTransactionId: 'TXN123456789',
    status: 'completed',
    date: '2025-01-10',
    notes: 'January rent payment',
  },
  {
    id: '2',
    receiptNumber: 'RCP-20250113-0002',
    tenantName: 'Michael Brown',
    tenantId: '2',
    propertyName: 'Sunset Apartments',
    unitNumber: '103',
    invoiceNumber: 'INV-20250101-0002',
    amount: 2200,
    method: 'bank_transfer',
    status: 'completed',
    date: '2025-01-08',
    notes: 'January rent',
  },
  {
    id: '3',
    receiptNumber: 'RCP-20250113-0003',
    tenantName: 'Emma Wilson',
    tenantId: '3',
    propertyName: 'Harbor View',
    unitNumber: '501',
    invoiceNumber: 'INV-20250101-0003',
    amount: 1800,
    method: 'mtn_momo',
    momoPhone: '+233 55 987 6543',
    momoTransactionId: 'TXN987654321',
    status: 'pending',
    date: '2025-01-12',
    notes: 'Awaiting confirmation',
  },
  {
    id: '4',
    receiptNumber: 'RCP-20250113-0004',
    tenantName: 'David Lee',
    tenantId: '4',
    propertyName: 'Palm Heights',
    unitNumber: '302',
    invoiceNumber: 'INV-20250101-0004',
    amount: 1100,
    method: 'cash',
    status: 'completed',
    date: '2025-01-05',
    notes: '',
  },
  {
    id: '5',
    receiptNumber: 'RCP-20250113-0005',
    tenantName: 'Lisa Chen',
    tenantId: '5',
    propertyName: 'Sunset Apartments',
    unitNumber: '401',
    invoiceNumber: 'INV-20250101-0005',
    amount: 1950,
    method: 'card',
    status: 'failed',
    date: '2025-01-11',
    notes: 'Card declined',
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle className="h-3 w-3" /> Completed
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    case 'refunded':
      return (
        <Badge className="bg-info/10 text-info border-info/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Refunded
        </Badge>
      );
    default:
      return null;
  }
};

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'mtn_momo':
      return <Phone className="h-4 w-4 text-warning" />;
    case 'bank_transfer':
      return <Building2 className="h-4 w-4 text-info" />;
    case 'card':
      return <CreditCard className="h-4 w-4 text-primary" />;
    case 'cash':
      return <DollarSign className="h-4 w-4 text-success" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

const getMethodLabel = (method: string) => {
  switch (method) {
    case 'mtn_momo':
      return 'MTN MoMo';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'card':
      return 'Card';
    case 'cash':
      return 'Cash';
    default:
      return 'Other';
  }
};

export default function Payments() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mtn_momo');

  const stats = {
    totalReceived: mockPayments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: mockPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    failedCount: mockPayments.filter((p) => p.status === 'failed').length,
    momoPayments: mockPayments.filter((p) => p.method === 'mtn_momo').length,
  };

  const filteredPayments = mockPayments.filter(
    (payment) =>
      payment.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    downloadCsv(
      'payments-export.csv',
      mockPayments.map((p) => ({
        receipt_number: p.receiptNumber,
        tenant: p.tenantName,
        property: p.propertyName,
        unit: p.unitNumber,
        invoice: p.invoiceNumber,
        amount: p.amount,
        method: getMethodLabel(p.method),
        status: p.status,
        date: p.date,
        momo_phone: p.momoPhone || '',
        momo_transaction: p.momoTransactionId || '',
        notes: p.notes || '',
      }))
    );
    toast({ title: 'Export complete', description: 'Payments exported as CSV.' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and manage all payment transactions</p>
        </div>
        <Button className="gap-2" onClick={() => setIsRecordOpen(true)}>
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-foreground">GHS {stats.totalReceived.toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">GHS {stats.pendingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-destructive">{stats.failedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MTN MoMo</p>
                <p className="text-2xl font-bold text-foreground">{stats.momoPayments}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Phone className="h-6 w-6 text-warning" />
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
            placeholder="Search by tenant, receipt, or invoice..."
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

      {/* Payments Table */}
      <Card className="card-shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.receiptNumber}</TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>
                    <button
                      className="hover:text-primary transition-colors"
                      onClick={() => navigate(`/tenants/${payment.tenantId}`)}
                    >
                      {payment.tenantName}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{payment.propertyName}</p>
                      <p className="text-muted-foreground">Unit {payment.unitNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getMethodIcon(payment.method)}
                      <span>{getMethodLabel(payment.method)}</span>
                    </div>
                    {payment.momoPhone && (
                      <p className="text-xs text-muted-foreground">{payment.momoPhone}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">GHS {payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => toast({ title: 'Receipt', description: 'Receipt downloaded.' })}
                        >
                          <Receipt className="h-4 w-4 mr-2" /> Download Receipt
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => navigate(`/tenants/${payment.tenantId}`)}
                        >
                          <DollarSign className="h-4 w-4 mr-2" /> View Tenant
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
                <Label htmlFor="paymentTenant">Tenant *</Label>
                <select
                  id="paymentTenant"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select tenant...</option>
                  <option value="1">Sarah Johnson</option>
                  <option value="2">Michael Brown</option>
                  <option value="3">Emma Wilson</option>
                  <option value="4">David Lee</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentInvoice">Invoice</Label>
                <select
                  id="paymentInvoice"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select invoice...</option>
                  <option value="1">INV-20250101-0001 - GHS 1,500</option>
                  <option value="2">INV-20250101-0002 - GHS 2,200</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="paymentAmount">Amount (GHS) *</Label>
                <Input id="paymentAmount" type="number" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Input id="paymentDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="mtn_momo">MTN Mobile Money (MoMo)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card Payment</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            {paymentMethod === 'mtn_momo' && (
              <>
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-5 w-5 text-warning" />
                    <span className="font-medium text-warning">MTN Mobile Money</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter the MoMo details for this payment. Ensure the phone number is registered with MTN.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="momoPhone">MoMo Phone Number *</Label>
                    <Input id="momoPhone" placeholder="+233 24 XXX XXXX" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="momoTransactionId">Transaction ID</Label>
                    <Input id="momoTransactionId" placeholder="e.g., TXN123456789" />
                  </div>
                </div>
              </>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div className="grid gap-2">
                <Label htmlFor="bankReference">Bank Reference Number</Label>
                <Input id="bankReference" placeholder="Enter bank reference..." />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea id="paymentNotes" placeholder="Additional notes about this payment..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({ title: 'Payment recorded', description: 'The payment has been recorded successfully.' });
                setIsRecordOpen(false);
              }}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
