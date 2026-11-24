import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search, 
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
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { toast } from '@/components/ui/use-toast';
import { useProperties, useCreateProperty, useDeleteProperty, type Property } from '@/hooks/useProperties';
import { useSettings } from '@/contexts/useSettings';
import { useI18n } from '@/contexts/useI18n';
import { AddPropertyWizard } from '@/components/properties/AddPropertyWizard';
import { EditPropertyModal } from '@/components/properties/EditPropertyModal';
import { calculatePropertyCompleteness } from '@/lib/propertyProfileCompleteness';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyPreviewCard } from '@/components/forms/PropertyPreviewCard';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';
import {
  PageContainer,
  PageHeader,
  PageActions,
} from '@/design-system/LayoutFramework';
import { StandardTable } from '@/design-system/components/StandardTable';

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

const getPropertyTypeVariant = (type: string) => {
  const variants: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
    apartment: 'info',
    house: 'success',
    commercial: 'warning',
    mixed: 'neutral',
    short_let: 'warning',
  };
  return variants[type] || 'neutral';
};

export default function Properties() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const { isSuperAdmin } = useUserRole();
  const { t } = useI18n();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-properties') as ViewMode) || 'cards');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('estatepro-view-properties', view);
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
  const confirmAction = useConfirmAction();
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const filteredProperties = properties.filter((property) => {
    if (selectedOrgFilter !== 'all' && property.company_id !== selectedOrgFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (property.name || '').toLowerCase().includes(q) ||
      (property.address || '').toLowerCase().includes(q) ||
      (property.city || '').toLowerCase().includes(q) ||
      (property.companies?.name || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedOrgFilter, pageSize]);

  const paginatedProperties = filteredProperties.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async () => {
    if (!formData.name || !formData.address || !formData.city) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const payload: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
      ...formData, 
      occupied_units: 0,
      description: formData.description || null,
      image_url: formData.image_urls[0] || formData.image_url || null,
      image_urls: formData.image_urls,
    };

    await createProperty.mutateAsync(payload);
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

  const handleDelete = async (property: Property) => {
    const confirmed = await confirmAction({
      title: 'Delete property?',
      description: `Delete "${property.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete property',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteProperty.mutateAsync(property.id);
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* Page Header */}
      <PageHeader
        title={t('properties', 'Properties')}
        description={t('page_properties_subtitle', 'Manage your physical estate portfolio, buildings, and community assets.')}
        actions={
          <PageActions>
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 text-xs"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('action_add_property', 'Add Property')}
            </Button>
          </PageActions>
        }
      />

      {/* Filters & View Switcher */}
      <FilterBar className="animate-fade-in flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('page_properties_search', 'Search properties by name, city, or company...')}
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
      {!isLoading && view === 'cards' && paginatedProperties.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedProperties.map((property, index: number) => (
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
                  <StatusPill
                    variant={getPropertyTypeVariant(property.type)}
                    className="absolute right-3 top-3 capitalize"
                  >
                    {property.type}
                  </StatusPill>
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
                      {property.companies?.name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary border border-primary/20 mt-2 font-medium">
                          🏢 {property.companies.name}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            calculatePropertyCompleteness(property).score >= 80
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          )}
                        >
                          {calculatePropertyCompleteness(property).score}% Complete
                        </span>
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
                          <Eye className="h-4 w-4 mr-2" /> {t('action_view_details', 'View Details')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setEditingProperty(property);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit Asset Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => handleDelete(property)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> {t('btn_delete', 'Delete')}
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
                      <span className="text-sm font-medium">{property.total_units} {t('unit_plural', 'units')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className={`text-sm font-medium ${getOccupancyColor(property.occupied_units, property.total_units)}`}>
                        {property.total_units > 0 
                          ? Math.round((property.occupied_units / property.total_units) * 100) 
                          : 0}% {t('stat_occupied', 'occupied')}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredProperties.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 2. Compact / List View */}
      {!isLoading && view === 'compact' && paginatedProperties.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedProperties.map((property) => {
              const occRate = property.total_units > 0 ? Math.round((property.occupied_units / property.total_units) * 100) : 0;
              return (
                <div key={property.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {property.image_url ? (
                        <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground truncate cursor-pointer hover:underline" onClick={() => navigate(`/properties/${property.id}`)}>
                          {property.name}
                        </span>
                        <StatusPill variant={getPropertyTypeVariant(property.type)} className="capitalize text-xs">
                          {property.type}
                        </StatusPill>
                        {property.companies?.name && (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            🏢 {property.companies.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 inline shrink-0" />
                        {property.address}, {property.city}, {property.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right min-w-[90px]">
                      <p className="text-xs text-muted-foreground">{property.total_units} units</p>
                      <p className={`text-xs font-semibold ${getOccupancyColor(property.occupied_units, property.total_units)}`}>
                        {occRate}% occupied
                      </p>
                    </div>

                    <div className="w-24 hidden md:block">
                      <Progress value={occRate} className="h-2" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/properties/${property.id}`)}>
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/properties/${property.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> {t('action_view_details', 'View Details')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setEditingProperty(property)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Asset Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(property)}>
                            <Trash2 className="h-4 w-4 mr-2" /> {t('btn_delete', 'Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredProperties.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 3. Table View */}
      {!isLoading && view === 'table' && paginatedProperties.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="min-w-[200px]">{t('th_property', 'Property')}</TableHead>
                  <TableHead>{t('th_company', 'Organization')}</TableHead>
                  <TableHead>{t('th_type', 'Type')}</TableHead>
                  <TableHead>{t('th_location', 'Location')}</TableHead>
                  <TableHead className="text-center">{t('units', 'Units')}</TableHead>
                  <TableHead className="min-w-[140px]">{t('th_occupancy', 'Occupancy')}</TableHead>
                  <TableHead className="text-right">{t('th_actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProperties.map((property) => {
                  const occRate = property.total_units > 0 ? Math.round((property.occupied_units / property.total_units) * 100) : 0;
                  return (
                    <TableRow key={property.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {property.image_url ? (
                              <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <span
                              className="font-medium text-foreground cursor-pointer hover:underline"
                              onClick={() => navigate(`/properties/${property.id}`)}
                            >
                              {property.name}
                            </span>
                            <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                              {property.address}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {property.companies?.name ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                            🏢 {property.companies.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={getPropertyTypeVariant(property.type)} className="capitalize text-xs whitespace-nowrap">
                          {property.type}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {property.city}, {property.state || property.country}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {property.total_units}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{property.occupied_units}/{property.total_units} occ</span>
                            <span className={`font-semibold ${getOccupancyColor(property.occupied_units, property.total_units)}`}>{occRate}%</span>
                          </div>
                          <Progress value={occRate} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => navigate(`/properties/${property.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> {t('action_view_details', 'View Details')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditingProperty(property)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit Asset Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(property)}>
                              <Trash2 className="h-4 w-4 mr-2" /> {t('btn_delete', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredProperties.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProperties.length === 0 && (
        <EmptyState
          icon={Building2}
          title={t('empty_no_records', 'No properties found')}
          description={t('empty_search_prompt', 'Try adjusting your search or add a new property.')}
          action={<Button onClick={() => setIsAddDialogOpen(true)}><Plus className="h-4 w-4" />{t('action_add_property', 'Add Property')}</Button>}
        />
      )}

      {/* 7-Step Add Property Onboarding Wizard */}
      <AddPropertyWizard
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={(newProp) => {
          navigate(`/properties/${newProp.id}`);
        }}
      />

      {/* Section-based Edit Property Modal */}
      <EditPropertyModal
        property={editingProperty}
        open={Boolean(editingProperty)}
        onOpenChange={(open) => !open && setEditingProperty(null)}
      />
    </PageContainer>
  );
}
