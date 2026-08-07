import { useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [view, setView] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [createOpen, setCreateOpen] = useState(false);
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
    const now = Date.now();
    return records.filter((row) => (
      (!query || (`${row.title} ${row.status} ${row.notes || ''}`).toLowerCase().includes(query))
      && (view === 'all' || (view === 'upcoming' ? row.status === 'planned' && new Date(row.ends_at).getTime() >= now : row.status !== 'planned' || new Date(row.ends_at).getTime() < now))
    ));
  }, [meetingsQuery.data, search, view]);

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
    }, { onSuccess: () => {
      setTitle(''); setRelatedLeadId(''); setHostUserId(''); setStartsAt(''); setEndsAt(''); setNotes(''); setCreateOpen(false);
    } });
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
    <CrmWorkspace title="Meetings" subtitle="Schedule meetings and record outcomes.">
      <CrmDataCard title="Meetings" description="Plan the calendar, review outcomes, and keep lead context attached." action={<Button onClick={() => setCreateOpen(true)}><CalendarPlus className="mr-2 h-4 w-4" />New meeting</Button>}>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SimpleToolbar search={search} setSearch={setSearch} />
          <div className="flex rounded-md border border-border p-1" aria-label="Meeting views">
            {(['upcoming', 'past', 'all'] as const).map((item) => <Button key={item} size="sm" variant={view === item ? 'secondary' : 'ghost'} className="capitalize" onClick={() => setView(item)}>{item}</Button>)}
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2.5">Title</th><th className="px-3 py-2.5">From</th><th className="px-3 py-2.5">To</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Notes</th><th className="px-3 py-2.5">Action</th></tr>
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
                        {MEETING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    ) : <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${meetingStatusChipClass(row.status)}`}>{row.status}</span>}
                  </td>
                  <td className="max-w-xs px-3 py-2">
                    {editingMeetingId === row.id ? <input className="h-8 w-full rounded-md border border-input px-2 text-xs" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} /> : <span className="line-clamp-2">{row.notes || '-'}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {editingMeetingId === row.id ? <div className="flex gap-2"><Button size="sm" onClick={() => saveEdit(row.id)} disabled={updateMeeting.isPending}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingMeetingId(null)}>Cancel</Button></div> : <Button size="sm" variant="outline" onClick={() => startEdit(row.id, row.status, row.notes)}>Edit</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label={`No ${view} meetings found.`} /></div> : null}
        </div>
      </CrmDataCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Schedule meeting</DialogTitle><DialogDescription>Set the participants, timing, owner, and agenda while the lead context is fresh.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm sm:col-span-2"><span>Meeting title</span><input aria-label="Meeting title" className="h-10 w-full rounded-md border border-input px-3 text-sm" placeholder="e.g. Lease terms review" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="space-y-1.5 text-sm"><span>Related lead</span><select aria-label="Related lead" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={relatedLeadId} onChange={(event) => setRelatedLeadId(event.target.value)}>
            <option value="">Related lead (optional)</option>
            {(leadsQuery.data || []).map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.contact_name || lead.contact_email || 'Lead'}</option>
            ))}
          </select></label>
          <label className="space-y-1.5 text-sm"><span>Host</span><div>
            <AssigneePicker
              users={assignableUsersQuery.data || []}
              value={hostUserId || null}
              onChange={(next) => setHostUserId(next || '')}
              placeholder="Host (optional)"
              className="h-10"
            />
          </div></label>
          <label className="space-y-1.5 text-sm"><span>Starts</span><input aria-label="Meeting start time" className="h-10 w-full rounded-md border border-input px-3 text-sm" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
          <label className="space-y-1.5 text-sm"><span>Ends</span><input aria-label="Meeting end time" className="h-10 w-full rounded-md border border-input px-3 text-sm" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
          <label className="space-y-1.5 text-sm sm:col-span-2"><span>Agenda and notes</span><textarea aria-label="Agenda and notes" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Decision points, questions, and required follow-up" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={create} disabled={!title.trim() || createMeeting.isPending}>Schedule meeting</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmWorkspace>
  );
}
