import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Mail,
  Phone,
  Home,
  Edit,
  Trash2,
  Eye,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface TenantRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  property: string;
  moveInDate: string;
  leaseStatus: 'active' | 'expiring' | 'expired';
  balance: number;
}

const mockTenants: TenantRow[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 123-4567',
    unit: 'Unit 204',
    property: 'Sunset Apartments',
    moveInDate: 'Mar 15, 2024',
    leaseStatus: 'active',
    balance: 0,
  },
  {
    id: '2',
    name: 'Michael Brown',
    email: 'michael.brown@email.com',
    phone: '+1 (555) 234-5678',
    unit: 'Unit 108',
    property: 'Oak Ridge Complex',
    moveInDate: 'Jan 01, 2024',
    leaseStatus: 'expiring',
    balance: 1500,
  },
  {
    id: '3',
    name: 'Emma Wilson',
    email: 'emma.wilson@email.com',
    phone: '+1 (555) 345-6789',
    unit: 'Unit 412',
    property: 'Riverside Heights',
    moveInDate: 'Jun 20, 2024',
    leaseStatus: 'active',
    balance: 0,
  },
  {
    id: '4',
    name: 'David Lee',
    email: 'david.lee@email.com',
    phone: '+1 (555) 456-7890',
    unit: 'Unit 305',
    property: 'Sunset Apartments',
    moveInDate: 'Nov 10, 2023',
    leaseStatus: 'expired',
    balance: 2400,
  },
  {
    id: '5',
    name: 'Jennifer Martinez',
    email: 'jennifer.m@email.com',
    phone: '+1 (555) 567-8901',
    unit: 'Unit 501',
    property: 'Downtown Business Center',
    moveInDate: 'Aug 05, 2024',
    leaseStatus: 'active',
    balance: 0,
  },
];

const getLeaseStatusBadge = (status: TenantRow['leaseStatus']) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
    case 'expiring':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Expiring Soon</Badge>;
    case 'expired':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>;
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

export default function Tenants() {
  const navigate = useNavigate();
  const [tenants] = useState<TenantRow[]>(mockTenants);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.property.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground">
            Manage tenant profiles and information
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
              <DialogDescription>
                Enter the tenant's information. They will receive an email invitation to set up their portal access.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@email.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emergency">Emergency Contact</Label>
                  <Input id="emergency" placeholder="Contact name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                  <Input id="emergencyPhone" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="employer">Employer</Label>
                  <Input id="employer" placeholder="Company name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input id="occupation" placeholder="Job title" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Add Tenant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Tenants Table */}
      <div className="bg-card rounded-xl card-shadow-md overflow-hidden animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Property / Unit</TableHead>
              <TableHead>Move-in Date</TableHead>
              <TableHead>Lease Status</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.map((tenant) => (
              <TableRow key={tenant.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(tenant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{tenant.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {tenant.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {tenant.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{tenant.unit}</p>
                      <p className="text-xs text-muted-foreground">{tenant.property}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {tenant.moveInDate}
                  </div>
                </TableCell>
                <TableCell>
                  {getLeaseStatusBadge(tenant.leaseStatus)}
                </TableCell>
                <TableCell>
                  <span className={tenant.balance > 0 ? 'text-destructive font-medium' : 'text-success'}>
                    ${tenant.balance.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/tenants/${tenant.id}`)}>
                      <Eye className="h-4 w-4 mr-2" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/tenants/${tenant.id}?edit=true`)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/tenants/${tenant.id}?tab=messages`)}>
                      <Mail className="h-4 w-4 mr-2" /> Send Message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No tenants found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or add a new tenant.
          </p>
        </div>
      )}
    </div>
  );
}
