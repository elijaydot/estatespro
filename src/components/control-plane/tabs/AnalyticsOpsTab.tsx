import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/control-plane/EmptyState';
import type { CompanyRiskRow, ModuleAdoptionRow, OpsSignalRow } from '@/lib/controlPlaneAnalytics';
import type { PlatformAnalyticsSnapshot, PlatformDriftCheck } from '@/hooks/useControlPlane';

type AnalyticsOpsTabProps = {
  moduleRows: ModuleAdoptionRow[];
  opsSignals: OpsSignalRow[];
  companyRiskRows: CompanyRiskRow[];
  snapshots: PlatformAnalyticsSnapshot[];
  driftChecks: PlatformDriftCheck[];
  onRunPhase10: () => void;
  onRefreshPhase10: () => void;
  isRunPending: boolean;
  formatDate: (value: string) => string;
};

export function AnalyticsOpsTab({
  moduleRows,
  opsSignals,
  companyRiskRows,
  snapshots,
  driftChecks,
  onRunPhase10,
  onRefreshPhase10,
  isRunPending,
  formatDate,
}: AnalyticsOpsTabProps) {
  const warningCount = opsSignals.filter((row) => row.status === 'warning').length;

  return (
    <TabsContent value="analytics">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Signals in Warning</p>
            <p className="text-2xl font-bold mt-2">{warningCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Observed Modules</p>
            <p className="text-2xl font-bold mt-2">{moduleRows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">At-Risk Companies</p>
            <p className="text-2xl font-bold mt-2">{companyRiskRows.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backend Phase 10 Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Trigger persisted analytics snapshots and drift checks from the control plane backend.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onRunPhase10} disabled={isRunPending}>
                {isRunPending ? 'Running...' : 'Run Phase 10 Backend Check'}
              </Button>
              <Button variant="outline" onClick={onRefreshPhase10}>Refresh Backend Data</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ops Signal Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            {opsSignals.length === 0 ? (
              <EmptyState title="No ops signals" description="Signals appear when event and decision telemetry is available." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Signal</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opsSignals.map((row) => (
                    <TableRow key={row.signal}>
                      <TableCell>{row.signal}</TableCell>
                      <TableCell>{row.value}{row.unit === 'percent' ? '%' : ''}</TableCell>
                      <TableCell>{row.threshold}{row.unit === 'percent' ? '%' : ''}</TableCell>
                      <TableCell>
                        {row.status === 'warning' ? (
                          <Badge variant="destructive">warning</Badge>
                        ) : (
                          <Badge variant="outline">ok</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Module Adoption and Risk Mix</CardTitle>
          </CardHeader>
          <CardContent>
            {moduleRows.length === 0 ? (
              <EmptyState title="No module activity" description="Events will populate module adoption once activity is ingested." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Denied/Blocked</TableHead>
                    <TableHead>High Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleRows.map((row) => (
                    <TableRow key={row.module}>
                      <TableCell>{row.module}</TableCell>
                      <TableCell>{row.events}</TableCell>
                      <TableCell>{row.denied_or_blocked}</TableCell>
                      <TableCell>{row.high_risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-3">
        <CardHeader>
          <CardTitle className="text-base">Company Risk Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          {companyRiskRows.length === 0 ? (
            <EmptyState title="No elevated company risk" description="Watchlist appears when risk factors pass baseline thresholds." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Denials</TableHead>
                  <TableHead>High Risk</TableHead>
                  <TableHead>Open Alerts</TableHead>
                  <TableHead>Usage Pressure</TableHead>
                  <TableHead>Risk Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyRiskRows.map((row) => (
                  <TableRow key={row.company_id}>
                    <TableCell className="max-w-[240px] truncate" title={row.company_id}>{row.company_id}</TableCell>
                    <TableCell>{row.denial_events}</TableCell>
                    <TableCell>{row.high_risk_events}</TableCell>
                    <TableCell>{row.open_alerts}</TableCell>
                    <TableCell>{row.usage_pressure}</TableCell>
                    <TableCell>{row.risk_score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Persisted Analytics Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <EmptyState title="No snapshots yet" description="Run Phase 10 backend check to persist analytics snapshots." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Total Events</TableHead>
                    <TableHead>Denied</TableHead>
                    <TableHead>Critical Alerts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell>{row.snapshot_window}</TableCell>
                      <TableCell>{row.total_events}</TableCell>
                      <TableCell>{row.entitlement_denied}</TableCell>
                      <TableCell>{row.critical_open_alerts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Drift Checks</CardTitle>
          </CardHeader>
          <CardContent>
            {driftChecks.length === 0 ? (
              <EmptyState title="No drift checks yet" description="Drift checks appear after the backend Phase 10 run executes." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Check Key</TableHead>
                    <TableHead>Observed</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driftChecks.slice(0, 12).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell>{row.check_key}</TableCell>
                      <TableCell>{row.observed_value}</TableCell>
                      <TableCell>{row.threshold_value}</TableCell>
                      <TableCell>
                        {row.status === 'critical' ? (
                          <Badge variant="destructive">critical</Badge>
                        ) : row.status === 'warning' ? (
                          <Badge variant="secondary">warning</Badge>
                        ) : (
                          <Badge variant="outline">ok</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
