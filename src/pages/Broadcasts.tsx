import { useEffect, useMemo, useState } from 'react';
import { Building2, Eye, Megaphone, MoreHorizontal, Pencil, Plus, Send, Trash2, Users, Search } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBroadcastAnnouncements, useDeleteBroadcast, useSendBroadcast, useUpdateBroadcast, type Broadcast } from '@/hooks/useBroadcasts';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useMyCompanies } from '@/hooks/useCompanies';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { useStepUpGuard } from '@/hooks/useStepUpGuard';
import { logSecurityEvent } from '@/lib/security';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuth } from '@/contexts/useAuth';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';

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

const formatDateSafe = (dateString?: string | null) => {
  if (!dateString) return 'recently';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'recently';
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'unknown';
};

export default function Broadcasts() {
  const { user } = useAuth();
  const { isManager, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { companies, activeCompanyId } = useActiveCompany();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-broadcasts') as ViewMode) || 'table');
  const [search, setSearch] = useState('');
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

  useEffect(() => {
    localStorage.setItem('estatepro-view-broadcasts', view);
  }, [view]);

  const selectedPropertyId = propertyId === 'all' ? undefined : propertyId;
  const selectedUnitId = unitId === 'all' ? undefined : unitId;

  const { data: units = [] } = useUnits(selectedPropertyId);
  const unitRows = units as UnitRow[];
  const sendBroadcast = useSendBroadcast();
  const updateBroadcast = useUpdateBroadcast();
  const deleteBroadcast = useDeleteBroadcast();
  const { ensureAal2 } = useStepUpGuard();

  const activeCompanyName = useMemo(
    () => companies.find((company) => company.id === activeCompanyId)?.name || (activeCompanyId === 'all' ? 'All Organizations (Global Seer)' : 'No active company'),
    [companies, activeCompanyId]
  );

  const filteredBroadcasts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return broadcasts.filter((item) => {
      if (selectedOrgFilter !== 'all' && item.company_id && item.company_id !== selectedOrgFilter) {
        return false;
      }
      return !q || item.title.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
    });
  }, [broadcasts, search, selectedOrgFilter]);

  const paginatedBroadcasts = filteredBroadcasts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, selectedOrgFilter, pageSize]);

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Broadcasts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Send targeted announcements and review delivery history across organizations.</p>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />New broadcast
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-border/70 py-3">
        <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><div><p className="text-[11px] text-muted-foreground">Active Scope</p><p className="text-sm font-medium">{activeCompanyName}</p></div></div>
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-muted-foreground" /><div><p className="text-[11px] text-muted-foreground">Total Broadcasts</p><p className="text-sm font-medium">{broadcasts.length}</p></div></div>
        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><div><p className="text-[11px] text-muted-foreground">Default Reach</p><p className="text-sm font-medium">All users</p></div></div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-1 items-center gap-3 min-w-[240px] max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search broadcasts..." className="pl-9" />
          </div>

          {isSuperAdmin && companiesList.length > 0 && (
            <div className="w-48 sm:w-56 shrink-0">
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Organizations</SelectItem>
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
          <DialogFooter><Button variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button><Button onClick={handleSend} disabled={!title.trim() || !message.trim() || sendBroadcast.isPending || updateBroadcast.isPending}><Send className="h-4 w-4 mr-2" />{editingBroadcast ? (updateBroadcast.isPending ? 'Saving...' : 'Save changes') : (sendBroadcast.isPending ? 'Sending...' : 'Send broadcast')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingBroadcast)} onOpenChange={(open) => { if (!open) setViewingBroadcast(null); }}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{viewingBroadcast?.title}</DialogTitle><DialogDescription>{viewingBroadcast ? `${audienceLabel[viewingBroadcast.target_role]} · ${formatDateSafe(viewingBroadcast.created_at)}` : ''}</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{viewingBroadcast?.message}</p></DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingBroadcast)} onOpenChange={(open) => { if (!open) setDeletingBroadcast(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete broadcast?</AlertDialogTitle><AlertDialogDescription>This removes “{deletingBroadcast?.title}” from broadcast history. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteBroadcast.isPending} onClick={() => deletingBroadcast && deleteBroadcast.mutate(deletingBroadcast.id, { onSuccess: () => setDeletingBroadcast(null) })}>Delete broadcast</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {filteredBroadcasts.length === 0 && (
        <EmptyState icon={Megaphone} title="No broadcasts found" description="Send the first announcement for this company or adjust search filters." action={<Button size="sm" onClick={() => setComposerOpen(true)}><Plus className="h-4 w-4 mr-2" />New broadcast</Button>} />
      )}

      {/* Cards View */}
      {view === 'cards' && filteredBroadcasts.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedBroadcasts.map((item) => (
              <Card key={item.id} className="p-5 card-shadow-md hover:card-shadow-lg transition-all space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-base truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{audienceLabel[item.target_role]}</Badge>
                      <span className="text-[11px] text-muted-foreground">{item.unit_id ? 'Specific unit' : item.property_id ? 'Specific property' : 'All properties'}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewingBroadcast(item)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                      {item.created_by === user?.id && (
                        <>
                          <DropdownMenuItem onClick={() => openEditor(item)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingBroadcast(item)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{item.message}</p>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Sent {formatDateSafe(item.created_at)}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setViewingBroadcast(item)}>Read full</Button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredBroadcasts.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Compact View */}
      {view === 'compact' && filteredBroadcasts.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedBroadcasts.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate cursor-pointer hover:underline" onClick={() => setViewingBroadcast(item)}>
                      {item.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{audienceLabel[item.target_role]}</Badge>
                    <span className="text-[11px] text-muted-foreground">({item.unit_id ? 'Specific unit' : item.property_id ? 'Specific property' : 'All properties'})</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.message}</p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <span className="text-xs text-muted-foreground">{formatDateSafe(item.created_at)}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setViewingBroadcast(item)}>
                      View
                    </Button>
                    {item.created_by === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditor(item)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingBroadcast(item)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredBroadcasts.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Table View */}
      {view === 'table' && filteredBroadcasts.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Announcement</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBroadcasts.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="max-w-md">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.message}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{audienceLabel[item.target_role]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.unit_id ? 'Specific unit' : item.property_id ? 'Specific property' : 'All properties'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateSafe(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingBroadcast(item)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                          {item.created_by === user?.id && (
                            <>
                              <DropdownMenuItem onClick={() => openEditor(item)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeletingBroadcast(item)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 pt-0">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredBroadcasts.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}
    </div>
  );
}
