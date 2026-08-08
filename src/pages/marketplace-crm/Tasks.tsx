import { useEffect, useMemo, useState } from 'react';
import { ListTodo } from 'lucide-react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmLeadTask, useCrmAssignableUsers, useCrmLeads } from '@/hooks/useMarketplace';
import { useCrmTasks, useUpdateCrmTask, useUpdateCrmTaskStatus } from '@/hooks/useMarketplaceCrm';

const TASK_TYPES = ['follow_up', 'site_visit', 'document_check', 'intro_call', 'negotiation'];

function taskStatusChipClass(status: 'open' | 'done' | 'canceled') {
  if (status === 'done') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (status === 'canceled') return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
  return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
}

export default function MarketplaceCrmTasksPage() {
  const { activeCompanyId } = useActiveCompany();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const tasksQuery = useCrmTasks(activeCompanyId);
  const updateTask = useUpdateCrmTaskStatus(activeCompanyId);
  const createTask = useCreateCrmLeadTask(activeCompanyId);
  const updateTaskDetails = useUpdateCrmTask(activeCompanyId);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'open' | 'closed' | 'all'>('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [taskType, setTaskType] = useState('follow_up');
  const [notes, setNotes] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskType, setEditTaskType] = useState('follow_up');
  const [editOwnerUserId, setEditOwnerUserId] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const rows = useMemo(() => {
    const records = tasksQuery.data || [];
    const query = search.toLowerCase().trim();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    return records.filter((row) => (
      (!query || (`${row.task_type} ${row.notes || ''} ${row.status}`).toLowerCase().includes(query))
      && (view === 'all' || (view === 'open' ? row.status === 'open' : row.status !== 'open'))
      && (typeFilter === 'all' || row.task_type === typeFilter)
      && (ownerFilter === 'all' || row.owner_user_id === ownerFilter)
      && (dueFilter === 'all'
        || (dueFilter === 'overdue' && new Date(row.due_at).getTime() < now.getTime() && row.status === 'open')
        || (dueFilter === 'today' && new Date(row.due_at).getTime() >= todayStart && new Date(row.due_at).getTime() < tomorrowStart)
        || (dueFilter === 'upcoming' && new Date(row.due_at).getTime() >= tomorrowStart))
    ));
  }, [dueFilter, ownerFilter, search, tasksQuery.data, typeFilter, view]);

  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [dueFilter, ownerFilter, pageSize, search, typeFilter, view]);

  const create = () => {
    if (!leadId || !ownerUserId || !dueAt) return;
    createTask.mutate({
      leadId,
      ownerUserId,
      dueAt: new Date(dueAt).toISOString(),
      notes: notes.trim() || undefined,
      taskType,
    }, { onSuccess: () => {
      setLeadId(''); setOwnerUserId(''); setDueAt(''); setTaskType('follow_up'); setNotes(''); setCreateOpen(false);
    } });
  };

  const startEdit = (taskId: string, currentTaskType: string, currentOwnerUserId: string, currentDueAt: string, currentNotes: string | null) => {
    setEditingTaskId(taskId);
    setEditTaskType(currentTaskType);
    setEditOwnerUserId(currentOwnerUserId);
    setEditDueAt(currentDueAt.slice(0, 16));
    setEditNotes(currentNotes || '');
  };

  const saveEdit = () => {
    if (!editingTaskId || !editOwnerUserId || !editDueAt) return;
    updateTaskDetails.mutate(
      {
        taskId: editingTaskId,
        payload: {
          task_type: editTaskType,
          owner_user_id: editOwnerUserId,
          due_at: new Date(editDueAt).toISOString(),
          notes: editNotes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setEditingTaskId(null);
          setEditTaskType('follow_up');
          setEditOwnerUserId('');
          setEditDueAt('');
          setEditNotes('');
        },
      },
    );
  };

  return (
    <CrmWorkspace title="Tasks" subtitle="Plan and track lead and deal follow-ups.">
      <CrmDataCard title="Tasks" description="Prioritize follow-ups, assign clear ownership, and close the loop on every lead." action={<Button onClick={() => setCreateOpen(true)}><ListTodo className="mr-2 h-4 w-4" />New task</Button>}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SimpleToolbar search={search} setSearch={setSearch} />
          <div className="flex rounded-md border border-border p-1" aria-label="Task views">
            {(['open', 'closed', 'all'] as const).map((item) => <Button key={item} size="sm" variant={view === item ? 'secondary' : 'ghost'} className="capitalize" onClick={() => setView(item)}>{item}</Button>)}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label="Filter tasks by type" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All task types</option>{TASK_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
          </select>
          <select aria-label="Filter tasks by owner" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="all">All owners</option>{(assignableUsersQuery.data || []).map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}
          </select>
          <select aria-label="Filter tasks by due date" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)}>
            <option value="all">Any due date</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Due later</option>
          </select>
          {(typeFilter !== 'all' || ownerFilter !== 'all' || dueFilter !== 'all') && <Button variant="ghost" size="sm" onClick={() => { setTypeFilter('all'); setOwnerFilter('all'); setDueFilter('all'); }}>Reset filters</Button>}
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Subject</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Owner</th>
                <th className="px-3 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">
                    {editingTaskId === row.id ? (
                      <input className="h-8 w-full rounded-md border border-input px-2 text-xs" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
                    ) : (row.notes || row.task_type)}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {editingTaskId === row.id ? (
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={editTaskType} onChange={(event) => setEditTaskType(event.target.value)}>
                        {TASK_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
                      </select>
                    ) : row.task_type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2">
                    {editingTaskId === row.id ? (
                      <input className="h-8 w-full rounded-md border border-input px-2 text-xs" type="datetime-local" value={editDueAt} onChange={(event) => setEditDueAt(event.target.value)} />
                    ) : new Date(row.due_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${taskStatusChipClass(row.status)}`}>{row.status}</span></td>
                  <td className="px-3 py-2">
                    {editingTaskId === row.id ? <AssigneePicker users={assignableUsersQuery.data || []} value={editOwnerUserId || null} onChange={(next) => setEditOwnerUserId(next || '')} placeholder="Select owner" className="h-8" allowUnassigned={false} /> : (assignableUsersQuery.data || []).find((user) => user.user_id === row.owner_user_id)?.name || 'Assigned user'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {row.status !== 'done' ? (
                        <button
                          className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground"
                          onClick={() => updateTask.mutate({ taskId: row.id, status: 'done' })}
                          disabled={updateTask.isPending}
                        >
                          Mark Done
                        </button>
                      ) : (
                        <button
                          className="h-8 rounded-md border border-input px-2 text-xs"
                          onClick={() => updateTask.mutate({ taskId: row.id, status: 'open' })}
                          disabled={updateTask.isPending}
                        >
                          Reopen
                        </button>
                      )}
                      {row.status !== 'canceled' ? (
                        <button
                          className="h-8 rounded-md border border-input px-2 text-xs"
                          onClick={() => updateTask.mutate({ taskId: row.id, status: 'canceled' })}
                          disabled={updateTask.isPending}
                        >
                          Cancel
                        </button>
                      ) : null}
                      {editingTaskId === row.id ? (
                        <><Button size="sm" className="h-8" onClick={saveEdit} disabled={updateTaskDetails.isPending}>Save</Button><Button size="sm" variant="outline" className="h-8" onClick={() => setEditingTaskId(null)}>Close</Button></>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => startEdit(row.id, row.task_type, row.owner_user_id, row.due_at, row.notes)}>Edit</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label={`No ${view} tasks found.`} /></div> : null}
          <TablePagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      </CrmDataCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create task</DialogTitle><DialogDescription>Connect the follow-up to a lead, set ownership, and choose a deadline.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm"><span>Related lead</span><select aria-label="Related lead" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={leadId} onChange={(event) => setLeadId(event.target.value)}><option value="">Select lead</option>{(leadsQuery.data || []).map((lead) => <option key={lead.id} value={lead.id}>{lead.contact_name || lead.contact_email || lead.id}</option>)}</select></label>
            <label className="space-y-1.5 text-sm"><span>Owner</span><AssigneePicker users={assignableUsersQuery.data || []} value={ownerUserId || null} onChange={(next) => setOwnerUserId(next || '')} placeholder="Select owner" className="h-10" allowUnassigned={false} /></label>
            <label className="space-y-1.5 text-sm"><span>Task type</span><select aria-label="Task type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={taskType} onChange={(event) => setTaskType(event.target.value)}>{TASK_TYPES.map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select></label>
            <label className="space-y-1.5 text-sm"><span>Due date and time</span><input aria-label="Due date and time" className="h-10 w-full rounded-md border border-input px-3 text-sm" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
            <label className="space-y-1.5 text-sm sm:col-span-2"><span>Notes</span><textarea aria-label="Task notes" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Outcome expected, context, or next step" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={create} disabled={!leadId || !ownerUserId || !dueAt || createTask.isPending}>Create task</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmWorkspace>
  );
}
