import { useMemo, useState } from 'react';
import { MapPinPlus } from 'lucide-react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmAssignableUsers } from '@/hooks/useMarketplace';
import { useCreateCrmVisit, useCrmDeals, useCrmVisits, useUpdateCrmVisit } from '@/hooks/useMarketplaceCrm';

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

  const rows = useMemo(() => {
    const records = visitsQuery.data || [];
    const query = search.toLowerCase().trim();
    return records.filter((row) => (
      (!query || (`${row.locality || ''} ${row.address_text || ''} ${row.status} ${row.notes || ''}`).toLowerCase().includes(query))
      && (view === 'upcoming' ? row.status === 'planned' : row.status === view)
    ));
  }, [search, view, visitsQuery.data]);

  const create = () => {
    if (!locality.trim()) return;
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
    updateVisit.mutate({
      visitId,
      payload: {
        status: 'in_progress',
        check_in_at: new Date().toISOString(),
      },
    });
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
                  <td className="px-3 py-2">{row.proof_path || 'Pending'}</td>
                  <td className="px-3 py-2">
                    {row.status === 'planned' ? (
                      <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={() => startVisit(row.id)} disabled={updateVisit.isPending}>Check In</button>
                    ) : null}
                    {row.status === 'in_progress' ? (
                      <div className="space-y-2">
                        {completingVisitId === row.id ? (
                          <>
                            <input
                              className="h-8 w-full rounded-md border border-input px-2 text-xs"
                              value={proofPath}
                              onChange={(event) => setProofPath(event.target.value)}
                              placeholder="Proof URL or file reference"
                            />
                            <input
                              className="h-8 w-full rounded-md border border-input px-2 text-xs"
                              value={outcome}
                              onChange={(event) => setOutcome(event.target.value)}
                              placeholder="Visit outcome"
                            />
                            <div className="flex gap-2">
                              <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={() => completeVisit(row.id)} disabled={updateVisit.isPending}>Complete</button>
                              <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => setCompletingVisitId(null)}>Close</button>
                            </div>
                          </>
                        ) : (
                          <div className="flex gap-2">
                            <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => setCompletingVisitId(row.id)}>Complete Visit</button>
                            <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => cancelVisit(row.id)} disabled={updateVisit.isPending}>Cancel</button>
                          </div>
                        )}
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
    </CrmWorkspace>
  );
}
