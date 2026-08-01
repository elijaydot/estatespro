import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmVisit, useCrmVisits, useUpdateCrmVisit } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmVisitsPage() {
  const { activeCompanyId } = useActiveCompany();
  const visitsQuery = useCrmVisits(activeCompanyId);
  const createVisit = useCreateCrmVisit(activeCompanyId);
  const updateVisit = useUpdateCrmVisit(activeCompanyId);

  const [search, setSearch] = useState('');
  const [locality, setLocality] = useState('');
  const [completingVisitId, setCompletingVisitId] = useState<string | null>(null);
  const [proofPath, setProofPath] = useState('');
  const [outcome, setOutcome] = useState('');

  const rows = useMemo(() => {
    const records = visitsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.locality || ''} ${row.address_text || ''} ${row.status}`).toLowerCase().includes(query));
  }, [visitsQuery.data, search]);

  const create = () => {
    if (!locality.trim()) return;
    createVisit.mutate({
      related_type: 'deal',
      related_id: null,
      locality: locality.trim(),
      address_text: null,
      status: 'planned',
      check_in_at: null,
      check_in_lat: null,
      check_in_lng: null,
      check_out_at: null,
      proof_path: null,
      outcome: null,
      notes: null,
      created_by: null,
    });
    setLocality('');
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
      <CrmDataCard title="Schedule Visit" description="Add a property visit to the schedule.">
        <div className="flex gap-2">
          <input className="h-9 flex-1 rounded-md border border-input px-3 text-sm" placeholder="Locality" value={locality} onChange={(event) => setLocality(event.target.value)} />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createVisit.isPending}>Schedule</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Visit Register" description="Visit records including check-in and proof status.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Locality</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Check-In</th><th className="px-3 py-2">Proof</th><th className="px-3 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.locality || '-'}</td>
                  <td className="px-3 py-2">{row.status}</td>
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
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No visits scheduled yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
