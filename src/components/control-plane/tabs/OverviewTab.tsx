import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import type { GovernanceAlert } from '@/hooks/useControlPlane';
import type { CorrelationSummaryRow } from '@/lib/controlPlaneViews';
import { EmptyState } from '@/components/control-plane/EmptyState';
import { shortReference } from '@/lib/controlPlanePresentation';

type OverviewTabProps = {
  eventsCount: number;
  alerts: GovernanceAlert[];
  correlations: CorrelationSummaryRow[];
  formatDate: (value: string) => string;
  renderSeverity: (severity: string) => ReactNode;
};

export function OverviewTab({
  eventsCount,
  alerts,
  correlations,
  formatDate,
  renderSeverity,
}: OverviewTabProps) {
  return (
    <TabsContent value="overview">
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
