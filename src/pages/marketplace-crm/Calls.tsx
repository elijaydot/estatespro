import { useMemo, useState } from 'react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmCall, useCrmCalls, useUpdateCrmCall } from '@/hooks/useMarketplaceCrm';
import { useCrmAssignableUsers, useCrmLeads } from '@/hooks/useMarketplace';

const CALL_RESULTS = [
  'answered_follow_up_required',
  'answered_no_follow_up',
  'missed',
  'voicemail',
  'wrong_number',
  'rescheduled',
];

function callResultChipClass(result: string | null) {
  if (result === 'answered_no_follow_up') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (result === 'answered_follow_up_required' || result === 'rescheduled') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  if (result === 'wrong_number' || result === 'missed') return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
  return 'bg-zinc-500/10 text-zinc-700 border-zinc-500/30';
}

export default function MarketplaceCrmCallsPage() {
  const { activeCompanyId } = useActiveCompany();
  const callsQuery = useCrmCalls(activeCompanyId);
  const leadsQuery = useCrmLeads(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const createCall = useCreateCrmCall(activeCompanyId);
  const updateCall = useUpdateCrmCall(activeCompanyId);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [callType, setCallType] = useState<'inbound' | 'outbound'>('outbound');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [leadId, setLeadId] = useState('');
  const [result, setResult] = useState('answered_follow_up_required');
  const [startedAt, setStartedAt] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [contactName, setContactName] = useState('');
  const [editingCallId, setEditingCallId] = useState<string | null>(null);
  const [editResult, setEditResult] = useState('answered_follow_up_required');
  const [editDuration, setEditDuration] = useState('10');
  const [editSubject, setEditSubject] = useState('');

  const rows = useMemo(() => {
    const records = callsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.subject} ${row.call_type} ${row.result || ''}`).toLowerCase().includes(query));
  }, [callsQuery.data, search]);

  const create = () => {
    if (!subject.trim()) return;
    if (!leadId) return;
    const duration = Number(durationMinutes);
    if (Number.isNaN(duration) || duration <= 0) return;

    createCall.mutate({
      subject: subject.trim(),
      call_type: callType,
      related_type: 'lead',
      related_id: leadId,
      contact_name: contactName.trim() || null,
      owner_user_id: ownerUserId || null,
      started_at: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
      duration_minutes: duration,
      result,
    });
    setSubject('');
    setLeadId('');
    setResult('answered_follow_up_required');
    setDurationMinutes('10');
    setStartedAt('');
    setOwnerUserId('');
    setContactName('');
  };

  const startEdit = (callId: string, currentSubject: string, currentResult: string | null, currentDuration: number) => {
    setEditingCallId(callId);
    setEditSubject(currentSubject);
    setEditResult(currentResult || 'answered_follow_up_required');
    setEditDuration(String(currentDuration));
  };

  const saveEdit = () => {
    if (!editingCallId) return;
    const parsedDuration = Number(editDuration);
    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) return;

    updateCall.mutate(
      {
        callId: editingCallId,
        payload: {
          subject: editSubject.trim(),
          duration_minutes: parsedDuration,
          result: editResult,
        },
      },
      {
        onSuccess: () => {
          setEditingCallId(null);
          setEditSubject('');
          setEditDuration('10');
          setEditResult('answered_follow_up_required');
        },
      },
    );
  };

  return (
    <CrmWorkspace title="Calls" subtitle="Inbound and outbound interaction logging with outcomes.">
      <CrmDataCard title="Log Call" description="Quick log for a phone interaction.">
        <div className="mb-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Track result quality so your follow-up queue reflects real call outcomes.
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <input aria-label="Call subject" className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-4" placeholder="Call subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <select aria-label="Call direction" className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-2" value={callType} onChange={(event) => setCallType(event.target.value as 'inbound' | 'outbound')}>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
          <input aria-label="Call duration in minutes" className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-2" inputMode="numeric" placeholder="Duration (min)" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
          <select aria-label="Related lead" className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-2" value={leadId} onChange={(event) => setLeadId(event.target.value)}>
            <option value="">Select lead</option>
            {(leadsQuery.data || []).map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.contact_name || lead.contact_email || 'Unnamed lead'}</option>
            ))}
          </select>
          <select aria-label="Call result" className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-2" value={result} onChange={(event) => setResult(event.target.value)}>
            {CALL_RESULTS.map((item) => (
              <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input aria-label="Call start time" className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-3" type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
          <div className="lg:col-span-3">
            <AssigneePicker
              users={assignableUsersQuery.data || []}
              value={ownerUserId || null}
              onChange={(next) => setOwnerUserId(next || '')}
              placeholder="Owner (optional)"
              className="h-10"
            />
          </div>
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-4" placeholder="Contact name (optional)" value={contactName} onChange={(event) => setContactName(event.target.value)} />
          <button className="h-10 rounded-md bg-primary px-3 text-sm text-primary-foreground lg:col-span-2" onClick={create} disabled={createCall.isPending}>Create</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Calls" description="Calls module table in FishGate CRM sequence.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2.5">Subject</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Result</th><th className="px-3 py-2.5">Start Time</th><th className="px-3 py-2.5">Duration</th><th className="px-3 py-2.5">Action</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">
                    {editingCallId === row.id ? (
                      <input className="h-8 w-full rounded-md border border-input px-2 text-xs" value={editSubject} onChange={(event) => setEditSubject(event.target.value)} />
                    ) : row.subject}
                  </td>
                  <td className="px-3 py-2">{row.call_type}</td>
                  <td className="px-3 py-2">
                    {editingCallId === row.id ? (
                      <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={editResult} onChange={(event) => setEditResult(event.target.value)}>
                        {CALL_RESULTS.map((item) => (
                          <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    ) : <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${callResultChipClass(row.result)}`}>{(row.result || '-').replace(/_/g, ' ')}</span>}
                  </td>
                  <td className="px-3 py-2">{new Date(row.started_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {editingCallId === row.id ? (
                      <input className="h-8 w-24 rounded-md border border-input px-2 text-xs" value={editDuration} onChange={(event) => setEditDuration(event.target.value)} />
                    ) : `${row.duration_minutes} min`}
                  </td>
                  <td className="px-3 py-2">
                    {editingCallId === row.id ? (
                      <div className="flex gap-2">
                        <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={saveEdit} disabled={updateCall.isPending}>Save</button>
                        <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => setEditingCallId(null)} disabled={updateCall.isPending}>Cancel</button>
                      </div>
                    ) : (
                      <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => startEdit(row.id, row.subject, row.result, row.duration_minutes)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No calls logged yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
