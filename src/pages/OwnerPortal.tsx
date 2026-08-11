import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CreditCard, FileText, Gauge, Receipt, Search, Wrench } from 'lucide-react';
import { TablePagination } from '@/components/marketplace-crm/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanyExecutiveReport } from '@/hooks/useCompanyExecutiveReport';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSettings } from '@/contexts/useSettings';

export default function OwnerPortal() {
  const report = useCompanyExecutiveReport();
  const { setActiveCompanyId } = useActiveCompany();
  const { formatCurrency } = useSettings();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (report.data || []).filter((row) => !query || [row.company_name, row.company_email, row.company_address]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [report.data, search]);

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
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Owner / Investor Portal</p>
          <h1 className="mt-1 text-2xl font-semibold">Portfolio command view</h1>
          <p className="mt-1 text-sm text-muted-foreground">Financial performance, occupancy, and operating pressure across companies you can access.</p>
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

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><CardTitle className="text-base">Company performance</CardTitle><p className="mt-1 text-sm text-muted-foreground">Compare portfolio scale, occupancy, collections, and unresolved work.</p></div>
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Filter companies" /></div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? <div className="px-6 py-10 text-center text-sm text-muted-foreground">No accessible companies match this filter.</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Portfolio</TableHead><TableHead>Occupancy</TableHead><TableHead>Collected</TableHead><TableHead>Outstanding</TableHead><TableHead>Maintenance</TableHead><TableHead className="text-right">Open</TableHead></TableRow></TableHeader>
              <TableBody>{visibleRows.map((row) => (
                <TableRow key={row.company_id}>
                  <TableCell><p className="font-medium">{row.company_name}</p><p className="text-xs text-muted-foreground">{row.company_email || row.company_address || 'No company contact details'}</p></TableCell>
                  <TableCell>{row.property_count} properties / {row.unit_count} units</TableCell>
                  <TableCell>{Number(row.occupancy_rate || 0).toFixed(1)}%</TableCell>
                  <TableCell>{formatCurrency(Number(row.total_collected || 0))}</TableCell>
                  <TableCell>{formatCurrency(Number(row.outstanding_balance || 0))}</TableCell>
                  <TableCell>{row.open_maintenance_count > 0 ? <Badge variant="destructive">{row.open_maintenance_count} open</Badge> : <Badge variant="secondary">Clear</Badge>}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1"><Button asChild size="sm" variant="ghost"><Link to="/properties" onClick={() => setActiveCompanyId(row.company_id)}>Properties</Link></Button><Button asChild size="sm" variant="ghost"><Link to="/maintenance" onClick={() => setActiveCompanyId(row.company_id)}>Maintenance</Link></Button></div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
          <TablePagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, icon: Icon, attention = false }: { label: string; value: string; icon: typeof Building2; attention?: boolean }) {
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className={attention ? 'h-4 w-4 text-destructive' : 'h-4 w-4 text-primary'} /></div><p className="mt-3 text-xl font-semibold">{value}</p></CardContent></Card>;
}