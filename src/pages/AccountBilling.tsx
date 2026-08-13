import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CreditCard, Layers3, Plus, RefreshCw, Settings2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { untypedSupabase } from '@/integrations/supabase/untypedClient';
import { useAuth } from '@/contexts/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

type Company = { id: string; name: string };
type BillingGroup = { id: string; name: string; status: string; created_at: string };
type Member = { id: string; group_id: string; company_id: string; added_at: string };
type Plan = { id: string; code: string; name: string; description: string | null; sort_order: number };
type Subscription = { id: string; group_id: string; plan_id: string; status: string; payment_state: string; next_renewal_at: string | null; grace_end_at: string | null; dunning_attempt_count: number };
type Addon = { id: string; code: string; name: string; description: string | null };
type GroupAddon = { id: string; group_id: string; addon_id: string; status: string };
type Invoice = { id: string; group_id: string; invoice_kind: string; invoice_status: string; amount_minor: number; currency_code: string; due_at: string; paid_at: string | null; external_reference: string | null };
type PaymentAttempt = { id: string; group_id: string; payment_status: string; gateway: string; payment_method: string; amount_minor: number; currency_code: string; gateway_reference: string; failure_reason: string | null; created_at: string };
type GroupEvent = { id: string; group_id: string; event_type: string; details: Record<string, unknown>; created_at: string };

type BillingData = {
  companies: Company[];
  groups: BillingGroup[];
  members: Member[];
  plans: Plan[];
  subscriptions: Subscription[];
  addons: Addon[];
  groupAddons: GroupAddon[];
  invoices: Invoice[];
  attempts: PaymentAttempt[];
  events: GroupEvent[];
};

function formatMoney(amountMinor: number, currencyCode = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amountMinor / 100);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'Not scheduled';
}

function eventSummary(details: Record<string, unknown>) {
  const parts: string[] = [];
  if (typeof details.reason === 'string') parts.push(details.reason);
  if (typeof details.paused_company_subscriptions === 'number') parts.push(`${details.paused_company_subscriptions} standalone subscriptions paused`);
  if (typeof details.amount_minor === 'number') parts.push(formatMoney(details.amount_minor, typeof details.currency_code === 'string' ? details.currency_code : 'USD'));
  return parts.join(' · ') || 'Recorded by the billing lifecycle.';
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (['active', 'current', 'paid', 'succeeded'].includes(status)) return 'default';
  if (['past_due', 'grace', 'grace_period', 'uncollectible', 'failed'].includes(status)) return 'destructive';
  if (['pending', 'processing', 'open'].includes(status)) return 'secondary';
  return 'outline';
}

export default function AccountBilling() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [createPlanId, setCreatePlanId] = useState('');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const billing = useQuery({
    queryKey: ['owner-account-billing', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<BillingData> => {
      const client = untypedSupabase;
      const [companies, groups, plans, addons] = await Promise.all([
        client.from('companies').select('id,name').eq('owner_id', user!.id).order('name'),
        client.from('owner_billing_groups').select('id,name,status,created_at').eq('owner_id', user!.id).order('created_at', { ascending: false }),
        client.from('saas_plans').select('id,code,name,description,sort_order').is('product_id', null).eq('is_active', true).order('sort_order'),
        client.from('saas_addons').select('id,code,name,description').eq('is_active', true).order('sort_order'),
      ]);
      const initialError = companies.error || groups.error || plans.error || addons.error;
      if (initialError) throw initialError;

      const groupIds = (groups.data || []).map((group: BillingGroup) => group.id);
      if (!groupIds.length) {
        return { companies: companies.data || [], groups: [], members: [], plans: plans.data || [], subscriptions: [], addons: addons.data || [], groupAddons: [], invoices: [], attempts: [], events: [] };
      }

      const [members, subscriptions, groupAddons, invoices, attempts, events] = await Promise.all([
        client.from('owner_billing_group_members').select('id,group_id,company_id,added_at').in('group_id', groupIds).order('added_at'),
        client.from('saas_owner_group_plan_subscriptions').select('id,group_id,plan_id,status,payment_state,next_renewal_at,grace_end_at,dunning_attempt_count').in('group_id', groupIds).order('created_at', { ascending: false }),
        client.from('saas_owner_group_addon_subscriptions').select('id,group_id,addon_id,status').in('group_id', groupIds),
        client.from('saas_owner_group_subscription_invoices').select('id,group_id,invoice_kind,invoice_status,amount_minor,currency_code,due_at,paid_at,external_reference').in('group_id', groupIds).order('created_at', { ascending: false }).limit(100),
        client.from('saas_owner_group_subscription_payment_attempts').select('id,group_id,payment_status,gateway,payment_method,amount_minor,currency_code,gateway_reference,failure_reason,created_at').in('group_id', groupIds).order('created_at', { ascending: false }).limit(100),
        client.from('saas_owner_group_subscription_events').select('id,group_id,event_type,details,created_at').in('group_id', groupIds).order('created_at', { ascending: false }).limit(100),
      ]);
      const detailError = members.error || subscriptions.error || groupAddons.error || invoices.error || attempts.error || events.error;
      if (detailError) throw detailError;

      return {
        companies: companies.data || [], groups: groups.data || [], members: members.data || [], plans: plans.data || [],
        subscriptions: subscriptions.data || [], addons: addons.data || [], groupAddons: groupAddons.data || [],
        invoices: invoices.data || [], attempts: attempts.data || [], events: events.data || [],
      };
    },
  });

  useEffect(() => {
    if (!selectedGroupId && billing.data?.groups[0]) setSelectedGroupId(billing.data.groups[0].id);
  }, [billing.data?.groups, selectedGroupId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['owner-account-billing'] });
  const rpcMutation = useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args: Record<string, unknown> }) => {
      const { data, error } = await untypedSupabase.rpc(fn, args);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refresh();
      setReason('');
      toast.success('Billing group updated.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = billing.data;
  const selectedGroup = data?.groups.find((group) => group.id === selectedGroupId);
  const activeSubscription = data?.subscriptions.find((subscription) => subscription.group_id === selectedGroupId && ['active', 'grace_period'].includes(subscription.status));
  const currentPlan = data?.plans.find((plan) => plan.id === activeSubscription?.plan_id);
  const groupMembers = data?.members.filter((member) => member.group_id === selectedGroupId) || [];
  const memberCompanyIds = new Set(data?.members.map((member) => member.company_id) || []);
  const eligibleCompanies = data?.companies.filter((company) => !memberCompanyIds.has(company.id)) || [];
  const companyById = useMemo(() => new Map((data?.companies || []).map((company) => [company.id, company])), [data?.companies]);
  const groupInvoices = data?.invoices.filter((invoice) => invoice.group_id === selectedGroupId) || [];
  const groupAttempts = data?.attempts.filter((attempt) => attempt.group_id === selectedGroupId) || [];
  const groupEvents = data?.events.filter((event) => event.group_id === selectedGroupId) || [];
  const outstandingMinor = groupInvoices.filter((invoice) => ['open', 'uncollectible'].includes(invoice.invoice_status)).reduce((sum, invoice) => sum + invoice.amount_minor, 0);

  const requireReason = () => {
    if (reason.trim()) return true;
    toast.error('Enter a reason for this billing change.');
    return false;
  };

  const createGroup = async () => {
    if (!groupName.trim() || !createPlanId || selectedCompanyIds.length < 2 || !requireReason()) return;
    await rpcMutation.mutateAsync({
      fn: 'owner_billing_group_create',
      args: { p_name: groupName.trim(), p_company_ids: selectedCompanyIds, p_plan_id: createPlanId, p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() },
    });
    setCreateOpen(false);
    setGroupName('');
    setCreatePlanId('');
    setSelectedCompanyIds([]);
  };

  if (billing.isLoading) return <div className="space-y-4 p-4 md:p-6"><Skeleton className="h-10 w-72" /><Skeleton className="h-32 w-full" /><Skeleton className="h-80 w-full" /></div>;

  if (billing.error) return <div className="p-4 md:p-6"><Alert variant="destructive"><AlertTitle>Account billing unavailable</AlertTitle><AlertDescription>{billing.error.message}</AlertDescription></Alert></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2"><CreditCard className="h-5 w-5" /><h1 className="text-2xl font-semibold">Account Billing</h1></div><p className="mt-1 text-sm text-muted-foreground">Manage standalone companies and optional pooled subscriptions from one place.</p></div>
        <div className="flex gap-2"><Button variant="outline" size="icon" onClick={() => refresh()} title="Refresh billing data"><RefreshCw className="h-4 w-4" /></Button><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button disabled={(data?.companies.length || 0) < 2}><Plus className="mr-2 h-4 w-4" />Create billing group</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create pooled billing group</DialogTitle><DialogDescription>Select at least two companies you own. Their standalone subscriptions will be paused and preserved.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="group-name">Group name</Label><Input id="group-name" value={groupName} onChange={(event) => setGroupName(event.target.value)} /></div><div className="space-y-2"><Label>Unified plan</Label><Select value={createPlanId} onValueChange={setCreatePlanId}><SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger><SelectContent>{data?.plans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Companies</Label><div className="max-h-44 space-y-2 overflow-auto rounded-md border p-3">{data?.companies.map((company) => <label key={company.id} className="flex items-center gap-3 text-sm"><Checkbox checked={selectedCompanyIds.includes(company.id)} onCheckedChange={(checked) => setSelectedCompanyIds((current) => checked ? [...current, company.id] : current.filter((id) => id !== company.id))} />{company.name}</label>)}</div></div><div className="space-y-2"><Label htmlFor="create-reason">Reason</Label><Input id="create-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why are these companies pooling billing?" /></div></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={createGroup} disabled={rpcMutation.isPending || selectedCompanyIds.length < 2}>Create group</Button></DialogFooter></DialogContent></Dialog></div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Owned companies</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data?.companies.length || 0}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Billing groups</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data?.groups.length || 0}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Grouped companies</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data?.members.length || 0}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatMoney(data?.invoices.filter((invoice) => ['open', 'uncollectible'].includes(invoice.invoice_status)).reduce((sum, invoice) => sum + invoice.amount_minor, 0) || 0)}</CardContent></Card></div>

      {!data?.groups.length ? <Alert><Layers3 className="h-4 w-4" /><AlertTitle>Per-company billing is active</AlertTitle><AlertDescription>Your companies remain independently subscribed. Create a billing group when two or more companies should share one plan, quota pool, invoice, and renewal.</AlertDescription></Alert> : <>
        <div className="flex flex-wrap items-center gap-3"><Label>Billing group</Label><Select value={selectedGroupId} onValueChange={setSelectedGroupId}><SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger><SelectContent>{data.groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select><Badge variant={statusVariant(activeSubscription?.payment_state || selectedGroup?.status || 'unknown')}>{activeSubscription?.payment_state || selectedGroup?.status}</Badge></div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">Current plan</p><p className="font-semibold">{currentPlan?.name || 'No active plan'}</p></div><div className="border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">Next renewal</p><p className="font-semibold">{formatDate(activeSubscription?.next_renewal_at)}</p></div><div className="border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">Group outstanding</p><p className="font-semibold">{formatMoney(outstandingMinor)}</p></div></div>

          <Tabs defaultValue="members"><TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="members">Members</TabsTrigger><TabsTrigger value="addons">Add-ons</TabsTrigger><TabsTrigger value="invoices">Invoices</TabsTrigger><TabsTrigger value="payments">Payments</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
            <TabsContent value="members" className="space-y-3"><div className="flex gap-2"><Select value={newMemberId} onValueChange={setNewMemberId}><SelectTrigger className="max-w-sm"><SelectValue placeholder="Add an eligible company" /></SelectTrigger><SelectContent>{eligibleCompanies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent></Select><Button disabled={!newMemberId || rpcMutation.isPending} onClick={() => requireReason() && rpcMutation.mutate({ fn: 'owner_billing_group_add_company', args: { p_group_id: selectedGroupId, p_company_id: newMemberId, p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() } })}><Plus className="mr-2 h-4 w-4" />Add</Button></div><Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Added</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{groupMembers.map((member) => <TableRow key={member.id}><TableCell className="font-medium">{companyById.get(member.company_id)?.name || member.company_id}</TableCell><TableCell>{formatDate(member.added_at)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" disabled={groupMembers.length <= 2} onClick={() => requireReason() && rpcMutation.mutate({ fn: 'owner_billing_group_remove_company', args: { p_group_id: selectedGroupId, p_company_id: member.company_id, p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() } })}>Remove</Button></TableCell></TableRow>)}</TableBody></Table></TabsContent>
            <TabsContent value="addons"><div className="divide-y rounded-md border">{data.addons.map((addon) => { const subscription = data.groupAddons.find((item) => item.group_id === selectedGroupId && item.addon_id === addon.id); const enabled = subscription?.status === 'active'; return <div key={addon.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{addon.name}</p><p className="text-sm text-muted-foreground">{addon.description}</p></div><Switch checked={enabled} disabled={rpcMutation.isPending} onCheckedChange={(checked) => requireReason() && rpcMutation.mutate({ fn: 'owner_billing_group_set_addon_status', args: { p_group_id: selectedGroupId, p_addon_code: addon.code, p_enabled: checked, p_reason: reason.trim(), p_end_at: null, p_correlation_id: crypto.randomUUID(), p_metadata: { source: 'account_billing_ui' } } })} /></div>; })}</div></TabsContent>
            <TabsContent value="invoices">{groupInvoices.length ? <Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{groupInvoices.map((invoice) => <TableRow key={invoice.id}><TableCell>{invoice.external_reference || invoice.invoice_kind}</TableCell><TableCell><Badge variant={statusVariant(invoice.invoice_status)}>{invoice.invoice_status}</Badge></TableCell><TableCell>{formatDate(invoice.due_at)}</TableCell><TableCell className="text-right">{formatMoney(invoice.amount_minor, invoice.currency_code)}</TableCell></TableRow>)}</TableBody></Table> : <Alert><AlertTitle>No invoices yet</AlertTitle><AlertDescription>The first renewal invoice will appear when this group's renewal becomes due.</AlertDescription></Alert>}</TabsContent>
            <TabsContent value="payments">{groupAttempts.length ? <Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Gateway</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{groupAttempts.map((attempt) => <TableRow key={attempt.id}><TableCell>{attempt.gateway_reference}</TableCell><TableCell>{attempt.gateway}</TableCell><TableCell><Badge variant={statusVariant(attempt.payment_status)}>{attempt.payment_status}</Badge>{attempt.failure_reason && <p className="mt-1 text-xs text-destructive">{attempt.failure_reason}</p>}</TableCell><TableCell className="text-right">{formatMoney(attempt.amount_minor, attempt.currency_code)}</TableCell></TableRow>)}</TableBody></Table> : <Alert><AlertTitle>No payment attempts yet</AlertTitle><AlertDescription>Payment activity begins after a renewal invoice is queued.</AlertDescription></Alert>}</TabsContent>
            <TabsContent value="history"><div className="divide-y rounded-md border">{groupEvents.map((event) => <div key={event.id} className="flex items-start justify-between gap-4 p-3"><div><p className="text-sm font-medium">{event.event_type.replace(/\./g, ' ')}</p><p className="text-xs text-muted-foreground">{eventSummary(event.details)}</p></div><time className="shrink-0 text-xs text-muted-foreground">{formatDate(event.created_at)}</time></div>)}</div></TabsContent>
          </Tabs></div>

          <aside className="space-y-4 border-l pl-4"><div><div className="flex items-center gap-2"><Settings2 className="h-4 w-4" /><h2 className="font-semibold">Group controls</h2></div><p className="mt-1 text-xs text-muted-foreground">Every mutation is validated and audited.</p></div><div className="space-y-2"><Label htmlFor="change-reason">Required change reason</Label><Input id="change-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div><div className="space-y-2"><Label>Change plan</Label><Select value={activeSubscription?.plan_id || ''} onValueChange={(planId) => requireReason() && rpcMutation.mutate({ fn: 'owner_billing_group_change_plan', args: { p_group_id: selectedGroupId, p_plan_id: planId, p_currency_code: 'USD', p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{data.plans.map((plan) => <SelectItem key={plan.id} value={plan.id} disabled={plan.id === activeSubscription?.plan_id}>{plan.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="rename-group">Rename group</Label><div className="flex gap-2"><Input id="rename-group" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} placeholder={selectedGroup?.name} /><Button variant="outline" disabled={!renameValue.trim()} onClick={() => requireReason() && rpcMutation.mutate({ fn: 'owner_billing_group_rename', args: { p_group_id: selectedGroupId, p_name: renameValue.trim(), p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() } })}>Save</Button></div></div><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="w-full">Dissolve billing group</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Dissolve {selectedGroup?.name}?</AlertDialogTitle><AlertDialogDescription>All member companies will require new standalone plans. Previous subscriptions will not reactivate automatically.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={!reason.trim()} onClick={() => rpcMutation.mutate({ fn: 'owner_billing_group_dissolve', args: { p_group_id: selectedGroupId, p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() } })}>Dissolve group</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></aside></div>
      </>}

      <section><div className="mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" /><h2 className="font-semibold">Company billing mode</h2></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data?.companies.map((company) => { const member = data.members.find((item) => item.company_id === company.id); const group = data.groups.find((item) => item.id === member?.group_id); return <div key={company.id} className="flex items-center justify-between border-b py-3"><div><p className="font-medium">{company.name}</p><p className="text-xs text-muted-foreground">{group ? group.name : 'Independent subscription'}</p></div><Badge variant={group ? 'default' : 'outline'}>{group ? 'Pooled' : 'Per-company'}</Badge></div>; })}</div></section>
    </div>
  );
}