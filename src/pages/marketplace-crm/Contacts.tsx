import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmContacts } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmContactsPage() {
  const { activeCompanyId } = useActiveCompany();
  const contactsQuery = useCrmContacts(activeCompanyId);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const records = contactsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.full_name} ${row.email || ''} ${row.phone_e164}`).toLowerCase().includes(query));
  }, [contactsQuery.data, search]);

  return (
    <CrmWorkspace title="Contacts" subtitle="People records linked to leads and account relationships.">
      <CrmDataCard title="All Contacts" description="Contacts currently generated from active lead contacts.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Contact Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Preferred Channel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.email || '-'}</td>
                  <td className="px-3 py-2">{row.phone_e164}</td>
                  <td className="px-3 py-2">{row.preferred_channel || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No contacts available yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
