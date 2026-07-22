import { useMemo, useState } from 'react';
import { Shield, Siren, Activity, Fingerprint, RefreshCw, Plus, Trash2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useAssignPlatformOperatorRole,
  useControlPlaneAlerts,
  useControlPlaneEvents,
  useEntitlementDecisions,
  usePlatformOperatorRoles,
  useRemovePlatformOperatorRole,
  useUsageSnapshots,
} from '@/hooks/useControlPlane';
import { useSuperAdminOverride } from '@/hooks/useSuperAdminOverride';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') return <Badge variant="destructive">critical</Badge>;
  if (severity === 'warning') return <Badge variant="secondary">warning</Badge>;
  return <Badge variant="outline">{severity}</Badge>;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';

type OperatorRole = 'security_auditor' | 'support_operator' | 'billing_operator';

function isInTimeRange(value: string, timeRange: TimeRange) {
  if (timeRange === 'all') return true;

  const now = Date.now();
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return false;

  const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 24 * 7 : 24 * 30;
  return now - createdAt <= hours * 60 * 60 * 1000;
}

function matchesSearch(haystack: Array<string | null | undefined>, needle: string) {
  const search = needle.trim().toLowerCase();
  if (!search) return true;
  return haystack.some((value) => String(value || '').toLowerCase().includes(search));
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 p-6 text-center space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {action ? <div className="pt-1 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default function SuperAdminControlPlane() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canOverride, overrideEnabled, setOverrideEnabled } = useSuperAdminOverride();

  const events = useControlPlaneEvents(100);
  const alerts = useControlPlaneAlerts(100);
  const decisions = useEntitlementDecisions(100);
  const usage = useUsageSnapshots(100);
  const operatorRoles = usePlatformOperatorRoles(200);
  const assignOperatorRole = useAssignPlatformOperatorRole();
  const removeOperatorRole = useRemovePlatformOperatorRole();

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'critical'>('all');
  const [eventResultFilter, setEventResultFilter] = useState<'all' | 'success' | 'warning' | 'blocked' | 'denied' | 'error'>('all');
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'allowed' | 'denied'>('all');
  const [operatorUserId, setOperatorUserId] = useState('');
  const [operatorRole, setOperatorRole] = useState<OperatorRole>('security_auditor');

  const isLoading = events.isLoading || alerts.isLoading || decisions.isLoading || usage.isLoading || operatorRoles.isLoading;
  const hasError = events.error || alerts.error || decisions.error || usage.error || operatorRoles.error;

  const refreshAll = () => {
    void events.refetch();
    void alerts.refetch();
    void decisions.refetch();
    void usage.refetch();
    void operatorRoles.refetch();
  };

  const filteredAlerts = useMemo(() => {
    return (alerts.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (alertStatusFilter !== 'all' && item.status !== alertStatusFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter && !(severityFilter === 'error' && item.severity === 'critical')) {
        return false;
      }
      return matchesSearch([item.title, item.description, item.alert_type, item.correlation_id, item.company_id, item.status], search);
    });
  }, [alerts.data, alertStatusFilter, search, severityFilter, timeRange]);

  const filteredEvents = useMemo(() => {
    return (events.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (eventResultFilter !== 'all' && item.result_status !== eventResultFilter) return false;
      return matchesSearch([
        item.source,
        item.event_type,
        item.module,
        item.action,
        item.correlation_id,
        item.company_id,
      ], search);
    });
  }, [eventResultFilter, events.data, search, severityFilter, timeRange]);

  const filteredDecisions = useMemo(() => {
    return (decisions.data || []).filter((item) => {
      if (!isInTimeRange(item.created_at, timeRange)) return false;
      if (decisionFilter === 'allowed' && !item.allowed) return false;
      if (decisionFilter === 'denied' && item.allowed) return false;
      return matchesSearch([
        item.module,
        item.action,
        item.entitlement_key,
        item.decision_reason,
        item.company_id,
      ], search);
    });
  }, [decisionFilter, decisions.data, search, timeRange]);

  const filteredUsage = useMemo(() => {
    return (usage.data || []).filter((item) => {
      if (!isInTimeRange(item.snapshot_at, timeRange)) return false;
      return matchesSearch([item.company_id, item.product_code, item.quota_code, item.limit_state], search);
    });
  }, [search, timeRange, usage.data]);

  const openAlerts = filteredAlerts.filter((item) => item.status === 'open').length;
  const blockedEvents = filteredEvents.filter((item) => item.result_status === 'blocked' || item.result_status === 'denied').length;
  const highRiskEvents = filteredEvents.filter((item) => item.risk_score >= 80).length;

  const handleSeedEvent = async () => {
    const { error } = await supabase.rpc('platform_ingest_audit_event' as never, {
      p_source: 'control_plane_ui',
      p_event_type: 'admin.seed_event',
      p_module: 'admin',
      p_action: 'seed_event',
      p_result_status: 'blocked',
      p_severity: 'warning',
      p_actor_user_id: user?.id ?? null,
      p_company_id: null,
      p_target_entity_type: 'system',
      p_target_entity_id: 'control-plane',
      p_correlation_id: `control-plane-seed-${Date.now()}`,
      p_risk_score: 85,
      p_ip_address: null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      p_device_info: { source: 'super-admin-control-plane' },
      p_metadata: { note: 'seeded from super admin ui' },
    } as never);

    if (error) {
      toast({ title: 'Seed event failed', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Seed event created', description: 'A synthetic governance event was added.' });
    refreshAll();
  };

  const handleAssignRole = async () => {
    const trimmed = operatorUserId.trim();
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidLike.test(trimmed)) {
      toast({ title: 'Invalid user ID', description: 'Enter a valid user UUID.', variant: 'destructive' });
      return;
    }

    try {
      await assignOperatorRole.mutateAsync({ userId: trimmed, role: operatorRole });
      setOperatorUserId('');
      toast({ title: 'Operator role assigned', description: `${operatorRole} granted.` });
    } catch (error) {
      toast({
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Could not assign role.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Super Admin Domain</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Control Plane</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-tenant governance, risk visibility, and entitlement decision telemetry.</p>
        </div>
        <div className="flex items-center gap-2">
          {canOverride && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Platform Override</span>
              <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
            </div>
          )}
          <Button variant="outline" className="gap-2" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search module, action, company, correlation..." />
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger>
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as 'all' | 'info' | 'warning' | 'error' | 'critical')}>
            <SelectTrigger>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventResultFilter} onValueChange={(value) => setEventResultFilter(value as 'all' | 'success' | 'warning' | 'blocked' | 'denied' | 'error')}>
            <SelectTrigger>
              <SelectValue placeholder="Event result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event outcomes</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={alertStatusFilter} onValueChange={(value) => setAlertStatusFilter(value as 'all' | 'open' | 'acknowledged' | 'resolved')}>
            <SelectTrigger>
              <SelectValue placeholder="Alert status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All alert status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Open Alerts</p>
              <Siren className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{openAlerts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Blocked Events</p>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{blockedEvents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">High Risk Events</p>
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{highRiskEvents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Usage Snapshots</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{(usage.data || []).length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading control plane data...</CardContent>
        </Card>
      )}

      {hasError && (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            One or more control plane datasets failed to load. Check permissions and Phase 7 migration status.
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="decisions">Entitlements</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="operators">Operators</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Governance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAlerts.length === 0 ? (
                  <EmptyState
                    title="No alerts matched your current filters"
                    description="Adjust filters or generate a synthetic governance event to validate alerting."
                    action={<Button size="sm" onClick={() => void handleSeedEvent()}>Generate Test Event</Button>}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.slice(0, 20).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                          <TableCell>{item.alert_type}</TableCell>
                          <TableCell>{item.title}</TableCell>
                          <TableCell>{item.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Audit Events</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEvents.length === 0 ? (
                  <EmptyState
                    title="No events matched your current filters"
                    description="Try broadening your filters or generate a synthetic event."
                    action={<Button size="sm" onClick={() => void handleSeedEvent()}>Generate Test Event</Button>}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Correlation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.slice(0, 25).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell>{item.module}</TableCell>
                          <TableCell>{item.action}</TableCell>
                          <TableCell>{item.result_status}</TableCell>
                          <TableCell>{item.risk_score}</TableCell>
                          <TableCell className="max-w-[220px] truncate" title={item.correlation_id}>{item.correlation_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="decisions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entitlement Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 max-w-xs">
                  <Select value={decisionFilter} onValueChange={(value) => setDecisionFilter(value as 'all' | 'allowed' | 'denied')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Decision filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All decisions</SelectItem>
                      <SelectItem value="allowed">Allowed only</SelectItem>
                      <SelectItem value="denied">Denied only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {filteredDecisions.length === 0 ? (
                  <EmptyState
                    title="No entitlement decisions matched"
                    description="This table populates when entitlement checks are recorded by app flows."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entitlement</TableHead>
                        <TableHead>Allowed</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDecisions.slice(0, 25).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell>{item.module}</TableCell>
                          <TableCell>{item.action}</TableCell>
                          <TableCell>{item.entitlement_key}</TableCell>
                          <TableCell>{item.allowed ? 'yes' : 'no'}</TableCell>
                          <TableCell>{item.risk_score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage Snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredUsage.length === 0 ? (
                  <EmptyState
                    title="No usage snapshots matched"
                    description="Usage snapshots are created when platform_refresh_usage_snapshot is called."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Snapshot</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quota</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Hard Limit</TableHead>
                        <TableHead>Usage %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsage.slice(0, 25).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.snapshot_at)}</TableCell>
                          <TableCell>{item.product_code}</TableCell>
                          <TableCell>{item.quota_code}</TableCell>
                          <TableCell>{item.used_value}</TableCell>
                          <TableCell>{item.hard_limit}</TableCell>
                          <TableCell>{item.usage_percent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operators">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Operator Roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2">
                  <Input
                    placeholder="User UUID"
                    value={operatorUserId}
                    onChange={(e) => setOperatorUserId(e.target.value)}
                  />
                  <Select value={operatorRole} onValueChange={(value) => setOperatorRole(value as OperatorRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security_auditor">security_auditor</SelectItem>
                      <SelectItem value="support_operator">support_operator</SelectItem>
                      <SelectItem value="billing_operator">billing_operator</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => void handleAssignRole()} disabled={assignOperatorRole.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Assign
                  </Button>
                </div>

                {(operatorRoles.data || []).length === 0 ? (
                  <EmptyState
                    title="No operator roles assigned"
                    description="Assign security, support, and billing operator users here."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Created</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(operatorRoles.data || []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell className="max-w-[320px] truncate" title={item.user_id}>{item.user_id}</TableCell>
                          <TableCell>{item.role}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={removeOperatorRole.isPending}
                              onClick={() => void removeOperatorRole.mutateAsync(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
