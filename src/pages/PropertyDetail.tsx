import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Home, 
  Users, 
  DollarSign,
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
  Calendar,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Property, PropertyType, UnitStatus } from '@/types';

// Mock property data
const mockProperty: Property = {
  id: '1',
  workspaceId: 'ws-1',
  name: 'Sunset Apartments',
  address: '123 Sunset Boulevard',
  city: 'Los Angeles',
  state: 'CA',
  zipCode: '90028',
  country: 'USA',
  type: 'apartment',
  description: 'Modern apartment complex with luxury amenities including swimming pool, gym, and 24/7 security. Located in a prime location with easy access to shopping centers and public transportation.',
  images: [],
  totalUnits: 24,
  occupiedUnits: 21,
  createdAt: new Date(),
};

// Mock units for this property
const mockPropertyUnits = [
  { id: '1', unitNumber: '101', bedrooms: 2, bathrooms: 1, sqft: 850, rent: 1500, status: 'occupied' as UnitStatus, tenant: 'Sarah Johnson' },
  { id: '2', unitNumber: '102', bedrooms: 1, bathrooms: 1, sqft: 650, rent: 1100, status: 'vacant' as UnitStatus },
  { id: '3', unitNumber: '103', bedrooms: 3, bathrooms: 2, sqft: 1200, rent: 2200, status: 'occupied' as UnitStatus, tenant: 'Michael Brown' },
  { id: '4', unitNumber: '201', bedrooms: 2, bathrooms: 2, sqft: 950, rent: 1700, status: 'maintenance' as UnitStatus },
  { id: '5', unitNumber: '202', bedrooms: 2, bathrooms: 1, sqft: 850, rent: 1500, status: 'occupied' as UnitStatus, tenant: 'Emma Wilson' },
  { id: '6', unitNumber: '203', bedrooms: 1, bathrooms: 1, sqft: 650, rent: 1100, status: 'occupied' as UnitStatus, tenant: 'David Lee' },
];

// Mock recent activity
const mockActivity = [
  { id: '1', type: 'payment', description: 'Rent payment received from Sarah Johnson', date: '2 hours ago' },
  { id: '2', type: 'maintenance', description: 'Maintenance completed for Unit 201', date: '1 day ago' },
  { id: '3', type: 'lease', description: 'New lease signed for Unit 102', date: '3 days ago' },
  { id: '4', type: 'tenant', description: 'New tenant moved into Unit 305', date: '5 days ago' },
];

const getPropertyTypeBadge = (type: PropertyType) => {
  const styles = {
    apartment: 'bg-info/10 text-info border-info/20',
    house: 'bg-success/10 text-success border-success/20',
    commercial: 'bg-accent/10 text-accent border-accent/20',
    mixed: 'bg-primary/10 text-primary border-primary/20',
  };
  return styles[type];
};

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

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const property = mockProperty;

  const occupancyRate = Math.round((property.occupiedUnits / property.totalUnits) * 100);
  const vacantUnits = property.totalUnits - property.occupiedUnits;
  const monthlyRevenue = mockPropertyUnits
    .filter(u => u.status === 'occupied')
    .reduce((sum, u) => sum + u.rent, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/properties')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
              <Badge className={getPropertyTypeBadge(property.type)}>
                {property.type}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>{property.address}, {property.city}, {property.state} {property.zipCode}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              <DropdownMenuItem>Generate Report</DropdownMenuItem>
              <DropdownMenuItem>Export Data</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete Property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Units</p>
                <p className="text-2xl font-bold text-foreground">{property.totalUnits}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Home className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold text-foreground">{occupancyRate}%</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
            <Progress value={occupancyRate} className="mt-3 h-2" />
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vacant Units</p>
                <p className="text-2xl font-bold text-foreground">{vacantUnits}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Building2 className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-foreground">${monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="units" className="space-y-4">
        <TabsList>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Property Units</h2>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockPropertyUnits.map((unit) => (
              <Link to={`/units/${unit.id}`} key={unit.id}>
                <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">Unit {unit.unitNumber}</h3>
                        <p className="text-sm text-muted-foreground">
                          {unit.bedrooms} bed • {unit.bathrooms} bath • {unit.sqft} sqft
                        </p>
                      </div>
                      {getStatusBadge(unit.status)}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-semibold text-foreground">${unit.rent.toLocaleString()}/mo</span>
                      {unit.tenant && (
                        <span className="text-sm text-muted-foreground">{unit.tenant}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <Card className="card-shadow-md">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {mockActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'payment' ? 'bg-success/10' :
                      activity.type === 'maintenance' ? 'bg-warning/10' :
                      activity.type === 'lease' ? 'bg-info/10' : 'bg-primary/10'
                    }`}>
                      {activity.type === 'payment' && <DollarSign className="h-4 w-4 text-success" />}
                      {activity.type === 'maintenance' && <Wrench className="h-4 w-4 text-warning" />}
                      {activity.type === 'lease' && <Calendar className="h-4 w-4 text-info" />}
                      {activity.type === 'tenant' && <Users className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Documents</h2>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
          <Card className="card-shadow-md">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No documents uploaded yet</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
