import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmCampaign, useCrmCampaigns } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmCampaignsPage() {
  const { activeCompanyId } = useActiveCompany();
  const campaignsQuery = useCrmCampaigns(activeCompanyId);
  const createCampaign = useCreateCrmCampaign(activeCompanyId);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');

  const rows = useMemo(() => {
    const records = campaignsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.name} ${row.channel} ${row.status}`).toLowerCase().includes(query));
  }, [campaignsQuery.data, search]);

  const create = () => {
    if (!name.trim()) return;
    createCampaign.mutate({
      name: name.trim(),
      channel: 'email',
      status: 'active',
      budget_amount: null,
      spend_amount: null,
      starts_on: new Date().toISOString().slice(0, 10),
      ends_on: null,
      open_rate: null,
      click_rate: null,
      bounce_rate: null,
    });
    setName('');
  };

  return (
    <CrmWorkspace title="Campaigns" subtitle="Marketing campaigns with email analytics metrics.">
      <CrmDataCard title="Create Campaign" description="Start a campaign and track conversion signals.">
        <div className="flex gap-2">
          <input className="h-9 flex-1 rounded-md border border-input px-3 text-sm" placeholder="Campaign name" value={name} onChange={(event) => setName(event.target.value)} />
          <button className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground" onClick={create} disabled={createCampaign.isPending}>Create</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Campaign Performance" description="Open rate, click rate, and bounce insights.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2">Campaign</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Open %</th><th className="px-3 py-2">Click %</th><th className="px-3 py-2">Bounce %</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.channel}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.open_rate ?? '-'}</td>
                  <td className="px-3 py-2">{row.click_rate ?? '-'}</td>
                  <td className="px-3 py-2">{row.bounce_rate ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No campaigns created yet." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
