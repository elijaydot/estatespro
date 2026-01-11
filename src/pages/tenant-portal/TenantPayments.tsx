import { useState } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Mock payment data
const upcomingPayment = {
  amount: 1500,
  dueDate: 'Feb 01, 2025',
  daysUntilDue: 15,
  description: 'Monthly Rent - February 2025',
};

const paymentHistory = [
  { id: '1', date: 'Jan 01, 2025', description: 'Monthly Rent - January 2025', amount: 1500, status: 'paid', method: 'Card ending 4242' },
  { id: '2', date: 'Dec 01, 2024', description: 'Monthly Rent - December 2024', amount: 1500, status: 'paid', method: 'Card ending 4242' },
  { id: '3', date: 'Nov 01, 2024', description: 'Monthly Rent - November 2024', amount: 1500, status: 'paid', method: 'Bank Transfer' },
  { id: '4', date: 'Oct 01, 2024', description: 'Monthly Rent - October 2024', amount: 1500, status: 'paid', method: 'Card ending 4242' },
  { id: '5', date: 'Sep 01, 2024', description: 'Monthly Rent - September 2024', amount: 1500, status: 'paid', method: 'Card ending 4242' },
  { id: '6', date: 'Aug 01, 2024', description: 'Monthly Rent - August 2024', amount: 1500, status: 'paid', method: 'Bank Transfer' },
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
    case 'overdue':
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Overdue
        </Badge>
      );
    default:
      return null;
  }
};

export default function TenantPayments() {
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground">Manage your rent payments and view history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold text-success">$0</p>
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
                <p className="text-sm text-muted-foreground">Next Payment</p>
                <p className="text-2xl font-bold text-foreground">${upcomingPayment.amount.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-2xl font-bold text-foreground">{upcomingPayment.daysUntilDue} days</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Calendar className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payment */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/50">
            <div>
              <p className="font-medium">{upcomingPayment.description}</p>
              <p className="text-sm text-muted-foreground mt-1">Due: {upcomingPayment.dueDate}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">${upcomingPayment.amount.toLocaleString()}</span>
              <Button className="gap-2" onClick={() => setIsPayDialogOpen(true)}>
                <CreditCard className="h-4 w-4" />
                Pay Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="card-shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payment History</CardTitle>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.method}</TableCell>
                  <TableCell className="font-medium">${payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              Pay your rent securely using your preferred payment method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount Due</span>
                <span className="text-2xl font-bold">${upcomingPayment.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Card ending in 4242</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                  <RadioGroupItem value="bank" id="bank" />
                  <Label htmlFor="bank" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Bank Transfer
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Direct bank payment</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsPayDialogOpen(false)} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Pay ${upcomingPayment.amount.toLocaleString()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
