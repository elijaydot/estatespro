import type { ReactNode } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Building2, Users, CreditCard, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GovernanceAlert, AdministrationSnapshot } from '@/hooks/useControlPlane';
import type { CorrelationSummaryRow } from '@/lib/controlPlaneViews';
import { EmptyState } from '@/components/control-plane/EmptyState';
import { shortReference } from '@/lib/controlPlanePresentation';

type OverviewTabProps = {
  eventsCount: number;
  alerts: GovernanceAlert[];
  correlations: CorrelationSummaryRow[];
  formatDate: (value: string) => string;
  renderSeverity: (severity: string) => ReactNode;
  administrationSnapshot?: AdministrationSnapshot | null;
  onRefreshSnapshot?: () => void;
  isRefreshPending?: boolean;
};

export function OverviewTab({
  eventsCount,
  alerts,
  correlations,
  formatDate,
  renderSeverity,
  administrationSnapshot,
  onRefreshSnapshot,
  isRefreshPending = false,
}: OverviewTabProps) {
  const generatedAtDate = administrationSnapshot?.generated_at
    ? new Date(administrationSnapshot.generated_at)
    : null;

  const isStale = generatedAtDate
    ? Date.now() - generatedAtDate.getTime() > 90 * 60 * 1000 // > 90 min
    : false;

  const relativeFreshness = generatedAtDate
    ? `${formatDistanceToNow(generatedAtDate, { addSuffix: true })}`
    : 'No snapshot recorded';

  const exactFreshness = generatedAtDate
    ? format(generatedAtDate, 'PPpp')
    : 'Pending initial execution';

  return (
    <TabsContent value="overview" className="space-y-3">
      {/* Data Freshness Disclosure & Fleet Headline */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Data Freshness Disclosure:</span>
              <span className="text-sm text-foreground">
                Data as of <span className="font-medium">{relativeFreshness}</span> ({exactFreshness})
              </span>
              {isStale ? (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" /> Snapshot Stale — Last refresh missed
                </Badge>
              ) : generatedAtDate ? (
                <Badge variant="outline" className="flex items-center gap-1 text-xs border-success/40 text-success">
                  <CheckCircle2 className="h-3 w-3" /> Live & Healthy
                </Badge>
              ) : null}
            </div>
            {onRefreshSnapshot && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefreshSnapshot}
                disabled={isRefreshPending}
                className="h-8 gap-1 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshPending ? 'animate-spin' : ''}`} />
                {isRefreshPending ? 'Refreshing...' : 'Refresh Snapshot'}
              </Button>
            )}
          </div>

          {/* Quick Snapshot Metrics Strip */}
          {administrationSnapshot && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
              <div className="rounded-md border border-border/50 p-2.5 bg-background/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> Total Companies
                </div>
                <p className="text-base font-bold mt-1">
                  {administrationSnapshot.total_companies.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">
                    ({administrationSnapshot.verified_companies} verified)
                  </span>
                </p>
              </div>

              <div className="rounded-md border border-border/50 p-2.5 bg-background/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Total Users
                </div>
                <p className="text-base font-bold mt-1">
                  {administrationSnapshot.total_users.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">
                    ({administrationSnapshot.total_landlords} landlords, {administrationSnapshot.total_property_managers} PMs)
                  </span>
                </p>
              </div>

              <div className="rounded-md border border-border/50 p-2.5 bg-background/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" /> Plan Subscriptions
                </div>
                <p className="text-base font-bold mt-1">
                  {(administrationSnapshot.company_subscriptions + administrationSnapshot.group_subscriptions).toLocaleString()}
                </p>
              </div>

              <div className="rounded-md border border-border/50 p-2.5 bg-background/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Billing Groups
                </div>
                <p className="text-base font-bold mt-1">
                  {administrationSnapshot.active_billing_groups.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1.5">
                    / {administrationSnapshot.total_billing_groups}
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Risk Correlations</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsCount === 0 ? (
              <EmptyState title="No events found" description="Adjust the filters or create a test event." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Correlation</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>High Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correlations.map((row) => (
                    <TableRow key={row.correlation_id}>
                      <TableCell className="font-mono" title={row.correlation_id}>{shortReference(row.correlation_id)}</TableCell>
                      <TableCell>{row.events}</TableCell>
                      <TableCell>{row.high_risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Governance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyState title="No alerts" description="No alerts are currently visible with your filters." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Title</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.slice(0, 10).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell>{renderSeverity(item.severity)}</TableCell>
                      <TableCell>{item.title}</TableCell>
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

