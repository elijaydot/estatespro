import { useState, useEffect, useMemo } from 'react';
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
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  ExternalLink,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { EditPropertyModal } from '@/components/properties/EditPropertyModal';
import { calculatePropertyCompleteness } from '@/lib/propertyProfileCompleteness';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
import { toast } from '@/components/ui/use-toast';
import { useProperty, useUpdateProperty, useDeleteProperty, type Property } from '@/hooks/useProperties';
import { useUnits, type Unit } from '@/hooks/useUnits';
import { useTenants, type Tenant } from '@/hooks/useTenants';
import { useMaintenanceRequests, type MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useInvoices, type Invoice } from '@/hooks/useInvoices';
import { useLeases, type Lease } from '@/hooks/useLeases';
import { useSettings } from '@/contexts/useSettings';
import { PhotoGallery } from '@/components/ui/photo-gallery';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import { PageContainer } from '@/design-system/LayoutFramework';

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
    apartment: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    house: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    commercial: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    mixed: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    short_let: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };
  return styles[type] || 'bg-muted text-muted-foreground';
};

const getUnitStatusBadge = (status: string) => {
  switch (status) {
    case 'occupied':
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs">Occupied</Badge>;
    case 'vacant':
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">Vacant</Badge>;
    case 'maintenance':
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">Maintenance</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

const getMaintenancePriorityBadge = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'urgent':
    case 'emergency':
      return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">Urgent</Badge>;
    case 'high':
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">High</Badge>;
    case 'medium':
      return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs">Medium</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Low</Badge>;
  }
};

const getInvoiceStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">Paid</Badge>;
    case 'pending':
    case 'open':
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">Pending</Badge>;
    case 'overdue':
      return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">Overdue</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();

  const { data: property, isLoading } = useProperty(id || '');
  const { data: allUnits = [] } = useUnits(id);
  const { data: allTenants = [] } = useTenants();
  const { data: allMaintenance = [] } = useMaintenanceRequests();
  const { data: allInvoices = [] } = useInvoices();
  const { data: allLeases = [] } = useLeases();

  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const confirmAction = useConfirmAction();
  const propertyWithImages = property as PropertyWithImages | undefined;
  const unitRows = allUnits as UnitRow[];

  const completeness = useMemo(
    () => (property ? calculatePropertyCompleteness(property) : null),
    [property]
  );

  // Form state for edit
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
    const confirmed = await confirmAction({
      title: 'Delete property?',
      description: `Delete "${property?.name || 'this property'}"? This action cannot be undone.`,
      confirmLabel: 'Delete property',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteProperty.mutateAsync(id);
    navigate('/properties');
  };

  // Associated Data Filters
  const unitIds = useMemo(() => new Set(unitRows.map((u) => u.id)), [unitRows]);

  const propertyTenants = useMemo(() => {
    return (allTenants as Tenant[]).filter((t) => {
      if (t.property_id && t.property_id === id) return true;
      if (t.unit_id && unitIds.has(t.unit_id)) return true;
      return false;
    });
  }, [allTenants, id, unitIds]);

  const propertyMaintenance = useMemo(() => {
    return (allMaintenance as MaintenanceRequest[]).filter((m) => {
      if (m.property_id && m.property_id === id) return true;
      if (m.unit_id && unitIds.has(m.unit_id)) return true;
      return false;
    });
  }, [allMaintenance, id, unitIds]);

  const propertyInvoices = useMemo(() => {
    return (allInvoices as Invoice[]).filter((inv) => {
      if (inv.property_id && inv.property_id === id) return true;
      if (inv.unit_id && unitIds.has(inv.unit_id)) return true;
      return false;
    });
  }, [allInvoices, id, unitIds]);

  // Health Metrics Calculations
  const totalUnits = property?.total_units || unitRows.length || 0;
  const occupiedUnits = unitRows.filter((u) => u.status === 'occupied').length || property?.occupied_units || 0;
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const monthlyRealizedRevenue = useMemo(() => {
    return unitRows
      .filter((u) => u.status === 'occupied')
      .reduce((sum, u) => sum + (u.rent_amount || 0), 0);
  }, [unitRows]);

  const potentialRevenue = useMemo(() => {
    return unitRows.reduce((sum, u) => sum + (u.rent_amount || 0), 0);
  }, [unitRows]);

  const totalInvoiced = useMemo(() => {
    return propertyInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [propertyInvoices]);

  const totalPaid = useMemo(() => {
    return propertyInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  }, [propertyInvoices]);

  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;
  const outstandingAmount = Math.max(0, totalInvoiced - totalPaid);

  const openMaintenanceCount = propertyMaintenance.filter(
    (m) => m.status === 'open' || m.status === 'in_progress' || m.status === 'pending'
  ).length;

  const overdueInvoicesCount = propertyInvoices.filter(
    (inv) => inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.due_date) < new Date())
  ).length;

  const openIssuesCount = openMaintenanceCount + overdueInvoicesCount;

  // Active images
  const propertyImages = (propertyWithImages?.image_urls?.length ?? 0) > 0
    ? propertyWithImages?.image_urls || []
    : property?.image_url ? [property.image_url] : [];

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

  return (
    <PageContainer maxWidth="7xl" className="space-y-8 pb-16">
      {/* 1. TOP SECTION: PROPERTY HERO */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-sm space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/properties')}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
              className="gap-2 text-xs"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Property
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/units?add=true&propertyId=${id}`)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Unit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/payments?record=true&propertyId=${id}`)}>
                  <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Property
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Hero Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Property Image / Photo Gallery */}
          <div className="lg:col-span-4 shrink-0">
            {propertyImages.length > 0 ? (
              <div className="rounded-xl overflow-hidden border border-border/70 shadow-xs aspect-video bg-muted/40 relative group">
                <img
                  src={propertyImages[0]}
                  alt={property.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {propertyImages.length > 1 && (
                  <Badge className="absolute bottom-2 right-2 bg-black/70 text-white border-0 text-[11px] backdrop-blur-xs">
                    +{propertyImages.length - 1} photos
                  </Badge>
                )}
              </div>
            ) : (
              <div className="rounded-xl aspect-video bg-muted/30 border border-dashed border-border/80 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Building2 className="h-10 w-10 stroke-[1.5] text-muted-foreground/60" />
                <span className="text-xs">No property photos uploaded</span>
              </div>
            )}
          </div>

          {/* Details & Live Status */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {property.name}
                </h1>
                <Badge className={cn('text-xs font-semibold capitalize', getPropertyTypeBadge(property.type))}>
                  {property.type}
                </Badge>
                <Badge
                  className={cn(
                    'text-xs font-semibold',
                    occupancyRate >= 80
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', occupancyRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500')} />
                  {occupancyRate}% Occupied
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {property.address}, {property.city}, {property.state || ''} {property.country || ''}
                </span>
              </div>

              {property.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                  {property.description}
                </p>
              )}
            </div>

            {/* Financial Highlights & Quick CTAs */}
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Monthly Realized Income
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(monthlyRealizedRevenue)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/ month</span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Button
                  onClick={() => navigate(`/units?add=true&propertyId=${id}`)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Unit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/payments?record=true&propertyId=${id}`)}
                  className="gap-1.5 text-xs border-border/80 hover:bg-muted/60"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Record Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Profile Completeness Card */}
      {completeness && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border',
                completeness.score >= 80
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : completeness.score >= 50
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-muted text-muted-foreground border-border/60'
              )}
            >
              {completeness.score}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Property Asset Profile Quality
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-semibold',
                    completeness.score >= 80
                      ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'border-amber-500/30 text-amber-600 dark:text-amber-400'
                  )}
                >
                  {completeness.score >= 80 ? 'Enterprise Complete' : 'Recommendations Pending'}
                </Badge>
              </div>
              {completeness.missingItems.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Missing:{' '}
                  {completeness.missingItems.slice(0, 4).map((m) => m.label).join(', ')}
                  {completeness.missingItems.length > 4 && ` +${completeness.missingItems.length - 4} more`}
                </p>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  All essential portfolio, ownership, compliance and financial specifications complete.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
              className="gap-1.5 text-xs h-8 border-border/80"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Complete Profile</span>
            </Button>
          </div>
        </div>
      )}

      {/* 2. MIDDLE SECTION: 4 HEALTH METRICS CARDS (24px padding) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Occupancy Rate */}
        <Card className="p-6 rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Occupancy Rate
            </span>
            <Home className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {occupancyRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {occupiedUnits} of {totalUnits} units rented ({vacantUnits} vacant)
            </p>
          </div>
          <Progress value={occupancyRate} className="h-1.5 bg-muted" />
        </Card>

        {/* Metric 2: Realized Revenue */}
        <Card className="p-6 rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Realized Revenue
            </span>
            <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground truncate">
              {formatCurrency(monthlyRealizedRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Max potential: {formatCurrency(potentialRevenue)} / mo
            </p>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Active lease yield</span>
          </div>
        </Card>

        {/* Metric 3: Collection Rate */}
        <Card className="p-6 rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Collection Rate
            </span>
            <CreditCard className="h-4 w-4 text-blue-500 shrink-0" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {collectionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {outstandingAmount > 0 ? `${formatCurrency(outstandingAmount)} outstanding` : 'All invoices fully settled'}
            </p>
          </div>
          <Progress value={collectionRate} className="h-1.5 bg-muted" />
        </Card>

        {/* Metric 4: Open Issues */}
        <Card className="p-6 rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open Issues
            </span>
            <AlertCircle className={cn('h-4 w-4 shrink-0', openIssuesCount > 0 ? 'text-amber-500' : 'text-emerald-500')} />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {openIssuesCount} {openIssuesCount === 1 ? 'Action Item' : 'Action Items'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {openMaintenanceCount} maintenance · {overdueInvoicesCount} overdue
            </p>
          </div>
          {openIssuesCount === 0 ? (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Operational health optimal</span>
            </div>
          ) : (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Attention recommended</span>
            </div>
          )}
        </Card>
      </div>

      {/* 3. BOTTOM SECTION: 4 WORKFLOW TABS */}
      <div className="space-y-4">
        <Tabs defaultValue="units" className="space-y-6">
          <div className="border-b border-border/80 pb-1">
            <TabsList className="bg-transparent h-10 p-0 gap-6">
              <TabsTrigger
                value="units"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium text-xs sm:text-sm text-muted-foreground gap-2"
              >
                <Home className="h-4 w-4" />
                Units
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {unitRows.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="tenants"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium text-xs sm:text-sm text-muted-foreground gap-2"
              >
                <Users className="h-4 w-4" />
                Tenants
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {propertyTenants.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="maintenance"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium text-xs sm:text-sm text-muted-foreground gap-2"
              >
                <Wrench className="h-4 w-4" />
                Maintenance
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {propertyMaintenance.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="transactions"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-1 pb-2 font-medium text-xs sm:text-sm text-muted-foreground gap-2"
              >
                <FileText className="h-4 w-4" />
                Transactions
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {propertyInvoices.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: UNITS */}
          <TabsContent value="units" className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Property Units</h3>
                <p className="text-xs text-muted-foreground">Manage rentable inventory, pricing, and occupancy status</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/units?add=true&propertyId=${id}`)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Unit
              </Button>
            </div>

            {unitRows.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unitRows.map((unit) => (
                  <Link to={`/units/${unit.id}`} key={unit.id} className="block group">
                    <Card className="p-5 rounded-xl border border-border/80 shadow-xs hover:border-primary/50 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            Unit {unit.unit_number}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {unit.bedrooms} bed • {unit.bathrooms} bath • {unit.sqft} sqft
                          </p>
                        </div>
                        {getUnitStatusBadge(unit.status)}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Rent</span>
                          <p className="font-bold text-sm text-foreground">
                            {formatCurrency(unit.rent_amount)} <span className="text-xs font-normal text-muted-foreground">/mo</span>
                          </p>
                        </div>
                        <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:underline">
                          View Unit <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-3 bg-muted/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">No units configured yet</p>
                  <p className="text-xs text-muted-foreground">Add your first rentable unit to start managing leases and tenants.</p>
                </div>
                <Button size="sm" onClick={() => navigate(`/units?add=true&propertyId=${id}`)} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Add Unit
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TENANTS */}
          <TabsContent value="tenants" className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Resident Directory</h3>
                <p className="text-xs text-muted-foreground">Active leaseholders and resident contact profiles</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/tenants')}
                className="gap-1.5 text-xs"
              >
                <Users className="h-3.5 w-3.5" />
                All Tenants
              </Button>
            </div>

            {propertyTenants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {propertyTenants.map((tenant) => {
                  const assignedUnit = unitRows.find((u) => u.id === tenant.unit_id);
                  return (
                    <Card key={tenant.id} className="p-5 rounded-xl border border-border/80 shadow-xs space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {tenant.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link to={`/tenants/${tenant.id}`} className="font-semibold text-sm text-foreground hover:underline">
                              {tenant.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {assignedUnit ? `Unit ${assignedUnit.unit_number}` : 'Unit Assigned'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                          Resident
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/60">
                        {tenant.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{tenant.email}</span>
                          </div>
                        )}
                        {tenant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{tenant.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Move-in: {tenant.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString() : 'Active'}</span>
                        <Link to={`/tenants/${tenant.id}`} className="text-primary font-medium hover:underline flex items-center gap-1">
                          Profile <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2 bg-muted/20">
                <Users className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No active tenants assigned</p>
                <p className="text-xs text-muted-foreground">Tenants assigned to units in this property will be listed here.</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: MAINTENANCE */}
          <TabsContent value="maintenance" className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Maintenance Requests</h3>
                <p className="text-xs text-muted-foreground">Repairs, contractor dispatches, and tickets for this property</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/maintenance')}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                New Ticket
              </Button>
            </div>

            {propertyMaintenance.length > 0 ? (
              <div className="space-y-3">
                {propertyMaintenance.map((ticket) => {
                  const unit = unitRows.find((u) => u.id === ticket.unit_id);
                  return (
                    <Card key={ticket.id} className="p-4 rounded-xl border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{ticket.title}</span>
                          {getMaintenancePriorityBadge(ticket.priority)}
                          <Badge variant="outline" className="text-xs capitalize">
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {unit ? `Unit ${unit.unit_number}` : 'Property Common Area'} · Reported {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        {ticket.estimated_cost && (
                          <span className="text-xs font-mono font-medium text-foreground">
                            Est: {formatCurrency(ticket.estimated_cost)}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/maintenance')}
                          className="text-xs text-primary gap-1"
                        >
                          View <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2 bg-emerald-500/5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-foreground">All maintenance tasks completed</p>
                <p className="text-xs text-muted-foreground">No open repair tickets or pending work orders for this property.</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: TRANSACTIONS */}
          <TabsContent value="transactions" className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Property Ledger & Invoices</h3>
                <p className="text-xs text-muted-foreground">Billing statements, rental receipts, and collection history</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/payments?record=true&propertyId=${id}`)}
                className="gap-1.5 text-xs"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            </div>

            {propertyInvoices.length > 0 ? (
              <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Invoiced</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {propertyInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-foreground">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(inv.due_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            {getInvoiceStatusBadge(inv.status)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-foreground font-mono">
                            {formatCurrency(inv.amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatCurrency(inv.paid_amount || 0)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link to="/invoices" className="text-primary hover:underline font-medium">
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2 bg-emerald-500/5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-foreground">No overdue rent payments</p>
                <p className="text-xs text-muted-foreground">All billing statements and rental receipts for this property are settled.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* EDIT PROPERTY ASSET PROFILE MODAL */}
      <EditPropertyModal
        property={property}
        open={isEditOpen}
        onOpenChange={(open) => !open && closeEdit()}
      />
    </PageContainer>
  );
}
