import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Building2,
  Home,
  DollarSign,
  ClipboardList,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InspectionChecklistSettings } from '@/components/settings/InspectionChecklistSettings';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { useI18n } from '@/contexts/useI18n';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useMaintenanceRequests, useCreateMaintenanceRequest, useUpdateMaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useSendMaintenanceNotification } from '@/hooks/useMaintenanceNotifications';
import { format } from 'date-fns';
import { useVendors } from '@/hooks/useVendors';
import { StatusPill } from '@/components/shared/StatusPill';
import { FilterBar } from '@/components/shared/FilterBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';
import {
  PageContainer,
  PageHeader,
  PageActions,
  PageInsights,
} from '@/design-system/LayoutFramework';
import { StandardTable } from '@/design-system/components/StandardTable';

type MaintenanceRequestRow = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  assigned_to?: string | null;
  vendor_id?: string | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  unit_id?: string | null;
  property_id?: string | null;
  tenant_id?: string | null;
  company_id?: string | null;
  units?: {
    unit_number: string;
  } | null;
  properties?: {
    name: string;
    company_id?: string;
    companies?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
  tenants?: {
    name: string;
  } | null;
  vendors?: {
    name: string;
  } | null;
};

type UnitRow = {
  id: string;
  unit_number: string;
  property_id?: string | null;
};

type TenantRow = {
  id: string;
  name: string;
  email: string;
};

type PropertyRow = {
  id: string;
  name: string;
  company_id?: string | null;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <StatusPill variant="success" className="gap-1">
          <CheckCircle className="h-3 w-3" /> Completed
        </StatusPill>
      );
    case 'in_progress':
      return (
        <StatusPill variant="info" className="gap-1">
          <Clock className="h-3 w-3" /> In Progress
        </StatusPill>
      );
    case 'submitted':
      return (
        <StatusPill variant="warning" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Submitted
        </StatusPill>
      );
    case 'cancelled':
      return (
        <StatusPill className="gap-1">
          <XCircle className="h-3 w-3" /> Cancelled
        </StatusPill>
      );
    default:
      return null;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return (
        <StatusPill variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Urgent
        </StatusPill>
      );
    case 'high':
      return (
        <StatusPill variant="warning">
          High
        </StatusPill>
      );
    case 'medium':
      return (
        <StatusPill variant="info">
          Medium
        </StatusPill>
      );
    case 'low':
      return (
        <StatusPill>
          Low
        </StatusPill>
      );
    default:
      return null;
  }
};

export default function Maintenance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'requests';
  const currentTab = ['requests', 'work-orders', 'inspections'].includes(rawTab) ? rawTab : 'requests';

  const handleTabChange = (val: string) => {
    setSearchParams(val === 'requests' ? {} : { tab: val }, { replace: true });
  };

  const { formatCurrency } = useSettings();
  const { t } = useI18n();
  const { isSuperAdmin } = useUserRole();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-maintenance') as ViewMode) || 'table');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestRow | null>(null);

  useEffect(() => {
    localStorage.setItem('estatepro-view-maintenance', view);
  }, [view]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    unit_id: '',
    property_id: '',
    tenant_id: '',
    priority: 'medium',
    status: 'submitted',
    assigned_to: '',
    vendor_id: '',
    estimated_cost: '',
    actual_cost: '',
  });

  const { data: requests = [], isLoading } = useMaintenanceRequests();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const { data: properties = [] } = useProperties();
  const { data: vendors = [] } = useVendors('active');
  const typedRequests = requests as MaintenanceRequestRow[];
  const typedUnits = units as UnitRow[];
  const typedTenants = tenants as TenantRow[];
  const typedProperties = properties as PropertyRow[];
  const createRequest = useCreateMaintenanceRequest();
  const updateRequest = useUpdateMaintenanceRequest();
  const sendNotification = useSendMaintenanceNotification();

  const handleStatusChange = async (requestId: string, newStatus: string, oldStatus: string) => {
    await updateRequest.mutateAsync({ 
      id: requestId, 
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    });
    try {
      await sendNotification.mutateAsync({ requestId, newStatus, oldStatus });
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  };

  const propertyOptions = typedProperties.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const filteredUnits = formData.property_id
    ? typedUnits.filter((u) => u.property_id === formData.property_id)
    : typedUnits;

  const unitOptions = filteredUnits.map((u) => ({
    value: u.id,
    label: `Unit ${u.unit_number}`,
  }));

  const tenantOptions = typedTenants.map((t) => ({
    value: t.id,
    label: t.name,
    description: t.email,
  }));

  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: v.name,
    description: v.category,
  }));

  const stats = {
    total: typedRequests.length,
    submitted: typedRequests.filter((r) => r.status === 'submitted').length,
    inProgress: typedRequests.filter((r) => r.status === 'in_progress').length,
    completed: typedRequests.filter((r) => r.status === 'completed').length,
    urgent: typedRequests.filter((r) => r.priority === 'urgent' && r.status !== 'completed').length,
  };

  const filteredRequests = typedRequests.filter((request) => {
    const reqCompanyId = request.company_id || request.properties?.company_id || request.properties?.companies?.id;
    if (selectedOrgFilter !== 'all' && reqCompanyId && reqCompanyId !== selectedOrgFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    return (
      request.title.toLowerCase().includes(q) ||
      request.description.toLowerCase().includes(q) ||
      request.properties?.name.toLowerCase().includes(q) ||
      request.properties?.companies?.name?.toLowerCase().includes(q) ||
      request.vendors?.name.toLowerCase().includes(q) ||
      (request.assigned_to && request.assigned_to.toLowerCase().includes(q))
    );
  });

  const workOrdersCount = useMemo(() => {
    return typedRequests.filter((r) => r.vendor_id || r.assigned_to || r.status === 'in_progress').length;
  }, [typedRequests]);

  const displayedRequests = useMemo(() => {
    if (currentTab === 'work-orders') {
      return filteredRequests.filter((r) => r.vendor_id || r.assigned_to || r.status === 'in_progress');
    }
    return filteredRequests;
  }, [currentTab, filteredRequests]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedOrgFilter, pageSize, currentTab]);

  const paginatedRequests = displayedRequests.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async () => {
    if (!formData.title || !formData.description) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    await createRequest.mutateAsync({
      title: formData.title,
      description: formData.description,
      unit_id: formData.unit_id || null,
      property_id: formData.property_id || null,
      tenant_id: formData.tenant_id || null,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      vendor_id: formData.vendor_id || null,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      actual_cost: formData.actual_cost ? parseFloat(formData.actual_cost) : null,
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const openEdit = (request: MaintenanceRequestRow) => {
    setSelectedRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      unit_id: request.unit_id || '',
      property_id: request.property_id || '',
      tenant_id: request.tenant_id || '',
      priority: request.priority,
      status: request.status,
      assigned_to: request.assigned_to || '',
      vendor_id: request.vendor_id || '',
      estimated_cost: request.estimated_cost?.toString() || '',
      actual_cost: request.actual_cost?.toString() || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;

    await updateRequest.mutateAsync({
      id: selectedRequest.id,
      title: formData.title,
      description: formData.description,
      unit_id: formData.unit_id || null,
      property_id: formData.property_id || null,
      tenant_id: formData.tenant_id || null,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      vendor_id: formData.vendor_id || null,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      actual_cost: formData.actual_cost ? parseFloat(formData.actual_cost) : null,
    });

    setIsEditOpen(false);
    setSelectedRequest(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      unit_id: '',
      property_id: '',
      tenant_id: '',
      priority: 'medium',
      status: 'submitted',
      assigned_to: '',
      vendor_id: '',
      estimated_cost: '',
      actual_cost: '',
    });
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* 1. Header & Primary Action Area */}
      <PageHeader
        title={t('maintenance', 'Maintenance & Work Orders')}
        description={t('page_maintenance_subtitle', 'Triage resident service tickets, dispatch technicians, track repair costs, and log vendor allocations.')}
        actions={
          <PageActions>
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium h-9 text-xs"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('action_new_request', 'New Work Order')}
            </Button>
          </PageActions>
        }
      />

      {/* 2. Page Insights (Clean metric strip, not wall of cards) */}
      <PageInsights
        metrics={[
          {
            id: 'urgent-issues',
            label: 'Urgent / Emergency',
            value: stats.urgent,
            tone: stats.urgent > 0 ? 'danger' : 'default',
            subtext: stats.urgent > 0 ? 'Immediate technician response required' : 'Zero active emergency tickets',
          },
          {
            id: 'in-progress',
            label: 'In Progress with Vendors',
            value: stats.inProgress,
            tone: 'warning',
            subtext: 'Technicians actively dispatched',
          },
          {
            id: 'submitted',
            label: 'New Submitted Tickets',
            value: stats.submitted,
            tone: 'default',
            subtext: 'Pending manager review & triage',
          },
          {
            id: 'completed-tickets',
            label: 'Resolved & Signed Off',
            value: stats.completed,
            tone: 'success',
            subtext: 'Work orders closed this period',
          },
        ]}
      />

      {/* Filters & View Toggle */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 border border-border/60">
          <TabsTrigger value="requests" className="gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance Tickets ({typedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Work Orders ({workOrdersCount})
          </TabsTrigger>
          <TabsTrigger value="inspections" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Inspections & Checklists
          </TabsTrigger>
        </TabsList>

        {currentTab === 'inspections' ? (
          <div className="pt-2">
            <InspectionChecklistSettings />
          </div>
        ) : (
          <>
            <FilterBar className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('page_maintenance_search', 'Search by title, description, property, or vendor...')}
              className="pl-10 h-11 border-border/70 bg-card/80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isSuperAdmin && companiesList.length > 0 && (
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-11">
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

      {/* 1. Cards / Grid View */}
      {!isLoading && view === 'cards' && paginatedRequests.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedRequests.map((request) => (
              <Card key={request.id} className="p-5 card-shadow-md hover:card-shadow-lg transition-all animate-enter">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">{request.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getPriorityBadge(request.priority)}
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-secondary/40 space-y-1 text-xs">
                  <p className="text-muted-foreground line-clamp-2">{request.description}</p>
                  <div className="pt-1 flex items-center justify-between text-muted-foreground">
                    <span>{request.properties?.name || 'No property'} {request.units ? `• Unit ${request.units.unit_number}` : ''}</span>
                    {request.tenants && <span>Tenant: {request.tenants.name}</span>}
                  </div>
                  {(request.properties as { companies?: { name?: string } | null } | null)?.companies?.name && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 mt-1 font-medium">
                      🏢 {(request.properties as { companies?: { name?: string } | null }).companies?.name}
                    </span>
                  )}
                  {(request.vendors?.name || request.assigned_to) && (
                    <p className="text-xs font-medium text-foreground mt-1">
                      Assigned: {request.vendors?.name || request.assigned_to}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {request.actual_cost != null ? (
                      <span className="font-semibold text-foreground">{formatCurrency(request.actual_cost)}</span>
                    ) : request.estimated_cost != null ? (
                      <span>{formatCurrency(request.estimated_cost)} est.</span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(request)}>
                      Edit
                    </Button>
                    {request.status === 'completed' ? (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(request.id, 'in_progress', request.status)}>
                        Reopen
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleStatusChange(request.id, 'completed', request.status)}>
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredRequests.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 2. Compact View */}
      {!isLoading && view === 'compact' && paginatedRequests.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedRequests.map((request) => (
              <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{request.title}</span>
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                      {(request.properties as { companies?: { name?: string } | null } | null)?.companies?.name && (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          🏢 {(request.properties as { companies?: { name?: string } | null }).companies?.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {request.properties?.name || 'No property'} {request.units ? `(Unit ${request.units.unit_number})` : ''} • {request.tenants ? `Tenant: ${request.tenants.name} • ` : ''} {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(request)}>
                    Edit
                  </Button>
                  {request.status === 'completed' ? (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(request.id, 'in_progress', request.status)}>
                      Reopen
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleStatusChange(request.id, 'completed', request.status)}>
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredRequests.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* 3. Table View */}
      {!isLoading && view === 'table' && paginatedRequests.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Title</TableHead>
                  <TableHead>{t('th_property', 'Unit / Property')}</TableHead>
                  <TableHead>{t('th_tenant', 'Tenant')}</TableHead>
                  <TableHead>{t('th_priority', 'Priority')}</TableHead>
                  <TableHead>{t('th_status', 'Status')}</TableHead>
                  <TableHead>{t('th_date', 'Created')}</TableHead>
                  <TableHead className="text-right">{t('th_actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {request.description}
                        </p>
                        {(request.actual_cost != null || request.estimated_cost != null) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <DollarSign className="h-3 w-3" />
                            {request.actual_cost != null ? formatCurrency(request.actual_cost) : `${formatCurrency(request.estimated_cost || 0)} est.`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm">Unit {request.units?.unit_number || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.properties?.name || 'N/A'}
                          </p>
                          {(request.properties as { companies?: { name?: string } | null } | null)?.companies?.name && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 mt-1 font-medium">
                              🏢 {(request.properties as { companies?: { name?: string } | null }).companies?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.tenants ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{request.tenants.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(request.created_at), 'MMM dd, yyyy')}
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
                          <DropdownMenuItem onClick={() => openEdit(request)}>
                            Edit Request
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(request.id, 'in_progress', request.status)}
                          >
                            Mark In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(request.id, 'completed', request.status)}
                          >
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleStatusChange(request.id, 'cancelled', request.status)}
                          >
                            Cancel Request
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
            total={displayedRequests.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedRequests.length === 0 && (
        <EmptyState
          icon={Wrench}
          title={currentTab === 'work-orders' ? 'No work orders found' : t('empty_no_records', 'No maintenance requests found')}
          description={currentTab === 'work-orders' ? 'No assigned work orders or vendor dispatches match your filter.' : t('empty_search_prompt', 'Try adjusting your search query or create a request.')}
          action={<Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4" />{t('action_new_request', 'New Request')}</Button>}
        />
      )}
          </>
        )}
      </Tabs>

      {/* Create Request Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Maintenance Request</DialogTitle>
            <DialogDescription>Submit a new maintenance request for a unit.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Leaking faucet in bathroom"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unit *</Label>
                <SearchableSelect
                  options={unitOptions}
                  value={formData.unit_id}
                  onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                  placeholder="Select unit..."
                  searchPlaceholder="Search units..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Property</Label>
                <SearchableSelect
                  options={propertyOptions}
                  value={formData.property_id}
                  onValueChange={(value) => setFormData({ ...formData, property_id: value })}
                  placeholder="Select property..."
                  searchPlaceholder="Search properties..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tenant</Label>
                <SearchableSelect
                  options={tenantOptions}
                  value={formData.tenant_id}
                  onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
                  placeholder="Select tenant..."
                  searchPlaceholder="Search tenants..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <SearchableSelect
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  placeholder="Select priority..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Vendor</Label>
                <SearchableSelect
                  options={vendorOptions}
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  placeholder="Select vendor..."
                  searchPlaceholder="Search vendors..."
                />
              </div>
              <div className="grid gap-2">
              <Label>Other assignee</Label>
              <Input
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="Name of staff member or external contractor"
              />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="estimated-cost">Estimated cost</Label><Input id="estimated-cost" type="number" min="0" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="actual-cost">Actual cost</Label><Input id="actual-cost" type="number" min="0" step="0.01" value={formData.actual_cost} onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })} /></div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createRequest.isPending}>
              {createRequest.isPending ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Request</DialogTitle>
            <DialogDescription>Update the maintenance request details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editTitle">Title *</Label>
              <Input
                id="editTitle"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editDescription">Description *</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unit *</Label>
                <SearchableSelect
                  options={unitOptions}
                  value={formData.unit_id}
                  onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                  placeholder="Select unit..."
                  searchPlaceholder="Search units..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <SearchableSelect
                  options={[
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  placeholder="Select status..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <SearchableSelect
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  placeholder="Select priority..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Vendor</Label>
                <SearchableSelect options={vendorOptions} value={formData.vendor_id} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })} placeholder="Select vendor..." searchPlaceholder="Search vendors..." />
              </div>
              <div className="grid gap-2">
                <Label>Other assignee</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="Name of staff member or external contractor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="edit-estimated-cost">Estimated cost</Label><Input id="edit-estimated-cost" type="number" min="0" step="0.01" value={formData.estimated_cost} onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })} /></div>
              <div className="grid gap-2"><Label htmlFor="edit-actual-cost">Actual cost</Label><Input id="edit-actual-cost" type="number" min="0" step="0.01" value={formData.actual_cost} onChange={(e) => setFormData({ ...formData, actual_cost: e.target.value })} /></div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); setSelectedRequest(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateRequest.isPending}>
              {updateRequest.isPending ? 'Updating...' : 'Update Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
