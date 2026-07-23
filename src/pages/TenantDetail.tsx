import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal,
  Wrench,
  AlertCircle,
  CheckCircle,
  Send,
  Loader2,
  RefreshCw,
  Copy,
  LinkIcon,
  UserX,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/use-toast';
import { useTenant, useUpdateTenant, useDeleteTenant, type Tenant } from '@/hooks/useTenants';
import { useCreateTenantExit, useTenantExitsByTenant } from '@/hooks/useTenantExits';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useUnits, type Unit } from '@/hooks/useUnits';
import { useInvoices, type Invoice } from '@/hooks/useInvoices';
import { useMaintenanceRequests, type MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useTenantInvites, type TenantInvite } from '@/hooks/useTenantInvites';
import { useSettings } from '@/contexts/useSettings';
import { useAuth } from '@/contexts/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, isPast } from 'date-fns';
import { PortalStatusBadge } from '@/components/tenants/PortalStatusBadge';
import { useSendMessage } from '@/hooks/useMessages';
import { useActiveCompany } from '@/contexts/useActiveCompany';

type TenantRow = Tenant & {
  units?: {
    unit_number: string;
  } | null;
  properties?: {
    name: string;
  } | null;
};

type UnitRow = Unit & {
  properties?: {
    name: string;
  } | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Unknown error';
};

const getLeaseStatusBadge = (leaseEndDate: string | null) => {
  if (!leaseEndDate) return <Badge className="bg-muted text-muted-foreground">No Lease</Badge>;
  
  const daysUntilEnd = differenceInDays(new Date(leaseEndDate), new Date());
  
  if (daysUntilEnd < 0) {
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>;
  }
  if (daysUntilEnd <= 30) {
    return <Badge className="bg-warning/10 text-warning border-warning/20">Expiring Soon</Badge>;
  }
  return <Badge className="bg-success/10 text-success border-success/20">Active</Badge>;
};

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
    case 'pending':
      return <Badge className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
    case 'overdue':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
  }
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: tenant, isLoading } = useTenant(id || '');
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: invoices = [] } = useInvoices();
  const { data: maintenanceRequests = [] } = useMaintenanceRequests();
  const { data: invites = [] } = useTenantInvites();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const sendMessage = useSendMessage();
  const createExit = useCreateTenantExit();
  const { data: tenantExits = [] } = useTenantExitsByTenant(id);
  const inviteRows = invites as TenantInvite[];
  const propertyRows = properties as Property[];
  const unitRows = units as UnitRow[];
  const invoiceRows = invoices as Invoice[];
  const maintenanceRows = maintenanceRequests as MaintenanceRequest[];

  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitReason, setExitReason] = useState('lease_expiry');

  // Check if tenant has pending invite
  const hasPendingInvite = inviteRows.some((invite) => 
    invite.tenant_id === id && 
    !invite.used_at && 
    !isPast(new Date(invite.expires_at))
  );

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_id: '',
    unit_id: '',
    move_in_date: '',
    lease_end_date: '',
    monthly_rent: 0,
    security_deposit: 0,
    balance: 0,
    emergency_contact: '',
    emergency_phone: '',
    employer: '',
    occupation: '',
  });

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        property_id: tenant.property_id || '',
        unit_id: tenant.unit_id || '',
        move_in_date: tenant.move_in_date || '',
        lease_end_date: tenant.lease_end_date || '',
        monthly_rent: tenant.monthly_rent || 0,
        security_deposit: tenant.security_deposit || 0,
        balance: tenant.balance || 0,
        emergency_contact: tenant.emergency_contact || '',
        emergency_phone: tenant.emergency_phone || '',
        employer: tenant.employer || '',
        occupation: tenant.occupation || '',
      });
    }
  }, [tenant]);

  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');

  const isEditOpen = searchParams.get('edit') === 'true';
  const isMessageOpen = searchParams.get('tab') === 'messages';

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

  const closeMessage = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    setSearchParams(next, { replace: true });
  };
  const openMessage = () => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'messages');
    setSearchParams(next, { replace: true });
  };

  const handleSave = async () => {
    if (!id) return;
    
    await updateTenant.mutateAsync({
      id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      property_id: formData.property_id || null,
      unit_id: formData.unit_id || null,
      move_in_date: formData.move_in_date || null,
      lease_end_date: formData.lease_end_date || null,
      monthly_rent: formData.monthly_rent,
      security_deposit: formData.security_deposit,
      balance: formData.balance,
      emergency_contact: formData.emergency_contact || null,
      emergency_phone: formData.emergency_phone || null,
      employer: formData.employer || null,
      occupation: formData.occupation || null,
    });
    closeEdit();
  };

  const handleDelete = async () => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this tenant?')) {
      await deleteTenant.mutateAsync(id);
      navigate('/tenants');
    }
  };

  const handleSendInvite = async () => {
    if (!tenant || tenant.tenant_user_id) {
      toast({ title: 'Error', description: 'This tenant already has an active portal account', variant: 'destructive' });
      return;
    }
    
    setIsSendingInvite(true);
    try {
      const property = propertyRows.find((p) => p.id === tenant.property_id);

      const { data, error } = await supabase.functions.invoke('send-tenant-invite', {
        body: {
          tenantId: tenant.id,
          email: tenant.email,
          landlordName: user?.email || 'Property Manager',
          propertyName: property?.name || 'Your Property',
          origin: window.location.origin,
          companyId: activeCompanyId,
        },
      });

      if (error) throw new Error(error.message || 'Failed to send invite');

      if (data?.emailSent === false && data?.inviteLink) {
        await navigator.clipboard.writeText(data.inviteLink);
        toast({ 
          title: 'Email Not Sent - Link Copied!', 
          description: data.warning || 'The invite link has been copied to your clipboard.',
        });
      } else {
        toast({ title: 'Success', description: `Invite sent to ${tenant.email}` });
      }
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!tenant) return;
    
    setIsCopyingLink(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const token = crypto.randomUUID() + '-' + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('tenant_invites')
        .insert({
          tenant_id: tenant.id,
          email: tenant.email,
          token,
          expires_at: expiresAt.toISOString(),
          user_id: currentUser.id,
        });

      if (error) throw error;

      const appUrl = 'https://fishgate.lovable.app';
      const inviteLink = `${appUrl}/tenant/signup?invite=${token}`;
      await navigator.clipboard.writeText(inviteLink);
      
      toast({ 
        title: 'Link Copied!', 
        description: 'Invite link copied to clipboard.' 
      });
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsCopyingLink(false);
    }
  };

  // Filter data for this tenant
  const tenantInvoices = invoiceRows.filter((inv) => inv.tenant_id === id);
  const tenantMaintenance = maintenanceRows.filter((m) => m.tenant_id === id);

  const propertyOptions = propertyRows.map((property) => ({
    value: property.id,
    label: property.name,
    description: `${property.city}, ${property.state}`,
  }));

  const unitOptions = unitRows
    .filter((unit) => !formData.property_id || unit.property_id === formData.property_id)
    .map((unit) => ({
      value: unit.id,
      label: `Unit ${unit.unit_number}`,
      description: unit.properties?.name || '',
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <User className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Tenant not found</p>
        <Button variant="outline" onClick={() => navigate('/tenants')}>
          Back to Tenants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tenants')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">{getInitials(tenant.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
              {getLeaseStatusBadge(tenant.lease_end_date)}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                {tenant.units ? `Unit ${tenant.units.unit_number}` : 'No unit'} - {tenant.properties?.name || 'No property'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={openMessage}>
            <Mail className="h-4 w-4" />
            Send Message
          </Button>
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
                  navigate('/leases?add=true');
                }}
              >
                <Calendar className="h-4 w-4 mr-2" /> Create Lease
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  navigate(`/tenant-inventory-baseline/${tenant.id}`);
                }}
              >
                <FileText className="h-4 w-4 mr-2" /> Move-in Baseline Inventory
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tenant.status === 'active' && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setExitDialogOpen(true);
                  }}
                  className="text-warning"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Initiate Tenant Exit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {tenant.status === 'active' ? (
                <DropdownMenuItem
                  onSelect={async (e) => {
                    e.preventDefault();
                    await updateTenant.mutateAsync({ id: id!, status: 'inactive' });
                    toast({ title: 'Tenant Deactivated', description: `${tenant.name} has been marked as inactive.` });
                  }}
                >
                  <UserX className="h-4 w-4 mr-2" /> Mark Inactive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={async (e) => {
                    e.preventDefault();
                    await updateTenant.mutateAsync({ id: id!, status: 'active' });
                    toast({ title: 'Tenant Activated', description: `${tenant.name} has been marked as active.` });
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-2" /> Mark Active
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Remove Tenant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Portal Status Card - Show invite actions if not linked */}
      {!tenant.tenant_user_id && (
        <Card className="card-shadow-md border-warning/20 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <LinkIcon className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Portal Access Not Set Up</h3>
                  <p className="text-sm text-muted-foreground">
                    {hasPendingInvite 
                      ? 'An invite has been sent. Resend or copy the link below.'
                      : 'Send an invite to allow this tenant to access the portal.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={handleCopyInviteLink}
                  disabled={isCopyingLink}
                >
                  {isCopyingLink ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy Link
                </Button>
                <Button 
                  className="gap-2"
                  onClick={handleSendInvite}
                  disabled={isSendingInvite}
                >
                  {isSendingInvite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasPendingInvite ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {hasPendingInvite ? 'Resend Invite' : 'Send Invite'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tenant.tenant_user_id && (
        <Card className="card-shadow-md border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Portal Access Active</h3>
                <p className="text-sm text-muted-foreground">
                  This tenant has access to the tenant portal and can view their lease, payments, and submit requests.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(tenant.monthly_rent)}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className={`text-2xl font-bold ${tenant.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                  {formatCurrency(tenant.balance)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${tenant.balance > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                {tenant.balance > 0 ? (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-success" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lease Ends</p>
                <p className="text-2xl font-bold text-foreground">
                  {tenant.lease_end_date ? format(new Date(tenant.lease_end_date), 'MMM dd, yyyy') : '-'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Calendar className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Security Deposit</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(tenant.security_deposit)}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <FileText className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card className="card-shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{tenant.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
            </div>
            {(tenant.emergency_contact || tenant.emergency_phone) && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">Emergency Contact</p>
                <p className="font-medium">{tenant.emergency_contact || '-'}</p>
                <p className="text-sm text-muted-foreground">{tenant.emergency_phone || '-'}</p>
              </div>
            )}
            {(tenant.employer || tenant.occupation) && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground mb-2">Employment</p>
                <p className="font-medium">{tenant.occupation || '-'}</p>
                <p className="text-sm text-muted-foreground">{tenant.employer || '-'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="payments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="payments">Invoices</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="payments" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Invoices</CardTitle>
                  <Button className="gap-2" onClick={() => navigate('/invoices?add=true')}>
                    <DollarSign className="h-4 w-4" />
                    Create Invoice
                  </Button>
                </CardHeader>
                <CardContent>
                  {tenantInvoices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{invoice.description}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>{getPaymentStatusBadge(invoice.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">No invoices yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <Card className="card-shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Maintenance Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {tenantMaintenance.length > 0 ? (
                    <div className="space-y-4">
                      {tenantMaintenance.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning/10">
                              <Wrench className="h-4 w-4 text-warning" />
                            </div>
                            <div>
                              <p className="font-medium">{request.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(request.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-success/10 text-success border-success/20">{request.status}</Badge>
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
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Send Message Dialog */}
      <Dialog
        open={isMessageOpen}
        onOpenChange={(open) => {
          if (!open) {
            setMessageSubject('');
            setMessageBody('');
            closeMessage();
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Message {tenant.name}</DialogTitle>
            <DialogDescription>Send a message to this tenant.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="e.g., Rent reminder"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type your message..."
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeMessage}>
              Cancel
            </Button>
            <Button
              className="gap-2"
              onClick={async () => {
                if (!tenant) return;

                const subject = messageSubject.trim() || 'Message';
                const content = messageBody.trim();
                if (!content) return;

                try {
                  await sendMessage.mutateAsync({
                    recipient_id: tenant.id,
                    subject,
                    content,
                    property_id: tenant.property_id || undefined,
                  });
                  setMessageSubject('');
                  setMessageBody('');
                  closeMessage();
                } catch (error) {
                  console.error('Failed to send tenant message', error);
                }
              }}
              disabled={!messageBody.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendMessage.isPending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update all tenant information below.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <h4 className="font-medium text-sm text-muted-foreground">Personal Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantName">Full Name *</Label>
                <Input 
                  id="tenantName" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenantEmail">Email Address *</Label>
                <Input 
                  id="tenantEmail" 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantPhone">Phone Number *</Label>
                <Input 
                  id="tenantPhone" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250 XX XXX XXXX" 
                />
              </div>
              <div className="grid gap-2">
                <Label>Property</Label>
                <SearchableSelect
                  options={propertyOptions}
                  value={formData.property_id}
                  onValueChange={(value) => setFormData({ ...formData, property_id: value, unit_id: '' })}
                  placeholder="Select property..."
                  searchPlaceholder="Search properties..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Unit</Label>
                <SearchableSelect
                  options={unitOptions}
                  value={formData.unit_id}
                  onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                  placeholder="Select unit..."
                  searchPlaceholder="Search units..."
                />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground pt-2">Emergency Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantEmergencyContact">Contact Name</Label>
                <Input 
                  id="tenantEmergencyContact" 
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Emergency contact name" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenantEmergencyPhone">Contact Phone</Label>
                <Input 
                  id="tenantEmergencyPhone" 
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  placeholder="+250 XX XXX XXXX" 
                />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground pt-2">Employment Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantEmployer">Employer</Label>
                <Input 
                  id="tenantEmployer" 
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  placeholder="Company name" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenantOccupation">Occupation</Label>
                <Input 
                  id="tenantOccupation" 
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="Job title" 
                />
              </div>
            </div>

            <h4 className="font-medium text-sm text-muted-foreground pt-2">Lease & Payment Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantMoveIn">Move-in Date</Label>
                <Input 
                  id="tenantMoveIn" 
                  type="date" 
                  value={formData.move_in_date}
                  onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenantLeaseEnd">Lease End Date</Label>
                <Input 
                  id="tenantLeaseEnd" 
                  type="date" 
                  value={formData.lease_end_date}
                  onChange={(e) => setFormData({ ...formData, lease_end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantRent">Monthly Rent</Label>
                <Input 
                  id="tenantRent" 
                  type="number" 
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })}
                  min="0" 
                  step="0.01" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenantDeposit">Security Deposit</Label>
                <Input 
                  id="tenantDeposit" 
                  type="number" 
                  value={formData.security_deposit}
                  onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
                  min="0" 
                  step="0.01" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tenantBalance">Current Balance</Label>
                <Input 
                  id="tenantBalance" 
                  type="number" 
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                  step="0.01" 
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateTenant.isPending}>
              {updateTenant.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Exit Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Tenant Exit</DialogTitle>
            <DialogDescription>
              Start the exit process for {tenant?.name}. This will begin a multi-step workflow including property inspection, deposit decision, and final checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exit Reason</Label>
              <Select value={exitReason} onValueChange={setExitReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lease_expiry">Lease Expiry</SelectItem>
                  <SelectItem value="contract_termination">Contract Termination</SelectItem>
                  <SelectItem value="voluntary">Voluntary Departure</SelectItem>
                  <SelectItem value="violation">Lease Violation</SelectItem>
                  <SelectItem value="mutual_agreement">Mutual Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p><strong>Tenant:</strong> {tenant?.name}</p>
              <p><strong>Unit:</strong> {tenant?.unit_id ? unitRows.find((u) => u.id === tenant.unit_id)?.unit_number : 'N/A'}</p>
              <p><strong>Security Deposit:</strong> {formatCurrency(tenant?.security_deposit || 0)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!tenant?.property_id || !tenant?.unit_id) {
                  toast({ title: 'Error', description: 'Tenant must have a property and unit assigned.', variant: 'destructive' });
                  return;
                }
                const result = await createExit.mutateAsync({
                  tenant_id: id!,
                  property_id: tenant.property_id,
                  unit_id: tenant.unit_id,
                  exit_reason: exitReason,
                  deposit_amount: tenant.security_deposit || 0,
                });
                setExitDialogOpen(false);
                navigate(`/tenant-exit/${result.id}`);
              }}
              disabled={createExit.isPending}
              className="gap-2"
            >
              {createExit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Start Exit Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

