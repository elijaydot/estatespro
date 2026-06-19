import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  Wrench,
  FileText,
  Loader2,
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { toast } from '@/components/ui/use-toast';
import { useProperty, useUpdateProperty, useDeleteProperty, type Property } from '@/hooks/useProperties';
import { useUnits, type Unit } from '@/hooks/useUnits';
import { useSettings } from '@/contexts/useSettings';
import { PhotoGallery } from '@/components/ui/photo-gallery';
import { GenerateDescriptionButton } from '@/components/ai/GenerateDescriptionButton';

type PropertyWithImages = Property & {
  image_urls?: string[] | null;
};

type UnitRow = Unit;

const propertyTypeOptions = [
  { value: 'apartment', label: 'Apartment', description: 'Multi-unit residential building' },
  { value: 'house', label: 'House', description: 'Single family home' },
  { value: 'commercial', label: 'Commercial', description: 'Office or retail space' },
  { value: 'mixed', label: 'Mixed Use', description: 'Residential and commercial' },
  { value: 'short_let', label: 'Short Let', description: 'Airbnb-style short-term rental' },
];

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

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();

  const { data: property, isLoading } = useProperty(id || '');
  const { data: allUnits = [] } = useUnits(id);
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const propertyWithImages = property as PropertyWithImages | undefined;
  const unitRows = allUnits as UnitRow[];

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'apartment',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    total_units: 1,
    occupied_units: 0,
    description: '',
    image_url: '',
    image_urls: [] as string[],
  });

  // Populate form when property data loads
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || '',
        type: property.type || 'apartment',
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zip_code: property.zip_code || '',
        country: property.country || '',
        total_units: property.total_units || 1,
        occupied_units: property.occupied_units || 0,
        description: property.description || '',
        image_url: property.image_url || '',
        image_urls: propertyWithImages?.image_urls || [],
      });
    }
  }, [property, propertyWithImages]);

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

  const handleSave = async () => {
    if (!id) return;
    
    await updateProperty.mutateAsync({
      id,
      name: formData.name,
      type: formData.type,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zip_code,
      country: formData.country,
      total_units: formData.total_units,
      occupied_units: formData.occupied_units,
      description: formData.description || null,
      image_url: formData.image_urls[0] || formData.image_url || null,
      image_urls: formData.image_urls,
    });
    closeEdit();
  };

  const handleDelete = async () => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this property?')) {
      await deleteProperty.mutateAsync(id);
      navigate('/properties');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Property not found</p>
        <Button variant="outline" onClick={() => navigate('/properties')}>
          Back to Properties
        </Button>
      </div>
    );
  }

  const occupancyRate = property.total_units > 0 
    ? Math.round((property.occupied_units / property.total_units) * 100) 
    : 0;
  const vacantUnits = property.total_units - property.occupied_units;
  const monthlyRevenue = unitRows
    .filter((u) => u.status === 'occupied')
    .reduce((sum, u) => sum + (u.rent_amount || 0), 0);

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
              <Badge className={getPropertyTypeBadge(property.type)}>{property.type}</Badge>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>
                {property.address}, {property.city}, {property.state} {property.zip_code}
              </span>
            </div>
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
                  navigate('/units?add=true');
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Unit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
              >
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
                <p className="text-2xl font-bold text-foreground">{property.total_units}</p>
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
                <p className="text-2xl font-bold text-foreground">{formatCurrency(monthlyRevenue)}</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Gallery */}
      {((propertyWithImages?.image_urls?.length ?? 0) > 0 || property.image_url) && (
        <PhotoGallery 
          images={(propertyWithImages?.image_urls?.length ?? 0) > 0 
            ? propertyWithImages?.image_urls || []
            : property.image_url ? [property.image_url] : []} 
        />
      )}

      {/* Description */}
      {property.description && (
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{property.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="units" className="space-y-4">
        <TabsList>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Property Units</h2>
            <Button className="gap-2" onClick={() => navigate('/units?add=true')}>
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          </div>
          {allUnits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unitRows.map((unit) => (
                <Link to={`/units/${unit.id}`} key={unit.id}>
                  <Card className="card-shadow-md hover:card-shadow-lg transition-all cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">Unit {unit.unit_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {unit.bedrooms} bed • {unit.bathrooms} bath • {unit.sqft} sqft
                          </p>
                        </div>
                        {getStatusBadge(unit.status)}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="font-semibold text-foreground">{formatCurrency(unit.rent_amount)}/mo</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="card-shadow-md">
              <CardContent className="py-12 text-center">
                <Home className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No units added yet</p>
                <Button className="mt-4 gap-2" onClick={() => navigate('/units?add=true')}>
                  <Plus className="h-4 w-4" />
                  Add Unit
                </Button>
              </CardContent>
            </Card>
          )}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>Update all property details below.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Property Photos (up to 10)</Label>
              <MultiImageUpload
                values={formData.image_urls}
                onChange={(urls) => setFormData({ ...formData, image_urls: urls, image_url: urls[0] || '' })}
                folder="properties"
                maxImages={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="propertyName">Property Name *</Label>
                <Input 
                  id="propertyName" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sunset Apartments" 
                />
              </div>
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="propertyAddress">Street Address *</Label>
              <Input 
                id="propertyAddress" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="propertyCity">City *</Label>
                <Input 
                  id="propertyCity" 
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Kigali" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="propertyState">Region/State *</Label>
                <Input 
                  id="propertyState" 
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Kigali City" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="propertyZip">Postal/Zip Code</Label>
                <Input 
                  id="propertyZip" 
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="00000" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="propertyCountry">Country *</Label>
                <Input 
                  id="propertyCountry" 
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Rwanda" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="propertyTotalUnits">Total Units</Label>
                <Input 
                  id="propertyTotalUnits" 
                  type="number" 
                  value={formData.total_units}
                  onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 0 })}
                  min="0" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="propertyOccupiedUnits">Occupied Units</Label>
                <Input 
                  id="propertyOccupiedUnits" 
                  type="number" 
                  value={formData.occupied_units}
                  onChange={(e) => setFormData({ ...formData, occupied_units: parseInt(e.target.value) || 0 })}
                  min="0" 
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="propertyDesc">Description</Label>
                <GenerateDescriptionButton
                  type="property"
                  data={formData}
                  onGenerated={(desc) => setFormData({ ...formData, description: desc })}
                />
              </div>
              <Textarea 
                id="propertyDesc" 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4} 
                placeholder="Describe the property, its amenities, location benefits, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateProperty.isPending}>
              {updateProperty.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
