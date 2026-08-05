import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmContacts, useMergeCrmContacts, useUpdateCrmContact } from '@/hooks/useMarketplaceCrm';
import { findDuplicateContactGroups } from '@/lib/marketplaceCrmWorkflow';

export default function MarketplaceCrmContactsPage() {
  const { activeCompanyId } = useActiveCompany();
  const contactsQuery = useCrmContacts(activeCompanyId);
  const updateContact = useUpdateCrmContact(activeCompanyId);
  const mergeContacts = useMergeCrmContacts(activeCompanyId);
  const [search, setSearch] = useState('');
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [editChannel, setEditChannel] = useState('');

  const rows = useMemo(() => {
    const records = contactsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.full_name} ${row.email || ''} ${row.phone_e164}`).toLowerCase().includes(query));
  }, [contactsQuery.data, search]);

  const duplicateGroups = useMemo(() => findDuplicateContactGroups(contactsQuery.data || []), [contactsQuery.data]);

  const startEdit = (contactId: string, channel: string | null) => {
    setActiveEditId(contactId);
    setEditChannel(channel || '');
  };

  const saveChannel = (contactId: string) => {
    updateContact.mutate({
      contactId,
      payload: {
        preferred_channel: editChannel.trim() || null,
      },
    });
    setActiveEditId(null);
  };

  return (
    <CrmWorkspace title="Contacts" subtitle="People records linked to leads and account relationships.">
      <CrmDataCard title="Possible Duplicates" description="Contacts with matching email addresses or phone numbers.">
        <div className="space-y-3">
          {duplicateGroups.map((group) => {
            const [primary, ...duplicates] = group.contacts;
            return (
              <div key={group.key} className="rounded-lg border border-border/70 p-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{group.key}</div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">Primary:</span>
                    <span>{primary.full_name}</span>
                    <span className="text-muted-foreground">{primary.email || primary.phone_e164}</span>
                  </div>
                  {duplicates.map((duplicate) => (
                    <div key={duplicate.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Duplicate:</span>
                      <span>{duplicate.full_name}</span>
                      <span className="text-muted-foreground">{duplicate.email || duplicate.phone_e164}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => mergeContacts.mutate({ primaryContactId: primary.id, duplicateContactId: duplicate.id })}
                        disabled={mergeContacts.isPending}
                      >
                        Merge into primary
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {duplicateGroups.length === 0 ? <EmptyState label="No duplicate contact candidates found." /> : null}
        </div>
      </CrmDataCard>

      <CrmDataCard title="All Contacts" description="People associated with active leads and accounts.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Contact Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Preferred Channel</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.email || '-'}</td>
                  <td className="px-3 py-2">{row.phone_e164}</td>
                  <td className="px-3 py-2">
                    {activeEditId === row.id ? (
                      <Input
                        className="h-8 w-40 text-xs"
                        value={editChannel}
                        onChange={(event) => setEditChannel(event.target.value)}
                      />
                    ) : (row.preferred_channel ? <StatusPill variant="info" className="capitalize">{row.preferred_channel}</StatusPill> : '-')}
                  </td>
                  <td className="px-3 py-2">
                    {row.tenant_id ? (
                      <Link className="text-primary hover:underline" to={`/tenants/${row.tenant_id}`}>
                        Tenant since {row.tenant_since ? new Date(row.tenant_since).toLocaleDateString() : 'provisioning'}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {activeEditId === row.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8" onClick={() => saveChannel(row.id)} disabled={updateContact.isPending}>Save</Button>
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setActiveEditId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8" onClick={() => startEdit(row.id, row.preferred_channel)}>Edit Channel</Button>
                    )}
                  </td>
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
