import { useState } from 'react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import {
  Mail,
  Trash2,
  RefreshCw,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { useTenantInvites, useDeleteTenantInvite, useCreateTenantInvite } from '@/hooks/useTenantInvites';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProperties } from '@/hooks/useProperties';

const getInviteStatus = (invite: any) => {
  if (invite.used_at) {
    return { label: 'Used', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle };
  }
  if (isPast(new Date(invite.expires_at))) {
    return { label: 'Expired', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle };
  }
  return { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock };
};

export function InvitesManagement() {
  const { user } = useAuth();
  const { data: invites = [], isLoading } = useTenantInvites();
  const { data: properties = [] } = useProperties();
  const deleteInvite = useDeleteTenantInvite();
  const createInvite = useCreateTenantInvite();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const handleCopyLink = async (token: string) => {
    const inviteLink = `${window.location.origin}/tenant/signup?invite=${token}`;
    await navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard' });
  };

  const handleResendInvite = async (invite: any) => {
    setResending(invite.id);
    try {
      // First, delete the old invite
      await deleteInvite.mutateAsync(invite.id);
      
      // Create a new invite
      const result = await createInvite.mutateAsync({
        tenantId: invite.tenant_id,
        email: invite.email,
      });

      // Try to send email
      const property = properties.find((p: any) => p.id === invite.tenants?.property_id);
      const { data, error } = await supabase.functions.invoke('send-tenant-invite', {
        body: {
          tenantId: invite.tenant_id,
          email: invite.email,
          landlordName: user?.email || 'Property Manager',
          propertyName: property?.name || 'Your Property',
          origin: window.location.origin,
        },
      });

      if (data?.emailSent === false && data?.inviteLink) {
        await navigator.clipboard.writeText(data.inviteLink);
        toast({
          title: 'Link Copied!',
          description: 'Email service unavailable. The new invite link has been copied to your clipboard.',
        });
      } else {
        toast({ title: 'Success', description: 'Invite resent successfully' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setResending(null);
    }
  };

  const handleDeleteInvite = async () => {
    if (!inviteToDelete) return;
    await deleteInvite.mutateAsync(inviteToDelete);
    setDeleteDialogOpen(false);
    setInviteToDelete(null);
  };

  const pendingCount = invites.filter((i: any) => !i.used_at && !isPast(new Date(i.expires_at))).length;
  const usedCount = invites.filter((i: any) => i.used_at).length;
  const expiredCount = invites.filter((i: any) => !i.used_at && isPast(new Date(i.expires_at))).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold text-warning">{pendingCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold text-success">{usedCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invites Table */}
      <Card className="card-shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Tenant Invites
          </CardTitle>
          <CardDescription>
            Manage pending, used, and expired tenant portal invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No invites sent yet</h3>
              <p className="text-muted-foreground mt-1">
                Send invites from the Tenants page to allow tenants to access their portal.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite: any) => {
                  const status = getInviteStatus(invite);
                  const StatusIcon = status.icon;
                  const isExpiredOrUsed = invite.used_at || isPast(new Date(invite.expires_at));

                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">
                        {invite.tenants?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invite.used_at 
                          ? `Used ${format(new Date(invite.used_at), 'MMM d, yyyy')}`
                          : format(new Date(invite.expires_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!invite.used_at && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopyLink(invite.token)}
                                title="Copy invite link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleResendInvite(invite)}
                                disabled={resending === invite.id}
                                title="Resend invite"
                              >
                                {resending === invite.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setInviteToDelete(invite.id);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete invite"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invite. The tenant will no longer be able to use this link to register.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
