import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmCampaign, useCrmCampaigns, useUpdateCrmCampaign } from '@/hooks/useMarketplaceCrm';

// Navigation remains gated until FUTURE_FEATURE_MULTI_CHANNEL_MESSAGING.md is delivered.
export default function MarketplaceCrmCampaignsPage() {
  const { activeCompanyId } = useActiveCompany();
  const campaignsQuery = useCrmCampaigns(activeCompanyId);
  const createCampaign = useCreateCrmCampaign(activeCompanyId);
  const updateCampaign = useUpdateCrmCampaign(activeCompanyId);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState('draft');
  const [draftOpenRate, setDraftOpenRate] = useState('');
  const [draftClickRate, setDraftClickRate] = useState('');
  const [draftBounceRate, setDraftBounceRate] = useState('');

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
      status: 'draft',
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

  const editRow = (campaignId: string, status: string, openRate: number | null, clickRate: number | null, bounceRate: number | null) => {
    setActiveRowId(campaignId);
    setDraftStatus(status);
    setDraftOpenRate(openRate === null ? '' : String(openRate));
    setDraftClickRate(clickRate === null ? '' : String(clickRate));
    setDraftBounceRate(bounceRate === null ? '' : String(bounceRate));
  };

  const saveRow = (campaignId: string) => {
    const openRate = draftOpenRate.trim() ? Number.parseFloat(draftOpenRate) : null;
    const clickRate = draftClickRate.trim() ? Number.parseFloat(draftClickRate) : null;
    const bounceRate = draftBounceRate.trim() ? Number.parseFloat(draftBounceRate) : null;

    updateCampaign.mutate({
      id: campaignId,
      payload: {
        status: draftStatus,
        open_rate: Number.isNaN(openRate as number) ? null : openRate,
        click_rate: Number.isNaN(clickRate as number) ? null : clickRate,
        bounce_rate: Number.isNaN(bounceRate as number) ? null : bounceRate,
      },
    });

    setActiveRowId(null);
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
              <tr><th className="px-3 py-2">Campaign</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Open %</th><th className="px-3 py-2">Click %</th><th className="px-3 py-2">Bounce %</th><th className="px-3 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2">{row.channel}</td>
                  <td className="px-3 py-2">
                    {activeRowId === row.id ? (
                      <select className="h-8 rounded border border-input px-2 text-xs" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}>
                        <option value="draft">draft</option>
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="completed">completed</option>
                      </select>
                    ) : row.status}
                  </td>
                  <td className="px-3 py-2">{activeRowId === row.id ? <input className="h-8 w-20 rounded border border-input px-2 text-xs" value={draftOpenRate} onChange={(event) => setDraftOpenRate(event.target.value)} /> : (row.open_rate ?? '-')}</td>
                  <td className="px-3 py-2">{activeRowId === row.id ? <input className="h-8 w-20 rounded border border-input px-2 text-xs" value={draftClickRate} onChange={(event) => setDraftClickRate(event.target.value)} /> : (row.click_rate ?? '-')}</td>
                  <td className="px-3 py-2">{activeRowId === row.id ? <input className="h-8 w-20 rounded border border-input px-2 text-xs" value={draftBounceRate} onChange={(event) => setDraftBounceRate(event.target.value)} /> : (row.bounce_rate ?? '-')}</td>
                  <td className="px-3 py-2">
                    {activeRowId === row.id ? (
                      <div className="flex gap-2">
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => saveRow(row.id)} disabled={updateCampaign.isPending}>Save</button>
                        <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => setActiveRowId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="rounded border border-border px-2 py-1 text-xs" onClick={() => editRow(row.id, row.status, row.open_rate, row.click_rate, row.bounce_rate)}>Update KPI</button>
                    )}
                  </td>
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
