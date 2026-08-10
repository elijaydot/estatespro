import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

type Group = { id: string; owner_id: string; name: string; status: string; created_at: string };
type Member = { id: string; group_id: string; company_id: string; added_at: string };
type Company = { id: string; name: string };
type Plan = { id: string; name: string; code: string };
type Subscription = { id: string; group_id: string; plan_id: string; status: string; payment_state: string; next_renewal_at: string | null; grace_end_at: string | null; dunning_attempt_count: number };
type Invoice = { id: string; group_id: string; invoice_status: string; invoice_kind: string; amount_minor: number; currency_code: string; due_at: string; external_reference: string | null };
type Event = { id: string; group_id: string; event_type: string; actor_user_id: string | null; details: Record<string, unknown>; created_at: string };
type QuotaDimension = { id: string; code: string; name: string };
type EntitlementKey = { id: string; key: string; domain: string };
type QuotaOverride = { id: string; group_id: string; quota_dimension_id: string; mode: string; increment_by: number | null; hard_limit_override: number | null; reason: string; expires_at: string | null };
type EntitlementOverride = { id: string; group_id: string; entitlement_key_id: string; decision: string; reason: string; expires_at: string | null };

type Group360Data = {
  groups: Group[]; members: Member[]; companies: Company[]; plans: Plan[]; subscriptions: Subscription[];
  invoices: Invoice[]; events: Event[]; dimensions: QuotaDimension[]; entitlementKeys: EntitlementKey[];
  quotaOverrides: QuotaOverride[]; entitlementOverrides: EntitlementOverride[];
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);
}

export default function OwnerBillingGroup360() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [reason, setReason] = useState('');
  const [quotaCode, setQuotaCode] = useState('');
  const [quotaMode, setQuotaMode] = useState<'increment' | 'set'>('increment');
  const [quotaValue, setQuotaValue] = useState('');
  const [entitlementKey, setEntitlementKey] = useState('');
  const [entitlementDecision, setEntitlementDecision] = useState<'allow' | 'deny'>('allow');

  const query = useQuery({
    queryKey: ['control-plane-owner-billing-groups'],
    queryFn: async (): Promise<Group360Data> => {
      const client = supabase as any;
      const [groups, companies, plans, dimensions, entitlementKeys] = await Promise.all([
        client.from('owner_billing_groups').select('id,owner_id,name,status,created_at').order('created_at', { ascending: false }),
        client.from('companies').select('id,name').order('name'),
        client.from('saas_plans').select('id,name,code').is('product_id', null).order('sort_order'),
        client.from('saas_quota_dimensions').select('id,code,name').order('name'),
        client.from('saas_entitlement_keys').select('id,key,domain').order('domain'),
      ]);
      const firstError = groups.error || companies.error || plans.error || dimensions.error || entitlementKeys.error;
      if (firstError) throw firstError;
      const ids = (groups.data || []).map((group: Group) => group.id);
      if (!ids.length) return { groups: [], members: [], companies: companies.data || [], plans: plans.data || [], subscriptions: [], invoices: [], events: [], dimensions: dimensions.data || [], entitlementKeys: entitlementKeys.data || [], quotaOverrides: [], entitlementOverrides: [] };
      const [members, subscriptions, invoices, events, quotaOverrides, entitlementOverrides] = await Promise.all([
        client.from('owner_billing_group_members').select('id,group_id,company_id,added_at').in('group_id', ids),
        client.from('saas_owner_group_plan_subscriptions').select('id,group_id,plan_id,status,payment_state,next_renewal_at,grace_end_at,dunning_attempt_count').in('group_id', ids).order('created_at', { ascending: false }),
        client.from('saas_owner_group_subscription_invoices').select('id,group_id,invoice_status,invoice_kind,amount_minor,currency_code,due_at,external_reference').in('group_id', ids).order('created_at', { ascending: false }).limit(250),
        client.from('saas_owner_group_subscription_events').select('id,group_id,event_type,actor_user_id,details,created_at').in('group_id', ids).order('created_at', { ascending: false }).limit(250),
        client.from('saas_owner_group_quota_overrides').select('id,group_id,quota_dimension_id,mode,increment_by,hard_limit_override,reason,expires_at').in('group_id', ids),
        client.from('saas_owner_group_entitlement_overrides').select('id,group_id,entitlement_key_id,decision,reason,expires_at').in('group_id', ids),
      ]);
      const secondError = members.error || subscriptions.error || invoices.error || events.error || quotaOverrides.error || entitlementOverrides.error;
      if (secondError) throw secondError;
      return { groups: groups.data || [], members: members.data || [], companies: companies.data || [], plans: plans.data || [], subscriptions: subscriptions.data || [], invoices: invoices.data || [], events: events.data || [], dimensions: dimensions.data || [], entitlementKeys: entitlementKeys.data || [], quotaOverrides: quotaOverrides.data || [], entitlementOverrides: entitlementOverrides.data || [] };
    },
  });

  useEffect(() => {
    if (!groupId && query.data?.groups[0]) setGroupId(query.data.groups[0].id);
  }, [groupId, query.data?.groups]);

  const mutation = useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args: Record<string, unknown> }) => {
      const { error } = await (supabase as any).rpc(fn, args);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['control-plane-owner-billing-groups'] });
      toast.success('Group override updated.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = query.data;
  const companies = useMemo(() => new Map((data?.companies || []).map((company) => [company.id, company])), [data?.companies]);
  const plans = useMemo(() => new Map((data?.plans || []).map((plan) => [plan.id, plan])), [data?.plans]);
  const dimensions = useMemo(() => new Map((data?.dimensions || []).map((dimension) => [dimension.id, dimension])), [data?.dimensions]);
  const keys = useMemo(() => new Map((data?.entitlementKeys || []).map((key) => [key.id, key])), [data?.entitlementKeys]);
  const filteredGroups = (data?.groups || []).filter((group) => group.name.toLowerCase().includes(search.toLowerCase()) || group.owner_id.toLowerCase().includes(search.toLowerCase()));
  const group = data?.groups.find((item) => item.id === groupId);
  const members = data?.members.filter((item) => item.group_id === groupId) || [];
  const subscription = data?.subscriptions.find((item) => item.group_id === groupId && ['active', 'grace_period'].includes(item.status));
  const invoices = data?.invoices.filter((item) => item.group_id === groupId) || [];
  const events = data?.events.filter((item) => item.group_id === groupId) || [];
  const quotaOverrides = data?.quotaOverrides.filter((item) => item.group_id === groupId) || [];
  const entitlementOverrides = data?.entitlementOverrides.filter((item) => item.group_id === groupId) || [];
  const outstanding = invoices.filter((invoice) => ['open', 'uncollectible'].includes(invoice.invoice_status)).reduce((sum, invoice) => sum + invoice.amount_minor, 0);

  const assertReason = () => {
    if (reason.trim()) return true;
    toast.error('A reason is required for super-admin overrides.');
    return false;
  };

  if (query.isLoading) return <div className="space-y-4 p-4 md:p-6"><Skeleton className="h-10 w-80" /><Skeleton className="h-96 w-full" /></div>;
  if (query.error) return <div className="p-4 md:p-6"><Alert variant="destructive"><AlertTitle>Billing groups unavailable</AlertTitle><AlertDescription>{query.error.message}</AlertDescription></Alert></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h1 className="text-2xl font-semibold">Billing Groups</h1></div><p className="mt-1 text-sm text-muted-foreground">Platform oversight for pooled owner subscriptions, billing health, and audited exceptions.</p></header>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-3 border-b pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search group or owner ID" /></div><div className="max-h-72 space-y-1 overflow-auto lg:max-h-[65vh]">{filteredGroups.map((item) => { const count = data?.members.filter((member) => member.group_id === item.id).length || 0; return <button key={item.id} onClick={() => setGroupId(item.id)} className={`w-full border-l-2 px-3 py-3 text-left ${groupId === item.id ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted/60'}`}><div className="flex items-center justify-between gap-2"><span className="font-medium">{item.name}</span><Badge variant={item.status === 'active' ? 'default' : 'outline'}>{item.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{count} companies</p></button>; })}</div></aside>
        {!group ? <Alert><AlertTitle>No billing group selected</AlertTitle><AlertDescription>Select a group to open its operational record.</AlertDescription></Alert> : <main className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{group.name}</h2><p className="text-xs text-muted-foreground">Owner {group.owner_id}</p></div><Badge variant={subscription?.payment_state === 'current' ? 'default' : 'destructive'}>{subscription?.payment_state || group.status}</Badge></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Companies</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{members.length}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Plan</CardTitle></CardHeader><CardContent className="font-semibold">{plans.get(subscription?.plan_id || '')?.name || '-'}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader><CardContent className="font-semibold">{formatMoney(outstanding)}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Dunning attempts</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{subscription?.dunning_attempt_count || 0}</CardContent></Card></div>
          <Tabs defaultValue="overview"><TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="billing">Billing</TabsTrigger><TabsTrigger value="overrides">Overrides</TabsTrigger><TabsTrigger value="events">Events</TabsTrigger></TabsList>
            <TabsContent value="overview" className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Next renewal</p><p className="font-medium">{formatDate(subscription?.next_renewal_at || null)}</p></div><div><p className="text-xs text-muted-foreground">Grace ends</p><p className="font-medium">{formatDate(subscription?.grace_end_at || null)}</p></div></div><div><div className="mb-2 flex items-center gap-2"><Users className="h-4 w-4" /><h3 className="font-semibold">Member companies</h3></div><Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Company ID</TableHead><TableHead>Added</TableHead></TableRow></TableHeader><TableBody>{members.map((member) => <TableRow key={member.id}><TableCell className="font-medium">{companies.get(member.company_id)?.name || 'Unknown company'}</TableCell><TableCell className="font-mono text-xs">{member.company_id}</TableCell><TableCell>{formatDate(member.added_at)}</TableCell></TableRow>)}</TableBody></Table></div></TabsContent>
            <TabsContent value="billing"><Table><TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Kind</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{invoices.map((invoice) => <TableRow key={invoice.id}><TableCell>{invoice.external_reference || invoice.id}</TableCell><TableCell>{invoice.invoice_kind}</TableCell><TableCell><Badge variant={invoice.invoice_status === 'paid' ? 'default' : 'secondary'}>{invoice.invoice_status}</Badge></TableCell><TableCell>{formatDate(invoice.due_at)}</TableCell><TableCell className="text-right">{formatMoney(invoice.amount_minor, invoice.currency_code)}</TableCell></TableRow>)}</TableBody></Table></TabsContent>
            <TabsContent value="overrides" className="space-y-6"><div className="space-y-2"><Label htmlFor="override-reason">Required audit reason</Label><Input id="override-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Operational justification" /></div><div className="grid gap-6 xl:grid-cols-2"><section className="space-y-3"><h3 className="font-semibold">Quota override</h3><div className="grid grid-cols-2 gap-2"><Select value={quotaCode} onValueChange={setQuotaCode}><SelectTrigger><SelectValue placeholder="Quota" /></SelectTrigger><SelectContent>{data?.dimensions.map((dimension) => <SelectItem key={dimension.id} value={dimension.code}>{dimension.name}</SelectItem>)}</SelectContent></Select><Select value={quotaMode} onValueChange={(value: 'increment' | 'set') => setQuotaMode(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increment">Increment</SelectItem><SelectItem value="set">Set hard limit</SelectItem></SelectContent></Select></div><div className="flex gap-2"><Input type="number" min="0" value={quotaValue} onChange={(event) => setQuotaValue(event.target.value)} placeholder="Value" /><Button disabled={!quotaCode || quotaValue === '' || mutation.isPending} onClick={() => assertReason() && mutation.mutate({ fn: 'platform_set_owner_billing_group_quota_override', args: { p_group_id: groupId, p_quota_code: quotaCode, p_mode: quotaMode, p_value: Number(quotaValue), p_reason: reason.trim(), p_expires_at: null, p_correlation_id: crypto.randomUUID() } })}>Apply</Button></div><div className="divide-y rounded-md border">{quotaOverrides.map((override) => <div key={override.id} className="flex items-center justify-between gap-3 p-3 text-sm"><div><p className="font-medium">{dimensions.get(override.quota_dimension_id)?.name}</p><p className="text-xs text-muted-foreground">{override.mode}: {override.increment_by ?? override.hard_limit_override} · {override.reason}</p></div><Button variant="ghost" size="sm" onClick={() => assertReason() && mutation.mutate({ fn: 'platform_clear_owner_billing_group_quota_override', args: { p_group_id: groupId, p_quota_code: dimensions.get(override.quota_dimension_id)?.code, p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() } })}>Clear</Button></div>)}</div></section>
              <section className="space-y-3"><h3 className="font-semibold">Entitlement override</h3><div className="grid grid-cols-2 gap-2"><Select value={entitlementKey} onValueChange={setEntitlementKey}><SelectTrigger><SelectValue placeholder="Entitlement" /></SelectTrigger><SelectContent>{data?.entitlementKeys.map((key) => <SelectItem key={key.id} value={key.key}>{key.key}</SelectItem>)}</SelectContent></Select><Select value={entitlementDecision} onValueChange={(value: 'allow' | 'deny') => setEntitlementDecision(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="allow">Allow</SelectItem><SelectItem value="deny">Deny</SelectItem></SelectContent></Select></div><Button className="w-full" disabled={!entitlementKey || mutation.isPending} onClick={() => assertReason() && mutation.mutate({ fn: 'platform_set_owner_billing_group_entitlement_override', args: { p_group_id: groupId, p_entitlement_key: entitlementKey, p_decision: entitlementDecision, p_reason: reason.trim(), p_expires_at: null, p_correlation_id: crypto.randomUUID() } })}>Apply entitlement override</Button><div className="divide-y rounded-md border">{entitlementOverrides.map((override) => <div key={override.id} className="flex items-center justify-between gap-3 p-3 text-sm"><div><p className="font-medium">{keys.get(override.entitlement_key_id)?.key}</p><p className="text-xs text-muted-foreground">{override.decision} · {override.reason}</p></div><Button variant="ghost" size="sm" onClick={() => assertReason() && mutation.mutate({ fn: 'platform_clear_owner_billing_group_entitlement_override', args: { p_group_id: groupId, p_entitlement_key: keys.get(override.entitlement_key_id)?.key, p_reason: reason.trim(), p_correlation_id: crypto.randomUUID() } })}>Clear</Button></div>)}</div></section></div></TabsContent>
            <TabsContent value="events"><div className="divide-y rounded-md border">{events.map((event) => <div key={event.id} className="flex items-start justify-between gap-4 p-3"><div><p className="text-sm font-medium">{event.event_type.replaceAll('.', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">Actor {event.actor_user_id || 'system'} · {JSON.stringify(event.details)}</p></div><time className="shrink-0 text-xs text-muted-foreground">{formatDate(event.created_at)}</time></div>)}</div></TabsContent>
          </Tabs>
        </main>}
      </div>
    </div>
  );
}