import { Shield, Siren, Activity, Fingerprint, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useControlPlaneAlerts, useControlPlaneEvents, useEntitlementDecisions, useUsageSnapshots } from '@/hooks/useControlPlane';

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') return <Badge variant="destructive">critical</Badge>;
  if (severity === 'warning') return <Badge variant="secondary">warning</Badge>;
  return <Badge variant="outline">{severity}</Badge>;
}

export default function SuperAdminControlPlane() {
  const events = useControlPlaneEvents(100);
  const alerts = useControlPlaneAlerts(100);
  const decisions = useEntitlementDecisions(100);
  const usage = useUsageSnapshots(100);

  const isLoading = events.isLoading || alerts.isLoading || decisions.isLoading || usage.isLoading;
  const hasError = events.error || alerts.error || decisions.error || usage.error;

  const refreshAll = () => {
    void events.refetch();
    void alerts.refetch();
    void decisions.refetch();
    void usage.refetch();
  };

  const openAlerts = (alerts.data || []).filter((item) => item.status === 'open').length;
  const blockedEvents = (events.data || []).filter((item) => item.result_status === 'blocked' || item.result_status === 'denied').length;
  const highRiskEvents = (events.data || []).filter((item) => item.risk_score >= 80).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Super Admin Domain</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">Control Plane</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-tenant governance, risk visibility, and entitlement decision telemetry.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

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
          </TabsList>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Governance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
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
                    {(alerts.data || []).slice(0, 20).map((item) => (
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Audit Events</CardTitle>
              </CardHeader>
              <CardContent>
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
                    {(events.data || []).slice(0, 25).map((item) => (
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="decisions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entitlement Decisions</CardTitle>
              </CardHeader>
              <CardContent>
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
                    {(decisions.data || []).slice(0, 25).map((item) => (
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage Snapshots</CardTitle>
              </CardHeader>
              <CardContent>
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
                    {(usage.data || []).slice(0, 25).map((item) => (
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
