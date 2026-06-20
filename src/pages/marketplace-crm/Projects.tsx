import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmProject, useCrmProjects } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmProjectsPage() {
  const { activeCompanyId } = useActiveCompany();
  const projectsQuery = useCrmProjects(activeCompanyId);
  const createProject = useCreateCrmProject(activeCompanyId);

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');

  const rows = useMemo(() => {
    const records = projectsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.name} ${row.status}`).toLowerCase().includes(query));
  }, [projectsQuery.data, search]);

  const create = () => {
    if (!name.trim()) return;
    createProject.mutate({
      name: name.trim(),
      description: null,
      status: 'planned',
      owner_user_id: null,
      due_date: null,
      progress_percent: 0,
    });
    setName('');
  };

  return (
    <CrmWorkspace title="Projects" subtitle="Operational projects for launch plans and occupancy initiatives.">
      <CrmDataCard title="Create Project" description="Track strategic CRM and marketplace initiatives.">
        <div className="flex gap-2">
          <input className="h-9 flex-1 rounded-md border border-input px-3 text-sm" placeholder="Project name" value={name} onChange={(event) => setName(event.target.value)} />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createProject.isPending}>Create</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Project List" description="Project tracking with progress and ownership.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Project</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Progress</th><th className="px-3 py-2">Due Date</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.progress_percent}%</td>
                  <td className="px-3 py-2">{row.due_date || '-'}</td>
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
