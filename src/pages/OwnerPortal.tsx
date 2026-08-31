import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CreditCard, FileText, Gauge, Receipt, Search, Wrench, ArrowRight, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanyExecutiveReport } from '@/hooks/useCompanyExecutiveReport';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSettings } from '@/contexts/useSettings';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';

export default function OwnerPortal() {
  const report = useCompanyExecutiveReport();
  const { setActiveCompanyId } = useActiveCompany();
  const { formatCurrency } = useSettings();
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('estatepro-view-owner-portal') as ViewMode) || 'table');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    localStorage.setItem('estatepro-view-owner-portal', view);
  }, [view]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (report.data || []).filter((row) => !query || [row.company_name, row.company_email, row.company_address]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [report.data, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totals = useMemo(() => rows.reduce((summary, row) => ({
    properties: summary.properties + Number(row.property_count || 0),
    units: summary.units + Number(row.unit_count || 0),
    occupied: summary.occupied + Number(row.occupied_unit_count || 0),
    collected: summary.collected + Number(row.total_collected || 0),
    outstanding: summary.outstanding + Number(row.outstanding_balance || 0),
    maintenance: summary.maintenance + Number(row.open_maintenance_count || 0),
  }), { properties: 0, units: 0, occupied: 0, collected: 0, outstanding: 0, maintenance: 0 }), [rows]);
  
  const occupancy = totals.units > 0 ? Math.round((totals.occupied / totals.units) * 1000) / 10 : 0;
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);

  if (report.isLoading) {
    return <div className="space-y-5"><Skeleton className="h-28" /><div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div></div>;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-8 animate-fade-in">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Owner / Investor Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Portfolio Command View</h1>
          <p className="mt-1 text-sm text-muted-foreground">Financial performance, occupancy, and operating metrics across portfolio companies.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/reports"><FileText className="mr-2 h-4 w-4" />Reports</Link></Button>
          <Button asChild variant="outline"><Link to="/account/billing"><CreditCard className="mr-2 h-4 w-4" />Account billing</Link></Button>
        </div>
      </header>

      {report.isError ? (
        <Card className="border-destructive/40"><CardContent className="py-8"><p className="font-medium">Portfolio data could not be loaded.</p><p className="mt-1 text-sm text-muted-foreground">Refresh the page or contact support if the problem persists.</p></CardContent></Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Portfolio totals">
        <Metric label="Properties" value={totals.properties.toLocaleString()} icon={Building2} />
        <Metric label="Units" value={totals.units.toLocaleString()} icon={Building2} />
        <Metric label="Occupancy" value={`${occupancy}%`} icon={Gauge} />
        <Metric label="Collected" value={formatCurrency(totals.collected)} icon={Receipt} />
        <Metric label="Outstanding" value={formatCurrency(totals.outstanding)} icon={CreditCard} attention={totals.outstanding > 0} />
        <Metric label="Open maintenance" value={totals.maintenance.toLocaleString()} icon={Wrench} attention={totals.maintenance > 0} />
      </section>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter portfolio companies..." />
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {rows.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No companies found"
          description="No accessible companies match this filter."
        />
      )}

      {/* Cards View */}
      {view === 'cards' && rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleRows.map((row) => (
              <Card key={row.company_id} className="p-5 card-shadow-md hover:card-shadow-lg transition-all space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-base text-foreground truncate">{row.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{row.company_email || row.company_address || 'No contact details'}</p>
                  </div>
                  <Badge variant={row.open_maintenance_count > 0 ? 'destructive' : 'secondary'} className="shrink-0">
                    {row.open_maintenance_count > 0 ? `${row.open_maintenance_count} issues` : 'Clear'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Portfolio Scale</span>
                    <span className="font-semibold text-foreground">{row.property_count} properties • {row.unit_count} units</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Occupancy Rate</span>
                    <span className="font-semibold text-foreground">{Number(row.occupancy_rate || 0).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Collected</span>
                    <span className="font-semibold text-success">{formatCurrency(Number(row.total_collected || 0))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Outstanding</span>
                    <span className={Number(row.outstanding_balance || 0) > 0 ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
                      {formatCurrency(Number(row.outstanding_balance || 0))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link to="/properties" onClick={() => setActiveCompanyId(row.company_id)}>
                      Properties <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link to="/maintenance" onClick={() => setActiveCompanyId(row.company_id)}>
                      Maintenance
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Compact View */}
      {view === 'compact' && rows.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y rounded-lg border border-border bg-card shadow-xs">
            {visibleRows.map((row) => (
              <div key={row.company_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{row.company_name}</span>
                    <Badge variant={row.open_maintenance_count > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                      {row.open_maintenance_count > 0 ? `${row.open_maintenance_count} open maintenance` : 'Clear'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {row.property_count} properties • {row.unit_count} units ({Number(row.occupancy_rate || 0).toFixed(1)}% occupied)
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right text-xs">
                    <p className="font-semibold text-success">{formatCurrency(Number(row.total_collected || 0))}</p>
                    <p className={Number(row.outstanding_balance || 0) > 0 ? "text-destructive" : "text-muted-foreground"}>
                      Due: {formatCurrency(Number(row.outstanding_balance || 0))}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm" variant="outline" className="text-xs">
                      <Link to="/properties" onClick={() => setActiveCompanyId(row.company_id)}>
                        Properties
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="text-xs">
                      <Link to="/maintenance" onClick={() => setActiveCompanyId(row.company_id)}>
                        Maintenance
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Table View */}
      {view === 'table' && rows.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Company</TableHead>
                  <TableHead>Portfolio</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Maintenance</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.company_id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="font-medium">{row.company_name}</p>
                      <p className="text-xs text-muted-foreground">{row.company_email || row.company_address || 'No company contact details'}</p>
                    </TableCell>
                    <TableCell>{row.property_count} properties / {row.unit_count} units</TableCell>
                    <TableCell>{Number(row.occupancy_rate || 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-success font-medium">{formatCurrency(Number(row.total_collected || 0))}</TableCell>
                    <TableCell className={Number(row.outstanding_balance || 0) > 0 ? "text-destructive font-medium" : "text-foreground"}>
                      {formatCurrency(Number(row.outstanding_balance || 0))}
                    </TableCell>
                    <TableCell>
                      {row.open_maintenance_count > 0 ? <Badge variant="destructive">{row.open_maintenance_count} open</Badge> : <Badge variant="secondary">Clear</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/properties" onClick={() => setActiveCompanyId(row.company_id)}>Properties</Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/maintenance" onClick={() => setActiveCompanyId(row.company_id)}>Maintenance</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 pt-0">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon, attention = false }: { label: string; value: string; icon: typeof Building2; attention?: boolean }) {
  return (
    <Card className="card-shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon className={attention ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-primary'} />
        </div>
        <p className="mt-3 text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}