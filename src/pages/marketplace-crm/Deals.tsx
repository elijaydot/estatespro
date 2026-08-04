import { useMemo, useState } from 'react';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSettings } from '@/contexts/useSettings';
import { useCrmAssignableUsers, useCrmLeads } from '@/hooks/useMarketplace';
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

const LEAD_STAGES = ['new', 'attempted_contact', 'contacted', 'qualified', 'viewing_scheduled', 'offer_made', 'lease_in_progress', 'converted', 'lost'];

function dealStageChipClass(stage: string) {
  if (stage === 'converted') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  if (stage === 'lost') return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
  if (stage === 'offer_made' || stage === 'lease_in_progress') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
}

export default function MarketplaceCrmDealsPage() {
  const { activeCompanyId } = useActiveCompany();
  const { settings } = useSettings();
  const dealsQuery = useCrmDeals(activeCompanyId);
  const leadsQuery = useCrmLeads(activeCompanyId);
  const accountsQuery = useCrmAccounts(activeCompanyId);
  const contactsQuery = useCrmContacts(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
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
  const [createLeadId, setCreateLeadId] = useState('');
  const [createProbability, setCreateProbability] = useState('10');
  const [createExpectedCloseDate, setCreateExpectedCloseDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStage, setEditStage] = useState('new');
  const [editProbability, setEditProbability] = useState('10');
  const [editAmount, setEditAmount] = useState('');
  const [editOwnerUserId, setEditOwnerUserId] = useState('');
  const [editExpectedCloseDate, setEditExpectedCloseDate] = useState('');
  const [completingHandoffId, setCompletingHandoffId] = useState<string | null>(null);
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
    LEAD_STAGES.forEach((stage) => { bucket[stage] = []; });
    rows.forEach((row) => {
      const key = bucket[row.stage] ? row.stage : 'new';
      bucket[key].push(row);
    });
    return bucket;
  }, [rows]);

  const ownerNameById = useMemo(() => {
    const map = new Map<string, string>();
    (assignableUsersQuery.data || []).forEach((user) => {
      map.set(user.user_id, user.name);
    });
    return map;
  }, [assignableUsersQuery.data]);

  const handoffByDealId = useMemo(() => {
    const map = new Map<string, { id: string; status: string; readiness_notes: string | null }>();
    (handoffsQuery.data || []).forEach((handoff) => {
      map.set(handoff.deal_id, { id: handoff.id, status: handoff.status, readiness_notes: handoff.readiness_notes });
    });
    return map;
  }, [handoffsQuery.data]);

  const currencyCode = settings.currencyCode || 'NGN';
  const currencySymbol = settings.currencySymbol || currencyCode;

  const formatDealAmount = (value: number | null) => {
    if (value == null) return 'No amount';
    return `${currencySymbol} ${Number(value).toLocaleString()}`;
  };

  const onCreate = () => {
    if (!dealName.trim() || !createLeadId) return;
    const parsedProbability = Number(createProbability);
    if (Number.isNaN(parsedProbability) || parsedProbability < 0 || parsedProbability > 100) return;

    createDeal.mutate({
      deal_name: dealName.trim(),
      amount: amount ? Number(amount) : null,
      owner_user_id: createOwnerUserId || null,
      account_id: createAccountId || null,
      contact_id: createContactId || null,
      lead_id: createLeadId,
      currency: currencyCode,
      probability: parsedProbability,
      expected_close_date: createExpectedCloseDate || null,
    });
    setDealName('');
    setAmount('');
    setCreateOwnerUserId('');
    setCreateAccountId('');
    setCreateContactId('');
    setCreateLeadId('');
    setCreateProbability('10');
    setCreateExpectedCloseDate('');
  };

  const startEdit = (
    id: string,
    stage: string,
    probability: number,
    currentAmount: number | null,
    currentOwnerUserId: string | null,
    currentExpectedCloseDate: string | null,
  ) => {
    setEditingId(id);
    setEditStage(stage);
    setEditProbability(String(probability));
    setEditAmount(currentAmount == null ? '' : String(currentAmount));
    setEditOwnerUserId(currentOwnerUserId || '');
    setEditExpectedCloseDate(currentExpectedCloseDate || '');
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
        expectedCloseDate: editExpectedCloseDate || null,
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditAmount('');
          setEditOwnerUserId('');
          setEditExpectedCloseDate('');
        },
      },
    );
  };

  const submitHandoffCompletion = (handoffId: string, dealAmount: number | null) => {
    if (!leaseStart || !leaseEnd) return;
    const rent = Number(monthlyRent || dealAmount || 0);
    const deposit = Number(securityDeposit || 0);
    if (Number.isNaN(rent) || rent <= 0) return;
    if (Number.isNaN(deposit) || deposit < 0) return;

    completeHandoff.mutate({
      handoffId,
      leaseStart,
      leaseEnd,
      monthlyRent: rent,
      securityDeposit: deposit,
    }, {
      onSuccess: () => {
        setCompletingHandoffId(null);
        setLeaseStart('');
        setLeaseEnd('');
        setMonthlyRent('');
        setSecurityDeposit('');
      },
    });
  };

  return (
    <CrmWorkspace title="Deals" subtitle="Track opportunity economics against the authoritative lead pipeline.">
      <CrmDataCard title="Create Deal" description="Add a new sales opportunity.">
        <div className="mb-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Add a focused opportunity with ownership, confidence, and close-date context in one step.
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-4" placeholder="Deal name" value={dealName} onChange={(event) => setDealName(event.target.value)} />
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-2" placeholder={`Amount (${currencyCode})`} value={amount} onChange={(event) => setAmount(event.target.value)} />
          <select aria-label="Lead" className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-2" value={createLeadId} onChange={(event) => setCreateLeadId(event.target.value)}>
            <option value="">Select lead</option>
            {(leadsQuery.data || []).map((lead) => (
              <option key={lead.id} value={lead.id}>{lead.contact_name || lead.listing_title || lead.id} ({lead.stage.replace(/_/g, ' ')})</option>
            ))}
          </select>
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-2" placeholder="Probability %" value={createProbability} onChange={(event) => setCreateProbability(event.target.value)} />
          <input className="h-10 rounded-md border border-input px-3 text-sm lg:col-span-2" type="date" value={createExpectedCloseDate} onChange={(event) => setCreateExpectedCloseDate(event.target.value)} />

          <div className="lg:col-span-4">
            <AssigneePicker
              users={assignableUsersQuery.data || []}
              value={createOwnerUserId || null}
              onChange={(next) => setCreateOwnerUserId(next || '')}
              placeholder="Owner (optional)"
              className="h-10"
            />
          </div>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-4" value={createAccountId} onChange={(event) => setCreateAccountId(event.target.value)}>
            <option value="">Link Account (optional)</option>
            {(accountsQuery.data || []).map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm lg:col-span-4" value={createContactId} onChange={(event) => setCreateContactId(event.target.value)}>
            <option value="">Link Contact (optional)</option>
            {(contactsQuery.data || []).map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.full_name}</option>
            ))}
          </select>

          <button className="h-10 rounded-md bg-primary text-primary-foreground text-sm lg:col-span-3" onClick={onCreate} disabled={createDeal.isPending}>Create Deal</button>
        </div>
      </CrmDataCard>

      <CrmDataCard title="Pipeline Board" description="Review and update opportunities by stage.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700">won</span>
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700">negotiation</span>
            <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-700">lost</span>
          </div>
          <div className="flex min-w-max gap-3 pb-2">
            {LEAD_STAGES.map((stage) => (
              <div key={stage} className="w-72 rounded-xl border border-border/70 bg-card/80 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{stage.replace(/_/g, ' ')}</p>
                  <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{(grouped[stage] || []).length}</span>
                </div>
                <div className="space-y-2">
                  {(grouped[stage] || []).map((deal) => (
                    <div key={deal.id} className="rounded-lg border border-border/70 bg-background/90 p-2.5 text-sm shadow-sm">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{deal.deal_name}</p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${dealStageChipClass(deal.stage)}`}>{deal.stage.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDealAmount(deal.amount)}</p>
                      <p className="text-xs text-muted-foreground">Probability: {deal.probability}%</p>
                      <p className="text-xs text-muted-foreground">Owner: {deal.owner_user_id ? (ownerNameById.get(deal.owner_user_id) || deal.owner_user_id) : '-'}</p>
                      {handoffByDealId.get(deal.id) ? (
                        <p className="text-xs text-muted-foreground">
                          Handoff: {handoffByDealId.get(deal.id)?.status}
                        </p>
                      ) : null}
                      {editingId === deal.id ? (
                        <div className="mt-2 space-y-2">
                          <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={editStage} onChange={(event) => setEditStage(event.target.value)}>
                            {LEAD_STAGES.map((s) => (
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
                          <AssigneePicker
                            users={assignableUsersQuery.data || []}
                            value={editOwnerUserId || null}
                            onChange={(next) => setEditOwnerUserId(next || '')}
                            placeholder="Owner"
                            className="h-8"
                          />
                          <input
                            className="h-8 w-full rounded-md border border-input px-2 text-xs"
                            type="date"
                            value={editExpectedCloseDate}
                            onChange={(event) => setEditExpectedCloseDate(event.target.value)}
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
                            onClick={() => startEdit(deal.id, deal.stage, deal.probability, deal.amount, deal.owner_user_id, deal.expected_close_date)}
                          >
                            Edit Stage
                          </button>
                          {deal.stage === 'converted' && handoffByDealId.get(deal.id) ? (
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
                                    <input aria-label="Lease start date" className="h-8 w-full rounded-md border border-input px-2 text-xs" type="date" value={leaseStart} onChange={(event) => setLeaseStart(event.target.value)} />
                                    <input aria-label="Lease end date" className="h-8 w-full rounded-md border border-input px-2 text-xs" type="date" value={leaseEnd} onChange={(event) => setLeaseEnd(event.target.value)} />
                                    <input aria-label="Monthly rent" className="h-8 w-full rounded-md border border-input px-2 text-xs" inputMode="decimal" placeholder="Monthly rent" value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} />
                                    <input aria-label="Security deposit" className="h-8 w-full rounded-md border border-input px-2 text-xs" inputMode="decimal" placeholder="Security deposit" value={securityDeposit} onChange={(event) => setSecurityDeposit(event.target.value)} />
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
