import { useState, useEffect } from 'react';
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
  Loader2,
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/use-toast';
import { useUnit, useUpdateUnit, useDeleteUnit } from '@/hooks/useUnits';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useSettings } from '@/contexts/SettingsContext';
import { useTenants } from '@/hooks/useTenants';
import { PhotoGallery } from '@/components/ui/photo-gallery';

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
  const { formatCurrency } = useSettings();
  
  const { data: unit, isLoading } = useUnit(id || '');
  const { data: maintenanceRequests = [] } = useMaintenanceRequests();
  const { data: tenants = [] } = useTenants();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  // Form state for editing
  const [formData, setFormData] = useState({
    unit_number: '',
    floor: 1,
    status: 'vacant',
    bedrooms: 1,
    bathrooms: 1,
    sqft: 0,
    rent_amount: 0,
    amenities: '',
    description: '',
  });

  // Populate form when unit data loads
  useEffect(() => {
    if (unit) {
      setFormData({
        unit_number: unit.unit_number || '',
        floor: unit.floor || 1,
        status: unit.status || 'vacant',
        bedrooms: unit.bedrooms || 1,
        bathrooms: unit.bathrooms || 1,
        sqft: unit.sqft || 0,
        rent_amount: unit.rent_amount || 0,
        amenities: unit.amenities?.join(', ') || '',
        description: unit.description || '',
      });
    }
  }, [unit]);

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
    
    await updateUnit.mutateAsync({
      id,
      unit_number: formData.unit_number,
      floor: formData.floor,
      status: formData.status,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      sqft: formData.sqft,
      rent_amount: formData.rent_amount,
      amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean),
      description: formData.description || null,
    });
    closeEdit();
  };

  const handleDelete = async () => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this unit?')) {
      await deleteUnit.mutateAsync(id);
      navigate('/units');
    }
  };

  // Filter maintenance for this unit
  const unitMaintenance = maintenanceRequests.filter((m: any) => m.unit_id === id);
  
  // Find tenant for this unit
  const unitTenant = tenants.find((t: any) => t.unit_id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Home className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Unit not found</p>
        <Button variant="outline" onClick={() => navigate('/units')}>
          Back to Units
        </Button>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-foreground">Unit {unit.unit_number}</h1>
              {getStatusBadge(unit.status)}
            </div>
            <Link to={`/properties/${unit.property_id}`} className="text-muted-foreground hover:text-primary transition-colors">
              {unit.properties?.name || 'No property'}
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
                  navigate('/maintenance?add=true');
                }}
              >
                <Wrench className="h-4 w-4 mr-2" /> Create Maintenance Request
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  handleDelete();
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
            <p className="text-2xl font-bold text-foreground">{unit.sqft?.toLocaleString() || 0}</p>
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
            <p className="text-2xl font-bold text-foreground">{formatCurrency(unit.rent_amount)}</p>
            <p className="text-sm text-muted-foreground">Monthly Rent</p>
          </CardContent>
        </Card>
      </div>

      {/* Photo Gallery */}
      {((unit as any).image_urls?.length > 0 || unit.image_url) && (
        <PhotoGallery 
          images={(unit as any).image_urls?.length > 0 
            ? (unit as any).image_urls 
            : unit.image_url ? [unit.image_url] : []} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Description & Amenities */}
        <div className="space-y-6">
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{unit.description || 'No description available'}</p>
            </CardContent>
          </Card>

          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unit.amenities && unit.amenities.length > 0 ? (
                  unit.amenities.map((amenity: string, index: number) => (
                    <Badge key={index} variant="secondary" className="font-normal">
                      {amenity}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No amenities listed</p>
                )}
              </div>
            </CardContent>
          </Card>

          {unitTenant ? (
            <Card className="card-shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Current Tenant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link
                  to={`/tenants/${unitTenant.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{unitTenant.name}</p>
                    <p className="text-sm text-muted-foreground">{unitTenant.email}</p>
                  </div>
                </Link>
                {(unitTenant.move_in_date || unitTenant.lease_end_date) && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Move-in Date</p>
                      <p className="font-medium">{unitTenant.move_in_date || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lease Ends</p>
                      <p className="font-medium">{unitTenant.lease_end_date || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="card-shadow-md border-dashed">
              <CardContent className="py-8 text-center">
                <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">This unit is currently vacant</p>
                <Button className="gap-2" onClick={() => navigate('/tenants?add=true')}>
                  <Plus className="h-4 w-4" />
                  Add Tenant
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
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Maintenance History</CardTitle>
                  <Button variant="outline" className="gap-2" onClick={() => navigate('/maintenance?add=true')}>
                    <Wrench className="h-4 w-4" />
                    New Request
                  </Button>
                </CardHeader>
                <CardContent>
                  {unitMaintenance.length > 0 ? (
                    <div className="space-y-4">
                      {unitMaintenance.map((request: any) => (
                        <div key={request.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background">{getMaintenanceStatusIcon(request.status)}</div>
                            <div>
                              <p className="font-medium">{request.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-success/10 text-success border-success/20 capitalize">{request.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wrench className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No maintenance requests</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <Button variant="outline" className="gap-2">
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
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>Update all unit details below.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <h4 className="font-medium text-sm text-muted-foreground">Basic Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitNumber">Unit Number *</Label>
                <Input 
                  id="unitNumber" 
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="e.g., 101" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitFloor">Floor *</Label>
                <Input 
                  id="unitFloor" 
                  type="number" 
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                  min="0" 
                />
              </div>
              <div className="grid gap-2">
                <Label>Status *</Label>
                <SearchableSelect
                  options={statusOptions}
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  placeholder="Select status..."
                  searchPlaceholder="Search status..."
                />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground pt-2">Unit Specifications</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unitBeds">Bedrooms</Label>
                <Input 
                  id="unitBeds" 
                  type="number" 
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                  min="0" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitBaths">Bathrooms</Label>
                <Input 
                  id="unitBaths" 
                  type="number" 
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                  min="0" 
                  step="0.5" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitSqft">Square Feet</Label>
                <Input 
                  id="unitSqft" 
                  type="number" 
                  value={formData.sqft}
                  onChange={(e) => setFormData({ ...formData, sqft: parseInt(e.target.value) || 0 })}
                  min="0" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unitRent">Monthly Rent</Label>
                <Input 
                  id="unitRent" 
                  type="number" 
                  value={formData.rent_amount}
                  onChange={(e) => setFormData({ ...formData, rent_amount: parseInt(e.target.value) || 0 })}
                  min="0" 
                  step="0.01" 
                />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground pt-2">Amenities</h4>
            <div className="grid gap-2">
              <Label htmlFor="unitAmenities">Amenities (comma-separated)</Label>
              <Input 
                id="unitAmenities" 
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="Air Conditioning, Parking, Washer/Dryer, Balcony"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unitDesc">Description</Label>
              <Textarea 
                id="unitDesc" 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4} 
                placeholder="Describe the unit features, views, finishes, etc."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateUnit.isPending}>
              {updateUnit.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
