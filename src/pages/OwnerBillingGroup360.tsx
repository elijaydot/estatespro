import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
};
type Member = {
  id: string;
  group_id: string;
  company_id: string;
  added_at: string;
};
type Company = { id: string; name: string };
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
};
type EntitlementOverride = {
  id: string;
  group_id: string;
  entitlement_key_id: string;
  decision: string;
  reason: string;
  expires_at: string | null;
};

type Group360Data = {
  groups: Group[];
  members: Member[];
  companies: Company[];
  plans: Plan[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  events: Event[];
  dimensions: QuotaDimension[];
  entitlementKeys: EntitlementKey[];
  quotaOverrides: QuotaOverride[];
  entitlementOverrides: EntitlementOverride[];
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
  const [quotaCode, setQuotaCode] = useState('');
  const [quotaMode, setQuotaMode] = useState<'increment' | 'set'>('increment');
  const [quotaValue, setQuotaValue] = useState('');
  const [entitlementKey, setEntitlementKey] = useState('');
  const [entitlementDecision, setEntitlementDecision] = useState<
    'allow' | 'deny'
  >('allow');

  const query = useQuery({
    queryKey: ['control-plane-owner-billing-groups'],
    queryFn: async (): Promise<Group360Data> => {
      const client = supabase as any;
      const [groups, companies, plans, dimensions, entitlementKeys] =
        await Promise.all([
          client
            .from('owner_billing_groups')
            .select('id,owner_id,name,status,created_at')
            .order('created_at', { ascending: false }),
          client.from('companies').select('id,name').order('name'),
          client
            .from('saas_plans')
            .select('id,name,code')
            .is('product_id', null)
            .order('sort_order'),
          client
            .from('saas_quota_dimensions')
            .select('id,code,name')
            .order('name'),
          client
            .from('saas_entitlement_keys')
            .select('id,key,domain')
            .order('domain'),
        ]);
      const firstError =
        groups.error ||
        companies.error ||
        plans.error ||
        dimensions.error ||
        entitlementKeys.error;
      if (firstError) throw firstError;
      const ids = (groups.data || []).map((group: Group) => group.id);
      if (!ids.length)
        return {
          groups: [],
          members: [],
          companies: companies.data || [],
          plans: plans.data || [],
          subscriptions: [],
          invoices: [],
          events: [],
          dimensions: dimensions.data || [],
          entitlementKeys: entitlementKeys.data || [],
          quotaOverrides: [],
          entitlementOverrides: [],
        };
      const [
        members,
        subscriptions,
        invoices,
        events,
        quotaOverrides,
        entitlementOverrides,
      ] = await Promise.all([
        client
          .from('owner_billing_group_members')
          .select('id,group_id,company_id,added_at')
          .in('group_id', ids),
        client
          .from('saas_owner_group_plan_subscriptions')
          .select(
            'id,group_id,plan_id,status,payment_state,next_renewal_at,grace_end_at,dunning_attempt_count',
          )
          .in('group_id', ids)
          .order('created_at', { ascending: false }),
        client
          .from('saas_owner_group_subscription_invoices')
          .select(
            'id,group_id,invoice_status,invoice_kind,amount_minor,currency_code,due_at,external_reference',
          )
          .in('group_id', ids)
          .order('created_at', { ascending: false })
          .limit(250),
        client
          .from('saas_owner_group_subscription_events')
          .select('id,group_id,event_type,actor_user_id,details,created_at')
          .in('group_id', ids)
          .order('created_at', { ascending: false })
          .limit(250),
        client
          .from('saas_owner_group_quota_overrides')
          .select(
            'id,group_id,quota_dimension_id,mode,increment_by,hard_limit_override,reason,expires_at',
          )
          .in('group_id', ids),
        client
          .from('saas_owner_group_entitlement_overrides')
          .select('id,group_id,entitlement_key_id,decision,reason,expires_at')
          .in('group_id', ids),
      ]);
      const secondError =
        members.error ||
        subscriptions.error ||
        invoices.error ||
        events.error ||
        quotaOverrides.error ||
        entitlementOverrides.error;
      if (secondError) throw secondError;
      return {
        groups: groups.data || [],
        members: members.data || [],
        companies: companies.data || [],
        plans: plans.data || [],
        subscriptions: subscriptions.data || [],
        invoices: invoices.data || [],
        events: events.data || [],
        dimensions: dimensions.data || [],
        entitlementKeys: entitlementKeys.data || [],
        quotaOverrides: quotaOverrides.data || [],
        entitlementOverrides: entitlementOverrides.data || [],
      };
    },
  });

  useEffect(() => {
    if (!groupId && query.data?.groups[0]) setGroupId(query.data.groups[0].id);
  }, [groupId, query.data?.groups]);

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
      const { error } = await (supabase as any).rpc(fn, args);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['control-plane-owner-billing-groups'],
      });
      toast.success('Group override updated.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = query.data;
  const companies = useMemo(
    () =>
      new Map((data?.companies || []).map((company) => [company.id, company])),
    [data?.companies],
  );
  const plans = useMemo(
    () => new Map((data?.plans || []).map((plan) => [plan.id, plan])),
    [data?.plans],
  );
  const dimensions = useMemo(
    () =>
      new Map(
        (data?.dimensions || []).map((dimension) => [dimension.id, dimension]),
      ),
    [data?.dimensions],
  );
  const keys = useMemo(
    () => new Map((data?.entitlementKeys || []).map((key) => [key.id, key])),
    [data?.entitlementKeys],
  );
  const filteredGroups = (data?.groups || []).filter(
    (group) =>
      (groupStatus === 'all' || group.status === groupStatus) &&
      (group.name.toLowerCase().includes(search.toLowerCase()) ||
        group.owner_id.toLowerCase().includes(search.toLowerCase())),
  );
  const pagedGroups = filteredGroups.slice(
    (groupPage - 1) * groupPageSize,
    groupPage * groupPageSize,
  );
  const group = data?.groups.find((item) => item.id === groupId);
  const members =
    data?.members.filter((item) => item.group_id === groupId) || [];
  const subscription = data?.subscriptions.find(
    (item) =>
      item.group_id === groupId &&
      ['active', 'grace_period'].includes(item.status),
  );
  const invoices =
    data?.invoices.filter((item) => item.group_id === groupId) || [];
  const events = data?.events.filter((item) => item.group_id === groupId) || [];
  const quotaOverrides =
    data?.quotaOverrides.filter((item) => item.group_id === groupId) || [];
  const entitlementOverrides =
    data?.entitlementOverrides.filter((item) => item.group_id === groupId) ||
    [];
  const filteredMembers = members.filter((member) => {
    const company = companies.get(member.company_id);
    const needle = memberSearch.toLowerCase();
    return (
      company?.name.toLowerCase().includes(needle) ||
      member.company_id.toLowerCase().includes(needle)
    );
  });
  const pagedMembers = filteredMembers.slice(
    (memberPage - 1) * memberPageSize,
    memberPage * memberPageSize,
  );
  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoiceStatus === 'all' || invoice.invoice_status === invoiceStatus,
  );
  const pagedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * invoicePageSize,
    invoicePage * invoicePageSize,
  );
  const filteredQuotaOverrides = quotaOverrides.filter((override) => {
    const needle = overrideSearch.toLowerCase();
    return (
      override.reason.toLowerCase().includes(needle) ||
      dimensions
        .get(override.quota_dimension_id)
        ?.name.toLowerCase()
        .includes(needle)
    );
  });
  const filteredEntitlementOverrides = entitlementOverrides.filter(
    (override) => {
      const needle = overrideSearch.toLowerCase();
      return (
        override.reason.toLowerCase().includes(needle) ||
        keys
          .get(override.entitlement_key_id)
          ?.key.toLowerCase()
          .includes(needle)
      );
    },
  );
  const pagedQuotaOverrides = filteredQuotaOverrides.slice(
    (quotaPage - 1) * quotaPageSize,
    quotaPage * quotaPageSize,
  );
  const pagedEntitlementOverrides = filteredEntitlementOverrides.slice(
    (entitlementPage - 1) * entitlementPageSize,
    entitlementPage * entitlementPageSize,
  );
  const eventTypes = [...new Set(events.map((event) => event.event_type))];
  const filteredEvents = events.filter(
    (event) => eventType === 'all' || event.event_type === eventType,
  );
  const pagedEvents = filteredEvents.slice(
    (eventPage - 1) * eventPageSize,
    eventPage * eventPageSize,
  );
  const outstanding = invoices
    .filter((invoice) =>
      ['open', 'uncollectible'].includes(invoice.invoice_status),
    )
    .reduce((sum, invoice) => sum + invoice.amount_minor, 0);

  const assertReason = () => {
    if (reason.trim()) return true;
    toast.error('A reason is required for super-admin overrides.');
    return false;
  };

  if (query.isLoading)
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (query.error)
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive">
          <AlertTitle>Billing groups unavailable</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
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
            {pagedGroups.map((item) => {
              const count =
                data?.members.filter((member) => member.group_id === item.id)
                  .length || 0;
              return (
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
                    {count} companies
                  </p>
                </button>
              );
            })}
          </div>
          <TablePagination
            page={groupPage}
            pageSize={groupPageSize}
            total={filteredGroups.length}
            onPageChange={setGroupPage}
            onPageSizeChange={(size) => {
              setGroupPageSize(size);
              setGroupPage(1);
            }}
          />
        </aside>
        {!group ? (
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
                  {members.length}
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
                  {formatMoney(outstanding)}
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
                      {pagedMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            <Link
                              className="text-primary hover:underline"
                              to={`/super-admin/control-plane?cp_tab=company360&cp_company=${member.company_id}`}
                            >
                              {companies.get(member.company_id)?.name ||
                                'Unknown company'}
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
                    total={filteredMembers.length}
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
                      {pagedInvoices.map((invoice) => (
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
                    total={filteredInvoices.length}
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
                          {data?.dimensions.map((dimension) => (
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
                      {pagedQuotaOverrides.map((override) => (
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
                      total={filteredQuotaOverrides.length}
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
                          {data?.entitlementKeys.map((key) => (
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
                      {pagedEntitlementOverrides.map((override) => (
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
                      total={filteredEntitlementOverrides.length}
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
                      <SelectItem key={type} value={type}>{type.replaceAll('.', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="divide-y rounded-md border">
                  {pagedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-4 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {event.event_type.replaceAll('.', ' ')}
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
                  total={filteredEvents.length}
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
