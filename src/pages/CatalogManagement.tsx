import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Plus, Save, Search, Send } from 'lucide-react';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { supabase } from '@/integrations/supabase/client';
import { untypedSupabase } from '@/integrations/supabase/untypedClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  post_trial_action: 'grace_period' | 'lockout';
  post_trial_grace_days: number;
  saas_plan_prices: Array<{
    id: string;
    currency_code: string;
    amount_minor: number;
  }>;
  saas_plan_quotas: Array<{
    id: string;
    soft_limit: number;
    hard_limit: number;
    is_unlimited: boolean;
    saas_quota_dimensions: { code: string; name: string };
  }>;
  saas_plan_entitlements: Array<{
    id: string;
    bool_value: boolean | null;
    int_value: number | null;
    json_value: unknown;
    saas_entitlement_keys: { key: string };
  }>;
};

type CatalogQuotaDimension = { id: string; code: string; name: string; unit: string };
type CatalogEntitlementKey = { id: string; key: string; domain: string; value_type: string; name?: string };
type CatalogAddon = {
  id: string;
  name: string;
  code: string;
  attach_scope: string;
  is_active: boolean;
  saas_addon_prices: Array<{ currency_code: string; amount_minor: number }>;
  saas_addon_quota_overrides: Array<{ id: string }>;
  saas_addon_entitlements: Array<{ id: string }>;
};
type CatalogAuditEvent = {
  id: string;
  action: string;
  event_type: string;
  result_status: string;
  actor_user_id: string | null;
  created_at: string;
};
type RegistryRow = {
  id: string;
  name?: string;
  key?: string;
  code?: string;
  domain?: string;
  value_type?: string;
};

const API_KEYS = [
  'notifications.whatsapp.enabled',
  'portal.tenant.enabled',
  'portal.owner.enabled',
  'api.access.level',
];

export default function CatalogManagement() {
  const queryClient = useQueryClient();
  const [changes, setChanges] = useState<DraftChange[]>([]);
  const [authoring, setAuthoring] = useState<{
    kind: 'addon' | 'quota' | 'entitlement';
    open: boolean;
  }>({ kind: 'addon', open: false });
  const [definition, setDefinition] = useState({
    code: '',
    name: '',
    description: '',
    option: '',
    amount: '',
  });
  const [effect, setEffect] = useState<{
    kind: 'plan-quota' | 'plan-entitlement' | 'addon-quota' | 'addon-entitlement';
    targetId: string;
    open: boolean;
  }>({ kind: 'plan-quota', targetId: '', open: false });
  const [effectForm, setEffectForm] = useState({
    definitionCode: '',
    mode: 'increment',
    softLimit: '0',
    hardLimit: '0',
    unlimited: false,
    value: '',
  });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [addonPage, setAddonPage] = useState(1);
  const [quotaPage, setQuotaPage] = useState(1);
  const [quotaPageSize, setQuotaPageSize] = useState(10);
  const [entitlementPage, setEntitlementPage] = useState(1);
  const [entitlementPageSize, setEntitlementPageSize] = useState(10);
  const [auditPage, setAuditPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const catalog = useQuery({
    queryKey: ['catalog-management'],
    queryFn: async () => {
      const { data, error } = await untypedSupabase
        .from('saas_plans')
        .select(
          'id,name,code,sort_order,trial_days,post_trial_action,post_trial_grace_days,saas_plan_prices(id,currency_code,amount_minor),saas_plan_quotas(id,soft_limit,hard_limit,is_unlimited,saas_quota_dimensions(code,name)),saas_plan_entitlements(id,bool_value,int_value,json_value,saas_entitlement_keys(key))',
        )
        .like('code', 'fishgate_%')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as CatalogPlan[];
    },
  });

  const registry = useQuery({
    queryKey: ['catalog-registry'],
    queryFn: async () => {
      const [quotaResult, keyResult, addonResult, auditResult] =
        await Promise.all([
          supabase.from('saas_quota_dimensions').select('*').order('name'),
          supabase.from('saas_entitlement_keys').select('*').order('domain'),
          supabase
            .from('saas_addons')
            .select('*,saas_addon_prices(*),saas_addon_quota_overrides(id),saas_addon_entitlements(id)')
            .order('sort_order'),
          supabase
            .from('platform_audit_events')
            .select('*')
            .eq('module', 'catalog')
            .order('created_at', { ascending: false })
            .limit(100),
        ]);
      const error =
        quotaResult.error ||
        keyResult.error ||
        addonResult.error ||
        auditResult.error;
      if (error) throw error;
      return {
        quotas: (quotaResult.data || []) as CatalogQuotaDimension[],
        keys: (keyResult.data || []) as CatalogEntitlementKey[],
        addons: (addonResult.data || []) as CatalogAddon[],
        audit: (auditResult.data || []) as CatalogAuditEvent[],
      };
    },
  });

  const stage = (change: DraftChange) =>
    setChanges((current) => {
      const withoutSameField = current.filter(
        (item) =>
          !(
            item.entity === change.entity &&
            item.id === change.id &&
            item.field === change.field
          ),
      );
      return change.before === change.after
        ? withoutSameField
        : [...withoutSameField, change];
    });

  const saveDraft = useMutation({
    mutationFn: async () => {
      const { error } = await untypedSupabase
        .from('saas_catalog_change_sets')
        .insert({
          changes,
          title: `Catalog draft ${new Date().toLocaleDateString()}`,
        });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Draft saved. Live catalog is unchanged.'),
    onError: (error: Error) => toast.error(error.message),
  });

  const saveTrialPolicy = useMutation({
    mutationFn: async (policy: {
      planId: string;
      trialDays: number;
      action: 'grace_period' | 'lockout';
      graceDays: number;
    }) => {
      const { error } = await untypedSupabase.rpc('saas_catalog_set_trial_policy', {
        p_plan_id: policy.planId,
        p_trial_days: policy.trialDays,
        p_post_trial_action: policy.action,
        p_post_trial_grace_days: policy.graceDays,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['catalog-management'] });
      toast.success('Trial policy saved.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!changes.length) return;
      const { data: draft, error: draftError } = await untypedSupabase
        .from('saas_catalog_change_sets')
        .insert({ changes, title: 'Published catalog changes' })
        .select('id')
        .single();
      if (draftError) throw draftError;
      const { error } = await supabase.rpc(
        'saas_publish_catalog_change_set' as never,
        { p_change_set_id: draft.id } as never,
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      setChanges([]);
      await queryClient.invalidateQueries({ queryKey: ['catalog-management'] });
      toast.success('Catalog changes published.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dimensions = useMemo(
    () => registry.data?.quotas || [],
    [registry.data],
  );
  const createDefinition = useMutation({
    mutationFn: async () => {
      const common = { p_description: definition.description.trim() || null };
      const request =
        authoring.kind === 'addon'
          ? {
              fn: 'saas_catalog_create_addon',
              args: {
                ...common,
                p_code: definition.code.trim(),
                p_name: definition.name.trim(),
                p_attach_scope: definition.option,
                p_usd_amount_minor: Math.round(Number(definition.amount) * 100),
              },
            }
          : authoring.kind === 'quota'
            ? {
                fn: 'saas_catalog_create_quota_dimension',
                args: {
                  ...common,
                  p_code: definition.code.trim(),
                  p_name: definition.name.trim(),
                  p_unit: definition.option.trim(),
                },
              }
            : {
                fn: 'saas_catalog_create_entitlement_key',
                args: {
                  ...common,
                  p_key: definition.code.trim(),
                  p_domain: definition.name.trim(),
                  p_value_type: definition.option,
                },
              };
      const { error } = await untypedSupabase.rpc(request.fn, request.args);
      if (error) throw error;
    },
    onSuccess: async () => {
      setAuthoring((current) => ({ ...current, open: false }));
      setDefinition({
        code: '',
        name: '',
        description: '',
        option: '',
        amount: '',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['catalog-management'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog-registry'] }),
      ]);
      toast.success('Catalog definition created.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const openAuthoring = (kind: 'addon' | 'quota' | 'entitlement') => {
    setDefinition({
      code: '',
      name: '',
      description: '',
      option:
        kind === 'addon'
          ? 'any_product'
          : kind === 'quota'
            ? 'count'
            : 'boolean',
      amount: '',
    });
    setAuthoring({ kind, open: true });
  };
  const openEffect = (
    kind: 'plan-quota' | 'plan-entitlement' | 'addon-quota' | 'addon-entitlement',
    targetId: string,
  ) => {
    setEffectForm({
      definitionCode: '',
      mode: kind.includes('quota') ? 'increment' : 'set',
      softLimit: '0',
      hardLimit: '0',
      unlimited: false,
      value: '',
    });
    setEffect({ kind, targetId, open: true });
  };
  const selectedEntitlement = registry.data?.keys.find(
    (key) => key.key === effectForm.definitionCode,
  );
  const catalogEffect = useMutation({
    mutationFn: async () => {
      const isEntitlement = effect.kind.includes('entitlement');
      let typedValue: Record<string, unknown> = {};
      if (isEntitlement) {
        if (!selectedEntitlement) throw new Error('Select an entitlement definition.');
        if (selectedEntitlement.value_type === 'boolean') {
          typedValue = { p_bool_value: effectForm.value === 'true', p_int_value: null, p_json_value: null };
        } else if (selectedEntitlement.value_type === 'integer') {
          const value = Number(effectForm.value);
          if (!Number.isInteger(value)) throw new Error('Enter a whole-number entitlement value.');
          typedValue = { p_bool_value: null, p_int_value: value, p_json_value: null };
        } else {
          try {
            typedValue = { p_bool_value: null, p_int_value: null, p_json_value: JSON.parse(effectForm.value) };
          } catch {
            throw new Error('Enter valid JSON for this entitlement.');
          }
        }
      }

      const request = effect.kind === 'plan-quota'
        ? { fn: 'saas_catalog_assign_quota_to_plan', args: { p_plan_id: effect.targetId, p_quota_code: effectForm.definitionCode, p_soft_limit: Number(effectForm.softLimit), p_hard_limit: Number(effectForm.hardLimit), p_is_unlimited: effectForm.unlimited } }
        : effect.kind === 'plan-entitlement'
          ? { fn: 'saas_catalog_assign_entitlement_to_plan', args: { p_plan_id: effect.targetId, p_entitlement_key: effectForm.definitionCode, ...typedValue } }
          : effect.kind === 'addon-quota'
            ? { fn: 'saas_catalog_set_addon_quota_effect', args: { p_addon_id: effect.targetId, p_quota_code: effectForm.definitionCode, p_mode: effectForm.mode, p_value: Number(effectForm.value) } }
            : { fn: 'saas_catalog_set_addon_entitlement_effect', args: { p_addon_id: effect.targetId, p_entitlement_key: effectForm.definitionCode, p_mode: effectForm.mode, ...typedValue } };
      const { error } = await untypedSupabase.rpc(request.fn, request.args);
      if (error) throw error;
    },
    onSuccess: async () => {
      setEffect((current) => ({ ...current, open: false }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['catalog-management'] }),
        queryClient.invalidateQueries({ queryKey: ['catalog-registry'] }),
      ]);
      toast.success('Catalog assignment updated.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const affectedSubscriptions = useQuery({
    queryKey: [
      'catalog-affected-subscriptions',
      ...Array.from(new Set(changes.map((change) => change.planId))).sort(),
    ],
    enabled: changes.length > 0,
    queryFn: async () => {
      const planIds = Array.from(
        new Set(changes.map((change) => change.planId)),
      );
      const counts = await Promise.all(
        planIds.map(async (planId) => {
          const { data, error } = await supabase.rpc(
            'saas_catalog_active_subscription_count' as never,
            { p_plan_id: planId } as never,
          );
          if (error) throw error;
          return Number(data || 0);
        }),
      );
      return counts.reduce((sum, count) => sum + count, 0);
    },
  });
  const needle = catalogSearch.trim().toLowerCase();
  const filteredAddons = (registry.data?.addons || []).filter((addon) =>
    [addon.name, addon.code, addon.attach_scope].some((value) => String(value || '').toLowerCase().includes(needle)),
  );
  const filteredQuotas = (registry.data?.quotas || []).filter((quota) =>
    [quota.name, quota.code, quota.unit].some((value) => String(value || '').toLowerCase().includes(needle)),
  );
  const filteredKeys = (registry.data?.keys || []).filter((key) =>
    [key.key, key.domain, key.value_type].some((value) => String(value || '').toLowerCase().includes(needle)),
  );
  const filteredAudit = (registry.data?.audit || []).filter((event) =>
    [event.action, event.event_type, event.result_status, event.actor_user_id].some((value) => String(value || '').toLowerCase().includes(needle)),
  );
  const pagedAddons = filteredAddons.slice((addonPage - 1) * pageSize, addonPage * pageSize);
  const pagedAudit = filteredAudit.slice((auditPage - 1) * pageSize, auditPage * pageSize);
  const quotaAssignments = (catalog.data || []).reduce((sum, plan) => sum + plan.saas_plan_quotas.length, 0);
  const entitlementAssignments = (catalog.data || []).reduce((sum, plan) => sum + plan.saas_plan_entitlements.length, 0);
  const expectedQuotaAssignments = (catalog.data?.length || 0) * (registry.data?.quotas.length || 0);
  const expectedEntitlementAssignments = (catalog.data?.length || 0) * (registry.data?.keys.length || 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            <h1 className="text-2xl font-semibold">Catalog Management</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Unified plans, pricing, capacity, entitlements, and release
            controls.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={changes.length ? 'default' : 'secondary'}>
            {changes.length} draft changes
          </Badge>
          <Button
            variant="outline"
            disabled={!changes.length || saveDraft.isPending}
            onClick={() => saveDraft.mutate()}
          >
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!changes.length}>
                <Send className="mr-2 h-4 w-4" />
                Publish changes
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Publish {changes.length} catalog changes?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  These changes affect {affectedSubscriptions.data ?? 0} active
                  subscriptions. Quota decreases for paying subscribers are
                  blocked until a grandfathering policy is approved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="max-h-60 space-y-2 overflow-auto text-sm">
                {changes.map((change) => (
                  <div
                    key={`${change.entity}:${change.id}:${change.field}`}
                    className="border-b pb-2"
                  >
                    <strong>{change.planName}</strong>: {change.field} from{' '}
                    {String(change.before)} to {String(change.after)}
                  </div>
                ))}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => publish.mutate()}>
                  Publish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Plan quota coverage</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{quotaAssignments}/{expectedQuotaAssignments}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Plan entitlement coverage</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{entitlementAssignments}/{expectedEntitlementAssignments}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Add-on effects</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{(registry.data?.addons || []).reduce((sum, addon) => sum + (addon.saas_addon_quota_overrides?.length || 0) + (addon.saas_addon_entitlements?.length || 0), 0)}</CardContent></Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={catalogSearch} onChange={(event) => { setCatalogSearch(event.target.value); setAddonPage(1); setQuotaPage(1); setEntitlementPage(1); setAuditPage(1); }} placeholder="Filter catalog definitions and audit" />
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="trials">Trial Configuration</TabsTrigger>
          <TabsTrigger value="publish">Draft / Publish</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Unified plan matrix</CardTitle><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => catalog.data?.[0] && openEffect('plan-quota', catalog.data[0].id)}>Assign quota</Button><Button size="sm" variant="outline" onClick={() => catalog.data?.[0] && openEffect('plan-entitlement', catalog.data[0].id)}>Assign entitlement</Button></div></div>
              <CardDescription>
                USD is seeded. Add currencies only after approved FX values are
                available.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">
                      Plan
                    </TableHead>
                    <TableHead>USD / month</TableHead>
                    {dimensions.map((dimension) => (
                      <TableHead key={dimension.id} className="min-w-36">
                        {dimension.name}
                      </TableHead>
                    ))}
                    {API_KEYS.map((key) => (
                      <TableHead key={key} className="min-w-36">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalog.data?.map((plan) => {
                    const usd = plan.saas_plan_prices.find(
                      (price) => price.currency_code === 'USD',
                    );
                    return (
                      <TableRow key={plan.id}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {plan.name}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-24"
                            type="number"
                            defaultValue={(usd?.amount_minor || 0) / 100}
                            onBlur={(event) =>
                              usd &&
                              stage({
                                entity: 'price',
                                id: usd.id,
                                field: 'amount_minor',
                                before: usd.amount_minor,
                                after: Math.round(
                                  Number(event.target.value) * 100,
                                ),
                                planId: plan.id,
                                planName: plan.name,
                              })
                            }
                          />
                        </TableCell>
                        {dimensions.map((dimension) => {
                          const quota = plan.saas_plan_quotas.find(
                            (item) =>
                              item.saas_quota_dimensions.code ===
                              dimension.code,
                          );
                          return (
                            <TableCell key={dimension.id}>
                              {quota ? (
                                <div className="space-y-2">
                                  <Input
                                    className="w-24"
                                    type="number"
                                    disabled={quota.is_unlimited}
                                    defaultValue={quota.hard_limit}
                                    onBlur={(event) =>
                                      stage({
                                        entity: 'quota',
                                        id: quota.id,
                                        field: 'hard_limit',
                                        before: quota.hard_limit,
                                        after: Number(event.target.value),
                                        planId: plan.id,
                                        planName: plan.name,
                                      })
                                    }
                                  />
                                  <label className="flex items-center gap-2 text-xs">
                                    <Switch
                                      defaultChecked={quota.is_unlimited}
                                      onCheckedChange={(value) =>
                                        stage({
                                          entity: 'quota',
                                          id: quota.id,
                                          field: 'is_unlimited',
                                          before: quota.is_unlimited,
                                          after: value,
                                          planId: plan.id,
                                          planName: plan.name,
                                        })
                                      }
                                    />
                                    Unlimited
                                  </label>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  Not set
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                        {API_KEYS.map((key) => {
                          const entitlement = plan.saas_plan_entitlements.find(
                            (item) => item.saas_entitlement_keys.key === key,
                          );
                          return (
                            <TableCell key={key}>
                              {key === 'api.access.level' ? (
                                <select
                                  className="h-9 rounded-md border bg-background px-2"
                                  defaultValue={String(
                                    entitlement?.json_value || 'none',
                                  )}
                                  onChange={(event) =>
                                    entitlement &&
                                    stage({
                                      entity: 'entitlement',
                                      id: entitlement.id,
                                      field: 'json_value',
                                      before: entitlement.json_value,
                                      after: event.target.value,
                                      planId: plan.id,
                                      planName: plan.name,
                                    })
                                  }
                                >
                                  <option value="none">None</option>
                                  <option value="limited">Limited</option>
                                  <option value="full">Full</option>
                                </select>
                              ) : (
                                <Switch
                                  defaultChecked={Boolean(
                                    entitlement?.bool_value,
                                  )}
                                  onCheckedChange={(value) =>
                                    entitlement &&
                                    stage({
                                      entity: 'entitlement',
                                      id: entitlement.id,
                                      field: 'bool_value',
                                      before: entitlement.bool_value,
                                      after: value,
                                      planId: plan.id,
                                      planName: plan.name,
                                    })
                                  }
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="addons">
          <Card>
            <CardHeader>
              <CardTitle>Add-ons</CardTitle>
              <CardDescription>
                Create add-on definitions with attach scope and USD monthly
                pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => openAuthoring('addon')}>
                <Plus className="mr-2 h-4 w-4" />
                New add-on
              </Button>
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAddons.map((addon) => (
                    <TableRow key={addon.id}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell>{addon.attach_scope}</TableCell>
                      <TableCell>
                        {addon.is_active ? 'Active' : 'Inactive'}
                      </TableCell>
                      <TableCell>
                        {addon.saas_addon_prices
                          ?.map(
                            (price) =>
                              `${price.currency_code} ${(price.amount_minor / 100).toFixed(2)}`,
                          )
                          .join(', ')}
                      </TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => openEffect('addon-quota', addon.id)}>Quota effect</Button><Button size="sm" variant="ghost" onClick={() => openEffect('addon-entitlement', addon.id)}>Entitlement</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination page={addonPage} pageSize={pageSize} total={filteredAddons.length} onPageChange={setAddonPage} onPageSizeChange={(size) => { setPageSize(size); setAddonPage(1); setAuditPage(1); }} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="registry">
          <div className="grid gap-4 lg:grid-cols-2">
            <RegistryCard
              title="Quota dimensions"
              rows={filteredQuotas}
              onCreate={() => openAuthoring('quota')}
              onAssign={() => catalog.data?.[0] && openEffect('plan-quota', catalog.data[0].id)}
              page={quotaPage}
              pageSize={quotaPageSize}
              onPageChange={setQuotaPage}
              onPageSizeChange={(size) => { setQuotaPageSize(size); setQuotaPage(1); }}
            />
            <RegistryCard
              title="Entitlement keys"
              rows={filteredKeys}
              onCreate={() => openAuthoring('entitlement')}
              onAssign={() => catalog.data?.[0] && openEffect('plan-entitlement', catalog.data[0].id)}
              page={entitlementPage}
              pageSize={entitlementPageSize}
              onPageChange={setEntitlementPage}
              onPageSizeChange={(size) => { setEntitlementPageSize(size); setEntitlementPage(1); }}
            />
          </div>
        </TabsContent>
        <TabsContent value="trials">
          <Card>
            <CardHeader>
              <CardTitle>Trial configuration</CardTitle>
              <CardDescription>
                Expired trials are processed hourly using each plan's policy.
                Pooled billing groups do not receive trials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {catalog.data?.map((plan) => (
                <TrialPolicyRow
                  key={plan.id}
                  plan={plan}
                  pending={saveTrialPolicy.isPending}
                  onSave={(policy) => saveTrialPolicy.mutate(policy)}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="publish">
          <Card>
            <CardHeader>
              <CardTitle>Pending draft</CardTitle>
              <CardDescription>
                Edits here do not affect enforcement until explicitly published.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changes.length ? (
                changes.map((change) => (
                  <div
                    key={`${change.entity}:${change.id}:${change.field}`}
                    className="border-b py-3 text-sm"
                  >
                    {change.planName}: {change.field} → {String(change.after)}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No pending changes.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Catalog audit events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAudit.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        {new Date(event.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{event.action}</TableCell>
                      <TableCell>{event.result_status}</TableCell>
                      <TableCell>{event.actor_user_id || 'system'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination page={auditPage} pageSize={pageSize} total={filteredAudit.length} onPageChange={setAuditPage} onPageSizeChange={(size) => { setPageSize(size); setAuditPage(1); }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog
        open={authoring.open}
        onOpenChange={(open) =>
          setAuthoring((current) => ({ ...current, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {authoring.kind === 'addon'
                ? 'Create add-on'
                : authoring.kind === 'quota'
                  ? 'Create quota dimension'
                  : 'Create entitlement key'}
            </DialogTitle>
            <DialogDescription>
              Creates an audited catalog definition. Plan assignments and
              overrides remain separate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="definition-code">
                {authoring.kind === 'entitlement' ? 'Key' : 'Code'}
              </Label>
              <Input
                id="definition-code"
                value={definition.code}
                onChange={(event) =>
                  setDefinition((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder={
                  authoring.kind === 'entitlement'
                    ? 'domain.capability.enabled'
                    : 'lowercase_code'
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="definition-name">
                {authoring.kind === 'entitlement' ? 'Domain' : 'Name'}
              </Label>
              <Input
                id="definition-name"
                value={definition.name}
                onChange={(event) =>
                  setDefinition((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="definition-description">Description</Label>
              <Input
                id="definition-description"
                value={definition.description}
                onChange={(event) =>
                  setDefinition((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            {authoring.kind === 'quota' ? (
              <div className="space-y-2">
                <Label htmlFor="definition-unit">Unit</Label>
                <Input
                  id="definition-unit"
                  value={definition.option}
                  onChange={(event) =>
                    setDefinition((current) => ({
                      ...current,
                      option: event.target.value,
                    }))
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>
                  {authoring.kind === 'addon' ? 'Attach scope' : 'Value type'}
                </Label>
                <Select
                  value={definition.option}
                  onValueChange={(option) =>
                    setDefinition((current) => ({ ...current, option }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {authoring.kind === 'addon' ? (
                      <>
                        <SelectItem value="any_product">Any product</SelectItem>
                        <SelectItem value="core_only">Core only</SelectItem>
                        <SelectItem value="marketplace_only">
                          Marketplace only
                        </SelectItem>
                        <SelectItem value="crm_only">CRM only</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="integer">Integer</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {authoring.kind === 'addon' && (
              <div className="space-y-2">
                <Label htmlFor="definition-amount">USD monthly price</Label>
                <Input
                  id="definition-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={definition.amount}
                  onChange={(event) =>
                    setDefinition((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAuthoring((current) => ({ ...current, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              disabled={
                !definition.code.trim() ||
                !definition.name.trim() ||
                !definition.option.trim() ||
                (authoring.kind === 'addon' && definition.amount === '') ||
                createDefinition.isPending
              }
              onClick={() => createDefinition.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={effect.open} onOpenChange={(open) => setEffect((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>{effect.kind.startsWith('plan') ? 'Assign definition to plan' : 'Configure add-on effect'}</DialogTitle><DialogDescription>This audited operation updates the live catalog assignment immediately.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {effect.kind.startsWith('plan') && <div className="space-y-2"><Label>Plan</Label><Select value={effect.targetId} onValueChange={(targetId) => setEffect((current) => ({ ...current, targetId }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{catalog.data?.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent></Select></div>}
            <div className="space-y-2"><Label>{effect.kind.includes('quota') ? 'Quota dimension' : 'Entitlement key'}</Label><Select value={effectForm.definitionCode} onValueChange={(definitionCode) => setEffectForm((current) => ({ ...current, definitionCode, value: '' }))}><SelectTrigger><SelectValue placeholder="Select definition" /></SelectTrigger><SelectContent>{effect.kind.includes('quota') ? registry.data?.quotas.map((quota) => <SelectItem key={quota.id} value={quota.code}>{quota.name}</SelectItem>) : registry.data?.keys.map((key) => <SelectItem key={key.id} value={key.key}>{key.key}</SelectItem>)}</SelectContent></Select></div>
            {effect.kind === 'plan-quota' && <><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="effect-soft">Soft limit</Label><Input id="effect-soft" type="number" min="0" value={effectForm.softLimit} onChange={(event) => setEffectForm((current) => ({ ...current, softLimit: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="effect-hard">Hard limit</Label><Input id="effect-hard" type="number" min="0" value={effectForm.hardLimit} onChange={(event) => setEffectForm((current) => ({ ...current, hardLimit: event.target.value }))} /></div></div><label className="flex items-center gap-2 text-sm"><Switch checked={effectForm.unlimited} onCheckedChange={(unlimited) => setEffectForm((current) => ({ ...current, unlimited }))} />Unlimited</label></>}
            {effect.kind.startsWith('addon') && <div className="space-y-2"><Label>Effect mode</Label><Select value={effectForm.mode} onValueChange={(mode) => setEffectForm((current) => ({ ...current, mode }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="set">Set</SelectItem><SelectItem value="increment">Increment</SelectItem></SelectContent></Select></div>}
            {effect.kind !== 'plan-quota' && effect.kind.includes('quota') && <div className="space-y-2"><Label htmlFor="effect-value">Value</Label><Input id="effect-value" type="number" min="0" value={effectForm.value} onChange={(event) => setEffectForm((current) => ({ ...current, value: event.target.value }))} /></div>}
            {effect.kind.includes('entitlement') && selectedEntitlement?.value_type === 'boolean' && <div className="space-y-2"><Label>Value</Label><Select value={effectForm.value} onValueChange={(value) => setEffectForm((current) => ({ ...current, value }))}><SelectTrigger><SelectValue placeholder="Select value" /></SelectTrigger><SelectContent><SelectItem value="true">Enabled</SelectItem><SelectItem value="false">Disabled</SelectItem></SelectContent></Select></div>}
            {effect.kind.includes('entitlement') && selectedEntitlement && selectedEntitlement.value_type !== 'boolean' && <div className="space-y-2"><Label htmlFor="effect-entitlement-value">{selectedEntitlement.value_type === 'json' ? 'JSON value' : 'Integer value'}</Label><Input id="effect-entitlement-value" type={selectedEntitlement.value_type === 'integer' ? 'number' : 'text'} value={effectForm.value} onChange={(event) => setEffectForm((current) => ({ ...current, value: event.target.value }))} /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEffect((current) => ({ ...current, open: false }))}>Cancel</Button><Button disabled={!effectForm.definitionCode || (effect.kind !== 'plan-quota' && effectForm.value === '') || catalogEffect.isPending} onClick={() => catalogEffect.mutate()}>Apply</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrialPolicyRow({
  plan,
  pending,
  onSave,
}: {
  plan: CatalogPlan;
  pending: boolean;
  onSave: (policy: {
    planId: string;
    trialDays: number;
    action: 'grace_period' | 'lockout';
    graceDays: number;
  }) => void;
}) {
  const [trialDays, setTrialDays] = useState(plan.trial_days);
  const [action, setAction] = useState<'grace_period' | 'lockout'>(plan.post_trial_action);
  const [graceDays, setGraceDays] = useState(plan.post_trial_grace_days);

  return (
    <div className="grid gap-3 border-b pb-4 last:border-b-0 md:grid-cols-[minmax(10rem,1fr)_8rem_12rem_8rem_auto] md:items-end">
      <div>
        <p className="font-medium">{plan.name}</p>
        <p className="text-xs text-muted-foreground">{plan.code}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`trial-days-${plan.id}`}>Trial days</Label>
        <Input id={`trial-days-${plan.id}`} type="number" min="0" max="365" value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))} />
      </div>
      <div className="space-y-2">
        <Label>After trial</Label>
        <Select value={action} onValueChange={(value) => setAction(value as 'grace_period' | 'lockout')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="grace_period">Grace period</SelectItem>
            <SelectItem value="lockout">Lock access</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`grace-days-${plan.id}`}>Grace days</Label>
        <Input id={`grace-days-${plan.id}`} type="number" min="1" max="90" value={graceDays} disabled={action === 'lockout'} onChange={(event) => setGraceDays(Number(event.target.value))} />
      </div>
      <Button disabled={pending || trialDays < 0 || graceDays < 1} onClick={() => onSave({ planId: plan.id, trialDays, action, graceDays })}>
        <Save className="mr-2 h-4 w-4" /> Save
      </Button>
    </div>
  );
}

function RegistryCard({
  title,
  rows,
  onCreate,
  onAssign,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  title: string;
  rows: RegistryRow[];
  onCreate: () => void;
  onAssign: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Definitions are catalog data and can be extended without a migration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button><Button variant="outline" size="sm" onClick={onAssign}>Assign to plan</Button></div>
        <div className="mt-4 space-y-3">
          {rows.slice((page - 1) * pageSize, page * pageSize).map((row) => (
            <div key={row.id} className="border-b pb-3">
              <div className="font-medium">{row.name || row.key}</div>
              <div className="text-xs text-muted-foreground">
                {row.code || `${row.domain} · ${row.value_type}`}
              </div>
            </div>
          ))}
        </div>
        <TablePagination page={page} pageSize={pageSize} total={rows.length} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      </CardContent>
    </Card>
  );
}
