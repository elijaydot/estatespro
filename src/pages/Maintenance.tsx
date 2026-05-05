import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Search,
  Filter,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { useSettings } from '@/contexts/SettingsContext';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useMaintenanceRequests, useCreateMaintenanceRequest, useUpdateMaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useSendMaintenanceNotification } from '@/hooks/useMaintenanceNotifications';
import { format } from 'date-fns';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle className="h-3 w-3" /> Completed
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge className="bg-info/10 text-info border-info/20 gap-1">
          <Clock className="h-3 w-3" /> In Progress
        </Badge>
      );
    case 'submitted':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <AlertCircle className="h-3 w-3" /> Submitted
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-muted text-muted-foreground gap-1">
          <XCircle className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return null;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <AlertTriangle className="h-3 w-3" /> Urgent
        </Badge>
      );
    case 'high':
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge className="bg-info/10 text-info border-info/20 gap-1">
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge className="bg-muted text-muted-foreground gap-1">
          Low
        </Badge>
      );
    default:
      return null;
  }
};

export default function Maintenance() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

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
  });

  const { data: requests = [], isLoading } = useMaintenanceRequests();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const { data: properties = [] } = useProperties();
  const createRequest = useCreateMaintenanceRequest();
  const updateRequest = useUpdateMaintenanceRequest();
  const sendNotification = useSendMaintenanceNotification();

  const handleStatusChange = async (requestId: string, newStatus: string, oldStatus: string) => {
    await updateRequest.mutateAsync({ 
      id: requestId, 
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    });
    // Send email notification
    try {
      await sendNotification.mutateAsync({ requestId, newStatus, oldStatus });
    } catch (error) {
      console.warn('Failed to send notification:', error);
    }
  };

  const filteredRequests = requests.filter((request: any) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      (request.title || '').toLowerCase().includes(q) ||
      (request.description || '').toLowerCase().includes(q)
    );
  });

  const stats = {
    total: requests.length,
    submitted: requests.filter((r: any) => r.status === 'submitted').length,
    inProgress: requests.filter((r: any) => r.status === 'in_progress').length,
    completed: requests.filter((r: any) => r.status === 'completed').length,
  };

  const unitOptions = units.map((unit: any) => ({
    value: unit.id,
    label: `Unit ${unit.unit_number}`,
    description: unit.properties?.name || '',
  }));

  const tenantOptions = tenants.map((tenant: any) => ({
    value: tenant.id,
    label: tenant.name,
    description: tenant.email,
  }));

  const propertyOptions = properties.map((property: any) => ({
    value: property.id,
    label: property.name,
    description: `${property.city}, ${property.state}`,
  }));

  const handleCreate = async () => {
    if (!formData.title || !formData.unit_id) {
      toast({ title: 'Error', description: 'Title and Unit are required', variant: 'destructive' });
      return;
    }

    await createRequest.mutateAsync({
      title: formData.title,
      description: formData.description,
      unit_id: formData.unit_id,
      property_id: formData.property_id || null,
      tenant_id: formData.tenant_id || null,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      completed_at: null,
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedRequest) return;

    await updateRequest.mutateAsync({
      id: selectedRequest.id,
      title: formData.title,
      description: formData.description,
      unit_id: formData.unit_id,
      property_id: formData.property_id || null,
      tenant_id: formData.tenant_id || null,
      priority: formData.priority,
      status: formData.status,
      assigned_to: formData.assigned_to || null,
      completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
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
    });
  };

  const openEdit = (request: any) => {
    setSelectedRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      unit_id: request.unit_id,
      property_id: request.property_id || '',
      tenant_id: request.tenant_id || '',
      priority: request.priority,
      status: request.status,
      assigned_to: request.assigned_to || '',
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Maintenance</h1>
          <p className="text-muted-foreground mt-1">Track and manage maintenance requests</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Wrench className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold text-warning">{stats.submitted}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-info">{stats.inProgress}</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Clock className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or description..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Requests Table */}
      <Card className="card-shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 px-6 text-center text-muted-foreground">Loading maintenance requests...</div>
          ) : (
            <>
              <div className="md:hidden divide-y">
                {filteredRequests.length === 0 ? (
                  <div className="py-12 px-6 text-center text-muted-foreground">
                    <p className="font-medium text-foreground">No maintenance requests found</p>
                    <p className="text-sm mt-1">Try adjusting your search query.</p>
                  </div>
                ) : (
                  filteredRequests.map((request: any) => (
                    <div key={request.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{request.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Home className="h-4 w-4" />
                          <span>Unit {request.units?.unit_number || 'N/A'}</span>
                        </div>
                        {getPriorityBadge(request.priority)}
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{request.properties?.name || 'No property'}</span>
                        <span>{format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
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
                  ))
                )}
              </div>

              <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Unit / Property</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No maintenance requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {request.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">Unit {request.units?.unit_number || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.properties?.name || 'N/A'}
                          </p>
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
                        <span className="text-muted-foreground">-</span>
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
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
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
                ))
              )}
            </TableBody>
          </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

            <div className="grid gap-2">
              <Label>Assigned To</Label>
              <Input
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="Technician or contractor name"
              />
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
                <Label>Assigned To</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="Technician name"
                />
              </div>
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
    </div>
  );
}
