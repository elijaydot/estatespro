import { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, Megaphone, MoreHorizontal, Pencil, Plus, Send, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBroadcastAnnouncements, useDeleteBroadcast, useSendBroadcast, useUpdateBroadcast, type Broadcast } from '@/hooks/useBroadcasts';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { useStepUpGuard } from '@/hooks/useStepUpGuard';
import { logSecurityEvent } from '@/lib/security';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuth } from '@/contexts/useAuth';

const audienceLabel: Record<string, string> = {
  all: 'All users',
  landlord: 'Landlords only',
  property_manager: 'Property managers only',
  tenant: 'Tenants only',
};

type BroadcastRole = 'all' | 'landlord' | 'property_manager' | 'tenant';

type UnitRow = {
  id: string;
  unit_number: string;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'unknown';
};

export default function Broadcasts() {
  const { user } = useAuth();
  const { isManager, isLoading: roleLoading } = useUserRole();
  const { companies, activeCompanyId } = useActiveCompany();
  const { data: broadcasts = [], isLoading } = useBroadcastAnnouncements();
  const { data: properties = [] } = useProperties();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<BroadcastRole>('all');
  const [propertyId, setPropertyId] = useState<string>('all');
  const [unitId, setUnitId] = useState<string>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [viewingBroadcast, setViewingBroadcast] = useState<Broadcast | null>(null);
  const [deletingBroadcast, setDeletingBroadcast] = useState<Broadcast | null>(null);

  const selectedPropertyId = propertyId === 'all' ? undefined : propertyId;
  const selectedUnitId = unitId === 'all' ? undefined : unitId;

  const { data: units = [] } = useUnits(selectedPropertyId);
  const unitRows = units as UnitRow[];
  const sendBroadcast = useSendBroadcast();
  const updateBroadcast = useUpdateBroadcast();
  const deleteBroadcast = useDeleteBroadcast();
  const { ensureAal2 } = useStepUpGuard();

  const activeCompanyName = useMemo(
    () => companies.find((company) => company.id === activeCompanyId)?.name || 'No active company',
    [companies, activeCompanyId]
  );
  const paginatedBroadcasts = broadcasts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const resetComposer = () => {
    setTitle('');
    setMessage('');
    setTargetRole('all');
    setPropertyId('all');
    setUnitId('all');
    setEditingBroadcast(null);
  };

  const openEditor = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast);
    setTitle(broadcast.title);
    setMessage(broadcast.message);
    setTargetRole(broadcast.target_role);
    setPropertyId(broadcast.property_id || 'all');
    setUnitId(broadcast.unit_id || 'all');
    setComposerOpen(true);
  };

  const handleSend = async () => {
    const canProceed = await ensureAal2(editingBroadcast ? 'broadcasts.update' : 'broadcasts.send');
    if (!canProceed) return;

    if (editingBroadcast) {
      updateBroadcast.mutate({
        id: editingBroadcast.id,
        title: title.trim(),
        message: message.trim(),
        target_role: targetRole,
        property_id: selectedPropertyId || null,
        unit_id: selectedUnitId || null,
      }, {
        onSuccess: () => {
          resetComposer();
          setComposerOpen(false);
        },
      });
      return;
    }

    sendBroadcast.mutate({
      title,
      message,
      targetRole,
      propertyId: selectedPropertyId,
      unitId: selectedUnitId,
    }, {
      onSuccess: async () => {
        await logSecurityEvent('broadcast_sent', {
          targetRole,
          propertyId: selectedPropertyId || null,
          unitId: selectedUnitId || null,
        });
        resetComposer();
        setComposerOpen(false);
      },
      onError: async (error: unknown) => {
        await logSecurityEvent('broadcast_send_failed', {
          targetRole,
          reason: getErrorMessage(error),
        });
      },
    });

  };

  if (roleLoading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!isManager) {
    return (
      <div className="py-10 text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">Access restricted</p>
        <p className="text-sm text-muted-foreground">Only super admins, landlords, and property managers can send broadcasts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Broadcasts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Send targeted announcements and review delivery history.</p>
        </div>
        <Button onClick={() => setComposerOpen(true)}><Plus className="h-4 w-4" />New broadcast</Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-border/70 py-3">
        <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><div><p className="text-[11px] text-muted-foreground">Company</p><p className="text-sm font-medium">{activeCompanyName}</p></div></div>
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-muted-foreground" /><div><p className="text-[11px] text-muted-foreground">Sent broadcasts</p><p className="text-sm font-medium">{broadcasts.length}</p></div></div>
        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><div><p className="text-[11px] text-muted-foreground">Default reach</p><p className="text-sm font-medium">All users</p></div></div>
      </div>

      <Dialog open={composerOpen} onOpenChange={(open) => { setComposerOpen(open); if (!open && !sendBroadcast.isPending && !updateBroadcast.isPending) resetComposer(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editingBroadcast ? 'Edit broadcast' : 'New broadcast'}</DialogTitle><DialogDescription>{editingBroadcast ? 'Changes update the announcement record visible in this workspace.' : 'Write the announcement, then narrow its audience only when necessary.'}</DialogDescription></DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A short, specific announcement title" /></div>
            <div className="space-y-2"><div className="flex items-center justify-between"><Label>Message</Label><span className="text-xs text-muted-foreground">{message.length} characters</span></div><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write the announcement recipients should act on..." rows={7} /></div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2"><Label>Audience</Label><Select value={targetRole} onValueChange={(value) => setTargetRole(value as BroadcastRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All users</SelectItem><SelectItem value="landlord">Landlords only</SelectItem><SelectItem value="property_manager">Property managers only</SelectItem><SelectItem value="tenant">Tenants only</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Property</Label><Select value={propertyId} onValueChange={(value) => { setPropertyId(value); setUnitId('all'); }}><SelectTrigger><SelectValue placeholder="All properties" /></SelectTrigger><SelectContent><SelectItem value="all">All properties</SelectItem>{properties.map((property: Property) => <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Unit</Label><Select value={unitId} onValueChange={setUnitId} disabled={!selectedPropertyId}><SelectTrigger><SelectValue placeholder={selectedPropertyId ? 'All units' : 'Select property first'} /></SelectTrigger><SelectContent><SelectItem value="all">All units</SelectItem>{unitRows.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.unit_number}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/30 p-3"><Users className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Audience preview</p><p className="mt-0.5 text-xs text-muted-foreground">{audienceLabel[targetRole]} · {selectedPropertyId ? properties.find((property) => property.id === selectedPropertyId)?.name : 'All properties'} · {selectedUnitId ? unitRows.find((unit) => unit.id === selectedUnitId)?.unit_number : 'All units'}</p></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button><Button onClick={handleSend} disabled={!title.trim() || !message.trim() || sendBroadcast.isPending || updateBroadcast.isPending || !activeCompanyId}><Send className="h-4 w-4" />{editingBroadcast ? (updateBroadcast.isPending ? 'Saving...' : 'Save changes') : (sendBroadcast.isPending ? 'Sending...' : 'Send broadcast')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingBroadcast)} onOpenChange={(open) => { if (!open) setViewingBroadcast(null); }}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{viewingBroadcast?.title}</DialogTitle><DialogDescription>{viewingBroadcast ? `${audienceLabel[viewingBroadcast.target_role]} · ${formatDistanceToNow(new Date(viewingBroadcast.created_at), { addSuffix: true })}` : ''}</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{viewingBroadcast?.message}</p></DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingBroadcast)} onOpenChange={(open) => { if (!open) setDeletingBroadcast(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete broadcast?</AlertDialogTitle><AlertDialogDescription>This removes “{deletingBroadcast?.title}” from broadcast history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteBroadcast.isPending} onClick={() => deletingBroadcast && deleteBroadcast.mutate(deletingBroadcast.id, { onSuccess: () => setDeletingBroadcast(null) })}>Delete broadcast</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div><CardTitle className="text-base">Broadcast history</CardTitle><CardDescription className="mt-1">Announcements sent for the active company.</CardDescription></div>
            <Badge variant="outline">{broadcasts.length} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading broadcasts...</p> : broadcasts.length === 0 ? (
            <EmptyState icon={Megaphone} title="No broadcasts yet" description="Send the first announcement for this company." action={<Button size="sm" onClick={() => setComposerOpen(true)}><Plus className="h-4 w-4" />New broadcast</Button>} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2.5">Announcement</th><th className="px-3 py-2.5">Audience</th><th className="px-3 py-2.5">Scope</th><th className="px-3 py-2.5">Sent</th><th className="w-12 px-3 py-2.5"><span className="sr-only">Actions</span></th></tr></thead><tbody>
                {paginatedBroadcasts.map((item) => <tr key={item.id} className="border-t border-border/60"><td className="max-w-xl px-3 py-3"><p className="font-medium">{item.title}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.message}</p></td><td className="px-3 py-3"><Badge variant="secondary">{audienceLabel[item.target_role]}</Badge></td><td className="px-3 py-3 text-xs text-muted-foreground">{item.unit_id ? 'Specific unit' : item.property_id ? 'Specific property' : 'All properties'}</td><td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground" title={new Date(item.created_at).toLocaleString()}>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</td><td className="px-3 py-3"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${item.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewingBroadcast(item)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>{item.created_by === user?.id && <><DropdownMenuItem onClick={() => openEditor(item)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => setDeletingBroadcast(item)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></td></tr>)}
              </tbody></table>
              <TablePagination page={page} pageSize={pageSize} total={broadcasts.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
