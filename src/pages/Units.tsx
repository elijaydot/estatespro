import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Bed,
  Bath,
  Square,
  Edit,
  Trash2,
  Eye,
  User,
  Loader2,
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from '@/components/ui/use-toast';
import { useUnits, useCreateUnit, useDeleteUnit } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useSettings } from '@/contexts/SettingsContext';
import { UnitPreviewCard } from '@/components/forms/UnitPreviewCard';

const statusOptions = [
  { value: 'vacant', label: 'Vacant', description: 'Available for rent' },
  { value: 'occupied', label: 'Occupied', description: 'Currently rented' },
  { value: 'maintenance', label: 'Under Maintenance', description: 'Not available' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'occupied':
      return <Badge className="bg-info/10 text-info border-info/20">Occupied</Badge>;
    case 'vacant':
      return <Badge className="bg-success/10 text-success border-success/20">Vacant</Badge>;
    case 'maintenance':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Maintenance</Badge>;
    default:
      return null;
  }
};

export default function Units() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Handle ?add=true query parameter from Quick Add
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddDialogOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [formData, setFormData] = useState({
    property_id: '',
    unit_number: '',
    floor: 1,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 0,
    rent_amount: 0,
    status: 'vacant',
    description: '',
    image_url: '',
  });

  const { data: units = [], isLoading } = useUnits();
  const { data: properties = [] } = useProperties();
  const createUnit = useCreateUnit();
  const deleteUnit = useDeleteUnit();

  const propertyOptions = properties.map((property: any) => ({
    value: property.id,
    label: property.name,
    description: `${property.city}, ${property.state}`,
  }));

  const filteredUnits = units.filter((unit: any) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (unit.unit_number || '').toLowerCase().includes(q) ||
      (unit.properties?.name || '').toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!formData.property_id || !formData.unit_number) {
      toast({ title: 'Error', description: 'Property and Unit Number are required', variant: 'destructive' });
      return;
    }

    await createUnit.mutateAsync({ 
      ...formData, 
      amenities: [],
      image_url: formData.image_url || null,
    });
    setIsAddDialogOpen(false);
    setFormData({
      property_id: '',
      unit_number: '',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 0,
      rent_amount: 0,
      status: 'vacant',
      description: '',
      image_url: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      await deleteUnit.mutateAsync(id);
    }
  };

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
        <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Unit
        </Button>
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Units Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnits.map((unit: any, index: number) => (
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
                    <h3 className="font-semibold text-foreground">Unit {unit.unit_number}</h3>
                    <p className="text-sm text-muted-foreground">{unit.properties?.name || 'No property'}</p>
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
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => handleDelete(unit.id)}
                    >
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
                <span className="font-semibold text-foreground">
                  {formatCurrency(unit.rent_amount)}
                  <span className="text-sm text-muted-foreground font-normal">/mo</span>
                </span>
                {getStatusBadge(unit.status)}
              </div>

              {/* Tenant Info */}
              {unit.tenants && unit.tenants.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-secondary/50 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{unit.tenants[0]?.name}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No units found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or add a new unit.
          </p>
        </div>
      )}

      {/* Add Unit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
            <DialogDescription>
              Create a new unit for a property. You can assign tenants later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Unit Image</Label>
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                folder="units"
                placeholder="Upload unit image"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Property *</Label>
                <SearchableSelect
                  options={propertyOptions}
                  value={formData.property_id}
                  onValueChange={(value) => setFormData({ ...formData, property_id: value })}
                  placeholder="Select property..."
                  searchPlaceholder="Search properties..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitNumber">Unit Number *</Label>
                <Input
                  id="unitNumber"
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="e.g., 101"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 1 })}
                  min={0}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 1 })}
                  min={0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sqft">Square Footage</Label>
                <Input
                  id="sqft"
                  type="number"
                  value={formData.sqft}
                  onChange={(e) => setFormData({ ...formData, sqft: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rent">Monthly Rent</Label>
                <Input
                  id="rent"
                  type="number"
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({ ...formData, rent_amount: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <SearchableSelect
                options={statusOptions}
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                placeholder="Select status..."
                searchPlaceholder="Search status..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createUnit.isPending}>
              {createUnit.isPending ? 'Creating...' : 'Create Unit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
