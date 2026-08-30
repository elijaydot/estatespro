import { useState } from 'react';
import { 
  Users, UserPlus, Building2, Shield, Clock, CheckCircle2, 
  XCircle, Copy, Ban, MapPin, Loader2, Plus, Trash2, Pencil, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useMyCompanies,
  useCompanyMembers,
  useUpdateMemberStatus,
  useAssignPMToProperty,
  useRemovePMAssignment,
  usePMAssignments,
  useCreatePMInvite,
  usePMInvites,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  useRemoveCompanyMember,
  type Company,
  type PropertyAssignment,
} from '@/hooks/useCompanies';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useStepUpGuard } from '@/hooks/useStepUpGuard';
import { logSecurityEvent } from '@/lib/security';
import { useConfirmAction } from '@/components/ui/use-confirm-action';

type PropertyRow = Property & { company_id?: string | null };

type PmInvite = {
  id: string;
  token?: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export default function TeamManagement() {
  const { isLandlord, isSuperAdmin } = useUserRole();
  const { data: companies, isLoading: loadingCompanies } = useMyCompanies();
  const { activeCompanyId, setActiveCompanyId, defaultCompanyId, setDefaultCompanyId } = useActiveCompany();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [assignManagerId, setAssignManagerId] = useState('');
  const [assignPropertyId, setAssignPropertyId] = useState('');
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string; email: string; phone: string; address: string } | null>(null);
  const [savingDefaultCompanyId, setSavingDefaultCompanyId] = useState<string | null>(null);
  const resolvedCompanyId = activeCompanyId || '';
  
  const { data: members, isLoading: loadingMembers } = useCompanyMembers(resolvedCompanyId);
  const { data: assignments } = usePMAssignments(resolvedCompanyId);
  const { data: invites } = usePMInvites(resolvedCompanyId);
  const { data: properties } = useProperties();
  
  const updateStatus = useUpdateMemberStatus();
  const assignPM = useAssignPMToProperty();
  const removeAssignment = useRemovePMAssignment();
  const createInvite = useCreatePMInvite();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const removeMember = useRemoveCompanyMember();
  const { ensureAal2 } = useStepUpGuard();
  const confirmAction = useConfirmAction();

  const approvedMembers = members?.filter(m => m.status === 'approved') || [];
  const pendingMembers = members?.filter(m => m.status === 'pending') || [];
  const deactivatedMembers = members?.filter(m => m.status === 'deactivated') || [];

  // Company properties (those with company_id set)
  const propertyRows = (properties || []) as PropertyRow[];
  const companyProperties = resolvedCompanyId === 'all'
    ? propertyRows
    : propertyRows.filter((p) => p.company_id === resolvedCompanyId);

  const handleInvite = async () => {
    const canProceed = await ensureAal2('team.invite_manager');
    if (!canProceed) return;

    if (!inviteEmail || !resolvedCompanyId) return;
    const result = await createInvite.mutateAsync({ companyId: resolvedCompanyId, email: inviteEmail });
    const appUrl = window.location.origin;
    const inviteUrl = `${appUrl}/signup?pm_invite=${result.token}`;
    await navigator.clipboard.writeText(inviteUrl);
    await logSecurityEvent('team_invite_created', { companyId: resolvedCompanyId, email: inviteEmail });
    toast({ title: 'Invite link copied!', description: `Invite link for ${inviteEmail} has been copied to clipboard.` });
    setInviteEmail('');
    setInviteDialogOpen(false);
  };

  const handleAssign = async () => {
    const canProceed = await ensureAal2('team.assign_property_manager');
    if (!canProceed) return;

    if (!assignManagerId || !assignPropertyId || !resolvedCompanyId) return;
    await assignPM.mutateAsync({
      companyId: resolvedCompanyId,
      propertyId: assignPropertyId,
      managerId: assignManagerId,
    });
    await logSecurityEvent('team_assignment_created', {
      companyId: resolvedCompanyId,
      managerId: assignManagerId,
      propertyId: assignPropertyId,
    });
    setAssignManagerId('');
    setAssignPropertyId('');
  };

  const handleCreateCompany = async () => {
    const canProceed = await ensureAal2('team.create_company');
    if (!canProceed) return;

    if (!newCompanyName.trim()) return;
    const created = await createCompany.mutateAsync({ name: newCompanyName.trim() });
    await logSecurityEvent('company_created', { companyId: created?.id || null, name: newCompanyName.trim() });
    setNewCompanyName('');
    setCompanyDialogOpen(false);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany({
      id: company.id,
      name: company.name || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
    });
    setEditCompanyDialogOpen(true);
  };

  const handleUpdateCompany = async () => {
    const canProceed = await ensureAal2('team.update_company');
    if (!canProceed) return;

    if (!editingCompany) return;
    await updateCompany.mutateAsync({
      companyId: editingCompany.id,
      data: {
        name: editingCompany.name,
        email: editingCompany.email || null,
        phone: editingCompany.phone || null,
        address: editingCompany.address || null,
      },
    });
    await logSecurityEvent('company_updated', {
      companyId: editingCompany.id,
      name: editingCompany.name,
    });
    setEditCompanyDialogOpen(false);
    setEditingCompany(null);
  };

  const handleDeleteCompany = async (company: Company) => {
    const canProceed = await ensureAal2('team.delete_company');
    if (!canProceed) return;

    const confirmed = await confirmAction({
      title: 'Delete company?',
      description: `Delete "${company.name}" and remove its members and assignments? This action cannot be undone.`,
      confirmLabel: 'Delete company',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteCompany.mutateAsync(company.id);
    await logSecurityEvent('company_deleted', { companyId: company.id, name: company.name });
    if (resolvedCompanyId === company.id) {
      setActiveCompanyId(null);
    }
  };

  const handleSetDefaultCompany = async (company: Company) => {
    setSavingDefaultCompanyId(company.id);
    try {
      await setDefaultCompanyId(company.id);
      setActiveCompanyId(company.id);
      toast({ title: 'Login company updated', description: `${company.name} will open automatically when you sign in.` });
    } catch (error) {
      toast({ title: 'Unable to update login company', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSavingDefaultCompanyId(null);
    }
  };

  const handleUpdateMemberStatus = async (memberId: string, status: string) => {
    const canProceed = await ensureAal2('team.update_member_status');
    if (!canProceed) return;

    await updateStatus.mutateAsync({ memberId, status });
    await logSecurityEvent('team_member_status_updated', { memberId, status });
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const canProceed = await ensureAal2('team.remove_member');
    if (!canProceed) return;

    const confirmed = await confirmAction({
      title: 'Remove team member?',
      description: `Remove ${memberName || 'this manager'} from the company? This action cannot be undone.`,
      confirmLabel: 'Remove member',
      destructive: true,
    });
    if (!confirmed) return;
    await removeMember.mutateAsync(memberId);
    await logSecurityEvent('team_member_removed', { memberId, memberName });
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const canProceed = await ensureAal2('team.remove_assignment');
    if (!canProceed) return;

    await removeAssignment.mutateAsync(assignmentId);
    await logSecurityEvent('team_assignment_removed', { assignmentId });
  };

  const handleCopyInviteLink = async (invite: PmInvite) => {
    const canProceed = await ensureAal2('team.copy_invite_link');
    if (!canProceed) return;

    const url = `${window.location.origin}/signup?pm_invite=${invite.token}`;
    await navigator.clipboard.writeText(url);
    await logSecurityEvent('team_invite_link_copied', { inviteId: invite.id, email: invite.email });
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="text-success border-success"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'deactivated': return <Badge variant="secondary"><Ban className="h-3 w-3 mr-1" />Deactivated</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isLandlord && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">Only landlords and super admins can manage teams and property assignments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingCompanies) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage property managers and property assignments</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
          <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 w-full md:w-auto">
                <Building2 className="h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>Add another company or portfolio to manage</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Company name..." />
                </div>
                <Button onClick={handleCreateCompany} disabled={!newCompanyName.trim()} className="w-full">Create Company</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full md:w-auto">
                <UserPlus className="h-4 w-4" />
                Invite Manager
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Property Manager</DialogTitle>
                <DialogDescription>Send an invite link to a property manager to join your company</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="manager@email.com" />
                </div>
                <Button onClick={handleInvite} disabled={!inviteEmail || createInvite.isPending} className="w-full gap-2">
                  {createInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Generate & Copy Invite Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Company Selector */}
      {companies && companies.length > 1 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full max-w-md space-y-1.5">
                <Label>Active company</Label>
                <Select value={resolvedCompanyId} onValueChange={setActiveCompanyId}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{defaultCompanyId === c.id ? ' · Login default' : ''}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Active changes this workspace now. Login default controls which company opens next time you sign in.</p>
              </div>
              <Button variant={defaultCompanyId === resolvedCompanyId ? 'secondary' : 'outline'} disabled={!resolvedCompanyId || defaultCompanyId === resolvedCompanyId || savingDefaultCompanyId !== null} onClick={() => { const company = companies.find((item) => item.id === resolvedCompanyId); if (company) void handleSetDefaultCompany(company); }}>
                {savingDefaultCompanyId === resolvedCompanyId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                {defaultCompanyId === resolvedCompanyId ? 'Login default' : 'Set active as login default'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="members" className="space-y-4">
        <div className="w-full overflow-x-auto pb-1">
        <TabsList className="min-w-max">
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
            {pendingMembers.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {pendingMembers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <MapPin className="h-4 w-4" />
            Property Assignments
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invites
          </TabsTrigger>
          <TabsTrigger value="companies" className="gap-2">
            <Building2 className="h-4 w-4" />
            Companies ({companies?.length || 0})
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {/* Pending Applications */}
          {pendingMembers.length > 0 && (
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  Pending Applications ({pendingMembers.length})
                </CardTitle>
                <CardDescription>Property managers awaiting your approval</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingMembers.map(member => (
                  <div key={member.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.profiles?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleUpdateMemberStatus(member.id, 'approved')}
                        disabled={updateStatus.isPending}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleUpdateMemberStatus(member.id, 'rejected')}
                        disabled={updateStatus.isPending}
                        className="gap-1"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Approved Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Managers ({approvedMembers.length})</CardTitle>
              <CardDescription>Approved property managers in your company</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No approved managers yet. Invite or approve pending applications.</p>
              ) : (
                <div className="space-y-3">
                  {approvedMembers.map(member => {
                    const memberAssignments = assignments?.filter(a => a.manager_id === member.user_id) || [];
                    return (
                      <div key={member.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-success/10 text-success">
                                {member.profiles?.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.profiles?.name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                              {memberAssignments.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {memberAssignments.map(a => (
                                    <Badge key={a.id} variant="secondary" className="text-xs">
                                      {a.properties?.name || 'Property'}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {getStatusBadge(member.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-warning hover:text-warning"
                              onClick={() => void handleUpdateMemberStatus(member.id, 'deactivated')}
                            >
                              <Ban className="h-3 w-3 mr-1" /> Deactivate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleRemoveMember(member.id, member.profiles?.name || 'this manager')}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deactivated */}
          {deactivatedMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">Deactivated ({deactivatedMembers.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deactivatedMembers.map(member => (
                  <div key={member.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="opacity-50">
                        <AvatarFallback>{member.profiles?.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="opacity-60">
                        <p className="font-medium">{member.profiles?.name}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleUpdateMemberStatus(member.id, 'approved')}
                    >
                      Reactivate
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Property Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assign Manager to Property</CardTitle>
              <CardDescription>Link approved managers to specific properties they should manage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Property Manager</Label>
                  <Select value={assignManagerId} onValueChange={setAssignManagerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedMembers.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profiles?.name || m.profiles?.email || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select value={assignPropertyId} onValueChange={setAssignPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companyProperties.length > 0 ? (
                        companyProperties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                      ) : (
                        // Show all properties if none have company_id yet
                        propertyRows.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    onClick={handleAssign} 
                    disabled={!assignManagerId || !assignPropertyId || assignPM.isPending}
                    className="w-full gap-2"
                  >
                    <Plus className="h-4 w-4" /> Assign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {!assignments || assignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No property assignments yet.</p>
              ) : (
                <div className="space-y-3">
                  {assignments.map(assignment => {
                    const member = members?.find(m => m.user_id === assignment.manager_id);
                    return (
                      <div key={assignment.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member?.profiles?.name?.charAt(0) || 'M'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member?.profiles?.name || 'Unknown Manager'}</p>
                            <p className="text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {assignment.properties?.name || 'Unknown Property'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => void handleRemoveAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sent Invites</CardTitle>
              <CardDescription>Track invite links sent to property managers</CardDescription>
            </CardHeader>
            <CardContent>
              {!invites || invites.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invites sent yet.</p>
              ) : (
                <div className="space-y-3">
                  {(invites as PmInvite[]).map((invite) => (
                    <div key={invite.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent: {new Date(invite.created_at).toLocaleDateString()}
                          {' - '}
                          Expires: {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      {invite.used_at ? (
                        <Badge variant="outline" className="text-success border-success">Used</Badge>
                      ) : new Date(invite.expires_at) < new Date() ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => void handleCopyInviteLink(invite)}
                        >
                          <Copy className="h-3 w-3" /> Copy Link
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Companies</CardTitle>
              <CardDescription>Manage your companies and portfolios</CardDescription>
            </CardHeader>
            <CardContent>
              {!companies || companies.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No companies yet. Click "Add Company" to create one.</p>
              ) : (
                <div className="space-y-3">
                  {companies.map(company => {
                    const memberCount = members?.filter(m => m.status === 'approved').length || 0;
                    const propCount = companyProperties.length;
                    return (
                      <div key={company.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{company.name}</p>
                              <div className="flex gap-3 text-sm text-muted-foreground">
                                {company.email && <span>{company.email}</span>}
                                {company.phone && <span>- {company.phone}</span>}
                              </div>
                              {company.address && (
                                <p className="text-xs text-muted-foreground">{company.address}</p>
                              )}
                              <div className="flex gap-2 mt-1">
                                {defaultCompanyId === company.id && <Badge className="text-xs"><Star className="mr-1 h-3 w-3 fill-current" />Login default</Badge>}
                                {resolvedCompanyId === company.id && (
                                  <>
                                    <Badge variant="secondary" className="text-xs">{memberCount} managers</Badge>
                                    <Badge variant="secondary" className="text-xs">{propCount} properties</Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {defaultCompanyId !== company.id && (
                              <Button size="sm" variant="outline" className="gap-1" disabled={savingDefaultCompanyId !== null} onClick={() => void handleSetDefaultCompany(company)}>
                                {savingDefaultCompanyId === company.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />} Set as login default
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleEditCompany(company)}
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCompany(company)}
                              disabled={deleteCompany.isPending}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Company Dialog */}
      <Dialog open={editCompanyDialogOpen} onOpenChange={setEditCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company details</DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  placeholder="Company name..."
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingCompany.email}
                  onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                  placeholder="company@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editingCompany.phone}
                  onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editingCompany.address}
                  onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  placeholder="Company address..."
                />
              </div>
              <Button
                onClick={handleUpdateCompany}
                disabled={!editingCompany.name.trim() || updateCompany.isPending}
                className="w-full"
              >
                {updateCompany.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

