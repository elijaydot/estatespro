import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import {
  useCompleteCrmDealHandoff,
  useCreateCrmDeal,
  useCrmAccounts,
  useCrmContacts,
  useCrmDealHandoffs,
  useCrmDeals,
  useStartCrmDealHandoff,
  useTransitionCrmDealStage,
} from '@/hooks/useMarketplaceCrm';

const DEAL_STAGES = ['qualification', 'needs_analysis', 'value_proposition', 'identify_decision_makers', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

export default function MarketplaceCrmDealsPage() {
  const { activeCompanyId } = useActiveCompany();
  const dealsQuery = useCrmDeals(activeCompanyId);
  const accountsQuery = useCrmAccounts(activeCompanyId);
  const contactsQuery = useCrmContacts(activeCompanyId);
  const handoffsQuery = useCrmDealHandoffs(activeCompanyId);
  const createDeal = useCreateCrmDeal(activeCompanyId);
  const transitionDeal = useTransitionCrmDealStage(activeCompanyId);
  const startHandoff = useStartCrmDealHandoff(activeCompanyId);
  const completeHandoff = useCompleteCrmDealHandoff(activeCompanyId);

  const [search, setSearch] = useState('');
  const [dealName, setDealName] = useState('');
  const [amount, setAmount] = useState('');
  const [createOwnerUserId, setCreateOwnerUserId] = useState('');
  const [createAccountId, setCreateAccountId] = useState('');
  const [createContactId, setCreateContactId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStage, setEditStage] = useState('qualification');
  const [editProbability, setEditProbability] = useState('10');
  const [editAmount, setEditAmount] = useState('');
  const [editOwnerUserId, setEditOwnerUserId] = useState('');
  const [completingHandoffId, setCompletingHandoffId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');

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

  const handoffByDealId = useMemo(() => {
    const map = new Map<string, { id: string; status: string; readiness_notes: string | null }>();
    (handoffsQuery.data || []).forEach((handoff) => {
      map.set(handoff.deal_id, { id: handoff.id, status: handoff.status, readiness_notes: handoff.readiness_notes });
    });
    return map;
  }, [handoffsQuery.data]);

  const onCreate = () => {
    if (!dealName.trim()) return;
    createDeal.mutate({
      deal_name: dealName.trim(),
      amount: amount ? Number(amount) : null,
      owner_user_id: createOwnerUserId || null,
      account_id: createAccountId || null,
      contact_id: createContactId || null,
      currency: 'NGN',
      stage: 'qualification',
      probability: 10,
    });
    setDealName('');
    setAmount('');
    setCreateOwnerUserId('');
    setCreateAccountId('');
    setCreateContactId('');
  };

  const startEdit = (id: string, stage: string, probability: number, currentAmount: number | null, currentOwnerUserId: string | null) => {
    setEditingId(id);
    setEditStage(stage);
    setEditProbability(String(probability));
    setEditAmount(currentAmount == null ? '' : String(currentAmount));
    setEditOwnerUserId(currentOwnerUserId || '');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const parsed = Number(editProbability);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return;

    transitionDeal.mutate(
      {
        dealId: editingId,
        stage: editStage,
        probability: parsed,
        amount: editAmount ? Number(editAmount) : null,
        ownerUserId: editOwnerUserId.trim() || null,
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditAmount('');
          setEditOwnerUserId('');
        },
      },
    );
  };

  const submitHandoffCompletion = (handoffId: string, dealAmount: number | null) => {
    if (!tenantName.trim() || !tenantEmail.trim() || !tenantPhone.trim() || !leaseStart || !leaseEnd) return;
    const rent = Number(monthlyRent || dealAmount || 0);
    const deposit = Number(securityDeposit || 0);
    if (Number.isNaN(rent) || rent <= 0) return;
    if (Number.isNaN(deposit) || deposit < 0) return;

    completeHandoff.mutate({
      handoffId,
      tenantName: tenantName.trim(),
      tenantEmail: tenantEmail.trim(),
      tenantPhone: tenantPhone.trim(),
      leaseStart,
      leaseEnd,
      monthlyRent: rent,
      securityDeposit: deposit,
    }, {
      onSuccess: () => {
        setCompletingHandoffId(null);
        setTenantName('');
        setTenantEmail('');
        setTenantPhone('');
        setLeaseStart('');
        setLeaseEnd('');
        setMonthlyRent('');
        setSecurityDeposit('');
      },
    });
  };

  return (
    <CrmWorkspace title="Deals" subtitle="Kanban-style opportunity tracking for lease and revenue conversion.">
      <CrmDataCard title="Create Deal" description="Quick-add deal opportunity.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Deal name" value={dealName} onChange={(event) => setDealName(event.target.value)} />
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <input className="h-9 rounded-md border border-input px-3 text-sm" placeholder="Owner user id (optional)" value={createOwnerUserId} onChange={(event) => setCreateOwnerUserId(event.target.value)} />
          <button className="h-9 rounded-md bg-primary text-primary-foreground text-sm" onClick={onCreate} disabled={createDeal.isPending}>Create Deal</button>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={createAccountId} onChange={(event) => setCreateAccountId(event.target.value)}>
            <option value="">Link Account (optional)</option>
            {(accountsQuery.data || []).map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={createContactId} onChange={(event) => setCreateContactId(event.target.value)}>
            <option value="">Link Contact (optional)</option>
            {(contactsQuery.data || []).map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.full_name}</option>
            ))}
          </select>
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
                      <p className="text-xs text-muted-foreground">Probability: {deal.probability}%</p>
                      <p className="text-xs text-muted-foreground">Owner: {deal.owner_user_id || '-'}</p>
                      {handoffByDealId.get(deal.id) ? (
                        <p className="text-xs text-muted-foreground">
                          Handoff: {handoffByDealId.get(deal.id)?.status}
                        </p>
                      ) : null}
                      {editingId === deal.id ? (
                        <div className="mt-2 space-y-2">
                          <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={editStage} onChange={(event) => setEditStage(event.target.value)}>
                            {DEAL_STAGES.map((s) => (
                              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                            ))}
                          </select>
                          <input
                            className="h-8 w-full rounded-md border border-input px-2 text-xs"
                            value={editProbability}
                            onChange={(event) => setEditProbability(event.target.value)}
                            placeholder="Probability (0-100)"
                          />
                          <input
                            className="h-8 w-full rounded-md border border-input px-2 text-xs"
                            value={editAmount}
                            onChange={(event) => setEditAmount(event.target.value)}
                            placeholder="Amount (required for closed won)"
                          />
                          <input
                            className="h-8 w-full rounded-md border border-input px-2 text-xs"
                            value={editOwnerUserId}
                            onChange={(event) => setEditOwnerUserId(event.target.value)}
                            placeholder="Owner user id"
                          />
                          <div className="flex gap-2">
                            <button className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground" onClick={saveEdit} disabled={transitionDeal.isPending}>Save</button>
                            <button
                              className="h-8 rounded-md border border-input px-2 text-xs"
                              onClick={() => {
                                setEditingId(null);
                                setEditOwnerUserId('');
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <button
                            className="h-8 rounded-md border border-input px-2 text-xs"
                            onClick={() => startEdit(deal.id, deal.stage, deal.probability, deal.amount, deal.owner_user_id)}
                          >
                            Edit Stage
                          </button>
                          {deal.stage === 'closed_won' && handoffByDealId.get(deal.id) ? (
                            <div className="space-y-2">
                              {handoffByDealId.get(deal.id)?.status !== 'in_progress' && handoffByDealId.get(deal.id)?.status !== 'completed' ? (
                                <button
                                  className="h-8 rounded-md border border-input px-2 text-xs"
                                  onClick={() => startHandoff.mutate({ handoffId: handoffByDealId.get(deal.id)!.id })}
                                  disabled={startHandoff.isPending}
                                >
                                  Start Handoff
                                </button>
                              ) : null}
                              {handoffByDealId.get(deal.id)?.status !== 'completed' ? (
                                completingHandoffId === handoffByDealId.get(deal.id)!.id ? (
                                  <div className="space-y-2">
                                    <input className="h-8 w-full rounded-md border border-input px-2 text-xs" placeholder="Tenant full name" value={tenantName} onChange={(event) => setTenantName(event.target.value)} />
                                    <input className="h-8 w-full rounded-md border border-input px-2 text-xs" placeholder="Tenant email" value={tenantEmail} onChange={(event) => setTenantEmail(event.target.value)} />
                                    <input className="h-8 w-full rounded-md border border-input px-2 text-xs" placeholder="Tenant phone" value={tenantPhone} onChange={(event) => setTenantPhone(event.target.value)} />
                                    <input className="h-8 w-full rounded-md border border-input px-2 text-xs" type="date" value={leaseStart} onChange={(event) => setLeaseStart(event.target.value)} />
                                    <input className="h-8 w-full rounded-md border border-input px-2 text-xs" type="date" value={leaseEnd} onChange={(event) => setLeaseEnd(event.target.value)} />
                                    <input className="h-8 w-full rounded-md border border-input px-2 text-xs" placeholder="Monthly rent" value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} />
                                    <input className="h-8 w-full rounded-md border border-input px-2 text-xs" placeholder="Security deposit" value={securityDeposit} onChange={(event) => setSecurityDeposit(event.target.value)} />
                                    <div className="flex gap-2">
                                      <button
                                        className="h-8 rounded-md bg-primary px-2 text-xs text-primary-foreground"
                                        onClick={() => submitHandoffCompletion(handoffByDealId.get(deal.id)!.id, deal.amount)}
                                        disabled={completeHandoff.isPending}
                                      >
                                        Complete Handoff
                                      </button>
                                      <button className="h-8 rounded-md border border-input px-2 text-xs" onClick={() => setCompletingHandoffId(null)}>Close</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    className="h-8 rounded-md border border-input px-2 text-xs"
                                    onClick={() => {
                                      setCompletingHandoffId(handoffByDealId.get(deal.id)!.id);
                                      setMonthlyRent(deal.amount ? String(deal.amount) : '');
                                    }}
                                  >
                                    Complete Handoff
                                  </button>
                                )
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )}
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
