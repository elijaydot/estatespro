import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ImageUpload } from '@/components/ui/image-upload';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { toast } from '@/components/ui/use-toast';
import { useProperties, useCreateProperty, useDeleteProperty } from '@/hooks/useProperties';
import { useSettings } from '@/contexts/SettingsContext';
import { PropertyPreviewCard } from '@/components/forms/PropertyPreviewCard';

const propertyTypeOptions = [
  { value: 'apartment', label: 'Apartment', description: 'Multi-unit residential building' },
  { value: 'house', label: 'House', description: 'Single family home' },
  { value: 'commercial', label: 'Commercial', description: 'Office or retail space' },
  { value: 'mixed', label: 'Mixed Use', description: 'Residential and commercial' },
  { value: 'short_let', label: 'Short Let', description: 'Airbnb-style short-term rental' },
];

const getOccupancyColor = (occupied: number, total: number) => {
  if (total === 0) return 'text-muted-foreground';
  const rate = (occupied / total) * 100;
  if (rate >= 90) return 'text-success';
  if (rate >= 70) return 'text-info';
  if (rate >= 50) return 'text-warning';
  return 'text-destructive';
};

const getPropertyTypeBadge = (type: string) => {
  const styles: Record<string, string> = {
    apartment: 'bg-info/10 text-info border-info/20',
    house: 'bg-success/10 text-success border-success/20',
    commercial: 'bg-accent/10 text-accent border-accent/20',
    mixed: 'bg-primary/10 text-primary border-primary/20',
    short_let: 'bg-warning/10 text-warning border-warning/20',
  };
  return styles[type] || 'bg-muted text-muted-foreground';
};

export default function Properties() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
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
    name: '',
    type: 'apartment',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: settings.defaultCountry,
    description: '',
    total_units: 1,
    image_url: '',
    image_urls: [] as string[],
  });

  const { data: properties = [], isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();

  const filteredProperties = properties.filter((property: any) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (property.name || '').toLowerCase().includes(q) ||
      (property.address || '').toLowerCase().includes(q) ||
      (property.city || '').toLowerCase().includes(q)
    );
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.address || !formData.city) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    await createProperty.mutateAsync({ 
      ...formData, 
      occupied_units: 0,
      image_url: formData.image_urls[0] || formData.image_url || null,
      image_urls: formData.image_urls,
    } as any);
    setIsAddDialogOpen(false);
    setFormData({
      name: '',
      type: 'apartment',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: settings.defaultCountry,
      description: '',
      total_units: 1,
      image_url: '',
      image_urls: [],
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this property?')) {
      await deleteProperty.mutateAsync(id);
    }
  };

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
        <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Properties Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property: any, index: number) => (
            <Card
              key={property.id}
              className="overflow-hidden card-shadow-md hover:card-shadow-lg transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Property Image/Placeholder */}
              <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
                {property.image_url ? (
                  <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-16 w-16 text-primary/40" />
                )}
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
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          navigate(`/properties/${property.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          navigate(`/properties/${property.id}?edit=true`);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" /> Edit Property
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => handleDelete(property.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {property.description || 'No description available'}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{property.total_units} units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm font-medium ${getOccupancyColor(property.occupied_units, property.total_units)}`}>
                      {property.total_units > 0 
                        ? Math.round((property.occupied_units / property.total_units) * 100) 
                        : 0}% occupied
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No properties found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or add a new property.
          </p>
        </div>
      )}

      {/* Add Property Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>
              Enter the details for the new property. You can add units after creating the property.
            </DialogDescription>
          </DialogHeader>
          <div className="grid lg:grid-cols-2 gap-6 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Property Photos (up to 10)</Label>
                <MultiImageUpload
                  values={formData.image_urls}
                  onChange={(urls) => setFormData({ ...formData, image_urls: urls, image_url: urls[0] || '' })}
                  folder="properties"
                  maxImages={10}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Property Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sunset Apartments"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Property Type *</Label>
                  <SearchableSelect
                    options={propertyTypeOptions}
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                    placeholder="Select type..."
                    searchPlaceholder="Search types..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="units">Total Units</Label>
                  <Input
                    id="units"
                    type="number"
                    value={formData.total_units}
                    onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Kigali"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Kigali City"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="00000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Rwanda"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the property..."
                  rows={3}
                />
              </div>
            </div>
            <PropertyPreviewCard
              name={formData.name}
              type={formData.type}
              address={formData.address}
              city={formData.city}
              state={formData.state}
              zipCode={formData.zip_code}
              country={formData.country}
              totalUnits={formData.total_units}
              description={formData.description}
              imageUrl={formData.image_url}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createProperty.isPending}>
              {createProperty.isPending ? 'Creating...' : 'Create Property'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
