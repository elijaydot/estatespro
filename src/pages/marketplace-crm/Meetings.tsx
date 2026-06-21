import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmMeeting, useCrmMeetings, useUpdateCrmMeetingStatus } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmMeetingsPage() {
  const { activeCompanyId } = useActiveCompany();
  const meetingsQuery = useCrmMeetings(activeCompanyId);
  const createMeeting = useCreateCrmMeeting(activeCompanyId);
  const updateMeeting = useUpdateCrmMeetingStatus(activeCompanyId);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');

  const rows = useMemo(() => {
    const records = meetingsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.title} ${row.status}`).toLowerCase().includes(query));
  }, [meetingsQuery.data, search]);

  const create = () => {
    if (!title.trim()) return;
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    createMeeting.mutate({
      title: title.trim(),
      related_type: 'lead',
      related_id: null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: 'planned',
      notes: null,
    });
    setTitle('');
  };

  return (
    <CrmWorkspace title="Meetings" subtitle="Planned versus realized meetings and check-ins.">
      <CrmDataCard title="Create Meeting" description="Adds a meeting record with planned status.">
        <div className="flex gap-2">
          <input className="h-9 flex-1 rounded-md border border-input px-3 text-sm" placeholder="Meeting title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createMeeting.isPending}>Create</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Meetings" description="Meetings module table in FishGate CRM sequence.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">From</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2">{new Date(row.starts_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{new Date(row.ends_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    {row.status !== 'done' ? (
                      <button
                        className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground"
                        onClick={() => updateMeeting.mutate({ meetingId: row.id, status: 'done', notes: row.notes || 'Completed via CRM Meetings page' })}
                        disabled={updateMeeting.isPending}
                      >
                        Mark Done
                      </button>
                    ) : (
                      <button
                        className="h-8 rounded-md border border-input px-2 text-xs"
                        onClick={() => updateMeeting.mutate({ meetingId: row.id, status: 'planned' })}
                        disabled={updateMeeting.isPending}
                      >
                        Reopen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No meetings scheduled yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
