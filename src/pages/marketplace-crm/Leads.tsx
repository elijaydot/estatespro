import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useAssignCrmLead, useCrmAssignableUsers, useCrmLeads, useUpdateCrmLeadStage } from '@/hooks/useMarketplace';

const LEAD_STAGES = [
  'new',
  'attempted_contact',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'offer_made',
  'lease_in_progress',
  'converted',
  'lost',
];

function leadStageChipClass(stage: string) {
  if (stage === 'converted') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (stage === 'lost') return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
  if (stage === 'negotiation' || stage === 'viewing') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
}

function leadStatusChipClass(status: string) {
  if (status === 'won') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (status === 'lost') return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
  return 'bg-zinc-500/10 text-zinc-700 border-zinc-500/30';
}

export default function MarketplaceCrmLeadsPage() {
  const { activeCompanyId } = useActiveCompany();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const updateLeadStage = useUpdateCrmLeadStage(activeCompanyId);
  const assignLead = useAssignCrmLead(activeCompanyId);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_desc' | 'score_desc' | 'score_asc'>('score_desc');
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [draftStage, setDraftStage] = useState('new');
  const [draftAssignee, setDraftAssignee] = useState('');

  const rows = useMemo(() => {
    const records = leadsQuery.data || [];
    const query = search.toLowerCase().trim();
    const filtered = !query
      ? records
      : records.filter((row) => (`${row.contact_name || ''} ${row.contact_email || ''} ${row.stage} ${row.status} ${row.listing_title || ''}`).toLowerCase().includes(query));

    const sorted = [...filtered];
    if (sortBy === 'score_desc') {
      sorted.sort((a, b) => b.score - a.score || Date.parse(b.created_at) - Date.parse(a.created_at));
    } else if (sortBy === 'score_asc') {
      sorted.sort((a, b) => a.score - b.score || Date.parse(b.created_at) - Date.parse(a.created_at));
    } else {
      sorted.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    }

    return sorted;
  }, [leadsQuery.data, search, sortBy]);

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

  const saveEdit = async (leadId: string, currentStage: string, currentAssignedTo: string | null) => {
    const updates: Promise<unknown>[] = [];

    if (draftStage !== currentStage) {
      updates.push(updateLeadStage.mutateAsync({ leadId, stage: draftStage }));
    }

    const normalizedAssignee = draftAssignee || null;
    if (normalizedAssignee !== currentAssignedTo) {
      updates.push(assignLead.mutateAsync({ leadId, assigneeUserId: normalizedAssignee }));
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    cancelEdit();
  };

  const isSaving = updateLeadStage.isPending || assignLead.isPending;

  return (
    <CrmWorkspace title="Leads" subtitle="Primary lead pipeline sourced from marketplace inquiries.">
      <CrmDataCard title="All Leads" description="Filter leads by contact, stage, and source context.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Sort by:</span>
          <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'created_desc' | 'score_desc' | 'score_asc')}>
            <option value="score_desc">Score (high to low)</option>
            <option value="score_asc">Score (low to high)</option>
            <option value="created_desc">Newest first</option>
          </select>
        </div>
        <div className="mt-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Edit stage and owner directly in the table to keep triage velocity high.
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Lead Name</th>
                <th className="px-3 py-2.5">Company</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">Stage</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Score</th>
                <th className="px-3 py-2.5">Owner</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.contact_name || 'Unnamed lead'}</td>
                  <td className="px-3 py-2">{row.listing_title || '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.contact_email || '-'}</td>
                  <td className="px-3 py-2">{row.contact_phone || '-'}</td>
                  <td className="px-3 py-2">
                    {editingLeadId === row.id ? (
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={draftStage} onChange={(event) => setDraftStage(event.target.value)}>
                        {Array.from(new Set([...LEAD_STAGES, ...rows.map((lead) => lead.stage)])).map((stage) => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    ) : <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${leadStageChipClass(row.stage)}`}>{row.stage}</span>}
                  </td>
                  <td className="px-3 py-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${leadStatusChipClass(row.status)}`}>{row.status}</span></td>
                  <td className="px-3 py-2">
                    <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      {row.score}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {editingLeadId === row.id ? (
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={draftAssignee} onChange={(event) => setDraftAssignee(event.target.value)}>
                        <option value="">Unassigned</option>
                        {(assignableUsersQuery.data || []).map((user) => (
                          <option key={user.user_id} value={user.user_id}>{user.name}</option>
                        ))}
                      </select>
                    ) : (
                      (assignableUsersQuery.data || []).find((user) => user.user_id === row.assigned_to)?.name || 'Unassigned'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingLeadId === row.id ? (
                      <div className="flex gap-2">
                        <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={() => saveEdit(row.id, row.stage, row.assigned_to)} disabled={isSaving}>Save</button>
                        <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={cancelEdit} disabled={isSaving}>Cancel</button>
                      </div>
                    ) : (
                      <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => startEdit(row.id, row.stage, row.assigned_to)}>Edit</button>
                    )}
                  </td>
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
