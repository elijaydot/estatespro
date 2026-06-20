import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmCall, useCrmCalls } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmCallsPage() {
  const { activeCompanyId } = useActiveCompany();
  const callsQuery = useCrmCalls(activeCompanyId);
  const createCall = useCreateCrmCall(activeCompanyId);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');

  const rows = useMemo(() => {
    const records = callsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.subject} ${row.call_type} ${row.result || ''}`).toLowerCase().includes(query));
  }, [callsQuery.data, search]);

  const create = () => {
    if (!subject.trim()) return;
    createCall.mutate({
      subject: subject.trim(),
      call_type: 'outbound',
      related_type: 'lead',
      related_id: null,
      contact_name: null,
      started_at: new Date().toISOString(),
      duration_minutes: 10,
      result: null,
    });
    setSubject('');
  };

  return (
    <CrmWorkspace title="Calls" subtitle="Inbound and outbound interaction logging with outcomes.">
      <CrmDataCard title="Log Call" description="Quick log for a phone interaction.">
        <div className="flex gap-2">
          <input className="h-9 flex-1 rounded-md border border-input px-3 text-sm" placeholder="Call subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createCall.isPending}>Create</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Calls" description="Zoho-order calls module table.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Start Time</th><th className="px-3 py-2">Duration</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.subject}</td>
                  <td className="px-3 py-2">{row.call_type}</td>
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
