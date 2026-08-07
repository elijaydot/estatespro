import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, SearchX, Users } from 'lucide-react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { CrmDataCard, EmptyState, QueryErrorState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { StatusPill } from '@/components/shared/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmContacts, useMergeCrmContacts, useUpdateCrmContact } from '@/hooks/useMarketplaceCrm';
import { findDuplicateContactGroups } from '@/lib/marketplaceCrmWorkflow';
import { CRM_CHANNELS } from '@/lib/crmPreferences';

export default function MarketplaceCrmContactsPage() {
  const { activeCompanyId } = useActiveCompany();
  const contactsQuery = useCrmContacts(activeCompanyId);
  const updateContact = useUpdateCrmContact(activeCompanyId);
  const mergeContacts = useMergeCrmContacts(activeCompanyId);
  const [search, setSearch] = useState('');
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [editChannel, setEditChannel] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [identityFilter, setIdentityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(() => {
    const records = contactsQuery.data || [];
    const query = search.toLowerCase().trim();
    return records.filter((row) => (
      (!query || (`${row.full_name} ${row.email || ''} ${row.phone_e164}`).toLowerCase().includes(query))
      && (channelFilter === 'all' || row.preferred_channel === channelFilter)
      && (identityFilter === 'all' || (identityFilter === 'tenant' ? !!row.tenant_id : !row.tenant_id))
    ));
  }, [channelFilter, contactsQuery.data, identityFilter, search]);

  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [channelFilter, identityFilter, pageSize, search]);

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
      {contactsQuery.isError ? (
        <CrmDataCard title="Contacts unavailable" description="The CRM could not retrieve contact records.">
          <QueryErrorState message={contactsQuery.error?.message} onRetry={() => void contactsQuery.refetch()} />
        </CrmDataCard>
      ) : null}

      {!contactsQuery.isError && duplicateGroups.length > 0 ? (
        <CrmDataCard title="Resolve Possible Duplicates" description={`${duplicateGroups.length} group${duplicateGroups.length === 1 ? '' : 's'} need review before outreach or reporting.`}>
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
        </div>
        </CrmDataCard>
      ) : null}

      {!contactsQuery.isError ? (
        <CrmDataCard
          title={contactsQuery.data?.length ? 'All Contacts' : 'Contact Directory'}
          description={contactsQuery.data?.length ? `${contactsQuery.data.length} people associated with leads and accounts.` : 'Contacts are created automatically when a lead enters the pipeline.'}
          action={contactsQuery.data?.length ? <Button variant="outline" size="sm" asChild><Link to="/marketplace/crm/leads">View leads<ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : null}
        >
        {contactsQuery.data?.length ? <div className="space-y-3">
          <SimpleToolbar search={search} setSearch={setSearch} />
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Filter by preferred channel" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
              <option value="all">All channels</option>{CRM_CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
            </select>
            <select aria-label="Filter by identity" className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={identityFilter} onChange={(event) => setIdentityFilter(event.target.value)}>
              <option value="all">All contacts</option><option value="tenant">Linked tenants</option><option value="prospect">Prospects</option>
            </select>
            {(channelFilter !== 'all' || identityFilter !== 'all') && <Button variant="ghost" size="sm" onClick={() => { setChannelFilter('all'); setIdentityFilter('all'); }}>Reset filters</Button>}
          </div>
        </div> : null}
        {contactsQuery.data?.length ? <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Contact Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Preferred Channel</th>
                <th className="px-3 py-2">Origin</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.full_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.email || '-'}</td>
                  <td className="px-3 py-2">{row.phone_e164}</td>
                  <td className="px-3 py-2">
                    {activeEditId === row.id ? (
                      <select
                        aria-label="Preferred channel"
                        className="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs"
                        value={editChannel}
                        onChange={(event) => setEditChannel(event.target.value)}
                      >
                        <option value="">Not specified</option>{CRM_CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
                      </select>
                    ) : (row.preferred_channel ? <StatusPill variant="info" className="capitalize">{row.preferred_channel}</StatusPill> : '-')}
                  </td>
                  <td className="px-3 py-2"><Link className="text-primary hover:underline" to={`/marketplace/crm/leads?lead=${row.lead_id}`}>View lead</Link></td>
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
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={SearchX}
                label="No contacts match your search"
                description="Try a name, email address, or phone number, or clear the search to see all contacts."
                action={<Button variant="outline" size="sm" onClick={() => setSearch('')}>Clear search</Button>}
              />
            </div>
          ) : null}
          {rows.length > 0 ? <TablePagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={setPageSize} /> : null}
        </div> : (
          <EmptyState
            icon={Users}
            label="Your contact directory starts with a lead"
            description="Marketplace inquiries become contacts automatically, keeping the person and their opportunity connected from the first conversation."
            action={<Button asChild><Link to="/marketplace/crm/leads">Open lead pipeline<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
          />
        )}
        </CrmDataCard>
      ) : null}
    </CrmWorkspace>
  );
}
