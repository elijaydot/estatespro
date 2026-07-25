import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/control-plane/EmptyState';
import type { CompanyRiskRow, ModuleAdoptionRow, OpsSignalRow } from '@/lib/controlPlaneAnalytics';
import type {
  GovernanceAlert,
  PendingPaymentAttemptRow,
  PendingVerificationHealthRow,
  PlatformAnalyticsSnapshot,
  PlatformDriftCheck,
} from '@/hooks/useControlPlane';

type AnalyticsOpsTabProps = {
  moduleRows: ModuleAdoptionRow[];
  opsSignals: OpsSignalRow[];
  companyRiskRows: CompanyRiskRow[];
  snapshots: PlatformAnalyticsSnapshot[];
  driftChecks: PlatformDriftCheck[];
  pendingAttempts: PendingPaymentAttemptRow[];
  pendingHealth: PendingVerificationHealthRow[];
  pendingVerificationAlerts: GovernanceAlert[];
  onRunPhase10: () => void;
  onRefreshPhase10: () => void;
  onRefreshPendingVerification: () => void;
  onAcknowledgeAlert: (id: string) => void;
  onResolveAlert: (id: string) => void;
  isAlertActionPending: boolean;
  isRunPending: boolean;
  formatDate: (value: string) => string;
};

export function AnalyticsOpsTab({
  moduleRows,
  opsSignals,
  companyRiskRows,
  snapshots,
  driftChecks,
  pendingAttempts,
  pendingHealth,
  pendingVerificationAlerts,
  onRunPhase10,
  onRefreshPhase10,
  onRefreshPendingVerification,
  onAcknowledgeAlert,
  onResolveAlert,
  isAlertActionPending,
  isRunPending,
  formatDate,
}: AnalyticsOpsTabProps) {
  const getAlertMetadata = (row: GovernanceAlert) => {
    return row.metadata && typeof row.metadata === 'object'
      ? row.metadata as Record<string, unknown>
      : {};
  };

  const getMetaText = (row: GovernanceAlert, key: string) => {
    const value = getAlertMetadata(row)[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '-';
  };

  const getMetaNumber = (row: GovernanceAlert, key: string) => {
    const value = getAlertMetadata(row)[key];
    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? String(numberValue) : '-';
  };

  const hasPendingAttempt = (attemptId: string) => {
    if (!attemptId || attemptId === '-') return false;
    return pendingAttempts.some((row) => row.attempt_id === attemptId);
  };

  const warningCount = opsSignals.filter((row) => row.status === 'warning').length;
  const maxPendingRetries = pendingHealth.length > 0
    ? Math.max(...pendingHealth.map((row) => row.max_pending_verification_count))
    : 0;

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

        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Pending Payment Verifications</p>
            <p className="text-2xl font-bold mt-2">{pendingAttempts.length}</p>
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
            <CardTitle className="text-base">Pending Verification Health by Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={onRefreshPendingVerification}>Refresh Pending Verification Data</Button>
            </div>
            {pendingHealth.length === 0 ? (
              <EmptyState title="No pending verification pressure" description="No companies currently have delayed payment verification retries." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Pending Attempts</TableHead>
                    <TableHead>Max Retries</TableHead>
                    <TableHead>Oldest Pending</TableHead>
                    <TableHead>Latest Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingHealth.slice(0, 20).map((row) => (
                    <TableRow key={row.company_id}>
                      <TableCell className="max-w-[220px] truncate" title={row.company_id}>{row.company_id}</TableCell>
                      <TableCell>{row.pending_attempt_count}</TableCell>
                      <TableCell>
                        {row.max_pending_verification_count}
                        {row.max_pending_verification_count >= 4 ? (
                          <Badge variant="destructive" className="ml-2">high</Badge>
                        ) : (
                          <Badge variant="outline" className="ml-2">normal</Badge>
                        )}
                      </TableCell>
                      <TableCell>{row.oldest_pending_verification_at ? formatDate(row.oldest_pending_verification_at) : '-'}</TableCell>
                      <TableCell>{row.latest_pending_verification_at ? formatDate(row.latest_pending_verification_at) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Payment Attempt Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingAttempts.length === 0 ? (
              <EmptyState title="No pending attempts" description="All recent subscription payments are either settled or not awaiting retries." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Updated</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Provider Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAttempts.slice(0, 25).map((row) => (
                    <TableRow key={row.attempt_id} id={`pending-attempt-${row.attempt_id}`}>
                      <TableCell>{formatDate(row.updated_at)}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={row.company_id}>{row.company_id}</TableCell>
                      <TableCell>{row.gateway}</TableCell>
                      <TableCell>{row.pending_verification_count}</TableCell>
                      <TableCell>{row.last_pending_provider_status || '-'}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={row.last_pending_reference || ''}>{row.last_pending_reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Verification Governance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingVerificationAlerts.length === 0 ? (
              <EmptyState title="No pending verification alerts" description="Threshold alerts appear here when retry depth escalation is triggered." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retry Count</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Triage</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingVerificationAlerts.slice(0, 20).map((row) => (
                    <TableRow key={row.id} id={`pending-alert-${row.id}`}>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell>
                        {row.severity === 'critical' ? (
                          <Badge variant="destructive">critical</Badge>
                        ) : row.severity === 'warning' ? (
                          <Badge variant="secondary">warning</Badge>
                        ) : (
                          <Badge variant="outline">info</Badge>
                        )}
                      </TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{getMetaNumber(row, 'pending_verification_count')}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={getMetaText(row, 'reference')}>{getMetaText(row, 'reference')}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={getMetaText(row, 'attempt_id')}>{getMetaText(row, 'attempt_id')}</TableCell>
                      <TableCell>
                        {(() => {
                          const attemptId = getMetaText(row, 'attempt_id');
                          const canJump = hasPendingAttempt(attemptId);
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canJump}
                              onClick={() => {
                                const element = document.getElementById(`pending-attempt-${attemptId}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }}
                            >
                              Open Attempt
                            </Button>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={row.title}>{row.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={row.status !== 'open' || isAlertActionPending}
                            onClick={() => onAcknowledgeAlert(row.id)}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            disabled={row.status === 'resolved' || isAlertActionPending}
                            onClick={() => onResolveAlert(row.id)}
                          >
                            Resolve
                          </Button>
                        </div>
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
            <div className="mb-3 text-xs text-muted-foreground">
              Highest pending verification retry depth in scope: <span className="font-medium text-foreground">{maxPendingRetries}</span>
            </div>
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
