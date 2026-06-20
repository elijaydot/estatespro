import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useCrmReportLibrary } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmReportsPage() {
  const reportsQuery = useCrmReportLibrary();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const reportRows = reportsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return reportRows;
    return reportRows.filter((row) => (`${row.name} ${row.description} ${row.folder}`).toLowerCase().includes(query));
  }, [reportsQuery.data, search]);

  return (
    <CrmWorkspace title="Reports" subtitle="Report library modeled in FishGate CRM sequence with domain-specific analytics folders.">
      <CrmDataCard title="Report Library" description="Search and open report definitions.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Report Name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Folder</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
                  <td className="px-3 py-2">{row.folder}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No reports found for this filter." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
