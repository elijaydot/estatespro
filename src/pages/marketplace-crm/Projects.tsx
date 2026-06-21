import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, MetricCard, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmProject, useCrmProjects, useUpdateCrmProject } from '@/hooks/useMarketplaceCrm';
import { buildProjectSlaSummary } from '@/lib/marketplaceCrmWorkflow';

export default function MarketplaceCrmProjectsPage() {
  const { activeCompanyId } = useActiveCompany();
  const projectsQuery = useCrmProjects(activeCompanyId);
  const createProject = useCreateCrmProject(activeCompanyId);
  const updateProject = useUpdateCrmProject(activeCompanyId);

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState('planned');
  const [draftProgress, setDraftProgress] = useState('0');
  const [draftDueDate, setDraftDueDate] = useState('');
  const [draftOwnerUserId, setDraftOwnerUserId] = useState('');

  const rows = useMemo(() => {
    const records = projectsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.name} ${row.status}`).toLowerCase().includes(query));
  }, [projectsQuery.data, search]);

  const slaSummary = useMemo(() => buildProjectSlaSummary(projectsQuery.data || []), [projectsQuery.data]);

  const create = () => {
    if (!name.trim()) return;
    createProject.mutate({
      name: name.trim(),
      description: null,
      status: 'planned',
      owner_user_id: ownerUserId.trim() || null,
      due_date: null,
      progress_percent: 0,
    });
    setName('');
    setOwnerUserId('');
  };

  const editRow = (projectId: string, status: string, progressPercent: number, dueDate: string | null, ownerId: string | null) => {
    setActiveProjectId(projectId);
    setDraftStatus(status);
    setDraftProgress(String(progressPercent));
    setDraftDueDate(dueDate || '');
    setDraftOwnerUserId(ownerId || '');
  };

  const saveRow = (projectId: string) => {
    const progressPercent = Number.parseInt(draftProgress, 10);
    updateProject.mutate({
      id: projectId,
      payload: {
        status: draftStatus,
        progress_percent: Number.isNaN(progressPercent) ? 0 : Math.max(0, Math.min(progressPercent, 100)),
        due_date: draftDueDate || null,
        owner_user_id: draftOwnerUserId.trim() || null,
      },
    });
    setActiveProjectId(null);
  };

  const quickStatus = (projectId: string, status: 'planned' | 'active' | 'on_hold' | 'completed' | 'canceled') => {
    updateProject.mutate({ id: projectId, payload: { status } });
  };

  return (
    <CrmWorkspace title="Projects" subtitle="Operational projects for launch plans and occupancy initiatives.">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <MetricCard label="Overdue Projects" value={slaSummary.overdue} helper="Past due and not completed" />
        <MetricCard label="Due in 7 Days" value={slaSummary.dueSoon} helper="Active lifecycle pressure" />
      </section>

      <CrmDataCard title="Create Project" description="Track strategic CRM and marketplace initiatives.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input className="h-9 flex-1 rounded-md border border-input px-3 text-sm" placeholder="Project name" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Owner user id (optional)" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createProject.isPending}>Create</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Project List" description="Project tracking with progress and ownership.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Project</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Progress</th><th className="px-3 py-2">Due Date</th><th className="px-3 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{activeProjectId === row.id ? (
                    <select className="h-8 rounded border border-input px-2 text-xs" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>
                      <option value="planned">planned</option>
                      <option value="active">active</option>
                      <option value="on_hold">on_hold</option>
                      <option value="completed">completed</option>
                      <option value="canceled">canceled</option>
                    </select>
                  ) : row.status}</td>
                  <td className="px-3 py-2">{activeProjectId === row.id ? (
                    <input className="h-8 rounded border border-input px-2 text-xs" value={draftOwnerUserId} onChange={(event) => setDraftOwnerUserId(event.target.value)} placeholder="owner user id" />
                  ) : (row.owner_user_id || '-')}</td>
                  <td className="px-3 py-2">{activeProjectId === row.id ? <input className="h-8 w-20 rounded border border-input px-2 text-xs" value={draftProgress} onChange={(event) => setDraftProgress(event.target.value)} /> : `${row.progress_percent}%`}</td>
                  <td className="px-3 py-2">{activeProjectId === row.id ? <input className="h-8 rounded border border-input px-2 text-xs" type="date" value={draftDueDate} onChange={(event) => setDraftDueDate(event.target.value)} /> : (row.due_date || '-')}</td>
                  <td className="px-3 py-2">
                    {activeProjectId === row.id ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => saveRow(row.id)} disabled={updateProject.isPending}>Save</button>
                        <button
                          className="rounded border border-border px-2 py-1 text-xs"
                          onClick={() => {
                            setActiveProjectId(null);
                            setDraftOwnerUserId('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => editRow(row.id, row.status, row.progress_percent, row.due_date, row.owner_user_id)}>Edit</button>
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => quickStatus(row.id, 'active')} disabled={updateProject.isPending}>Activate</button>
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => quickStatus(row.id, 'on_hold')} disabled={updateProject.isPending}>Hold</button>
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => quickStatus(row.id, 'completed')} disabled={updateProject.isPending}>Complete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No projects created yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
