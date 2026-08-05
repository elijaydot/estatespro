import { useMemo, useState } from 'react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmAssignableUsers } from '@/hooks/useMarketplace';
import { useCreateCrmAccount, useCrmAccounts, useUpdateCrmAccount } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmAccountsPage() {
  const { activeCompanyId } = useActiveCompany();
  const accountsQuery = useCrmAccounts(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const createAccount = useCreateCrmAccount(activeCompanyId);
  const updateAccount = useUpdateCrmAccount(activeCompanyId);

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [accountKind, setAccountKind] = useState<'corporate_tenant' | 'owner_investor'>('corporate_tenant');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAccountKind, setEditAccountKind] = useState<'corporate_tenant' | 'owner_investor'>('corporate_tenant');
  const [editOwnerUserId, setEditOwnerUserId] = useState('');

  const rows = useMemo(() => {
    const records = accountsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.name} ${row.website || ''} ${row.phone || ''} ${row.account_kind}`).toLowerCase().includes(query));
  }, [accountsQuery.data, search]);

  const ownerNameById = useMemo(() => {
    const map = new Map<string, string>();
    (assignableUsersQuery.data || []).forEach((user) => {
      map.set(user.user_id, user.name || user.user_id);
    });
    return map;
  }, [assignableUsersQuery.data]);

  const onCreate = () => {
    if (!name.trim()) return;
    createAccount.mutate({
      name: name.trim(),
      website: website.trim() || null,
      account_kind: accountKind,
      owner_user_id: ownerUserId || null,
    });
    setName('');
    setWebsite('');
    setAccountKind('corporate_tenant');
    setOwnerUserId('');
  };

  const startEdit = (id: string, currentName: string, currentWebsite: string | null, currentAccountKind: 'corporate_tenant' | 'owner_investor', currentOwnerUserId: string | null) => {
    setEditingId(id);
    setEditName(currentName);
    setEditWebsite(currentWebsite || '');
    setEditAccountKind(currentAccountKind);
    setEditOwnerUserId(currentOwnerUserId || '');
  };

  const onSaveEdit = () => {
    if (!editingId || !editName.trim()) return;

    updateAccount.mutate(
      {
        id: editingId,
        payload: {
          name: editName.trim(),
          website: editWebsite.trim() || null,
          account_kind: editAccountKind,
          owner_user_id: editOwnerUserId || null,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditName('');
          setEditWebsite('');
          setEditOwnerUserId('');
        },
      },
    );
  };

  return (
    <CrmWorkspace title="Accounts" subtitle="Business account records for partners, firms, and corporate tenants.">
      <CrmDataCard title="Create Account" description="Add an organization to the CRM.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <Input aria-label="Account name" className="h-9" placeholder="Account name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input aria-label="Website" className="h-9" inputMode="url" placeholder="Website" value={website} onChange={(event) => setWebsite(event.target.value)} />
          <select aria-label="Account kind" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={accountKind} onChange={(event) => setAccountKind(event.target.value as typeof accountKind)}>
            <option value="corporate_tenant">Corporate tenant</option>
            <option value="owner_investor">Owner / investor</option>
          </select>
          <AssigneePicker
            users={assignableUsersQuery.data || []}
            value={ownerUserId || null}
            onChange={(next) => setOwnerUserId(next || '')}
            placeholder="Owner (optional)"
            className="h-9"
          />
          <Button size="sm" onClick={onCreate} disabled={createAccount.isPending}>Create Account</Button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="All Accounts" description="Organizations and account owners.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Account Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Website</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Linked Portfolio</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">
                    {editingId === row.id ? (
                      <Input
                        className="h-8 w-full"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                      />
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className="px-3 py-2">{row.phone || '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {editingId === row.id ? (
                      <Input
                        className="h-8 w-full"
                        value={editWebsite}
                        onChange={(event) => setEditWebsite(event.target.value)}
                      />
                    ) : (
                      row.website || '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {editingId === row.id ? (
                      <AssigneePicker
                        users={assignableUsersQuery.data || []}
                        value={editOwnerUserId || null}
                        onChange={(next) => setEditOwnerUserId(next || '')}
                        placeholder="Owner"
                        className="h-8"
                      />
                    ) : (
                      (row.owner_user_id ? (ownerNameById.get(row.owner_user_id) || row.owner_user_id) : '-')
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === row.id ? (
                      <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={editAccountKind} onChange={(event) => setEditAccountKind(event.target.value as typeof editAccountKind)}>
                        <option value="corporate_tenant">Corporate tenant</option>
                        <option value="owner_investor">Owner / investor</option>
                      </select>
                    ) : <StatusPill variant={row.account_kind === 'owner_investor' ? 'info' : 'neutral'} className="capitalize">{row.account_kind.replace(/_/g, ' ')}</StatusPill>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.account_kind === 'corporate_tenant' ? `${row.linked_tenant_count} tenants` : `${row.linked_property_count} properties`}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === row.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8" onClick={onSaveEdit} disabled={updateAccount.isPending}>
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setEditingId(null);
                            setEditName('');
                            setEditWebsite('');
                            setEditAccountKind('corporate_tenant');
                            setEditOwnerUserId('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => startEdit(row.id, row.name, row.website, row.account_kind, row.owner_user_id)}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
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
