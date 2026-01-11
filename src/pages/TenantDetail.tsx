import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Home,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal,
  Wrench,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock tenant data
const mockTenant = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@email.com',
  phone: '+1 (555) 123-4567',
  emergencyContact: 'John Johnson',
  emergencyPhone: '+1 (555) 987-6543',
  employer: 'Tech Corp Inc.',
  occupation: 'Software Engineer',
  unit: 'Unit 204',
  unitId: '1',
  property: 'Sunset Apartments',
  propertyId: '1',
  moveInDate: 'Mar 15, 2024',
  leaseEnd: 'Mar 14, 2025',
  leaseStatus: 'active' as const,
  monthlyRent: 1500,
  balance: 0,
  securityDeposit: 3000,
};

// Mock payment history
const mockPayments = [
  { id: '1', date: 'Jan 01, 2025', description: 'Rent - January 2025', amount: 1500, status: 'paid' },
  { id: '2', date: 'Dec 01, 2024', description: 'Rent - December 2024', amount: 1500, status: 'paid' },
  { id: '3', date: 'Nov 01, 2024', description: 'Rent - November 2024', amount: 1500, status: 'paid' },
  { id: '4', date: 'Oct 01, 2024', description: 'Rent - October 2024', amount: 1500, status: 'paid' },
];

// Mock maintenance requests
const mockMaintenance = [
  { id: '1', title: 'Leaky faucet in bathroom', date: 'Jan 05, 2025', status: 'completed', priority: 'medium' },
  { id: '2', title: 'AC not cooling properly', date: 'Dec 15, 2024', status: 'completed', priority: 'high' },
];

const getLeaseStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
    case 'expiring':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Expiring Soon</Badge>;
    case 'expired':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>;
    default:
      return null;
  }
};

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
    case 'pending':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
    case 'overdue':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>;
    default:
      return null;
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenant = mockTenant;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tenants')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {getInitials(tenant.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
              {getLeaseStatusBadge(tenant.leaseStatus)}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                {tenant.unit} • {tenant.property}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            Send Message
          </Button>
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Generate Statement</DropdownMenuItem>
              <DropdownMenuItem>Renew Lease</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Remove Tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl font-bold text-foreground">${tenant.monthlyRent.toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className={`text-2xl font-bold ${tenant.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                  ${tenant.balance.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${tenant.balance > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                {tenant.balance > 0 ? (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lease Ends</p>
                <p className="text-2xl font-bold text-foreground">{tenant.leaseEnd}</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Calendar className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Security Deposit</p>
                <p className="text-2xl font-bold text-foreground">${tenant.securityDeposit.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <FileText className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{tenant.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground mb-2">Emergency Contact</p>
              <p className="font-medium">{tenant.emergencyContact}</p>
              <p className="text-sm text-muted-foreground">{tenant.emergencyPhone}</p>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground mb-2">Employment</p>
              <p className="font-medium">{tenant.occupation}</p>
              <p className="text-sm text-muted-foreground">{tenant.employer}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="payments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Payment History</CardTitle>
                  <Button className="gap-2">
                    <DollarSign className="h-4 w-4" />
                    Record Payment
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell>{payment.description}</TableCell>
                          <TableCell className="font-medium">${payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockMaintenance.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-warning/10">
                            <Wrench className="h-4 w-4 text-warning" />
                          </div>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">{request.date}</p>
                          </div>
                        </div>
                        <Badge className="bg-success/10 text-success border-success/20">
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card className="card-shadow-md">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
