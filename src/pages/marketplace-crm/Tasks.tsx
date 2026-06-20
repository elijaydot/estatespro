import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmTasks } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmTasksPage() {
  const { activeCompanyId } = useActiveCompany();
  const tasksQuery = useCrmTasks(activeCompanyId);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const records = tasksQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.task_type} ${row.notes || ''} ${row.status}`).toLowerCase().includes(query));
  }, [tasksQuery.data, search]);

  return (
    <CrmWorkspace title="Tasks" subtitle="SLA-driven follow-up execution for lead and deal continuity.">
      <CrmDataCard title="All Tasks" description="Tasks aggregated from CRM lead workflow queues.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Priority</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.notes || row.task_type}</td>
                  <td className="px-3 py-2">{new Date(row.due_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.status === 'open' ? 'Normal' : 'Done'}</td>
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
