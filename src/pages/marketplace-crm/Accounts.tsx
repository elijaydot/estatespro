import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmAccount, useCrmAccounts } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmAccountsPage() {
  const { activeCompanyId } = useActiveCompany();
  const accountsQuery = useCrmAccounts(activeCompanyId);
  const createAccount = useCreateCrmAccount(activeCompanyId);

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');

  const rows = useMemo(() => {
    const records = accountsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.name} ${row.website || ''} ${row.phone || ''}`).toLowerCase().includes(query));
  }, [accountsQuery.data, search]);

  const onCreate = () => {
    if (!name.trim()) return;
    createAccount.mutate({ name: name.trim(), website: website.trim() || null });
    setName('');
    setWebsite('');
  };

  return (
    <CrmWorkspace title="Accounts" subtitle="Business account records for partners, firms, and corporate tenants.">
      <CrmDataCard title="Create Account" description="Quick add for new account records.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Account name" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Website" value={website} onChange={(event) => setWebsite(event.target.value)} />
          <button className="h-9 rounded-md bg-primary text-primary-foreground text-sm" onClick={onCreate} disabled={createAccount.isPending}>Create Account</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="All Accounts" description="FishGate account directory for CRM workflows.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Account Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Website</th>
                <th className="px-3 py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.phone || '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.website || '-'}</td>
                  <td className="px-3 py-2">{row.account_type || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No accounts created yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
