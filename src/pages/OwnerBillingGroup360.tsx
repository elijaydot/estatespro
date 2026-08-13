import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { supabase } from '@/integrations/supabase/client';
import { untypedSupabase } from '@/integrations/supabase/untypedClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

type Group = {
  id: string;
  owner_id: string;
  name: string;
  status: string;
  created_at: string;
  member_count?: number;
  subscription_id?: string | null;
  subscription_status?: string | null;
  payment_state?: string | null;
  grace_end_at?: string | null;
};
type Member = {
  id: string;
  group_id: string;
  company_id: string;
  added_at: string;
  company_name: string;
};
type Plan = { id: string; name: string; code: string };
type Subscription = {
  id: string;
  group_id: string;
  plan_id: string;
  status: string;
  payment_state: string;
  next_renewal_at: string | null;
  grace_end_at: string | null;
  dunning_attempt_count: number;
  plan_name?: string;
  plan_code?: string;
};
type Invoice = {
  id: string;
  group_id: string;
  invoice_status: string;
  invoice_kind: string;
  amount_minor: number;
  currency_code: string;
  due_at: string;
  external_reference: string | null;
};
type Event = {
  id: string;
  group_id: string;
  event_type: string;
  actor_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};
type QuotaDimension = { id: string; code: string; name: string };
type EntitlementKey = { id: string; key: string; domain: string };
type QuotaOverride = {
  id: string;
  group_id: string;
  quota_dimension_id: string;
  mode: string;
  increment_by: number | null;
  hard_limit_override: number | null;
  reason: string;
  expires_at: string | null;
  quota_code: string;
  quota_name: string;
};
type EntitlementOverride = {
  id: string;
  group_id: string;
  entitlement_key_id: string;
  decision: string;
  reason: string;
  expires_at: string | null;
  entitlement_key: string;
  entitlement_domain: string;
};

type Page<T> = { rows: T[]; page: number; page_size: number; total_count: number };
type GroupDirectoryData = Page<Group>;
type Group360Data = {
  group: Group;
  subscription: Subscription | null;
  summary: { member_count: number; outstanding_by_currency: Record<string, number> };
  members: Page<Member>;
  invoices: Page<Invoice>;
  events: Page<Event>;
  quota_overrides: Page<QuotaOverride>;
  entitlement_overrides: Page<EntitlementOverride>;
  event_types: string[];
  catalog: { plans: Plan[]; dimensions: QuotaDimension[]; entitlement_keys: EntitlementKey[] };
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value / 100);
}

function eventSummary(details: Record<string, unknown>) {
  const parts: string[] = [];
  if (typeof details.reason === 'string') parts.push(details.reason);
  if (typeof details.paused_company_subscriptions === 'number')
    parts.push(
      `${details.paused_company_subscriptions} standalone subscriptions paused`,
    );
  if (typeof details.amount_minor === 'number')
    parts.push(
      formatMoney(
        details.amount_minor,
        typeof details.currency_code === 'string'
          ? details.currency_code
          : 'USD',
      ),
    );
  return parts.join(' · ') || 'Recorded by the billing lifecycle.';
}

export default function OwnerBillingGroup360() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [groupStatus, setGroupStatus] = useState(
    () => searchParams.get('status') || 'all',
  );
  const [groupId, setGroupId] = useState(
    () => searchParams.get('group') || '',
  );
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get('view') || 'overview',
  );
  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(10);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(10);
  const [overrideSearch, setOverrideSearch] = useState('');
  const [quotaPage, setQuotaPage] = useState(1);
  const [quotaPageSize, setQuotaPageSize] = useState(10);
  const [entitlementPage, setEntitlementPage] = useState(1);
  const [entitlementPageSize, setEntitlementPageSize] = useState(10);
  const [eventType, setEventType] = useState('all');
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(10);
  const [reason, setReason] = useState('');
  const [graceDays, setGraceDays] = useState(7);
  const [graceMode, setGraceMode] = useState<'from_now' | 'extend'>('from_now');
  const [confirmGraceOpen, setConfirmGraceOpen] = useState(false);
  const [quotaCode, setQuotaCode] = useState('');
  const [quotaMode, setQuotaMode] = useState<'increment' | 'set'>('increment');
  const [quotaValue, setQuotaValue] = useState('');
  const [entitlementKey, setEntitlementKey] = useState('');
  const [entitlementDecision, setEntitlementDecision] = useState<
    'allow' | 'deny'
  >('allow');
  const deferredSearch = useDeferredValue(search);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const deferredOverrideSearch = useDeferredValue(overrideSearch);

  const directoryQuery = useQuery({
    queryKey: ['control-plane-owner-billing-groups-page', deferredSearch, groupStatus, groupPage, groupPageSize],
    queryFn: async (): Promise<GroupDirectoryData> => {
      const { data, error } = await untypedSupabase.rpc('platform_get_owner_billing_groups_page', {
        p_search: deferredSearch.trim() || null,
        p_status: groupStatus === 'all' ? null : groupStatus,
        p_page: groupPage,
        p_page_size: groupPageSize,
      });
      if (error) throw error;
      return data as GroupDirectoryData;
    },
  });

  const query = useQuery({
    queryKey: ['control-plane-owner-billing-group-360', groupId, deferredMemberSearch, memberPage, memberPageSize, invoiceStatus, invoicePage, invoicePageSize, deferredOverrideSearch, quotaPage, entitlementPage, quotaPageSize, eventType, eventPage, eventPageSize],
    enabled: Boolean(groupId),
    queryFn: async (): Promise<Group360Data> => {
      const { data, error } = await untypedSupabase.rpc('platform_get_owner_billing_group_360', {
        p_group_id: groupId,
        p_member_search: deferredMemberSearch.trim() || null,
        p_member_page: memberPage,
        p_member_page_size: memberPageSize,
        p_invoice_status: invoiceStatus === 'all' ? null : invoiceStatus,
        p_invoice_page: invoicePage,
        p_invoice_page_size: invoicePageSize,
        p_override_search: deferredOverrideSearch.trim() || null,
        p_quota_page: quotaPage,
        p_entitlement_page: entitlementPage,
        p_override_page_size: quotaPageSize,
        p_event_type: eventType === 'all' ? null : eventType,
        p_event_page: eventPage,
        p_event_page_size: eventPageSize,
      });
      if (error) throw error;
      return data as Group360Data;
    },
  });

  useEffect(() => {
    if (!groupId && directoryQuery.data?.rows[0]) setGroupId(directoryQuery.data.rows[0].id);
  }, [groupId, directoryQuery.data?.rows]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (groupId) next.set('group', groupId);
    next.set('view', activeTab);
    if (search) next.set('q', search);
    if (groupStatus !== 'all') next.set('status', groupStatus);
    setSearchParams(next, { replace: true });
  }, [activeTab, groupId, groupStatus, search, setSearchParams]);

  useEffect(() => {
    setMemberPage(1);
    setInvoicePage(1);
    setQuotaPage(1);
    setEntitlementPage(1);
    setEventPage(1);
  }, [groupId]);

  const mutation = useMutation({
    mutationFn: async ({
      fn,
      args,
    }: {
      fn: string;
      args: Record<string, unknown>;
    }) => {
      const { error } = await untypedSupabase.rpc(fn, args);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['control-plane-owner-billing-group-360'],
      });
      toast.success('Group override updated.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const graceMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error('No active group subscription selected.');
      const { error } = await untypedSupabase.rpc('platform_admin_set_owner_group_subscription_grace', {
        p_group_id: groupId,
        p_subscription_id: subscription.id,
        p_grace_days: graceDays,
        p_mode: graceMode,
        p_reason: reason.trim(),
        p_correlation_id: `cp-group-grace-${Date.now()}`,
        p_metadata: { source: 'owner_billing_group_360' },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-owner-billing-groups-page'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-owner-billing-group-360'] }),
      ]);
      setConfirmGraceOpen(false);
      toast.success('Billing group grace updated.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = query.data;
  const plans = useMemo(
    () => new Map((data?.catalog.plans || []).map((plan) => [plan.id, plan])),
    [data?.catalog.plans],
  );
  const dimensions = useMemo(
    () =>
      new Map(
        (data?.catalog.dimensions || []).map((dimension) => [dimension.id, dimension]),
      ),
    [data?.catalog.dimensions],
  );
  const keys = useMemo(
    () => new Map((data?.catalog.entitlement_keys || []).map((key) => [key.id, key])),
    [data?.catalog.entitlement_keys],
  );
  const pagedGroups = directoryQuery.data?.rows || [];
  const group = data?.group;
  const members = data?.members.rows || [];
  const subscription = data?.subscription;
  const invoices = data?.invoices.rows || [];
  const events = data?.events.rows || [];
  const quotaOverrides = data?.quota_overrides.rows || [];
  const entitlementOverrides = data?.entitlement_overrides.rows || [];
  const eventTypes = data?.event_types || [];
  const outstanding = Object.entries(data?.summary.outstanding_by_currency || {})
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(' · ') || formatMoney(0);

  const assertReason = () => {
    if (reason.trim()) return true;
    toast.error('A reason is required for super-admin overrides.');
    return false;
  };

  if (directoryQuery.isLoading)
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (directoryQuery.error)
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertTitle>Billing groups unavailable</AlertTitle>
          <AlertDescription>{directoryQuery.error.message}</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">Billing Groups</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform oversight for pooled owner subscriptions, billing health, and
          audited exceptions.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-3 border-b pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search group or owner ID"
            />
          </div>
          <Select
            value={groupStatus}
            onValueChange={(value) => {
              setGroupStatus(value);
              setGroupPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter billing groups by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="dissolved">Dissolved</SelectItem>
            </SelectContent>
          </Select>
          <div className="max-h-72 space-y-1 overflow-auto lg:max-h-[65vh]">
            {pagedGroups.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setGroupId(item.id)}
                  className={`w-full border-l-2 px-3 py-3 text-left ${groupId === item.id ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted/60'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge
                      variant={item.status === 'active' ? 'default' : 'outline'}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.member_count || 0} companies
                  </p>
                </button>
            ))}
          </div>
          <TablePagination
            page={groupPage}
            pageSize={groupPageSize}
            total={directoryQuery.data?.total_count || 0}
            onPageChange={setGroupPage}
            onPageSizeChange={(size) => {
              setGroupPageSize(size);
              setGroupPage(1);
            }}
          />
        </aside>
        {groupId && query.isLoading ? (
          <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-80 w-full" /></div>
        ) : query.error ? (
          <Alert variant="destructive"><AlertTitle>Billing group record unavailable</AlertTitle><AlertDescription>{query.error.message}</AlertDescription></Alert>
        ) : !group ? (
          <Alert>
            <AlertTitle>No billing group selected</AlertTitle>
            <AlertDescription>
              Select a group to open its operational record.
            </AlertDescription>
          </Alert>
        ) : (
          <main className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{group.name}</h2>
                <p className="text-xs text-muted-foreground">
                  Owner {group.owner_id}
                </p>
              </div>
              <Badge
                variant={
                  subscription?.payment_state === 'current'
                    ? 'default'
                    : 'destructive'
                }
              >
                {subscription?.payment_state || group.status}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Companies</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {data?.summary.member_count || 0}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Plan</CardTitle>
                </CardHeader>
                <CardContent className="font-semibold">
                  {plans.get(subscription?.plan_id || '')?.name || '-'}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Outstanding</CardTitle>
                </CardHeader>
                <CardContent className="font-semibold">
                  {outstanding}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dunning attempts</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {subscription?.dunning_attempt_count || 0}
                </CardContent>
              </Card>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="overrides">Overrides</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Next renewal
                    </p>
                    <p className="font-medium">
                      {formatDate(subscription?.next_renewal_at || null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Grace ends</p>
                    <p className="font-medium">
                      {formatDate(subscription?.grace_end_at || null)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3 rounded-md border p-4">
                  <div><h3 className="font-semibold">Scoped billing grace</h3><p className="text-sm text-muted-foreground">Affects this billing group's subscription and member companies only.</p></div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div><Label>Operation</Label><Select value={graceMode} onValueChange={(value) => setGraceMode(value as 'from_now' | 'extend')}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="from_now">Set from now</SelectItem><SelectItem value="extend">Extend existing</SelectItem></SelectContent></Select></div>
                    <div><Label htmlFor="group-grace-days">Days</Label><Input id="group-grace-days" className="mt-2" type="number" min="1" max="90" value={graceDays} onChange={(event) => setGraceDays(Number(event.target.value))} /></div>
                    <div><Label htmlFor="group-grace-reason">Audit reason</Label><Input id="group-grace-reason" className="mt-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required justification" /></div>
                  </div>
                  <Button disabled={!subscription || reason.trim().length < 8 || graceDays < 1 || graceDays > 90 || graceMutation.isPending} onClick={() => setConfirmGraceOpen(true)}>Review scoped grace</Button>
                  <AlertDialog open={confirmGraceOpen} onOpenChange={setConfirmGraceOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm scoped group grace</AlertDialogTitle>
                        <AlertDialogDescription>
                          {graceMode === 'extend' ? 'Extend' : 'Set'} grace by {graceDays} days for subscription {subscription?.id} only. This action is audited.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => graceMutation.mutate()} disabled={graceMutation.isPending}>{graceMutation.isPending ? 'Applying...' : 'Apply grace'}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <h3 className="font-semibold">Member companies</h3>
                  </div>
                  <Input
                    className="mb-3 max-w-sm"
                    value={memberSearch}
                    onChange={(event) => {
                      setMemberSearch(event.target.value);
                      setMemberPage(1);
                    }}
                    placeholder="Filter member companies"
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Company ID</TableHead>
                        <TableHead>Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <Link
                              className="text-primary hover:underline"
                              to={`/super-admin/control-plane?cp_tab=company360&cp_company=${member.company_id}`}
                            >
                              {member.company_name}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {member.company_id}
                          </TableCell>
                          <TableCell>{formatDate(member.added_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    page={memberPage}
                    pageSize={memberPageSize}
                    total={data?.members.total_count || 0}
                    onPageChange={setMemberPage}
                    onPageSizeChange={(size) => {
                      setMemberPageSize(size);
                      setMemberPage(1);
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="billing">
                <Select
                  value={invoiceStatus}
                  onValueChange={(value) => {
                    setInvoiceStatus(value);
                    setInvoicePage(1);
                  }}
                >
                  <SelectTrigger className="mb-3 w-52" aria-label="Filter invoices by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All invoice statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="uncollectible">Uncollectible</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
                {invoices.length ? (
                  <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            {invoice.external_reference || invoice.id}
                          </TableCell>
                          <TableCell>{invoice.invoice_kind}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                invoice.invoice_status === 'paid'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {invoice.invoice_status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(invoice.due_at)}</TableCell>
                          <TableCell className="text-right">
                            {formatMoney(
                              invoice.amount_minor,
                              invoice.currency_code,
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    page={invoicePage}
                    pageSize={invoicePageSize}
                    total={data?.invoices.total_count || 0}
                    onPageChange={setInvoicePage}
                    onPageSizeChange={(size) => {
                      setInvoicePageSize(size);
                      setInvoicePage(1);
                    }}
                  />
                  </div>
                ) : (
                  <Alert>
                    <AlertTitle>No invoices yet</AlertTitle>
                    <AlertDescription>
                      This group is current. Its first invoice will appear when
                      renewal processing begins.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              <TabsContent value="overrides" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="override-reason">Required audit reason</Label>
                  <Input
                    id="override-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Operational justification"
                  />
                </div>
                <Input
                  value={overrideSearch}
                  onChange={(event) => {
                    setOverrideSearch(event.target.value);
                    setQuotaPage(1);
                    setEntitlementPage(1);
                  }}
                  placeholder="Filter overrides by definition or reason"
                />
                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="space-y-3">
                    <h3 className="font-semibold">Quota override</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={quotaCode} onValueChange={setQuotaCode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Quota" />
                        </SelectTrigger>
                        <SelectContent>
                          {data?.catalog.dimensions.map((dimension) => (
                            <SelectItem
                              key={dimension.id}
                              value={dimension.code}
                            >
                              {dimension.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={quotaMode}
                        onValueChange={(value: 'increment' | 'set') =>
                          setQuotaMode(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="increment">Increment</SelectItem>
                          <SelectItem value="set">Set hard limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={quotaValue}
                        onChange={(event) => setQuotaValue(event.target.value)}
                        placeholder="Value"
                      />
                      <Button
                        disabled={
                          !quotaCode || quotaValue === '' || mutation.isPending
                        }
                        onClick={() =>
                          assertReason() &&
                          mutation.mutate({
                            fn: 'platform_set_owner_billing_group_quota_override',
                            args: {
                              p_group_id: groupId,
                              p_quota_code: quotaCode,
                              p_mode: quotaMode,
                              p_value: Number(quotaValue),
                              p_reason: reason.trim(),
                              p_expires_at: null,
                              p_correlation_id: crypto.randomUUID(),
                            },
                          })
                        }
                      >
                        Apply
                      </Button>
                    </div>
                    <div className="divide-y rounded-md border">
                      {quotaOverrides.map((override) => (
                        <div
                          key={override.id}
                          className="flex items-center justify-between gap-3 p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {
                                dimensions.get(override.quota_dimension_id)
                                  ?.name
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {override.mode}:{' '}
                              {override.increment_by ??
                                override.hard_limit_override}{' '}
                              · {override.reason}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              assertReason() &&
                              mutation.mutate({
                                fn: 'platform_clear_owner_billing_group_quota_override',
                                args: {
                                  p_group_id: groupId,
                                  p_quota_code: dimensions.get(
                                    override.quota_dimension_id,
                                  )?.code,
                                  p_reason: reason.trim(),
                                  p_correlation_id: crypto.randomUUID(),
                                },
                              })
                            }
                          >
                            Clear
                          </Button>
                        </div>
                      ))}
                    </div>
                    <TablePagination
                      page={quotaPage}
                      pageSize={quotaPageSize}
                      total={data?.quota_overrides.total_count || 0}
                      onPageChange={setQuotaPage}
                      onPageSizeChange={(size) => {
                        setQuotaPageSize(size);
                        setQuotaPage(1);
                      }}
                    />
                  </section>
                  <section className="space-y-3">
                    <h3 className="font-semibold">Entitlement override</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={entitlementKey}
                        onValueChange={setEntitlementKey}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Entitlement" />
                        </SelectTrigger>
                        <SelectContent>
                          {data?.catalog.entitlement_keys.map((key) => (
                            <SelectItem key={key.id} value={key.key}>
                              {key.key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={entitlementDecision}
                        onValueChange={(value: 'allow' | 'deny') =>
                          setEntitlementDecision(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allow">Allow</SelectItem>
                          <SelectItem value="deny">Deny</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!entitlementKey || mutation.isPending}
                      onClick={() =>
                        assertReason() &&
                        mutation.mutate({
                          fn: 'platform_set_owner_billing_group_entitlement_override',
                          args: {
                            p_group_id: groupId,
                            p_entitlement_key: entitlementKey,
                            p_decision: entitlementDecision,
                            p_reason: reason.trim(),
                            p_expires_at: null,
                            p_correlation_id: crypto.randomUUID(),
                          },
                        })
                      }
                    >
                      Apply entitlement override
                    </Button>
                    <div className="divide-y rounded-md border">
                      {entitlementOverrides.map((override) => (
                        <div
                          key={override.id}
                          className="flex items-center justify-between gap-3 p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              {keys.get(override.entitlement_key_id)?.key}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {override.decision} · {override.reason}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              assertReason() &&
                              mutation.mutate({
                                fn: 'platform_clear_owner_billing_group_entitlement_override',
                                args: {
                                  p_group_id: groupId,
                                  p_entitlement_key: keys.get(
                                    override.entitlement_key_id,
                                  )?.key,
                                  p_reason: reason.trim(),
                                  p_correlation_id: crypto.randomUUID(),
                                },
                              })
                            }
                          >
                            Clear
                          </Button>
                        </div>
                      ))}
                    </div>
                    <TablePagination
                      page={entitlementPage}
                      pageSize={entitlementPageSize}
                      total={data?.entitlement_overrides.total_count || 0}
                      onPageChange={setEntitlementPage}
                      onPageSizeChange={(size) => {
                        setEntitlementPageSize(size);
                        setEntitlementPage(1);
                      }}
                    />
                  </section>
                </div>
              </TabsContent>
              <TabsContent value="events">
                <Select
                  value={eventType}
                  onValueChange={(value) => {
                    setEventType(value);
                    setEventPage(1);
                  }}
                >
                  <SelectTrigger className="mb-3 w-64" aria-label="Filter billing events by type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All event types</SelectItem>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type.replace(/\./g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="divide-y rounded-md border">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-4 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {event.event_type.replace(/\./g, ' ')}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {eventSummary(event.details)} · Actor{' '}
                          {event.actor_user_id ? (
                            <Link
                              className="text-primary hover:underline"
                              to={`/super-admin/control-plane?cp_tab=user360&cp_user=${event.actor_user_id}`}
                            >
                              {event.actor_user_id}
                            </Link>
                          ) : 'system'}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(event.created_at)}
                      </time>
                    </div>
                  ))}
                </div>
                <TablePagination
                  page={eventPage}
                  pageSize={eventPageSize}
                  total={data?.events.total_count || 0}
                  onPageChange={setEventPage}
                  onPageSizeChange={(size) => {
                    setEventPageSize(size);
                    setEventPage(1);
                  }}
                />
              </TabsContent>
            </Tabs>
          </main>
        )}
      </div>
    </div>
  );
}
