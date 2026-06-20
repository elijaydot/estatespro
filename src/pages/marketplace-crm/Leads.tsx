import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmLeads } from '@/hooks/useMarketplace';

export default function MarketplaceCrmLeadsPage() {
  const { activeCompanyId } = useActiveCompany();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const records = leadsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.contact_name || ''} ${row.contact_email || ''} ${row.stage} ${row.status} ${row.listing_title || ''}`).toLowerCase().includes(query));
  }, [leadsQuery.data, search]);

  return (
    <CrmWorkspace title="Leads" subtitle="Primary lead pipeline sourced from marketplace inquiries.">
      <CrmDataCard title="All Leads" description="Filter leads by contact, stage, and source context.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Lead Name</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.contact_name || 'Unnamed lead'}</td>
                  <td className="px-3 py-2">{row.listing_title || '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.contact_email || '-'}</td>
                  <td className="px-3 py-2">{row.contact_phone || '-'}</td>
                  <td className="px-3 py-2">{row.stage}</td>
                  <td className="px-3 py-2">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No leads found for this filter." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
