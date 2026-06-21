import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmCall, useCrmCalls } from '@/hooks/useMarketplaceCrm';
import { useCrmLeads } from '@/hooks/useMarketplace';

export default function MarketplaceCrmCallsPage() {
  const { activeCompanyId } = useActiveCompany();
  const callsQuery = useCrmCalls(activeCompanyId);
  const leadsQuery = useCrmLeads(activeCompanyId);
  const createCall = useCreateCrmCall(activeCompanyId);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [callType, setCallType] = useState<'inbound' | 'outbound'>('outbound');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [leadId, setLeadId] = useState('');
  const [result, setResult] = useState('answered_follow_up_required');

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
      contact_name: null,
      started_at: new Date().toISOString(),
      duration_minutes: duration,
      result,
    });
    setSubject('');
    setLeadId('');
    setResult('answered_follow_up_required');
    setDurationMinutes('10');
  };

  return (
    <CrmWorkspace title="Calls" subtitle="Inbound and outbound interaction logging with outcomes.">
      <CrmDataCard title="Log Call" description="Quick log for a phone interaction.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <input className="h-9 flex-1 rounded-md border border-input px-3 text-sm" placeholder="Call subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={callType} onChange={(event) => setCallType(event.target.value as 'inbound' | 'outbound')}>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Duration (min)" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} />
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={leadId} onChange={(event) => setLeadId(event.target.value)}>
            <option value="">Select lead</option>
            {(leadsQuery.data || []).map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.contact_name || lead.id}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={result} onChange={(event) => setResult(event.target.value)}>
            <option value="answered_follow_up_required">Answered - Follow up required</option>
            <option value="answered_no_follow_up">Answered - No follow up</option>
            <option value="missed">Missed</option>
            <option value="voicemail">Voicemail</option>
          </select>
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createCall.isPending}>Create</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Calls" description="Calls module table in FishGate CRM sequence.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Start Time</th><th className="px-3 py-2">Duration</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.subject}</td>
                  <td className="px-3 py-2">{row.call_type}</td>
                  <td className="px-3 py-2">{row.result || '-'}</td>
                  <td className="px-3 py-2">{new Date(row.started_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.duration_minutes} min</td>
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
