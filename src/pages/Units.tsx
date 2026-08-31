import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  Search, 
  MoreHorizontal,
  Bed,
  Bath,
  Square,
  Edit,
  Trash2,
  Eye,
  User,
  Loader2,
  Store,
} from 'lucide-react';
import { CreateListingFlow } from '@/components/marketplace-crm/CreateListingFlow';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { toast } from '@/components/ui/use-toast';
import { useUnits, useCreateUnit, useDeleteUnit, type Unit } from '@/hooks/useUnits';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useSettings } from '@/contexts/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnitPreviewCard } from '@/components/forms/UnitPreviewCard';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';

type UnitTenant = {
  id: string;
  name: string | null;
};

type UnitRow = Unit & {
  properties?: {
    id: string;
    name: string;
    company_id?: string;
    companies?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
  tenants?: UnitTenant[] | null;
};

const statusOptions = [
  { value: 'vacant', label: 'Vacant', description: 'Available for rent' },
  { value: 'occupied', label: 'Occupied', description: 'Currently rented' },
  { value: 'maintenance', label: 'Under Maintenance', description: 'Not available' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'occupied':
      return <StatusPill variant="info">Occupied</StatusPill>;
    case 'vacant':
      return <StatusPill variant="success">Vacant</StatusPill>;
    case 'maintenance':
      return <StatusPill variant="warning">Maintenance</StatusPill>;
    default:
      return null;
  }
};

export default function Units() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { isSuperAdmin } = useUserRole();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-units') as ViewMode) || 'cards');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [listingUnitId, setListingUnitId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('estatepro-view-units', view);
  }, [view]);

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
    image_urls: [] as string[],
  });

  const { data: units = [], isLoading } = useUnits();
  const { data: properties = [] } = useProperties();
  const createUnit = useCreateUnit();
  const deleteUnit = useDeleteUnit();
  const confirmAction = useConfirmAction();

  const propertyOptions = properties.map((property) => ({
    value: property.id,
    label: property.name,
    description: `${property.city}, ${property.state}`,
  }));

  const filteredUnits = (units as UnitRow[]).filter((unit) => {
    const unitCompanyId = unit.properties?.company_id || unit.properties?.companies?.id;
    if (selectedOrgFilter !== 'all' && unitCompanyId && unitCompanyId !== selectedOrgFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (unit.unit_number || '').toLowerCase().includes(q) ||
      (unit.properties?.name || '').toLowerCase().includes(q) ||
      (unit.properties?.companies?.name || '').toLowerCase().includes(q) ||
      (unit.tenants && unit.tenants.some((t) => (t.name || '').toLowerCase().includes(q)))
    );
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedOrgFilter, pageSize]);

  const paginatedUnits = filteredUnits.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async () => {
    if (!formData.property_id || !formData.unit_number || !formData.rent_amount) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const payload: Omit<Unit, 'id' | 'created_at' | 'updated_at'> = {
      ...formData,
      image_url: formData.image_urls[0] || formData.image_url || null,
      image_urls: formData.image_urls,
      sqft: formData.sqft || null,
      description: formData.description || null,
    };

    await createUnit.mutateAsync(payload);
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
      image_urls: [],
    });
  };

  const handleDelete = async (unit: UnitRow) => {
    const confirmed = await confirmAction({
      title: 'Delete unit?',
      description: `Delete Unit ${unit.unit_number}? This action cannot be undone.`,
      confirmLabel: 'Delete unit',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteUnit.mutateAsync(unit.id);
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

      {/* Filters & View Toggle */}
      <FilterBar className="animate-fade-in flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search units by number, property, company, or tenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isSuperAdmin && companiesList.length > 0 && (
            <div className="w-full sm:w-auto min-w-[220px]">
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Organizations (Global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Organizations (Global)</SelectItem>
                  {companiesList.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <ViewToggle view={view} onViewChange={setView} />
      </FilterBar>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* 1. Cards / Grid View */}
      {!isLoading && view === 'cards' && paginatedUnits.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedUnits.map((unit, index: number) => (
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
                      {unit.properties?.companies?.name && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 mt-1 font-medium">
                          🏢 {unit.properties.companies.name}
                        </span>
                      )}
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
                      {unit.status === 'vacant' && (
                        <DropdownMenuItem onSelect={() => setListingUnitId(unit.id)}>
                          <Store className="h-4 w-4 mr-2" /> Publish to marketplace
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => handleDelete(unit)}
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
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredUnits.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 2. Compact / List View */}
      {!isLoading && view === 'compact' && paginatedUnits.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedUnits.map((unit) => (
              <div key={unit.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate cursor-pointer hover:underline" onClick={() => navigate(`/units/${unit.id}`)}>
                        Unit {unit.unit_number}
                      </span>
                      {getStatusBadge(unit.status)}
                      {unit.properties?.companies?.name && (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          🏢 {unit.properties.companies.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {unit.properties?.name || 'No property'} • {unit.bedrooms} Bed • {unit.bathrooms} Bath {unit.sqft ? `• ${unit.sqft} sqft` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-foreground text-sm">
                      {formatCurrency(unit.rent_amount)}
                      <span className="text-xs text-muted-foreground font-normal">/mo</span>
                    </p>
                    {unit.tenants && unit.tenants.length > 0 ? (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <User className="h-3 w-3" /> {unit.tenants[0]?.name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Vacant</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/units/${unit.id}`)}>
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => navigate(`/units/${unit.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(`/units/${unit.id}?edit=true`)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Unit
                        </DropdownMenuItem>
                        {unit.status === 'vacant' && (
                          <DropdownMenuItem onSelect={() => setListingUnitId(unit.id)}>
                            <Store className="h-4 w-4 mr-2" /> Publish to marketplace
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(unit)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredUnits.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 3. Table View */}
      {!isLoading && view === 'table' && paginatedUnits.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Unit #</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnits.map((unit) => (
                  <TableRow key={unit.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span
                        className="font-medium text-foreground cursor-pointer hover:underline flex items-center gap-1.5"
                        onClick={() => navigate(`/units/${unit.id}`)}
                      >
                        <Home className="h-4 w-4 text-primary" />
                        Unit {unit.unit_number}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {unit.properties?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {unit.properties?.companies?.name ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                          🏢 {unit.properties.companies.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {unit.bedrooms} bed • {unit.bathrooms} bath {unit.sqft ? `• ${unit.sqft} sqft` : ''}
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {formatCurrency(unit.rent_amount)}
                      <span className="text-xs text-muted-foreground font-normal">/mo</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {unit.tenants && unit.tenants.length > 0 ? (
                        <span className="flex items-center gap-1 text-primary">
                          <User className="h-3.5 w-3.5" /> {unit.tenants[0]?.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None (Vacant)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(unit.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/units/${unit.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`/units/${unit.id}?edit=true`)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Unit
                          </DropdownMenuItem>
                          {unit.status === 'vacant' && (
                            <DropdownMenuItem onSelect={() => setListingUnitId(unit.id)}>
                              <Store className="h-4 w-4 mr-2" /> Publish to marketplace
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(unit)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredUnits.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredUnits.length === 0 && (
        <EmptyState
          icon={Home}
          title="No units found"
          description="Try adjusting your search or add a new unit."
          action={<Button onClick={() => setIsAddDialogOpen(true)}><Plus className="h-4 w-4" />Add Unit</Button>}
        />
      )}

      <CreateListingFlow companyId={activeCompanyId} open={Boolean(listingUnitId)} onOpenChange={(open) => { if (!open) setListingUnitId(null); }} initialUnitId={listingUnitId} />

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
              <Label>Unit Photos (up to 10)</Label>
              <MultiImageUpload
                values={formData.image_urls}
                onChange={(urls) => setFormData({ ...formData, image_urls: urls, image_url: urls[0] || '' })}
                folder="units"
                maxImages={10}
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
