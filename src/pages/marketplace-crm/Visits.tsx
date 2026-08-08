import { useMemo, useState } from 'react';
import { ExternalLink, MapPinPlus } from 'lucide-react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { DocumentUploader } from '@/components/marketplace-crm/DocumentUploader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmAssignableUsers } from '@/hooks/useMarketplace';
import { useCreateCrmVisit, useCrmDeals, useCrmVisits, useUpdateCrmVisit } from '@/hooks/useMarketplaceCrm';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';

function VisitProofLink({ path }: { path: string }) {
  const { signedUrl, isLoading } = useSignedUrl('crm-documents', path);
  if (isLoading) return <span className="text-xs text-muted-foreground">Preparing...</span>;
  if (!signedUrl) return <span className="text-xs text-muted-foreground">Unavailable</span>;
  return <a className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" href={signedUrl} target="_blank" rel="noreferrer">View evidence<ExternalLink className="h-3.5 w-3.5" /></a>;
}

export default function MarketplaceCrmVisitsPage() {
  const { activeCompanyId } = useActiveCompany();
  const visitsQuery = useCrmVisits(activeCompanyId);
  const dealsQuery = useCrmDeals(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const createVisit = useCreateCrmVisit(activeCompanyId);
  const updateVisit = useUpdateCrmVisit(activeCompanyId);

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'upcoming' | 'in_progress' | 'completed'>('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [relatedDealId, setRelatedDealId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [completingVisitId, setCompletingVisitId] = useState<string | null>(null);
  const [proofPath, setProofPath] = useState('');
  const [outcome, setOutcome] = useState('');
  const [proofUploadResetKey, setProofUploadResetKey] = useState(0);

  const rows = useMemo(() => {
    const records = visitsQuery.data || [];
    const query = search.toLowerCase().trim();
    return records.filter((row) => (
      (!query || (`${row.locality || ''} ${row.address_text || ''} ${row.status} ${row.notes || ''}`).toLowerCase().includes(query))
      && (view === 'upcoming' ? row.status === 'planned' : row.status === view)
    ));
  }, [search, view, visitsQuery.data]);

  const create = () => {
    if (!locality.trim() || !scheduledAt) return;
    createVisit.mutate({
      related_type: 'deal',
      related_id: relatedDealId || null,
      locality: locality.trim(),
      address_text: address.trim() || null,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      assigned_to: assignedTo || null,
      status: 'planned',
      check_in_at: null,
      check_in_lat: null,
      check_in_lng: null,
      check_out_at: null,
      proof_path: null,
      outcome: null,
      notes: visitNotes.trim() || null,
      created_by: null,
    }, { onSuccess: () => {
      setLocality(''); setAddress(''); setScheduledAt(''); setRelatedDealId(''); setAssignedTo(''); setVisitNotes(''); setCreateOpen(false);
    } });
  };

  const startVisit = (visitId: string) => {
    if (!navigator.geolocation) {
      toast({ title: 'Location unavailable', description: 'This browser cannot capture the GPS location required for check-in.', variant: 'destructive' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateVisit.mutate({
          visitId,
          payload: {
            status: 'in_progress',
            check_in_at: new Date().toISOString(),
            check_in_lat: coords.latitude,
            check_in_lng: coords.longitude,
          },
        });
      },
      () => {
        toast({ title: 'Check-in needs your location', description: 'Allow location access and try again. FishGate records GPS evidence for every field check-in.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const completeVisit = (visitId: string) => {
    if (!proofPath.trim() || !outcome.trim()) return;

    updateVisit.mutate({
      visitId,
      payload: {
        status: 'completed',
        check_out_at: new Date().toISOString(),
        proof_path: proofPath.trim(),
        outcome: outcome.trim(),
      },
    }, {
      onSuccess: () => {
        setCompletingVisitId(null);
        setProofPath('');
        setOutcome('');
        setProofUploadResetKey((current) => current + 1);
      },
    });
  };

  const cancelVisit = (visitId: string) => {
    updateVisit.mutate({
      visitId,
      payload: {
        status: 'canceled',
      },
    });
  };

  const closeCompletion = async () => {
    const abandonedPath = proofPath;
    setCompletingVisitId(null);
    setProofPath('');
    setOutcome('');
    setProofUploadResetKey((current) => current + 1);
    if (abandonedPath) {
      const { error } = await supabase.storage.from('crm-documents').remove([abandonedPath]);
      if (error) toast({ title: 'Evidence cleanup failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <CrmWorkspace title="Visits" subtitle="Schedule property visits and record check-ins.">
      <CrmDataCard title="Visit Register" description="Plan field activity, check in on site, and retain outcome evidence." action={<Button onClick={() => setCreateOpen(true)}><MapPinPlus className="mr-2 h-4 w-4" />Schedule visit</Button>}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SimpleToolbar search={search} setSearch={setSearch} />
          <div className="flex rounded-md border border-border p-1" aria-label="Visit views">
            {(['upcoming', 'in_progress', 'completed'] as const).map((item) => <Button key={item} size="sm" variant={view === item ? 'secondary' : 'ghost'} className="capitalize" onClick={() => setView(item)}>{item.replace('_', ' ')}</Button>)}
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Location</th><th className="px-3 py-2">Scheduled</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Check-In</th><th className="px-3 py-2">Proof</th><th className="px-3 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2"><p className="font-medium">{row.locality || '-'}</p><p className="max-w-64 truncate text-xs text-muted-foreground">{row.address_text || 'No address supplied'}</p></td>
                  <td className="px-3 py-2">{row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2">{(assignableUsersQuery.data || []).find((user) => user.user_id === row.assigned_to)?.name || 'Unassigned'}</td>
                  <td className="px-3 py-2 capitalize">{row.status.replace('_', ' ')}</td>
                  <td className="px-3 py-2">{row.check_in_at ? new Date(row.check_in_at).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2">{row.proof_path ? <VisitProofLink path={row.proof_path} /> : 'Pending'}</td>
                  <td className="px-3 py-2">
                    {row.status === 'planned' ? (
                      <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={() => startVisit(row.id)} disabled={updateVisit.isPending}>Check In</button>
                    ) : null}
                    {row.status === 'in_progress' ? (
                      <div className="flex gap-2">
                        <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => setCompletingVisitId(row.id)}>Complete Visit</button>
                        <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => cancelVisit(row.id)} disabled={updateVisit.isPending}>Cancel</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label={`No ${view.replace('_', ' ')} visits found.`} /></div> : null}
        </div>
      </CrmDataCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Schedule property visit</DialogTitle><DialogDescription>Capture the place, responsible teammate, opportunity, timing, and access context.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm"><span>Locality</span><input className="h-10 w-full rounded-md border border-input px-3 text-sm" placeholder="e.g. Lekki Phase 1" value={locality} onChange={(event) => setLocality(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm"><span>Scheduled time</span><input className="h-10 w-full rounded-md border border-input px-3 text-sm" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm sm:col-span-2"><span>Full address</span><input className="h-10 w-full rounded-md border border-input px-3 text-sm" placeholder="Street, building, unit, and landmark" value={address} onChange={(event) => setAddress(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm"><span>Related deal</span><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={relatedDealId} onChange={(event) => setRelatedDealId(event.target.value)}><option value="">No linked deal</option>{(dealsQuery.data || []).map((deal) => <option key={deal.id} value={deal.id}>{deal.deal_name}</option>)}</select></label>
            <label className="space-y-1.5 text-sm"><span>Assigned teammate</span><AssigneePicker users={assignableUsersQuery.data || []} value={assignedTo || null} onChange={(next) => setAssignedTo(next || '')} placeholder="Unassigned" className="h-10" /></label>
            <label className="space-y-1.5 text-sm sm:col-span-2"><span>Access instructions and notes</span><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Contact person, access code, meeting point, preparation, or safety notes" value={visitNotes} onChange={(event) => setVisitNotes(event.target.value)} /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={create} disabled={!locality.trim() || !scheduledAt || createVisit.isPending}>Schedule visit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completingVisitId} onOpenChange={(open) => { if (!open) void closeCompletion(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Complete property visit</DialogTitle><DialogDescription>Upload one private evidence file and record the visit outcome before checkout.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Visit evidence</p>
              <p className="text-xs text-muted-foreground">Use a clear checkout photo of the property or a signed PDF visit report. The file is private and visible only to authorized company users.</p>
              <DocumentUploader
                bucket="crm-documents"
                pathPrefix={`${activeCompanyId || 'unknown-company'}/visits/${completingVisitId || 'unknown-visit'}`}
                acceptedMimeTypes={['image/jpeg', 'image/png', 'image/webp', 'application/pdf']}
                maxFileSizeBytes={10 * 1024 * 1024}
                resetKey={String(proofUploadResetKey)}
                uploadLabel="Upload visit evidence"
                disabled={!activeCompanyId || updateVisit.isPending}
                onUploaded={(path) => setProofPath(path)}
                onCleared={() => setProofPath('')}
              />
            </div>
            <label className="block space-y-1.5 text-sm"><span>Visit outcome</span><textarea aria-label="Visit outcome" className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Record attendance, observations, client feedback, decisions, and the next action." value={outcome} onChange={(event) => setOutcome(event.target.value)} /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => void closeCompletion()}>Cancel</Button><Button onClick={() => completingVisitId && completeVisit(completingVisitId)} disabled={!proofPath || !outcome.trim() || updateVisit.isPending}>Complete visit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmWorkspace>
  );
}
