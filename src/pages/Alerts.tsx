import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, BellRing, Check, CheckCircle2, ExternalLink, RefreshCw, Search, Settings2, X, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useAcknowledgeOperationalAlert,
  useAcknowledgeOperationalAlerts,
  useDismissOperationalAlert,
  useEvaluateOperationalAlerts,
  useOperationalAlerts,
  useResolveOperationalAlert,
  type OperationalAlert,
  type OperationalAlertStatus,
} from '@/hooks/useOperationalAlerts';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';

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
  const vendorId = String(alert.metadata?.vendor_id ?? '');
  return vendorId ? `/vendors/${vendorId}` : '/vendors';
}

const alertTypeLabels: Record<OperationalAlert['alert_type'], string> = {
  lease_expiry: 'Lease expiry',
  vacant_unit: 'Vacant unit',
  overdue_payment: 'Overdue payment',
  vendor_document_expiring: 'Vendor document',
  listing_deal_closed: 'Listing deal closed',
};

const formatDateSafe = (dateString?: string | null) => {
  if (!dateString) return 'recently';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'recently';
  }
};

export default function Alerts() {
  const { isSuperAdmin } = useUserRole();
  const { data: companiesList = [] } = useMyCompanies();
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-alerts') as ViewMode) || 'cards');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<OperationalAlertStatus | 'active' | undefined>('active');
  const [type, setType] = useState<OperationalAlert['alert_type'] | 'all'>('all');
  const [severity, setSeverity] = useState<OperationalAlert['severity'] | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data: alerts = [], isLoading, error, refetch } = useOperationalAlerts();
  const acknowledge = useAcknowledgeOperationalAlert();
  const acknowledgeMany = useAcknowledgeOperationalAlerts();
  const dismiss = useDismissOperationalAlert();
  const resolve = useResolveOperationalAlert();
  const evaluate = useEvaluateOperationalAlerts();

  useEffect(() => {
    localStorage.setItem('estatepro-view-alerts', view);
  }, [view]);

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedOrgFilter !== 'all' && alert.company_id && alert.company_id !== selectedOrgFilter) {
      return false;
    }
    if (status === 'active' && !['open', 'acknowledged'].includes(alert.status)) return false;
    if (status && status !== 'active' && alert.status !== status) return false;
    if (type !== 'all' && alert.alert_type !== type) return false;
    if (severity !== 'all' && alert.severity !== severity) return false;
    const query = search.trim().toLowerCase();
    return !query || [alert.title, alert.description, alertTypeLabels[alert.alert_type]]
      .some((value) => value?.toLowerCase().includes(query));
  });

  useEffect(() => {
    setPage(1);
  }, [search, status, type, severity, selectedOrgFilter, pageSize]);

  const paginatedAlerts = filteredAlerts.slice((page - 1) * pageSize, page * pageSize);

  const openCount = alerts.filter((alert) => alert.status === 'open').length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === 'acknowledged').length;
  const criticalCount = alerts.filter((alert) => alert.severity === 'critical' && ['open', 'acknowledged'].includes(alert.status)).length;
  const visibleOpenAlerts = paginatedAlerts.filter((alert) => alert.status === 'open');

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

      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alerts..." className="pl-9" />
          </div>
          <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
            <SelectTrigger className="w-full sm:w-[170px]"><SelectValue placeholder="Alert type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All alert types</SelectItem>{Object.entries(alertTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={severity} onValueChange={(value) => setSeverity(value as typeof severity)}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All severities</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent>
          </Select>

          {isSuperAdmin && companiesList.length > 0 && (
            <div className="w-full sm:w-[200px]">
              <Select value={selectedOrgFilter} onValueChange={setSelectedOrgFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Organizations (Global)</SelectItem>
                  {companiesList.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" disabled={visibleOpenAlerts.length === 0 || acknowledgeMany.isPending} onClick={() => void acknowledgeVisible()}>
            <Check className="mr-2 h-4 w-4" /> Acknowledge visible ({visibleOpenAlerts.length})
          </Button>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {isLoading && <Card><CardContent className="py-12 text-center text-muted-foreground">Loading operational alerts...</CardContent></Card>}
      {error && <Card className="border-destructive/40"><CardContent className="space-y-3 py-10 text-center text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></CardContent></Card>}

      {!isLoading && !error && filteredAlerts.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No matching alerts"
          description="The selected view has no operational exceptions or warnings."
        />
      )}

      {/* Cards View */}
      {!isLoading && !error && view === 'cards' && paginatedAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedAlerts.map((alert) => (
              <Card key={alert.id} className={cn("p-5 card-shadow-md hover:card-shadow-lg transition-all", alert.severity === 'critical' && 'border-destructive/40')}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    alert.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
                  )}>
                    {alert.severity === 'critical' ? <AlertTriangle className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={alertLink(alert)} className="font-semibold text-foreground hover:underline truncate">{alert.title}</Link>
                      <Badge variant="outline" className="text-[10px]">{alertTypeLabels[alert.alert_type]}</Badge>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">{alert.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/60">
                      <span className="text-[11px] text-muted-foreground">{formatDateSafe(alert.created_at)}</span>
                      <div className="flex items-center gap-1.5">
                        <Button asChild size="sm" variant="link" className="h-auto p-0 text-xs">
                          <Link to={alertLink(alert)}>Open source <ExternalLink className="ml-1 h-3 w-3" /></Link>
                        </Button>
                        {alert.status === 'open' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acknowledge.mutate(alert.id)} disabled={acknowledge.isPending}>
                            <Check className="mr-1 h-3 w-3" /> Ack
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolve.mutate(alert.id)} disabled={resolve.isPending}>
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Resolve
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Dismiss" onClick={() => dismiss.mutate(alert.id)} disabled={dismiss.isPending}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredAlerts.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Compact View */}
      {!isLoading && !error && view === 'compact' && paginatedAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {paginatedAlerts.map((alert) => (
              <div key={alert.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    alert.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
                  )}>
                    {alert.severity === 'critical' ? <AlertTriangle className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={alertLink(alert)} className="font-medium text-xs sm:text-sm text-foreground hover:underline truncate">
                        {alert.title}
                      </Link>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[9px] py-0">{alert.severity}</Badge>
                      <Badge variant="outline" className="text-[9px] py-0">{alert.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <span className="text-xs text-muted-foreground">{formatDateSafe(alert.created_at)}</span>
                  <div className="flex items-center gap-1.5">
                    {alert.status === 'open' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acknowledge.mutate(alert.id)} disabled={acknowledge.isPending}>
                        <Check className="mr-1 h-3 w-3" /> Ack
                      </Button>
                    )}
                    {alert.status === 'acknowledged' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolve.mutate(alert.id)} disabled={resolve.isPending}>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Resolve
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Dismiss alert" onClick={() => dismiss.mutate(alert.id)} disabled={dismiss.isPending}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredAlerts.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Table View */}
      {!isLoading && !error && view === 'table' && paginatedAlerts.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Alert</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAlerts.map((alert) => (
                  <TableRow key={alert.id} className="hover:bg-muted/30">
                    <TableCell className="max-w-xs">
                      <div>
                        <Link to={alertLink(alert)} className="font-medium hover:underline text-foreground block truncate">
                          {alert.title}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{alertTypeLabels[alert.alert_type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={alert.status === 'resolved' ? 'success' : alert.status === 'open' ? 'destructive' : 'warning'} className="capitalize text-xs">
                        {alert.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateSafe(alert.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                          <Link to={alertLink(alert)}>Open</Link>
                        </Button>
                        {alert.status === 'open' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acknowledge.mutate(alert.id)} disabled={acknowledge.isPending}>
                            Ack
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolve.mutate(alert.id)} disabled={resolve.isPending}>
                            Resolve
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Dismiss" onClick={() => dismiss.mutate(alert.id)} disabled={dismiss.isPending}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredAlerts.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}