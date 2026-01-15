import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Plus, Pencil, Trash2, FileText, Eye, Send, CheckCircle, Clock, FileSignature, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SignaturePad, SignaturePadRef } from '@/components/ui/signature-pad';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { useLeases, useCreateLease, useUpdateLease, useDeleteLease, useSignLease, useUploadSignature, generateLeaseNumber } from '@/hooks/useLeases';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useCreateNotification } from '@/hooks/useNotifications';
import { useRef } from 'react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_signature: 'bg-warning/10 text-warning border-warning/20',
  active: 'bg-success/10 text-success border-success/20',
  expired: 'bg-destructive/10 text-destructive border-destructive/20',
  terminated: 'bg-muted text-muted-foreground',
};

interface LeaseFormData {
  tenant_id: string;
  property_id: string;
  unit_id: string;
  lease_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  terms: string;
  special_conditions: string;
}

const defaultFormData: LeaseFormData = {
  tenant_id: '',
  property_id: '',
  unit_id: '',
  lease_number: '',
  start_date: '',
  end_date: '',
  monthly_rent: 0,
  security_deposit: 0,
  terms: '',
  special_conditions: '',
};

const defaultLeaseTerms = `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is entered into between the Landlord and Tenant identified below.

1. PROPERTY: The Landlord agrees to rent to the Tenant, and the Tenant agrees to rent from the Landlord, the residential property described herein.

2. TERM: The lease shall commence on the start date and continue until the end date unless terminated earlier in accordance with the terms herein.

3. RENT: Tenant agrees to pay monthly rent on or before the 1st day of each month during the term of this lease.

4. SECURITY DEPOSIT: A security deposit shall be held by the Landlord as security for the faithful performance by Tenant of all terms, covenants, and conditions of this lease.

5. UTILITIES: Tenant shall be responsible for all utilities and services except as otherwise noted.

6. MAINTENANCE: Tenant shall maintain the premises in a clean and sanitary condition and shall not make any alterations without prior written consent of the Landlord.

7. DEFAULT: Failure to pay rent when due or violation of any other term of this lease may result in termination of the lease.`;

export default function Leases() {
  const { formatCurrency } = useSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<string | null>(null);
  const [viewingLease, setViewingLease] = useState<any>(null);
  const [signingLease, setSigningLease] = useState<any>(null);
  const [formData, setFormData] = useState<LeaseFormData>(defaultFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaseToDelete, setLeaseToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const { data: leases = [], isLoading } = useLeases();
  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const createLease = useCreateLease();
  const updateLease = useUpdateLease();
  const deleteLease = useDeleteLease();
  const signLease = useSignLease();
  const uploadSignature = useUploadSignature();
  const createNotification = useCreateNotification();

  const propertyOptions = properties.map(p => ({
    value: p.id,
    label: p.name,
    description: `${p.city}, ${p.country}`,
  }));

  const filteredUnits = formData.property_id 
    ? units.filter(u => u.property_id === formData.property_id)
    : units;

  const unitOptions = filteredUnits.map(u => ({
    value: u.id,
    label: u.unit_number,
    description: formatCurrency(u.rent_amount),
  }));

  const tenantOptions = tenants.map(t => ({
    value: t.id,
    label: t.name,
    description: t.email,
  }));

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = 
      lease.lease_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lease as any).tenants?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && lease.status === activeTab;
  });

  const handleOpenDialog = (lease?: any) => {
    if (lease) {
      setEditingLease(lease.id);
      setFormData({
        tenant_id: lease.tenant_id,
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        lease_number: lease.lease_number,
        start_date: lease.start_date,
        end_date: lease.end_date,
        monthly_rent: lease.monthly_rent,
        security_deposit: lease.security_deposit,
        terms: lease.terms || '',
        special_conditions: lease.special_conditions || '',
      });
    } else {
      setEditingLease(null);
      setFormData({
        ...defaultFormData,
        lease_number: generateLeaseNumber(),
        terms: defaultLeaseTerms,
      });
    }
    setIsDialogOpen(true);
  };

  const handlePropertyChange = (propertyId: string) => {
    setFormData(prev => ({
      ...prev,
      property_id: propertyId,
      unit_id: '',
    }));
  };

  const handleUnitChange = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    setFormData(prev => ({
      ...prev,
      unit_id: unitId,
      monthly_rent: unit?.rent_amount || prev.monthly_rent,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.tenant_id || !formData.property_id || !formData.unit_id || !formData.start_date || !formData.end_date) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    try {
      if (editingLease) {
        await updateLease.mutateAsync({ id: editingLease, ...formData });
      } else {
        await createLease.mutateAsync({
          ...formData,
          status: 'draft',
          landlord_signature_url: null,
          landlord_signed_at: null,
          tenant_signature_url: null,
          tenant_signed_at: null,
          document_url: null,
        });
      }
      setIsDialogOpen(false);
      setEditingLease(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error('Error saving lease:', error);
    }
  };

  const handleDelete = async () => {
    if (!leaseToDelete) return;
    try {
      await deleteLease.mutateAsync(leaseToDelete);
      setDeleteDialogOpen(false);
      setLeaseToDelete(null);
    } catch (error) {
      console.error('Error deleting lease:', error);
    }
  };

  const handleSendForSignature = async (lease: any) => {
    try {
      await updateLease.mutateAsync({ id: lease.id, status: 'pending_signature' });
      await createNotification.mutateAsync({
        title: 'Lease Sent for Signature',
        message: `Lease ${lease.lease_number} has been sent to ${(lease as any).tenants?.name} for signature.`,
        type: 'info',
        link: `/leases`,
      });
      toast({ title: 'Success', description: 'Lease sent for signature' });
    } catch (error) {
      console.error('Error sending for signature:', error);
    }
  };

  const handleSignLease = async () => {
    if (!signingLease || !signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({ title: 'Error', description: 'Please provide a signature', variant: 'destructive' });
      return;
    }

    try {
      const blob = await signaturePadRef.current.toBlob();
      if (!blob) {
        toast({ title: 'Error', description: 'Failed to capture signature', variant: 'destructive' });
        return;
      }

      const signatureUrl = await uploadSignature.mutateAsync({ leaseId: signingLease.id, signatureBlob: blob });
      await signLease.mutateAsync({ leaseId: signingLease.id, signatureUrl, signerType: 'landlord' });
      
      await createNotification.mutateAsync({
        title: 'Lease Signed',
        message: `Lease ${signingLease.lease_number} has been signed by the landlord.`,
        type: 'success',
        link: `/leases`,
      });

      setIsSignDialogOpen(false);
      setSigningLease(null);
    } catch (error) {
      console.error('Error signing lease:', error);
      toast({ title: 'Error', description: 'Failed to sign lease', variant: 'destructive' });
    }
  };

  const getLeaseStats = () => {
    const active = leases.filter(l => l.status === 'active').length;
    const pending = leases.filter(l => l.status === 'pending_signature').length;
    const expiringSoon = leases.filter(l => {
      if (l.status !== 'active') return false;
      const daysUntilExpiry = differenceInDays(new Date(l.end_date), new Date());
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length;
    return { active, pending, expiringSoon, total: leases.length };
  };

  const stats = getLeaseStats();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leases</h1>
          <p className="text-muted-foreground mt-1">Manage lease agreements, signatures, and renewals</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Lease
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leases</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Signature</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <FileSignature className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="pending_signature">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leases..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Leases Table */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle>Lease Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading leases...</div>
          ) : filteredLeases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leases found. Create one to get started.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lease #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property / Unit</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signatures</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map((lease) => {
                  const tenant = (lease as any).tenants;
                  const property = (lease as any).properties;
                  const unit = (lease as any).units;
                  const daysRemaining = differenceInDays(new Date(lease.end_date), new Date());

                  return (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">{lease.lease_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tenant?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{tenant?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{property?.name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{unit?.unit_number || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{format(new Date(lease.start_date), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">to {format(new Date(lease.end_date), 'MMM d, yyyy')}</p>
                          {lease.status === 'active' && daysRemaining > 0 && daysRemaining <= 30 && (
                            <Badge variant="outline" className="mt-1 bg-warning/10 text-warning text-xs">{daysRemaining} days left</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(lease.monthly_rent)}/mo</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[lease.status] || 'bg-muted'}>
                          {lease.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <div className={`w-3 h-3 rounded-full ${lease.landlord_signed_at ? 'bg-success' : 'bg-muted'}`} title={lease.landlord_signed_at ? 'Landlord signed' : 'Landlord not signed'} />
                          <div className={`w-3 h-3 rounded-full ${lease.tenant_signed_at ? 'bg-success' : 'bg-muted'}`} title={lease.tenant_signed_at ? 'Tenant signed' : 'Tenant not signed'} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setViewingLease(lease); setIsViewDialogOpen(true); }}>
                              <Eye className="h-4 w-4 mr-2" />View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenDialog(lease)}>
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            {lease.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSendForSignature(lease)}>
                                <Send className="h-4 w-4 mr-2" />Send for Signature
                              </DropdownMenuItem>
                            )}
                            {(lease.status === 'pending_signature' || lease.status === 'draft') && !lease.landlord_signed_at && (
                              <DropdownMenuItem onClick={() => { setSigningLease(lease); setIsSignDialogOpen(true); }}>
                                <FileSignature className="h-4 w-4 mr-2" />Sign as Landlord
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setLeaseToDelete(lease.id); setDeleteDialogOpen(true); }} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLease ? 'Edit Lease' : 'Create New Lease'}</DialogTitle>
            <DialogDescription>Fill in the lease agreement details.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Lease Number</Label>
                <Input value={formData.lease_number} onChange={(e) => setFormData({ ...formData, lease_number: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Tenant *</Label>
                <SearchableSelect options={tenantOptions} value={formData.tenant_id} onValueChange={(v) => setFormData({ ...formData, tenant_id: v })} placeholder="Select tenant..." searchPlaceholder="Search tenants..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Property *</Label>
                <SearchableSelect options={propertyOptions} value={formData.property_id} onValueChange={handlePropertyChange} placeholder="Select property..." searchPlaceholder="Search properties..." />
              </div>
              <div className="grid gap-2">
                <Label>Unit *</Label>
                <SearchableSelect options={unitOptions} value={formData.unit_id} onValueChange={handleUnitChange} placeholder="Select unit..." searchPlaceholder="Search units..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date *</Label>
                <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>End Date *</Label>
                <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Monthly Rent *</Label>
                <Input type="number" min="0" value={formData.monthly_rent || ''} onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label>Security Deposit</Label>
                <Input type="number" min="0" value={formData.security_deposit || ''} onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Terms & Conditions</Label>
              <Textarea rows={8} value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} placeholder="Enter lease terms..." />
            </div>

            <div className="grid gap-2">
              <Label>Special Conditions</Label>
              <Textarea rows={3} value={formData.special_conditions} onChange={(e) => setFormData({ ...formData, special_conditions: e.target.value })} placeholder="Any special conditions or notes..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createLease.isPending || updateLease.isPending}>
              {createLease.isPending || updateLease.isPending ? 'Saving...' : editingLease ? 'Update Lease' : 'Create Lease'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Lease Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lease Agreement - {viewingLease?.lease_number}</DialogTitle>
          </DialogHeader>
          {viewingLease && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Tenant</p>
                  <p className="font-medium">{(viewingLease as any).tenants?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Property/Unit</p>
                  <p className="font-medium">{(viewingLease as any).properties?.name} - {(viewingLease as any).units?.unit_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{format(new Date(viewingLease.start_date), 'MMM d, yyyy')} - {format(new Date(viewingLease.end_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rent</p>
                  <p className="font-medium">{formatCurrency(viewingLease.monthly_rent)}/month</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Terms & Conditions</h4>
                <div className="p-4 bg-card border rounded-lg whitespace-pre-wrap text-sm">{viewingLease.terms || 'No terms specified'}</div>
              </div>
              {viewingLease.special_conditions && (
                <div>
                  <h4 className="font-medium mb-2">Special Conditions</h4>
                  <div className="p-4 bg-card border rounded-lg whitespace-pre-wrap text-sm">{viewingLease.special_conditions}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Landlord Signature</p>
                  {viewingLease.landlord_signature_url ? (
                    <div>
                      <img src={viewingLease.landlord_signature_url} alt="Landlord Signature" className="max-h-20" />
                      <p className="text-xs text-muted-foreground mt-1">Signed: {format(new Date(viewingLease.landlord_signed_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not signed yet</p>
                  )}
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Tenant Signature</p>
                  {viewingLease.tenant_signature_url ? (
                    <div>
                      <img src={viewingLease.tenant_signature_url} alt="Tenant Signature" className="max-h-20" />
                      <p className="text-xs text-muted-foreground mt-1">Signed: {format(new Date(viewingLease.tenant_signed_at), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not signed yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign Lease Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sign Lease Agreement</DialogTitle>
            <DialogDescription>Lease #{signingLease?.lease_number} - Sign as Landlord</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Your Signature</Label>
            <SignaturePad ref={signaturePadRef} width={400} height={150} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSignLease} disabled={signLease.isPending || uploadSignature.isPending}>
              {signLease.isPending || uploadSignature.isPending ? 'Signing...' : 'Apply Signature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lease</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this lease? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
