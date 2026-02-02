import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Mail,
  Phone,
  Home,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Loader2,
  Send,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/use-toast';
import { useTenants, useCreateTenant, useDeleteTenant } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenantInvites } from '@/hooks/useTenantInvites';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, isPast } from 'date-fns';
import { PortalStatusBadge } from '@/components/tenants/PortalStatusBadge';
import { InvitesManagement } from '@/components/invites/InvitesManagement';
import { TenantPreviewCard } from '@/components/forms/TenantPreviewCard';
import { ImageUpload } from '@/components/ui/image-upload';

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

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

export default function Tenants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { formatCurrency } = useSettings();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitingTenant, setInvitingTenant] = useState<any>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_id: '',
    unit_id: '',
    monthly_rent: 0,
    security_deposit: 0,
    move_in_date: '',
    lease_end_date: '',
    emergency_contact: '',
    emergency_phone: '',
    employer: '',
    occupation: '',
    avatar_url: '',
  });

  // Handle ?add=true query parameter from Quick Add
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddDialogOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: tenants = [], isLoading } = useTenants();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: invites = [] } = useTenantInvites();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();
  const [activeTab, setActiveTab] = useState('tenants');

  // Check if a tenant has a pending invite
  const hasPendingInvite = (tenantId: string) => {
    return invites.some((invite: any) => 
      invite.tenant_id === tenantId && 
      !invite.used_at && 
      !isPast(new Date(invite.expires_at))
    );
  };

  const propertyOptions = properties.map((property: any) => ({
    value: property.id,
    label: property.name,
    description: `${property.city}, ${property.state}`,
  }));

  const unitOptions = units
    .filter((unit: any) => !formData.property_id || unit.property_id === formData.property_id)
    .map((unit: any) => ({
      value: unit.id,
      label: `Unit ${unit.unit_number}`,
      description: unit.properties?.name || '',
    }));

  const filteredTenants = tenants.filter((tenant: any) =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast({ title: 'Error', description: 'Name, email, and phone are required', variant: 'destructive' });
      return;
    }

    await createTenant.mutateAsync({
      ...formData,
      property_id: formData.property_id || null,
      unit_id: formData.unit_id || null,
      move_in_date: formData.move_in_date || null,
      lease_end_date: formData.lease_end_date || null,
      avatar_url: formData.avatar_url || null,
      tenant_user_id: null,
      id_document: null,
      status: 'active',
      balance: 0,
    });
    setIsAddDialogOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      property_id: '',
      unit_id: '',
      monthly_rent: 0,
      security_deposit: 0,
      move_in_date: '',
      lease_end_date: '',
      emergency_contact: '',
      emergency_phone: '',
      employer: '',
      occupation: '',
      avatar_url: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tenant?')) {
      await deleteTenant.mutateAsync(id);
    }
  };

  const handleSendInvite = async () => {
    if (!invitingTenant) return;
    
    setIsSendingInvite(true);
    try {
      if (!user) throw new Error('Not authenticated');

      const property = properties.find((p: any) => p.id === invitingTenant.property_id);

      console.log('Sending invite with origin:', window.location.origin);
      const { data, error } = await supabase.functions.invoke('send-tenant-invite', {
        body: {
          tenantId: invitingTenant.id,
          email: invitingTenant.email,
          landlordName: user?.email || 'Property Manager',
          propertyName: property?.name || 'Your Property',
          origin: window.location.origin,
        },
      });

      if (error) throw new Error(error.message || 'Failed to send invite');

      // Check if email was actually sent or if we need to show the link
      if (data?.emailSent === false && data?.inviteLink) {
        // Email failed (likely domain not verified), copy link instead
        await navigator.clipboard.writeText(data.inviteLink);
        toast({ 
          title: 'Email Not Sent - Link Copied!', 
          description: data.warning || 'Email service requires domain verification. The invite link has been copied to your clipboard - share it manually via WhatsApp, SMS, etc.',
          variant: 'default',
        });
      } else {
        toast({ title: 'Success', description: `Invite sent to ${invitingTenant.email}` });
      }
      
      setIsInviteDialogOpen(false);
      setInvitingTenant(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyInviteLink = async (tenant: any) => {
    setIsCopyingLink(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Generate a secure random token
      const token = crypto.randomUUID() + '-' + Date.now().toString(36);
      
      // Set expiry to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invite in database
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

      // Generate the invite link
      const inviteLink = `${window.location.origin}/tenant/signup?invite=${token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(inviteLink);
      
      toast({ 
        title: 'Link Copied!', 
        description: 'Invite link copied to clipboard. Share it with your tenant via WhatsApp, SMS, or any messaging app.' 
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsCopyingLink(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground">
            Manage tenant profiles and portal invitations
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
        <TabsList>
          <TabsTrigger value="tenants">All Tenants</TabsTrigger>
          <TabsTrigger value="invites">Portal Invites</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
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

      {/* Tenants Table */}
      {!isLoading && filteredTenants.length > 0 && (
        <div className="bg-card rounded-xl card-shadow-md overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Portal Status</TableHead>
                <TableHead>Lease Status</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant: any) => (
                <TableRow key={tenant.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(tenant.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{tenant.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {tenant.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {tenant.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">
                          {tenant.units ? `Unit ${tenant.units.unit_number}` : 'No unit'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.properties?.name || 'No property'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PortalStatusBadge 
                      tenantUserId={tenant.tenant_user_id}
                      hasPendingInvite={hasPendingInvite(tenant.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {getLeaseStatusBadge(tenant.lease_end_date)}
                  </TableCell>
                  <TableCell>
                    <span className={tenant.balance > 0 ? 'text-destructive font-medium' : 'text-success'}>
                      {formatCurrency(tenant.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
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
                            navigate(`/tenants/${tenant.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            navigate(`/tenants/${tenant.id}?edit=true`);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            navigate(`/tenants/${tenant.id}?tab=messages`);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" /> Send Message
                        </DropdownMenuItem>
                        {!tenant.tenant_user_id && (
                          <>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setInvitingTenant(tenant);
                                setIsInviteDialogOpen(true);
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" /> Send Portal Invite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                handleCopyInviteLink(tenant);
                              }}
                              disabled={isCopyingLink}
                            >
                              <Copy className="h-4 w-4 mr-2" /> Copy Invite Link
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => handleDelete(tenant.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No tenants found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or add a new tenant.
          </p>
        </div>
      )}
        </TabsContent>

        <TabsContent value="invites" className="mt-4">
          <InvitesManagement />
        </TabsContent>
      </Tabs>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Enter the tenant's information. They will receive an email invitation to set up their portal access.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Profile Photo</Label>
              <ImageUpload
                value={formData.avatar_url}
                onChange={(url) => setFormData({ ...formData, avatar_url: url || '' })}
                folder="tenants"
                placeholder="Upload tenant photo"
                aspectRatio="square"
                className="max-w-[150px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250 XXX XXX XXX"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@email.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-2">
                <Label>Unit</Label>
                <SearchableSelect
                  options={unitOptions}
                  value={formData.unit_id}
                  onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                  placeholder="Select unit..."
                  searchPlaceholder="Search units..."
                  disabled={!formData.property_id}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="monthly_rent">Monthly Rent</Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="security_deposit">Security Deposit</Label>
                <Input
                  id="security_deposit"
                  type="number"
                  value={formData.security_deposit}
                  onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="move_in_date">Move-in Date</Label>
                <Input
                  id="move_in_date"
                  type="date"
                  value={formData.move_in_date}
                  onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lease_end_date">Lease End Date</Label>
                <Input
                  id="lease_end_date"
                  type="date"
                  value={formData.lease_end_date}
                  onChange={(e) => setFormData({ ...formData, lease_end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency_phone">Emergency Phone</Label>
                <Input
                  id="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  placeholder="+250 XXX XXX XXX"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="employer">Employer</Label>
                <Input
                  id="employer"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="Job title"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createTenant.isPending}>
              {createTenant.isPending ? 'Adding...' : 'Add Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Send Portal Invite</DialogTitle>
            <DialogDescription>
              Send an email invitation to {invitingTenant?.name} to set up their tenant portal access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{invitingTenant?.email}</p>
                <p className="text-sm text-muted-foreground">Invitation will be sent to this email</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} disabled={isSendingInvite} className="gap-2">
              {isSendingInvite ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
