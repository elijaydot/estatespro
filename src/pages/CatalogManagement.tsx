import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Plus, Save, Send, TriangleAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type DraftChange = {
  entity: 'quota' | 'price' | 'entitlement' | 'plan';
  id: string;
  field: string;
  before: unknown;
  after: unknown;
  planId: string;
  planName: string;
};

type CatalogPlan = {
  id: string;
  name: string;
  code: string;
  trial_days: number;
  saas_plan_prices: Array<{ id: string; currency_code: string; amount_minor: number }>;
  saas_plan_quotas: Array<{ id: string; hard_limit: number; is_unlimited: boolean; saas_quota_dimensions: { code: string; name: string } }>;
  saas_plan_entitlements: Array<{ id: string; bool_value: boolean | null; json_value: unknown; saas_entitlement_keys: { key: string } }>;
};

const API_KEYS = ['notifications.whatsapp.enabled', 'portal.tenant.enabled', 'portal.owner.enabled', 'api.access.level'];

export default function CatalogManagement() {
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<DraftChange[]>([]);

  const catalog = useQuery({
    queryKey: ['catalog-management'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('saas_plans')
        .select('id,name,code,sort_order,trial_days,saas_plan_prices(id,currency_code,amount_minor),saas_plan_quotas(id,hard_limit,is_unlimited,saas_quota_dimensions(code,name)),saas_plan_entitlements(id,bool_value,json_value,saas_entitlement_keys(key))')
        .like('code', 'fishgate_%')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as CatalogPlan[];
    },
  });

  const registry = useQuery({
    queryKey: ['catalog-registry'],
    queryFn: async () => {
      const [quotaResult, keyResult, addonResult, auditResult] = await Promise.all([
        supabase.from('saas_quota_dimensions').select('*').order('name'),
        supabase.from('saas_entitlement_keys').select('*').order('domain'),
        supabase.from('saas_addons').select('*,saas_addon_prices(*)').order('sort_order'),
        supabase.from('platform_audit_events').select('*').eq('module', 'catalog').order('created_at', { ascending: false }).limit(100),
      ]);
      const error = quotaResult.error || keyResult.error || addonResult.error || auditResult.error;
      if (error) throw error;
      return { quotas: quotaResult.data || [], keys: keyResult.data || [], addons: addonResult.data || [], audit: auditResult.data || [] };
    },
  });

  const stage = (change: DraftChange) => setChanges((current) => {
    const withoutSameField = current.filter((item) => !(item.entity === change.entity && item.id === change.id && item.field === change.field));
    return change.before === change.after ? withoutSameField : [...withoutSameField, change];
  });

  const saveDraft = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('saas_catalog_change_sets').insert({ changes, title: `Catalog draft ${new Date().toLocaleDateString()}` });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Draft saved. Live catalog is unchanged.'),
    onError: (error: Error) => toast.error(error.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!changes.length) return;
      const { data: draft, error: draftError } = await (supabase as any).from('saas_catalog_change_sets').insert({ changes, title: 'Published catalog changes' }).select('id').single();
      if (draftError) throw draftError;
      const { error } = await supabase.rpc('saas_publish_catalog_change_set' as never, { p_change_set_id: draft.id } as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      setChanges([]);
      await queryClient.invalidateQueries({ queryKey: ['catalog-management'] });
      toast.success('Catalog changes published.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dimensions = useMemo(() => registry.data?.quotas || [], [registry.data]);
  const affectedSubscriptions = useQuery({
    queryKey: ['catalog-affected-subscriptions', ...Array.from(new Set(changes.map((change) => change.planId))).sort()],
    enabled: changes.length > 0,
    queryFn: async () => {
      const planIds = Array.from(new Set(changes.map((change) => change.planId)));
      const counts = await Promise.all(planIds.map(async (planId) => {
        const { data, error } = await supabase.rpc('saas_catalog_active_subscription_count' as never, { p_plan_id: planId } as never);
        if (error) throw error;
        return Number(data || 0);
      }));
      return counts.reduce((sum, count) => sum + count, 0);
    },
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><LayoutGrid className="h-5 w-5" /><h1 className="text-2xl font-semibold">Catalog Management</h1></div>
          <p className="mt-1 text-sm text-muted-foreground">Unified plans, pricing, capacity, entitlements, and release controls.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={changes.length ? 'default' : 'secondary'}>{changes.length} draft changes</Badge>
          <Button variant="outline" disabled={!changes.length || saveDraft.isPending} onClick={() => saveDraft.mutate()}><Save className="mr-2 h-4 w-4" />Save draft</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button disabled={!changes.length}><Send className="mr-2 h-4 w-4" />Publish changes</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Publish {changes.length} catalog changes?</AlertDialogTitle><AlertDialogDescription>These changes affect {affectedSubscriptions.data ?? 0} active subscriptions. Quota decreases for paying subscribers are blocked until a grandfathering policy is approved.</AlertDialogDescription></AlertDialogHeader>
              <div className="max-h-60 space-y-2 overflow-auto text-sm">{changes.map((change) => <div key={`${change.entity}:${change.id}:${change.field}`} className="border-b pb-2"><strong>{change.planName}</strong>: {change.field} from {String(change.before)} to {String(change.after)}</div>)}</div>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => publish.mutate()}>Publish</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger><TabsTrigger value="addons">Add-ons</TabsTrigger><TabsTrigger value="registry">Registry</TabsTrigger><TabsTrigger value="trials">Trial Configuration</TabsTrigger><TabsTrigger value="publish">Draft / Publish</TabsTrigger><TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <Card><CardHeader><CardTitle>Unified plan matrix</CardTitle><CardDescription>USD is seeded. Add currencies only after approved FX values are available.</CardDescription></CardHeader><CardContent className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead className="sticky left-0 bg-background">Plan</TableHead><TableHead>USD / month</TableHead>{dimensions.map((dimension: any) => <TableHead key={dimension.id} className="min-w-36">{dimension.name}</TableHead>)}{API_KEYS.map((key) => <TableHead key={key} className="min-w-36">{key}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{catalog.data?.map((plan) => {
                const usd = plan.saas_plan_prices.find((price) => price.currency_code === 'USD');
                return <TableRow key={plan.id}><TableCell className="sticky left-0 bg-background font-medium">{plan.name}</TableCell><TableCell><Input className="w-24" type="number" defaultValue={(usd?.amount_minor || 0) / 100} onBlur={(event) => usd && stage({ entity: 'price', id: usd.id, field: 'amount_minor', before: usd.amount_minor, after: Math.round(Number(event.target.value) * 100), planId: plan.id, planName: plan.name })} /></TableCell>
                  {dimensions.map((dimension: any) => { const quota = plan.saas_plan_quotas.find((item) => item.saas_quota_dimensions.code === dimension.code); return <TableCell key={dimension.id}>{quota ? <div className="space-y-2"><Input className="w-24" type="number" disabled={quota.is_unlimited} defaultValue={quota.hard_limit} onBlur={(event) => stage({ entity: 'quota', id: quota.id, field: 'hard_limit', before: quota.hard_limit, after: Number(event.target.value), planId: plan.id, planName: plan.name })} /><label className="flex items-center gap-2 text-xs"><Switch defaultChecked={quota.is_unlimited} onCheckedChange={(value) => stage({ entity: 'quota', id: quota.id, field: 'is_unlimited', before: quota.is_unlimited, after: value, planId: plan.id, planName: plan.name })} />Unlimited</label></div> : <span className="text-muted-foreground">Not set</span>}</TableCell>; })}
                  {API_KEYS.map((key) => { const entitlement = plan.saas_plan_entitlements.find((item) => item.saas_entitlement_keys.key === key); return <TableCell key={key}>{key === 'api.access.level' ? <select className="h-9 rounded-md border bg-background px-2" defaultValue={String(entitlement?.json_value || 'none')} onChange={(event) => entitlement && stage({ entity: 'entitlement', id: entitlement.id, field: 'json_value', before: entitlement.json_value, after: event.target.value, planId: plan.id, planName: plan.name })}><option value="none">None</option><option value="limited">Limited</option><option value="full">Full</option></select> : <Switch defaultChecked={Boolean(entitlement?.bool_value)} onCheckedChange={(value) => entitlement && stage({ entity: 'entitlement', id: entitlement.id, field: 'bool_value', before: entitlement.bool_value, after: value, planId: plan.id, planName: plan.name })} />}</TableCell>; })}</TableRow>;
              })}</TableBody></Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="addons"><Card><CardHeader><CardTitle>Add-ons</CardTitle><CardDescription>Pricing and attach scope. Entitlement and quota override editing uses the same draft workflow.</CardDescription></CardHeader><CardContent><Button variant="outline"><Plus className="mr-2 h-4 w-4" />New add-on</Button><Table className="mt-4"><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Scope</TableHead><TableHead>Status</TableHead><TableHead>Prices</TableHead></TableRow></TableHeader><TableBody>{registry.data?.addons.map((addon: any) => <TableRow key={addon.id}><TableCell>{addon.name}</TableCell><TableCell>{addon.attach_scope}</TableCell><TableCell>{addon.is_active ? 'Active' : 'Inactive'}</TableCell><TableCell>{addon.saas_addon_prices?.map((price: any) => `${price.currency_code} ${(price.amount_minor / 100).toFixed(2)}`).join(', ')}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
        <TabsContent value="registry"><div className="grid gap-4 lg:grid-cols-2"><RegistryCard title="Quota dimensions" rows={registry.data?.quotas || []} /><RegistryCard title="Entitlement keys" rows={registry.data?.keys || []} /></div></TabsContent>
        <TabsContent value="trials"><Card><CardHeader><CardTitle>Trial configuration</CardTitle><CardDescription>Trial length is stored per plan. Expiry action remains blocked pending the read-only grace versus lockout decision.</CardDescription></CardHeader><CardContent className="space-y-4">{catalog.data?.map((plan) => <div key={plan.id} className="flex max-w-md items-center justify-between gap-4"><span>{plan.name}</span><div className="flex items-center gap-2"><Input className="w-24" type="number" defaultValue={plan.trial_days} onBlur={(event) => stage({ entity: 'plan', id: plan.id, field: 'trial_days', before: plan.trial_days, after: Number(event.target.value), planId: plan.id, planName: plan.name })} /><span className="text-sm">days</span></div></div>)}<div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"><TriangleAlert className="h-4 w-4 shrink-0" />Post-expiry behavior is not implemented because no policy has been approved.</div></CardContent></Card></TabsContent>
        <TabsContent value="publish"><Card><CardHeader><CardTitle>Pending draft</CardTitle><CardDescription>Edits here do not affect enforcement until explicitly published.</CardDescription></CardHeader><CardContent>{changes.length ? changes.map((change) => <div key={`${change.entity}:${change.id}:${change.field}`} className="border-b py-3 text-sm">{change.planName}: {change.field} → {String(change.after)}</div>) : <p className="text-sm text-muted-foreground">No pending changes.</p>}</CardContent></Card></TabsContent>
        <TabsContent value="audit"><Card><CardHeader><CardTitle>Catalog audit events</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Result</TableHead><TableHead>Actor</TableHead></TableRow></TableHeader><TableBody>{registry.data?.audit.map((event: any) => <TableRow key={event.id}><TableCell>{new Date(event.created_at).toLocaleString()}</TableCell><TableCell>{event.action}</TableCell><TableCell>{event.result_status}</TableCell><TableCell>{event.actor_user_id || 'system'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}

function RegistryCard({ title, rows }: { title: string; rows: any[] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>Definitions are catalog data and can be extended without a migration.</CardDescription></CardHeader><CardContent><Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" />Create</Button><div className="mt-4 space-y-3">{rows.map((row) => <div key={row.id} className="border-b pb-3"><div className="font-medium">{row.name || row.key}</div><div className="text-xs text-muted-foreground">{row.code || `${row.domain} · ${row.value_type}`}</div></div>)}</div></CardContent></Card>;
}
