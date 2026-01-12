import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Bed,
  Bath,
  Square,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  User,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitStatus } from '@/types';

interface UnitRow {
  id: string;
  unitNumber: string;
  property: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent: number;
  status: UnitStatus;
  tenant?: string;
}

const mockUnits: UnitRow[] = [
  {
    id: '1',
    unitNumber: '101',
    property: 'Sunset Apartments',
    floor: 1,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 850,
    rent: 1500,
    status: 'occupied',
    tenant: 'Sarah Johnson',
  },
  {
    id: '2',
    unitNumber: '204',
    property: 'Sunset Apartments',
    floor: 2,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1200,
    rent: 2200,
    status: 'occupied',
    tenant: 'Michael Brown',
  },
  {
    id: '3',
    unitNumber: '305',
    property: 'Sunset Apartments',
    floor: 3,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 650,
    rent: 1100,
    status: 'vacant',
  },
  {
    id: '4',
    unitNumber: '412',
    property: 'Oak Ridge Complex',
    floor: 4,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1050,
    rent: 1800,
    status: 'maintenance',
  },
  {
    id: '5',
    unitNumber: '501',
    property: 'Riverside Heights',
    floor: 5,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    rent: 2800,
    status: 'occupied',
    tenant: 'Emma Wilson',
  },
  {
    id: '6',
    unitNumber: '108',
    property: 'Oak Ridge Complex',
    floor: 1,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 600,
    rent: 950,
    status: 'vacant',
  },
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

export default function Units() {
  const navigate = useNavigate();
  const [units] = useState<UnitRow[]>(mockUnits);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredUnits = units.filter(unit =>
    unit.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.tenant?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Units</h1>
          <p className="text-muted-foreground">
            Manage individual units across all properties
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
              <DialogDescription>
                Create a new unit for a property. You can assign tenants later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="property">Property</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunset">Sunset Apartments</SelectItem>
                      <SelectItem value="oakridge">Oak Ridge Complex</SelectItem>
                      <SelectItem value="riverside">Riverside Heights</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unitNumber">Unit Number</Label>
                  <Input id="unitNumber" placeholder="e.g., 101" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input id="floor" type="number" placeholder="1" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input id="bedrooms" type="number" placeholder="2" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input id="bathrooms" type="number" placeholder="1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sqft">Square Footage</Label>
                  <Input id="sqft" type="number" placeholder="850" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rent">Monthly Rent ($)</Label>
                  <Input id="rent" type="number" placeholder="1500" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Create Unit
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
            placeholder="Search units..."
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

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map((unit, index) => (
          <Card
            key={unit.id}
            className="p-5 card-shadow-md hover:card-shadow-lg transition-all duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Unit {unit.unitNumber}</h3>
                  <p className="text-sm text-muted-foreground">{unit.property}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        navigate(`/units/${unit.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        navigate(`/units/${unit.id}?edit=true`);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Edit Unit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Unit Details */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Bed className="h-4 w-4" />
                <span>{unit.bedrooms} bed</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Bath className="h-4 w-4" />
                <span>{unit.bathrooms} bath</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Square className="h-4 w-4" />
                <span>{unit.sqft} sqft</span>
              </div>
            </div>

            {/* Rent & Status */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">${unit.rent.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              {getStatusBadge(unit.status)}
            </div>

            {/* Tenant Info */}
            {unit.tenant && (
              <div className="mt-3 p-3 rounded-lg bg-secondary/50 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{unit.tenant}</span>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No units found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or add a new unit.
          </p>
        </div>
      )}
    </div>
  );
}
