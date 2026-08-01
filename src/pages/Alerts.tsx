import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, BellRing, Check, ExternalLink, RefreshCw, Search, Settings2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useAcknowledgeOperationalAlert,
  useAcknowledgeOperationalAlerts,
  useDismissOperationalAlert,
  useEvaluateOperationalAlerts,
  useOperationalAlerts,
  type OperationalAlert,
  type OperationalAlertStatus,
} from '@/hooks/useOperationalAlerts';

const filters: Array<{ label: string; value: OperationalAlertStatus | 'active' | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'active' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
];

function alertLink(alert: OperationalAlert) {
  if (alert.reference_table === 'leases') return '/leases';
  if (alert.reference_table === 'units') return `/units/${alert.reference_id}`;
  if (alert.reference_table === 'invoices') return '/invoices';
  const vendorId = String(alert.metadata.vendor_id ?? '');
  return vendorId ? `/vendors/${vendorId}` : '/vendors';
}

const alertTypeLabels: Record<OperationalAlert['alert_type'], string> = {
  lease_expiry: 'Lease expiry',
  vacant_unit: 'Vacant unit',
  overdue_payment: 'Overdue payment',
  vendor_document_expiring: 'Vendor document',
};

export default function Alerts() {
  const [status, setStatus] = useState<OperationalAlertStatus | 'active' | undefined>('active');
  const [type, setType] = useState<OperationalAlert['alert_type'] | 'all'>('all');
  const [severity, setSeverity] = useState<OperationalAlert['severity'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const { data: alerts = [], isLoading, error, refetch } = useOperationalAlerts();
  const acknowledge = useAcknowledgeOperationalAlert();
  const acknowledgeMany = useAcknowledgeOperationalAlerts();
  const dismiss = useDismissOperationalAlert();
  const evaluate = useEvaluateOperationalAlerts();
  const filteredAlerts = alerts.filter((alert) => {
    if (status === 'active' && !['open', 'acknowledged'].includes(alert.status)) return false;
    if (status && status !== 'active' && alert.status !== status) return false;
    if (type !== 'all' && alert.alert_type !== type) return false;
    if (severity !== 'all' && alert.severity !== severity) return false;
    const query = search.trim().toLowerCase();
    return !query || [alert.title, alert.description, alertTypeLabels[alert.alert_type]]
      .some((value) => value?.toLowerCase().includes(query));
  });
  const openCount = alerts.filter((alert) => alert.status === 'open').length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === 'acknowledged').length;
  const criticalCount = alerts.filter((alert) => alert.severity === 'critical' && ['open', 'acknowledged'].includes(alert.status)).length;
  const visibleOpenAlerts = filteredAlerts.filter((alert) => alert.status === 'open');

  const acknowledgeVisible = async () => {
    await acknowledgeMany.mutateAsync(visibleOpenAlerts.map((alert) => alert.id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Operational Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lease, vacancy, payment, and vendor compliance exceptions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/settings?tab=alerts"><Settings2 className="mr-2 h-4 w-4" /> Thresholds</Link></Button>
          <Button onClick={() => evaluate.mutate()} disabled={evaluate.isPending}>
            <RefreshCw className={cn('mr-2 h-4 w-4', evaluate.isPending && 'animate-spin')} />
            Refresh alerts
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="mt-1 text-2xl font-bold">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Acknowledged</p><p className="mt-1 text-2xl font-bold text-info">{acknowledgedCount}</p></CardContent></Card>
        <Card className={cn(criticalCount > 0 && 'border-destructive/40')}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Critical active</p><p className="mt-1 text-2xl font-bold text-destructive">{criticalCount}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter alerts">
        {filters.map((filter) => (
          <Button
            key={filter.label}
            size="sm"
            variant={status === filter.value ? 'default' : 'outline'}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_190px_160px_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alerts..." className="pl-9" />
        </div>
        <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
          <SelectTrigger><SelectValue placeholder="Alert type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All alert types</SelectItem>{Object.entries(alertTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={severity} onValueChange={(value) => setSeverity(value as typeof severity)}>
          <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All severities</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" disabled={visibleOpenAlerts.length === 0 || acknowledgeMany.isPending} onClick={() => void acknowledgeVisible()}>
          <Check className="mr-2 h-4 w-4" /> Acknowledge visible ({visibleOpenAlerts.length})
        </Button>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground">Loading operational alerts...</CardContent></Card>}
      {error && <Card className="border-destructive/40"><CardContent className="space-y-3 py-10 text-center text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></CardContent></Card>}

      {!isLoading && !error && filteredAlerts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
              <Check className="h-5 w-5" />
            </div>
            <p className="font-medium">No matching alerts</p>
            <p className="mt-1 text-sm text-muted-foreground">The selected view has no operational exceptions.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <Card key={alert.id} className={cn(alert.severity === 'critical' && 'border-destructive/40')}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                alert.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
              )}>
                {alert.severity === 'critical' ? <AlertTriangle className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={alertLink(alert)} className="font-semibold hover:underline">{alert.title}</Link>
                  <Badge variant="outline">{alertTypeLabels[alert.alert_type]}</Badge>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>{alert.severity}</Badge>
                  <Badge variant="outline">{alert.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                </p>
                <Button asChild size="sm" variant="link" className="mt-1 h-auto p-0"><Link to={alertLink(alert)}>Open source <ExternalLink className="ml-1 h-3.5 w-3.5" /></Link></Button>
              </div>
              {(alert.status === 'open' || alert.status === 'acknowledged') && (
                <div className="flex shrink-0 gap-2">
                  {alert.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => acknowledge.mutate(alert.id)} disabled={acknowledge.isPending}>
                      <Check className="mr-2 h-4 w-4" /> Acknowledge
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Dismiss alert" onClick={() => dismiss.mutate(alert.id)} disabled={dismiss.isPending}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}