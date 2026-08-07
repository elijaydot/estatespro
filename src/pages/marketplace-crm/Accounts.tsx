import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [kindFilter, setKindFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
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
    return records.filter((row) => (
      (!query || (`${row.name} ${row.website || ''} ${row.phone || ''} ${row.account_kind}`).toLowerCase().includes(query))
      && (kindFilter === 'all' || row.account_kind === kindFilter)
    ));
  }, [accountsQuery.data, kindFilter, search]);

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
    }, { onSuccess: () => {
      setName(''); setWebsite(''); setAccountKind('corporate_tenant'); setOwnerUserId(''); setCreateOpen(false);
    } });
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
      <CrmDataCard title="All Accounts" description="Organizations that group people, opportunities, ownership, and portfolio context." action={<Button onClick={() => setCreateOpen(true)}><Building2 className="mr-2 h-4 w-4" />New account</Button>}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SimpleToolbar search={search} setSearch={setSearch} />
          <select aria-label="Filter account type" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">All account types</option><option value="corporate_tenant">Corporate tenants</option><option value="owner_investor">Owners / investors</option></select>
        </div>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create account</DialogTitle><DialogDescription>Add an organization only when multiple contacts, properties, or deals need shared commercial context.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm"><span>Organization name</span><Input aria-label="Account name" placeholder="Company or investment entity" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="block space-y-1.5 text-sm"><span>Website</span><Input aria-label="Website" inputMode="url" placeholder="https://" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
            <label className="block space-y-1.5 text-sm"><span>Account type</span><select aria-label="Account kind" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={accountKind} onChange={(event) => setAccountKind(event.target.value as typeof accountKind)}><option value="corporate_tenant">Corporate tenant</option><option value="owner_investor">Owner / investor</option></select></label>
            <label className="block space-y-1.5 text-sm"><span>Relationship owner</span><AssigneePicker users={assignableUsersQuery.data || []} value={ownerUserId || null} onChange={(next) => setOwnerUserId(next || '')} placeholder="Unassigned" className="h-10" /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={onCreate} disabled={!name.trim() || createAccount.isPending}>Create account</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmWorkspace>
  );
}
