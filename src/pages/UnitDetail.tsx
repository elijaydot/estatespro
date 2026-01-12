import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Bed,
  Bath,
  Square,
  DollarSign,
  User,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  Wrench,
  FileText,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { UnitStatus } from '@/types';

// Mock unit data
const mockUnit = {
  id: '1',
  unitNumber: '204',
  propertyId: '1',
  property: 'Sunset Apartments',
  floor: 2,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1200,
  rent: 2200,
  status: 'occupied' as UnitStatus,
  amenities: ['Air Conditioning', 'Dishwasher', 'Washer/Dryer', 'Balcony', 'Parking'],
  description: 'Spacious 3-bedroom apartment with modern finishes, hardwood floors, and a private balcony with city views.',
  tenant: {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 123-4567',
    moveInDate: 'Mar 15, 2024',
    leaseEnd: 'Mar 14, 2025',
  },
};

// Mock maintenance history
const mockMaintenance = [
  { id: '1', title: 'HVAC filter replacement', date: 'Jan 10, 2025', status: 'completed', priority: 'low' },
  { id: '2', title: 'Garbage disposal repair', date: 'Dec 20, 2024', status: 'completed', priority: 'medium' },
  { id: '3', title: 'Annual inspection', date: 'Nov 15, 2024', status: 'completed', priority: 'low' },
];

// Mock lease history
const mockLeaseHistory = [
  { id: '1', tenant: 'Sarah Johnson', startDate: 'Mar 15, 2024', endDate: 'Mar 14, 2025', rent: 2200, status: 'active' },
  { id: '2', tenant: 'Michael Brown', startDate: 'Mar 15, 2022', endDate: 'Mar 14, 2024', rent: 1950, status: 'completed' },
];

const getStatusBadge = (status: UnitStatus) => {
  switch (status) {
    case 'occupied':
      return <Badge className="bg-info/10 text-info border-info/20">Occupied</Badge>;
    case 'vacant':
      return <Badge className="bg-success/10 text-success border-success/20">Vacant</Badge>;
    case 'maintenance':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Maintenance</Badge>;
  }
};

const getMaintenanceStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-warning" />;
    case 'submitted':
      return <AlertTriangle className="h-4 w-4 text-info" />;
    default:
      return null;
  }
};

export default function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const unit = mockUnit;

  const isEditOpen = searchParams.get('edit') === 'true';
  const closeEdit = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('edit');
    setSearchParams(next, { replace: true });
  };
  const openEdit = () => {
    const next = new URLSearchParams(searchParams);
    next.set('edit', 'true');
    setSearchParams(next, { replace: true });
  };

  const handleNotImplemented = (feature: string) => {
    toast({
      title: 'Coming soon',
      description: `${feature} will be enabled once we connect the backend.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/units')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-3 rounded-xl bg-primary/10">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Unit {unit.unitNumber}</h1>
              {getStatusBadge(unit.status)}
            </div>
            <Link to={`/properties/${unit.propertyId}`} className="text-muted-foreground hover:text-primary transition-colors">
              {unit.property}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={openEdit}>
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
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleNotImplemented('Create listing');
                }}
              >
                <FileText className="h-4 w-4 mr-2" /> Create Listing
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleNotImplemented('Schedule inspection');
                }}
              >
                <Calendar className="h-4 w-4 mr-2" /> Schedule Inspection
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  handleNotImplemented('Delete unit');
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Unit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6 text-center">
            <Bed className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{unit.bedrooms}</p>
            <p className="text-sm text-muted-foreground">Bedrooms</p>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6 text-center">
            <Bath className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{unit.bathrooms}</p>
            <p className="text-sm text-muted-foreground">Bathrooms</p>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6 text-center">
            <Square className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{unit.sqft.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Sq. Ft.</p>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6 text-center">
            <Home className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{unit.floor}</p>
            <p className="text-sm text-muted-foreground">Floor</p>
          </CardContent>
        </Card>
        <Card className="card-shadow-md sm:col-span-2 lg:col-span-1">
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">${unit.rent.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Monthly Rent</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Description & Amenities */}
        <div className="space-y-6">
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{unit.description}</p>
            </CardContent>
          </Card>

          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unit.amenities.map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="font-normal">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {unit.status === 'occupied' && unit.tenant && (
            <Card className="card-shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Current Tenant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  to={`/tenants/${unit.tenant.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{unit.tenant.name}</p>
                    <p className="text-sm text-muted-foreground">{unit.tenant.email}</p>
                  </div>
                </Link>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Move-in Date</p>
                    <p className="font-medium">{unit.tenant.moveInDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Ends</p>
                    <p className="font-medium">{unit.tenant.leaseEnd}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {unit.status === 'vacant' && (
            <Card className="card-shadow-md border-dashed">
              <CardContent className="py-8 text-center">
                <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">This unit is currently vacant</p>
                <Button className="gap-2" onClick={() => handleNotImplemented('Assign tenant')}>
                  <Plus className="h-4 w-4" />
                  Assign Tenant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="maintenance" className="space-y-4">
            <TabsList>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="leases">Lease History</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Maintenance History</CardTitle>
                  <Button variant="outline" className="gap-2" onClick={() => handleNotImplemented('New maintenance request')}>
                    <Wrench className="h-4 w-4" />
                    New Request
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockMaintenance.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-background">{getMaintenanceStatusIcon(request.status)}</div>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">{request.date}</p>
                          </div>
                        </div>
                        <Badge className="bg-success/10 text-success border-success/20 capitalize">{request.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leases" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Lease History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockLeaseHistory.map((lease) => (
                      <div key={lease.id} className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{lease.tenant}</p>
                          <Badge
                            className={
                              lease.status === 'active'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {lease.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {lease.startDate} - {lease.endDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${lease.rent.toLocaleString()}/mo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <Button variant="outline" className="gap-2" onClick={() => handleNotImplemented('Upload document')}>
                    <Plus className="h-4 w-4" />
                    Upload
                  </Button>
                </CardHeader>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>Update unit details (mock UI).</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitNumber">Unit Number</Label>
                <Input id="unitNumber" defaultValue={unit.unitNumber} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitFloor">Floor</Label>
                <Input id="unitFloor" defaultValue={String(unit.floor)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitBeds">Bedrooms</Label>
                <Input id="unitBeds" defaultValue={String(unit.bedrooms)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitBaths">Bathrooms</Label>
                <Input id="unitBaths" defaultValue={String(unit.bathrooms)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitSqft">Sqft</Label>
                <Input id="unitSqft" defaultValue={String(unit.sqft)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitRent">Monthly Rent</Label>
                <Input id="unitRent" defaultValue={String(unit.rent)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitStatus">Status</Label>
                <Input id="unitStatus" defaultValue={unit.status} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unitDesc">Description</Label>
              <Textarea id="unitDesc" defaultValue={unit.description} rows={4} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({ title: 'Saved', description: 'Unit updated (mock).' });
                closeEdit();
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

