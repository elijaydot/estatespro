import { useMemo, useState } from 'react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
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
    if (!query) return records;
    return records.filter((row) => (`${row.task_type} ${row.notes || ''} ${row.status}`).toLowerCase().includes(query));
  }, [tasksQuery.data, search]);

  const create = () => {
    if (!leadId || !ownerUserId || !dueAt) return;
    createTask.mutate({
      leadId,
      ownerUserId,
      dueAt: new Date(dueAt).toISOString(),
      notes: notes.trim() || undefined,
      taskType,
    });
    setLeadId('');
    setOwnerUserId('');
    setDueAt('');
    setTaskType('follow_up');
    setNotes('');
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
      <CrmDataCard title="Create Task" description="Add a task, owner, and due date.">
        <div className="mb-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Use due dates and owner routing to prevent stalled opportunities.
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-3" value={leadId} onChange={(event) => setLeadId(event.target.value)}>
            <option value="">Select lead</option>
            {(leadsQuery.data || []).map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.contact_name || lead.contact_email || lead.id}</option>
            ))}
          </select>
          <div className="lg:col-span-3">
            <AssigneePicker
              users={assignableUsersQuery.data || []}
              value={ownerUserId || null}
              onChange={(next) => setOwnerUserId(next || '')}
              placeholder="Select owner"
              className="h-10"
              allowUnassigned={false}
            />
          </div>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-2" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-2" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          <button className="h-10 rounded-md bg-primary px-3 text-sm text-primary-foreground lg:col-span-2" onClick={create} disabled={createTask.isPending}>Create Task</button>
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-12" placeholder="Task notes / activity details" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </CrmDataCard>

      <CrmDataCard title="All Tasks" description="Open and completed CRM tasks.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Subject</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">
                    {editingTaskId === row.id ? (
                      <input className="h-8 w-full rounded-md border border-input px-2 text-xs" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
                    ) : (row.notes || row.task_type)}
                  </td>
                  <td className="px-3 py-2">
                    {editingTaskId === row.id ? (
                      <input className="h-8 w-full rounded-md border border-input px-2 text-xs" type="datetime-local" value={editDueAt} onChange={(event) => setEditDueAt(event.target.value)} />
                    ) : new Date(row.due_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${taskStatusChipClass(row.status)}`}>{row.status}</span></td>
                  <td className="px-3 py-2">
                    {editingTaskId === row.id ? (
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={editTaskType} onChange={(event) => setEditTaskType(event.target.value)}>
                        {TASK_TYPES.map((type) => (
                          <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    ) : (row.status === 'open' ? 'Normal' : row.status === 'done' ? 'Done' : 'Canceled')}
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
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {editingTaskId === row.id ? (
                      <div className="flex gap-2">
                        <AssigneePicker
                          users={assignableUsersQuery.data || []}
                          value={editOwnerUserId || null}
                          onChange={(next) => setEditOwnerUserId(next || '')}
                          placeholder="Select owner"
                          className="h-8"
                          allowUnassigned={false}
                        />
                        <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={saveEdit} disabled={updateTaskDetails.isPending}>Save</button>
                        <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => setEditingTaskId(null)} disabled={updateTaskDetails.isPending}>Close</button>
                      </div>
                    ) : (
                      <button
                        className="h-8 rounded-md border border-input px-2 text-xs"
                        onClick={() => startEdit(row.id, row.task_type, row.owner_user_id, row.due_at, row.notes)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No tasks available for this scope." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
