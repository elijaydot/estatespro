import { useMemo, useState } from 'react';
import { ArrowRight, Handshake, Loader2, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AssigneePicker } from '@/components/marketplace-crm/AssigneePicker';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, QueryErrorState, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { Button } from '@/components/ui/button';
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
import { StatusPill } from '@/components/shared/StatusPill';

const LEAD_STAGES = ['new', 'attempted_contact', 'contacted', 'qualified', 'viewing_scheduled', 'offer_made', 'lease_in_progress', 'converted', 'lost'];

function dealStageVariant(stage: string) {
  if (stage === 'converted') return 'success' as const;
  if (stage === 'lost') return 'destructive' as const;
  if (stage === 'offer_made' || stage === 'lease_in_progress') return 'warning' as const;
  return 'info' as const;
}

const SUMMARY_STAGES = ['new', 'contacted', 'qualified', 'offer_made', 'converted'] as const;

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
  const loadError = dealsQuery.error || leadsQuery.error || accountsQuery.error || contactsQuery.error || assignableUsersQuery.error || handoffsQuery.error;
  const isLoading = dealsQuery.isLoading || leadsQuery.isLoading || accountsQuery.isLoading || contactsQuery.isLoading || assignableUsersQuery.isLoading || handoffsQuery.isLoading;

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
      {loadError ? (
        <CrmDataCard title="Deals unavailable" description="The CRM could not retrieve the records needed for this pipeline.">
          <QueryErrorState message={loadError.message} onRetry={() => { void dealsQuery.refetch(); void leadsQuery.refetch(); void accountsQuery.refetch(); void contactsQuery.refetch(); void assignableUsersQuery.refetch(); void handoffsQuery.refetch(); }} />
        </CrmDataCard>
      ) : isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-border/70 bg-card">
          <div className="text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Loading deal pipeline...</div>
        </div>
      ) : (
      <>
      {(leadsQuery.data || []).length > 0 ? (
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
      ) : null}

      <CrmDataCard title="Pipeline Board" description="Review and update opportunities by stage.">
        {rows.length === 0 ? (
          <EmptyState
            icon={(dealsQuery.data || []).length ? SearchX : Handshake}
            label={(dealsQuery.data || []).length ? 'No deals match your search' : (leadsQuery.data || []).length ? 'Create your first qualified opportunity' : 'Deals begin with a qualified lead'}
            description={(dealsQuery.data || []).length ? 'Clear the search to return to the complete opportunity pipeline.' : (leadsQuery.data || []).length ? 'Use the deal form above to add economics, ownership, confidence, and a close date to a lead.' : 'Qualify a marketplace inquiry first, then create a deal without losing its contact or listing context.'}
            action={(dealsQuery.data || []).length ? <Button variant="outline" onClick={() => setSearch('')}>Clear search</Button> : (leadsQuery.data || []).length === 0 ? <Button asChild><Link to="/marketplace/crm/leads">Open lead pipeline<ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : undefined}
          />
        ) : (
        <>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {SUMMARY_STAGES.map((stage) => (
            <div key={stage} className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]">
              <p className="text-xs font-medium capitalize text-muted-foreground">{stage.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{(grouped[stage] || []).length}</p>
            </div>
          ))}
        </div>
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto">
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
                        <StatusPill variant={dealStageVariant(deal.stage)}>{deal.stage.replace(/_/g, ' ')}</StatusPill>
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
        </>
        )}
      </CrmDataCard>
      </>
      )}
    </CrmWorkspace>
  );
}
