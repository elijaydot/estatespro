import { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  MapPin,
  Home,
  Users,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Property, PropertyType } from '@/types';

// Mock data
const mockProperties: Property[] = [
  {
    id: '1',
    workspaceId: 'ws-1',
    name: 'Sunset Apartments',
    address: '123 Sunset Boulevard',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90028',
    country: 'USA',
    type: 'apartment',
    description: 'Modern apartment complex with luxury amenities',
    images: [],
    totalUnits: 24,
    occupiedUnits: 21,
    createdAt: new Date(),
  },
  {
    id: '2',
    workspaceId: 'ws-1',
    name: 'Oak Ridge Complex',
    address: '456 Oak Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'USA',
    type: 'mixed',
    description: 'Mixed-use development with residential and commercial spaces',
    images: [],
    totalUnits: 48,
    occupiedUnits: 42,
    createdAt: new Date(),
  },
  {
    id: '3',
    workspaceId: 'ws-1',
    name: 'Riverside Heights',
    address: '789 River Road',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92101',
    country: 'USA',
    type: 'apartment',
    description: 'Waterfront living with stunning views',
    images: [],
    totalUnits: 36,
    occupiedUnits: 28,
    createdAt: new Date(),
  },
  {
    id: '4',
    workspaceId: 'ws-1',
    name: 'Downtown Business Center',
    address: '321 Commerce Ave',
    city: 'Sacramento',
    state: 'CA',
    zipCode: '95814',
    country: 'USA',
    type: 'commercial',
    description: 'Premium office and retail spaces',
    images: [],
    totalUnits: 18,
    occupiedUnits: 15,
    createdAt: new Date(),
  },
];

const getOccupancyColor = (occupied: number, total: number) => {
  const rate = (occupied / total) * 100;
  if (rate >= 90) return 'text-success';
  if (rate >= 70) return 'text-info';
  if (rate >= 50) return 'text-warning';
  return 'text-destructive';
};

const getPropertyTypeBadge = (type: PropertyType) => {
  const styles = {
    apartment: 'bg-info/10 text-info border-info/20',
    house: 'bg-success/10 text-success border-success/20',
    commercial: 'bg-accent/10 text-accent border-accent/20',
    mixed: 'bg-primary/10 text-primary border-primary/20',
  };
  return styles[type];
};

export default function Properties() {
  const [properties] = useState<Property[]>(mockProperties);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground">
            Manage your estates and properties
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
              <DialogDescription>
                Enter the details for the new property. You can add units after creating the property.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Property Name</Label>
                <Input id="name" placeholder="e.g., Sunset Apartments" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Property Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed">Mixed Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="units">Total Units</Label>
                  <Input id="units" type="number" placeholder="24" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Los Angeles" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="CA" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" placeholder="90028" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe the property..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Create Property
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
            placeholder="Search properties..."
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

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property, index) => (
          <Card
            key={property.id}
            className="overflow-hidden card-shadow-md hover:card-shadow-lg transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Property Image/Placeholder */}
            <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
              <Building2 className="h-16 w-16 text-primary/40" />
              <Badge
                className={`absolute top-3 right-3 ${getPropertyTypeBadge(property.type)}`}
              >
                {property.type}
              </Badge>
            </div>

            {/* Property Details */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {property.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{property.city}, {property.state}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" /> Edit Property
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {property.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{property.totalUnits} units</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-medium ${getOccupancyColor(property.occupiedUnits, property.totalUnits)}`}>
                    {Math.round((property.occupiedUnits / property.totalUnits) * 100)}% occupied
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No properties found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or add a new property.
          </p>
        </div>
      )}
    </div>
  );
}
