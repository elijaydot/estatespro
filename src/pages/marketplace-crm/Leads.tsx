import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Columns3, List, Loader2, SearchX, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { LeadDetailPanel } from '@/components/marketplace-crm/LeadDetailPanel';
import { LeadPipelineBoard, LEAD_STAGE_ORDER } from '@/components/marketplace-crm/LeadPipelineBoard';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { CrmDataCard, EmptyState, QueryErrorState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/shared/StatusPill';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useAssignCrmLead, useCrmAssignableUsers, useCrmLeads, useUpdateCrmLeadStage } from '@/hooks/useMarketplace';

function leadStageVariant(stage: string) {
  if (stage === 'converted') return 'success' as const;
  if (stage === 'lost') return 'destructive' as const;
  if (['viewing_scheduled', 'offer_made', 'lease_in_progress'].includes(stage)) return 'warning' as const;
  return 'info' as const;
}

function leadStatusVariant(status: string) {
  if (status === 'won') return 'success' as const;
  if (status === 'lost') return 'destructive' as const;
  return 'neutral' as const;
}

export default function MarketplaceCrmLeadsPage() {
  const { activeCompanyId } = useActiveCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const updateLeadStage = useUpdateCrmLeadStage(activeCompanyId);
  const assignLead = useAssignCrmLead(activeCompanyId);
  const [view, setView] = useState<'board' | 'table'>(() => localStorage.getItem('marketplace-crm-leads-view') === 'table' ? 'table' : 'board');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(searchParams.get('lead'));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_desc' | 'score_desc' | 'score_asc'>('score_desc');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [draftStage, setDraftStage] = useState('new');
  const [draftAssignee, setDraftAssignee] = useState('');
  const listingFilter = searchParams.get('listing');

  useEffect(() => {
    localStorage.setItem('marketplace-crm-leads-view', view);
  }, [view]);

  const filteredLeads = useMemo(() => {
    const records = leadsQuery.data || [];
    const byListing = listingFilter ? records.filter((lead) => lead.listing_id === listingFilter) : records;
    const query = search.toLowerCase().trim();
    return !query ? byListing : byListing.filter((lead) => (
      `${lead.contact_name || ''} ${lead.contact_email || ''} ${lead.stage} ${lead.status} ${lead.listing_title || ''}`
    ).toLowerCase().includes(query));
  }, [leadsQuery.data, listingFilter, search]);

  const tableRows = useMemo(() => {
    const sorted = filteredLeads.filter((lead) => (
      (stageFilter === 'all' || lead.stage === stageFilter)
      && (statusFilter === 'all' || lead.status === statusFilter)
      && (ownerFilter === 'all' || (ownerFilter === 'unassigned' ? !lead.assigned_to : lead.assigned_to === ownerFilter))
    ));
    if (sortBy === 'score_desc') sorted.sort((a, b) => b.score - a.score || Date.parse(b.created_at) - Date.parse(a.created_at));
    else if (sortBy === 'score_asc') sorted.sort((a, b) => a.score - b.score || Date.parse(b.created_at) - Date.parse(a.created_at));
    else sorted.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    return sorted;
  }, [filteredLeads, ownerFilter, sortBy, stageFilter, statusFilter]);

  const paginatedTableRows = tableRows.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);

  useEffect(() => {
    setTablePage(1);
  }, [search, stageFilter, statusFilter, ownerFilter, tablePageSize]);

  useEffect(() => {
    if (selectedLeadId && filteredLeads.some((lead) => lead.id === selectedLeadId)) return;
    setSelectedLeadId(filteredLeads[0]?.id || null);
  }, [filteredLeads, selectedLeadId]);

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) || null;
  const staleLeadCount = filteredLeads.filter((lead) => (
    !lead.last_activity_at || Date.now() - new Date(lead.last_activity_at).getTime() > 48 * 3600000
  )).length;
  const assignableUsers = assignableUsersQuery.data || [];
  const isSaving = updateLeadStage.isPending || assignLead.isPending;

  const startEdit = (leadId: string, stage: string, assignedTo: string | null) => {
    setEditingLeadId(leadId);
    setDraftStage(stage || 'new');
    setDraftAssignee(assignedTo || '');
  };

  const cancelEdit = () => {
    setEditingLeadId(null);
    setDraftStage('new');
    setDraftAssignee('');
  };

  const clearFilters = () => {
    setSearch('');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('lead');
    nextParams.delete('listing');
    setSearchParams(nextParams, { replace: true });
  };

  const saveEdit = async (leadId: string, currentStage: string, currentAssignedTo: string | null) => {
    const updates: Promise<unknown>[] = [];
    if (draftStage !== currentStage) updates.push(updateLeadStage.mutateAsync({ leadId, stage: draftStage }));
    const assignee = draftAssignee || null;
    if (assignee !== currentAssignedTo) updates.push(assignLead.mutateAsync({ leadId, assigneeUserId: assignee }));
    await Promise.all(updates);
    cancelEdit();
  };

  return (
    <CrmWorkspace title="Leads" subtitle="Manage marketplace inquiries from first contact through qualification.">
      {leadsQuery.isError ? (
        <CrmDataCard title="Lead pipeline unavailable" description="The CRM could not retrieve leads for the active company.">
          <QueryErrorState message={leadsQuery.error?.message} onRetry={() => void leadsQuery.refetch()} />
        </CrmDataCard>
      ) : leadsQuery.isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border/70 bg-card">
          <div className="text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading lead pipeline...</div>
        </div>
      ) : (leadsQuery.data || []).length === 0 ? (
        <CrmDataCard title="Lead Pipeline" description="Every marketplace inquiry enters this workspace automatically.">
          <EmptyState
            icon={Users}
            label="Your pipeline is ready for its first inquiry"
            description="Publish a verified listing to start capturing renter interest. New inquiries will arrive here with their contact and listing context attached."
            action={<Button asChild><Link to="/marketplace/manage">Manage listings<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
          />
        </CrmDataCard>
      ) : (
      <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[240px] flex-1"><SimpleToolbar search={search} setSearch={setSearch} /></div>
        <div className="flex rounded-md border border-border p-1" aria-label="Lead view">
          <Button size="sm" variant={view === 'board' ? 'secondary' : 'ghost'} onClick={() => setView('board')}><Columns3 className="mr-1.5 h-4 w-4" />Board</Button>
          <Button size="sm" variant={view === 'table' ? 'secondary' : 'ghost'} onClick={() => setView('table')}><List className="mr-1.5 h-4 w-4" />Table</Button>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <CrmDataCard title="No matching leads" description="The pipeline is healthy, but no records match the current search or listing filter.">
          <EmptyState
            icon={SearchX}
            label="No leads match these filters"
            description="Clear the active filters to return to the complete lead pipeline."
            action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
          />
        </CrmDataCard>
      ) : view === 'board' ? (
        <div className="space-y-4">
          <LeadPipelineBoard
            leads={filteredLeads}
            selectedLeadId={selectedLeadId}
            onSelectLead={setSelectedLeadId}
            onChangeStage={(leadId, stage) => updateLeadStage.mutate({ leadId, stage })}
            isLoading={leadsQuery.isLoading}
            isUpdating={updateLeadStage.isPending}
          />
          <LeadDetailPanel companyId={activeCompanyId} lead={selectedLead} assignableUsers={assignableUsers} staleLeadCount={staleLeadCount} />
        </div>
      ) : (
        <CrmDataCard title="All Leads" description="Filter and update leads by contact, stage, score, and owner.">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <select aria-label="Filter by stage" className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="all">All stages</option>{LEAD_STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{stage.replace(/_/g, ' ')}</option>)}
            </select>
            <select aria-label="Filter by status" className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option><option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option>
            </select>
            <select aria-label="Filter by owner" className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="all">All owners</option><option value="unassigned">Unassigned</option>{assignableUsers.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
            </select>
            <select aria-label="Sort leads" className="h-9 rounded-md border border-input bg-background px-2 text-xs" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="score_desc">Score (high to low)</option><option value="score_asc">Score (low to high)</option><option value="created_desc">Newest first</option>
            </select>
            {(stageFilter !== 'all' || statusFilter !== 'all' || ownerFilter !== 'all') && <Button variant="ghost" size="sm" onClick={() => { setStageFilter('all'); setStatusFilter('all'); setOwnerFilter('all'); }}>Reset filters</Button>}
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2.5">Lead</th><th className="px-3 py-2.5">Listing</th><th className="px-3 py-2.5">Email</th><th className="px-3 py-2.5">Phone</th><th className="px-3 py-2.5">Stage</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Score</th><th className="px-3 py-2.5">Owner</th><th className="px-3 py-2.5">Actions</th></tr>
              </thead>
              <tbody>
                {paginatedTableRows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{row.contact_name || 'Lead'}</td>
                    <td className="px-3 py-2">{row.listing_title || '-'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.contact_email || '-'}</td>
                    <td className="px-3 py-2">{row.contact_phone || '-'}</td>
                    <td className="px-3 py-2">
                      {editingLeadId === row.id ? (
                        <select className="h-8 rounded-md border bg-background px-2" value={draftStage} onChange={(event) => setDraftStage(event.target.value)}>
                          {Array.from(new Set([...LEAD_STAGE_ORDER, ...tableRows.map((lead) => lead.stage)])).map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                      ) : <StatusPill variant={leadStageVariant(row.stage)} className="capitalize">{row.stage.replace(/_/g, ' ')}</StatusPill>}
                    </td>
                    <td className="px-3 py-2"><StatusPill variant={leadStatusVariant(row.status)}>{row.status}</StatusPill></td>
                    <td className="px-3 py-2">{row.score}</td>
                    <td className="px-3 py-2">
                      {editingLeadId === row.id ? (
                        <select className="h-8 rounded-md border bg-background px-2" value={draftAssignee} onChange={(event) => setDraftAssignee(event.target.value)}>
                          <option value="">Unassigned</option>{assignableUsers.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                      ) : assignableUsers.find((member) => member.user_id === row.assigned_to)?.name || 'Unassigned'}
                    </td>
                    <td className="px-3 py-2">
                      {editingLeadId === row.id ? (
                        <div className="flex gap-2"><Button size="sm" onClick={() => saveEdit(row.id, row.stage, row.assigned_to)} disabled={isSaving}>Save</Button><Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button></div>
                      ) : <Button size="sm" variant="outline" onClick={() => startEdit(row.id, row.stage, row.assigned_to)}>Edit</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tableRows.length === 0 && <div className="p-4"><EmptyState label="No leads found for this filter." /></div>}
            {tableRows.length > 0 && <TablePagination page={tablePage} pageSize={tablePageSize} total={tableRows.length} onPageChange={setTablePage} onPageSizeChange={setTablePageSize} />}
          </div>
        </CrmDataCard>
      )}
      </>
      )}
    </CrmWorkspace>
  );
}