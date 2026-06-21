import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmAssignableUsers, useCrmLeads } from '@/hooks/useMarketplace';
import { useCreateCrmMeeting, useCrmMeetings, useUpdateCrmMeeting } from '@/hooks/useMarketplaceCrm';

const MEETING_STATUSES = ['planned', 'done', 'canceled'] as const;

function meetingStatusChipClass(status: 'planned' | 'done' | 'canceled') {
  if (status === 'done') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (status === 'canceled') return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
  return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
}

export default function MarketplaceCrmMeetingsPage() {
  const { activeCompanyId } = useActiveCompany();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const meetingsQuery = useCrmMeetings(activeCompanyId);
  const createMeeting = useCreateCrmMeeting(activeCompanyId);
  const updateMeeting = useUpdateCrmMeeting(activeCompanyId);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [relatedLeadId, setRelatedLeadId] = useState('');
  const [hostUserId, setHostUserId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [notes, setNotes] = useState('');
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'planned' | 'done' | 'canceled'>('planned');
  const [editNotes, setEditNotes] = useState('');

  const rows = useMemo(() => {
    const records = meetingsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.title} ${row.status}`).toLowerCase().includes(query));
  }, [meetingsQuery.data, search]);

  const create = () => {
    if (!title.trim()) return;
    const start = startsAt ? new Date(startsAt) : new Date();
    const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
    createMeeting.mutate({
      title: title.trim(),
      related_type: 'lead',
      related_id: relatedLeadId || null,
      host_user_id: hostUserId || null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: 'planned',
      notes: notes.trim() || null,
    });
    setTitle('');
    setRelatedLeadId('');
    setHostUserId('');
    setStartsAt('');
    setEndsAt('');
    setNotes('');
  };

  const startEdit = (meetingId: string, status: 'planned' | 'done' | 'canceled', currentNotes: string | null) => {
    setEditingMeetingId(meetingId);
    setEditStatus(status);
    setEditNotes(currentNotes || '');
  };

  const saveEdit = (meetingId: string) => {
    updateMeeting.mutate(
      {
        meetingId,
        payload: {
          status: editStatus,
          notes: editNotes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setEditingMeetingId(null);
          setEditStatus('planned');
          setEditNotes('');
        },
      },
    );
  };

  return (
    <CrmWorkspace title="Meetings" subtitle="Planned versus realized meetings and check-ins.">
      <CrmDataCard title="Create Meeting" description="Create a structured meeting record with ownership, context, and timing.">
        <div className="mb-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Capture meeting context before the call so outcomes and follow-up are easier to execute.
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-4" placeholder="Meeting title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-3" value={relatedLeadId} onChange={(event) => setRelatedLeadId(event.target.value)}>
            <option value="">Related lead (optional)</option>
            {(leadsQuery.data || []).map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.contact_name || lead.contact_email || lead.id}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-3" value={hostUserId} onChange={(event) => setHostUserId(event.target.value)}>
            <option value="">Host (optional)</option>
            {(assignableUsersQuery.data || []).map((user) => (
              <option key={user.user_id} value={user.user_id}>{user.name}</option>
            ))}
          </select>
          <button className="h-10 rounded-md bg-primary px-3 text-sm text-primary-foreground lg:col-span-2" onClick={create} disabled={createMeeting.isPending}>Create</button>

          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-3" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-3" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-6" placeholder="Agenda and notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </CrmDataCard>

      <CrmDataCard title="Meetings" description="Meetings module table in FishGate CRM sequence.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">From</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Notes</th><th className="px-3 py-2">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.title}</td>
                  <td className="px-3 py-2">{new Date(row.starts_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{new Date(row.ends_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {editingMeetingId === row.id ? (
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={editStatus} onChange={(event) => setEditStatus(event.target.value as 'planned' | 'done' | 'canceled')}>
                        {MEETING_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${meetingStatusChipClass(row.status)}`}>{row.status}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {editingMeetingId === row.id ? (
                      <input className="h-8 w-full rounded-md border border-input px-2 text-xs" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
                    ) : (row.notes || '-')}
                  </td>
                  <td className="px-3 py-2">
                    {editingMeetingId === row.id ? (
                      <div className="flex gap-2">
                        <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={() => saveEdit(row.id)} disabled={updateMeeting.isPending}>Save</button>
                        <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => setEditingMeetingId(null)} disabled={updateMeeting.isPending}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        className="h-8 rounded-md border border-input px-2 text-xs"
                        onClick={() => startEdit(row.id, row.status, row.notes)}
                      >
                        Edit
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
