import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCreateCrmDeal, useCrmDeals } from '@/hooks/useMarketplaceCrm';

const DEAL_STAGES = ['qualification', 'needs_analysis', 'value_proposition', 'identify_decision_makers', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

export default function MarketplaceCrmDealsPage() {
  const { activeCompanyId } = useActiveCompany();
  const dealsQuery = useCrmDeals(activeCompanyId);
  const createDeal = useCreateCrmDeal(activeCompanyId);

  const [search, setSearch] = useState('');
  const [dealName, setDealName] = useState('');
  const [amount, setAmount] = useState('');

  const rows = useMemo(() => {
    const records = dealsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return records;
    return records.filter((row) => (`${row.deal_name} ${row.stage}`).toLowerCase().includes(query));
  }, [dealsQuery.data, search]);

  const grouped = useMemo(() => {
    const bucket: Record<string, typeof rows> = {};
    DEAL_STAGES.forEach((stage) => { bucket[stage] = []; });
    rows.forEach((row) => {
      const key = bucket[row.stage] ? row.stage : 'qualification';
      bucket[key].push(row);
    });
    return bucket;
  }, [rows]);

  const onCreate = () => {
    if (!dealName.trim()) return;
    createDeal.mutate({
      deal_name: dealName.trim(),
      amount: amount ? Number(amount) : null,
      currency: 'NGN',
      stage: 'qualification',
      probability: 10,
    });
    setDealName('');
    setAmount('');
  };

  return (
    <CrmWorkspace title="Deals" subtitle="Kanban-style opportunity tracking for lease and revenue conversion.">
      <CrmDataCard title="Create Deal" description="Quick-add deal opportunity.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Deal name" value={dealName} onChange={(event) => setDealName(event.target.value)} />
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <button className="h-9 rounded-md bg-primary text-primary-foreground text-sm" onClick={onCreate} disabled={createDeal.isPending}>Create Deal</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Pipeline Board" description="Stage-view inspired by FishGate opportunity board.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto">
          <div className="flex gap-3 pb-2 min-w-max">
            {DEAL_STAGES.map((stage) => (
              <div key={stage} className="w-64 rounded-lg border border-border/70 bg-card/60 p-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{stage.replace(/_/g, ' ')}</p>
                <div className="space-y-2">
                  {(grouped[stage] || []).map((deal) => (
                    <div key={deal.id} className="rounded-md border border-border/70 bg-background/80 p-2 text-sm">
                      <p className="font-medium">{deal.deal_name}</p>
                      <p className="text-xs text-muted-foreground">{deal.amount ? `NGN ${Number(deal.amount).toLocaleString()}` : 'No amount'}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {rows.length === 0 ? <div className="mt-3"><EmptyState label="No deals created yet." /></div> : null}
      </CrmDataCard>
    </CrmWorkspace>
  );
}
