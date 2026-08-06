import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  DollarSign,
  Home,
  Users,
  Wrench,
  FileText,
  Building2,
  ChevronDown,
  Loader2,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { useSettings } from '@/contexts/useSettings';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useLeases } from '@/hooks/useLeases';
import { useVendorPayments, summarizeVendorPayments } from '@/hooks/useVendorPayments';
import { useVendors } from '@/hooks/useVendors';
import {
  computeAgingRows,
  computeMaintenanceCostRows,
  computeOccupancyTrend,
  computeRentRollRows,
  rowsToCsv,
} from '@/lib/pmReports';
import { useCompanyExecutiveReport, type CompanyExecutiveReportRow } from '@/hooks/useCompanyExecutiveReport';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function ExecutiveCompanyDrilldown({
  row,
  formatCurrency,
}: {
  row: CompanyExecutiveReportRow;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="border-t pt-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{row.company_name}</h3>
          <p className="text-sm text-muted-foreground">{[row.company_address, row.company_phone, row.company_email].filter(Boolean).join(' · ') || 'No contact details recorded'}</p>
        </div>
        <Badge variant={row.is_verified ? 'default' : 'secondary'}>{row.is_verified ? 'Verified' : 'Not verified'}</Badge>
      </div>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Portfolio</p><p className="font-medium">{row.property_count} properties, {row.unit_count} units</p></div>
        <div><p className="text-xs text-muted-foreground">Occupancy</p><p className="font-medium">{row.occupied_unit_count} occupied ({row.occupancy_rate}%)</p></div>
        <div><p className="text-xs text-muted-foreground">Active tenants</p><p className="font-medium">{row.active_tenant_count}</p></div>
        <div><p className="text-xs text-muted-foreground">Approved team</p><p className="font-medium">{row.team_member_count}</p></div>
        <div><p className="text-xs text-muted-foreground">Collected</p><p className="font-medium">{formatCurrency(Number(row.total_collected))}</p></div>
        <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-medium">{formatCurrency(Number(row.outstanding_balance))}</p></div>
        <div><p className="text-xs text-muted-foreground">Open maintenance</p><p className="font-medium">{row.open_maintenance_count}</p></div>
        <div><p className="text-xs text-muted-foreground">AI credits this month</p><p className="font-medium">{row.ai_credits_used ?? 'Restricted'}</p></div>
      </div>
    </div>
  );
}

export default function Reports() {
  const { formatCurrency } = useSettings();
  const [dateRange, setDateRange] = useState('6m');
  const [activeReport, setActiveReport] = useState('revenue');
  const [selectedExecutiveCompanyId, setSelectedExecutiveCompanyId] = useState<string | null>(null);

  const { data: properties = [] } = useProperties();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: maintenanceRequests = [] } = useMaintenanceRequests();
  const { data: leases = [] } = useLeases();
  const { data: vendors = [] } = useVendors();
  const { data: vendorPayments = [] } = useVendorPayments();
  const { data: dashboardStats } = useDashboardStats();
  const { data: executiveRows = [], isLoading: executiveLoading } = useCompanyExecutiveReport();
  const selectedExecutiveCompany = executiveRows.find((row) => row.company_id === selectedExecutiveCompanyId) ?? null;

  // Calculate statistics
  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingBalance = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + (i.amount - i.paid_amount), 0);

  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;

  const activeTenants = tenants.filter(t => t.status === 'active').length;

  // Generate monthly revenue data
  const generateMonthlyData = () => {
    const months = dateRange === '12m' ? 12 : dateRange === '6m' ? 6 : 3;
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= monthStart && paymentDate <= monthEnd && p.status === 'completed';
      });
      
      const monthInvoices = invoices.filter(i => {
        const invoiceDate = new Date(i.due_date);
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });
      
      data.push({
        month: format(date, 'MMM yyyy'),
        revenue: monthPayments.reduce((sum, p) => sum + p.amount, 0),
        invoiced: monthInvoices.reduce((sum, i) => sum + i.amount, 0),
      });
    }
    
    return data;
  };

  const revenueData = generateMonthlyData();
  const reportMonths = dateRange === '12m' ? 12 : dateRange === '6m' ? 6 : 3;
  const rentRollRows = computeRentRollRows(leases);
  const agingRows = computeAgingRows(invoices);
  const occupancyTrendRows = computeOccupancyTrend(leases, units.length, reportMonths);
  const maintenanceCostRows = computeMaintenanceCostRows(maintenanceRequests);
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));
  const vendorPaymentRows = vendorPayments
    .filter((payment) => new Date(payment.paid_at ?? payment.created_at) >= subMonths(new Date(), reportMonths))
    .map((payment) => ({ ...payment, vendorName: vendorById.get(payment.vendor_id) ?? 'Unknown vendor' }));
  const vendorPaymentTotals = summarizeVendorPayments(vendorPaymentRows);

  // Occupancy by property
  const occupancyByProperty = properties.map(p => ({
    name: p.name,
    occupied: p.occupied_units,
    vacant: p.total_units - p.occupied_units,
    rate: p.total_units > 0 ? Math.round((p.occupied_units / p.total_units) * 100) : 0,
  }));

  // Payment status distribution
  const paymentStatusData = [
    { name: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: COLORS[1] },
    { name: 'Pending', value: invoices.filter(i => i.status === 'pending').length, color: COLORS[2] },
    { name: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: COLORS[3] },
  ].filter(d => d.value > 0);

  // Maintenance by status
  const maintenanceStatusData = [
    { name: 'Submitted', value: maintenanceRequests.filter(m => m.status === 'submitted').length, color: COLORS[2] },
    { name: 'In Progress', value: maintenanceRequests.filter(m => m.status === 'in_progress').length, color: COLORS[4] },
    { name: 'Completed', value: maintenanceRequests.filter(m => m.status === 'completed').length, color: COLORS[1] },
  ].filter(d => d.value > 0);

  // Unit status distribution
  const unitStatusData = [
    { name: 'Occupied', value: units.filter(u => u.status === 'occupied').length, color: COLORS[1] },
    { name: 'Vacant', value: units.filter(u => u.status === 'vacant').length, color: COLORS[2] },
    { name: 'Maintenance', value: units.filter(u => u.status === 'maintenance').length, color: COLORS[3] },
  ].filter(d => d.value > 0);

  const handleExportReport = () => {
    let fileName = 'portfolio-summary';
    let csvContent = rowsToCsv(['Metric', 'Value'], [
      ['Total Revenue', formatCurrency(totalRevenue)],
      ['Outstanding Balance', formatCurrency(outstandingBalance)],
      ['Total Properties', properties.length.toString()],
      ['Total Units', units.length.toString()],
      ['Occupied Units', occupiedUnits.toString()],
      ['Occupancy Rate', `${occupancyRate.toFixed(1)}%`],
      ['Active Tenants', activeTenants.toString()],
      ['Open Maintenance Requests', maintenanceRequests.filter(m => m.status !== 'completed').length.toString()],
      ['Vendor Payments Paid', formatCurrency(vendorPaymentTotals.paid)],
      ['Vendor Payments Pending', formatCurrency(vendorPaymentTotals.pending)],
      ['Shortlet Conversion Rate', `${dashboardStats?.shortletConversionRate ?? 0}%`],
      ['Shortlet Acceptance Rate', `${dashboardStats?.shortletAcceptanceRate ?? 0}%`],
      ['Shortlet Avg Time To Pay (hours)', `${dashboardStats?.shortletAvgTimeToPayHours ?? 0}`],
    ]);

    if (activeReport === 'executive') {
      fileName = 'all-companies-executive-report';
      csvContent = rowsToCsv(
        ['Company', 'Access', 'Email', 'Phone', 'Address', 'Verified', 'Properties', 'Units', 'Occupied Units', 'Occupancy Rate', 'Active Tenants', 'Team Members', 'Collected', 'Outstanding', 'Open Maintenance', 'AI Credits Used'],
        executiveRows.map((row) => [row.company_name, row.access_role, row.company_email ?? '', row.company_phone ?? '', row.company_address ?? '', row.is_verified ? 'Yes' : 'No', row.property_count, row.unit_count, row.occupied_unit_count, `${row.occupancy_rate}%`, row.active_tenant_count, row.team_member_count, row.total_collected, row.outstanding_balance, row.open_maintenance_count, row.ai_credits_used ?? 'Restricted']),
      );
    } else if (activeReport === 'rent-roll') {
      fileName = 'rent-roll';
      csvContent = rowsToCsv(
        ['Property', 'Unit', 'Tenant', 'Lease', 'Start', 'End', 'Monthly Rent', 'Status'],
        rentRollRows.map((row) => [row.property, row.unit, row.tenant, row.leaseNumber, row.startDate, row.endDate, row.monthlyRent, row.status]),
      );
    } else if (activeReport === 'aging') {
      fileName = 'aging-collections';
      csvContent = rowsToCsv(
        ['Invoice', 'Tenant', 'Due Date', 'Days Overdue', 'Bucket', 'Balance', 'Status'],
        agingRows.map((row) => [row.invoiceNumber, row.tenant, row.dueDate, row.daysOverdue, row.bucket, row.balance, row.status]),
      );
    } else if (activeReport === 'occupancy-trend') {
      fileName = 'occupancy-trend';
      csvContent = rowsToCsv(
        ['Month', 'Occupied', 'Vacant', 'Occupancy Rate'],
        occupancyTrendRows.map((row) => [row.month, row.occupied, row.vacant, `${row.occupancyRate}%`]),
      );
    } else if (activeReport === 'maintenance-cost') {
      fileName = 'maintenance-cost';
      csvContent = rowsToCsv(
        ['Property', 'Request', 'Priority', 'Status', 'Estimated Cost', 'Actual Cost', 'Variance'],
        maintenanceCostRows.map((row) => [row.property, row.request, row.priority, row.status, row.estimatedCost, row.actualCost, row.variance]),
      );
    } else if (activeReport === 'vendor-payments') {
      fileName = 'vendor-payments';
      csvContent = rowsToCsv(
        ['Vendor', 'Date', 'Amount', 'Currency', 'Status', 'Payment Method', 'Reference', 'Work Order ID'],
        vendorPaymentRows.map((payment) => [payment.vendorName, payment.paid_at ?? payment.created_at, payment.amount, payment.currency, payment.status, payment.payment_method ?? '', payment.reference_number ?? '', payment.maintenance_request_id ?? '']),
      );
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecutivePdf = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    const rows = executiveRows.map((row) => `<tr><td>${escapeHtml(row.company_name)}</td><td>${escapeHtml(row.access_role)}</td><td>${row.property_count}</td><td>${row.unit_count}</td><td>${row.occupancy_rate}%</td><td>${row.active_tenant_count}</td><td>${escapeHtml(formatCurrency(row.total_collected))}</td><td>${escapeHtml(formatCurrency(row.outstanding_balance))}</td><td>${row.open_maintenance_count}</td><td>${escapeHtml(row.ai_credits_used ?? 'Restricted')}</td></tr>`).join('');
    printWindow.document.write(`<!doctype html><html><head><title>All Companies Executive Report</title><style>body{font-family:Arial,sans-serif;color:#17202a;padding:28px}h1{font-size:24px;margin:0 0 6px}p{color:#5d6d7e;margin:0 0 24px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #d5d8dc;padding:7px;text-align:left}th{background:#eef2f3}@media print{@page{size:landscape;margin:12mm}}</style></head><body><h1>All Companies Executive Report</h1><p>Generated ${escapeHtml(format(new Date(), 'PPP'))}</p><table><thead><tr><th>Company</th><th>Access</th><th>Properties</th><th>Units</th><th>Occupancy</th><th>Active tenants</th><th>Collected</th><th>Outstanding</th><th>Open maintenance</th><th>AI credits</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();window.close()}</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive insights into your property portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          {activeReport === 'executive' && (
            <Button onClick={handleExecutivePdf} variant="outline" className="gap-2" disabled={executiveRows.length === 0}>
              <Printer className="h-4 w-4" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Completed payments recorded</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(outstandingBalance)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive">Needs attention</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <FileText className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupancy Rate</p>
                <p className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {occupiedUnits} of {units.length} units
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Home className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tenants</p>
                <p className="text-2xl font-bold">{activeTenants}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tenants.length} total tenants
                </p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Users className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shortlet KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shortlet Conversion Rate</p>
                <p className="text-2xl font-bold">{dashboardStats?.shortletConversionRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Bookings converted to paid</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shortlet Acceptance Rate</p>
                <p className="text-2xl font-bold">{dashboardStats?.shortletAcceptanceRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Guest acceptances</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10">
                <Users className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Time To Pay</p>
                <p className="text-2xl font-bold">{dashboardStats?.shortletAvgTimeToPayHours ?? 0}h</p>
                <p className="text-xs text-muted-foreground mt-1">From booking to first payment</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={activeReport} onValueChange={setActiveReport} className="space-y-4">
        <TabsList className="h-auto flex flex-wrap justify-start">
          <TabsTrigger value="revenue" className="gap-2">
            <LineChart className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="occupancy" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Occupancy
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <PieChart className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="rent-roll">Rent Roll</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
          <TabsTrigger value="occupancy-trend">Occupancy Trend</TabsTrigger>
          <TabsTrigger value="maintenance-cost">Maintenance Cost</TabsTrigger>
          <TabsTrigger value="vendor-payments">Vendor Payments</TabsTrigger>
          <TabsTrigger value="executive" className="gap-2"><Building2 className="h-4 w-4" />All Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle>All Companies Executive Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {executiveLoading ? (
                <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : executiveRows.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No accessible companies found.</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="border-l-2 border-primary pl-4"><p className="text-xs text-muted-foreground">Companies</p><p className="text-2xl font-semibold">{executiveRows.length}</p></div>
                    <div className="border-l-2 border-success pl-4"><p className="text-xs text-muted-foreground">Properties</p><p className="text-2xl font-semibold">{executiveRows.reduce((sum, row) => sum + Number(row.property_count), 0)}</p></div>
                    <div className="border-l-2 border-info pl-4"><p className="text-xs text-muted-foreground">Collected</p><p className="text-xl font-semibold">{formatCurrency(executiveRows.reduce((sum, row) => sum + Number(row.total_collected), 0))}</p></div>
                    <div className="border-l-2 border-warning pl-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-xl font-semibold">{formatCurrency(executiveRows.reduce((sum, row) => sum + Number(row.outstanding_balance), 0))}</p></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-muted-foreground"><th className="py-3">Company</th><th>Access</th><th className="text-right">Properties</th><th className="text-right">Units</th><th className="text-right">Occupancy</th><th className="text-right">Collected</th><th className="text-right">Outstanding</th><th><span className="sr-only">Details</span></th></tr></thead>
                      <tbody>{executiveRows.map((row) => <tr key={row.company_id} className="border-b last:border-0"><td className="py-3"><div className="font-medium">{row.company_name}</div><div className="text-xs text-muted-foreground">{row.company_email || 'No email'}</div></td><td><Badge variant="outline">{row.access_role.replace('_', ' ')}</Badge></td><td className="text-right">{row.property_count}</td><td className="text-right">{row.unit_count}</td><td className="text-right">{row.occupancy_rate}%</td><td className="text-right">{formatCurrency(row.total_collected)}</td><td className="text-right">{formatCurrency(row.outstanding_balance)}</td><td className="text-right"><Button variant="ghost" size="icon" title={`View ${row.company_name} details`} onClick={() => setSelectedExecutiveCompanyId(selectedExecutiveCompanyId === row.company_id ? null : row.company_id)}><ChevronDown className={`h-4 w-4 transition-transform ${selectedExecutiveCompanyId === row.company_id ? 'rotate-180' : ''}`} /></Button></td></tr>)}</tbody>
                    </table>
                  </div>
                  {selectedExecutiveCompany && <ExecutiveCompanyDrilldown row={selectedExecutiveCompany} formatCurrency={formatCurrency} />}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Collected"
                      stroke="hsl(var(--primary))" 
                      fill="url(#revenueGradient)" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="invoiced" 
                      name="Invoiced"
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy">
          <Card className="card-shadow-md">
            <CardHeader>
              <CardTitle>Occupancy by Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancyByProperty} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="occupied" name="Occupied" fill="hsl(var(--success))" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="vacant" name="Vacant" fill="hsl(var(--muted))" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-shadow-md">
              <CardHeader>
                <CardTitle>Invoice Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow-md">
              <CardHeader>
                <CardTitle>Unit Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={unitStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {unitStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-shadow-md">
              <CardHeader>
                <CardTitle>Maintenance Requests by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={maintenanceStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {maintenanceStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow-md">
              <CardHeader>
                <CardTitle>Maintenance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-warning" />
                    <span className="font-medium">Open Requests</span>
                  </div>
                  <Badge className="bg-warning/20 text-warning border-warning/30">
                    {maintenanceRequests.filter(m => m.status === 'submitted').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-info/10">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-info" />
                    <span className="font-medium">In Progress</span>
                  </div>
                  <Badge className="bg-info/20 text-info border-info/30">
                    {maintenanceRequests.filter(m => m.status === 'in_progress').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-success/10">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-success" />
                    <span className="font-medium">Completed</span>
                  </div>
                  <Badge className="bg-success/20 text-success border-success/30">
                    {maintenanceRequests.filter(m => m.status === 'completed').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-destructive" />
                    <span className="font-medium">High Priority</span>
                  </div>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                    {maintenanceRequests.filter(m => m.priority === 'high' || m.priority === 'urgent').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rent-roll">
          <Card className="card-shadow-md">
            <CardHeader><CardTitle>Rent Roll</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-3">Property / Unit</th><th>Tenant</th><th>Lease</th><th>Term</th><th className="text-right">Monthly Rent</th><th>Status</th></tr></thead>
                <tbody>{rentRollRows.map((row) => <tr key={row.leaseNumber} className="border-b last:border-0"><td className="py-3">{row.property} / {row.unit}</td><td>{row.tenant}</td><td>{row.leaseNumber}</td><td>{row.startDate} to {row.endDate}</td><td className="text-right">{formatCurrency(row.monthlyRent)}</td><td><Badge variant="outline">{row.status}</Badge></td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card className="card-shadow-md">
            <CardHeader><CardTitle>Aging & Collections</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-3">Invoice</th><th>Tenant</th><th>Due</th><th>Age</th><th>Bucket</th><th className="text-right">Balance</th></tr></thead>
                <tbody>{agingRows.map((row) => <tr key={row.invoiceNumber} className="border-b last:border-0"><td className="py-3">{row.invoiceNumber}</td><td>{row.tenant}</td><td>{row.dueDate}</td><td>{row.daysOverdue} days</td><td><Badge variant="outline">{row.bucket}</Badge></td><td className="text-right">{formatCurrency(row.balance)}</td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy-trend">
          <Card className="card-shadow-md">
            <CardHeader><CardTitle>Occupancy Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={occupancyTrendRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Occupancy']} />
                    <Line type="monotone" dataKey="occupancyRate" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance-cost">
          <Card className="card-shadow-md">
            <CardHeader><CardTitle>Maintenance Cost</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-3">Property</th><th>Request</th><th>Priority</th><th>Status</th><th className="text-right">Estimated</th><th className="text-right">Actual</th><th className="text-right">Variance</th></tr></thead>
                <tbody>{maintenanceCostRows.map((row, index) => <tr key={`${row.request}-${index}`} className="border-b last:border-0"><td className="py-3">{row.property}</td><td>{row.request}</td><td>{row.priority}</td><td>{row.status}</td><td className="text-right">{formatCurrency(row.estimatedCost)}</td><td className="text-right">{formatCurrency(row.actualCost)}</td><td className="text-right">{formatCurrency(row.variance)}</td></tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor-payments">
          <Card className="card-shadow-md">
            <CardHeader><CardTitle>Vendor Payments</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="mt-1 text-xl font-bold text-success">{formatCurrency(vendorPaymentTotals.paid)}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-xl font-bold text-warning">{formatCurrency(vendorPaymentTotals.pending)}</p></div>
                <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Ledger entries</p><p className="mt-1 text-xl font-bold">{vendorPaymentRows.length}</p></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-3">Vendor</th><th>Date</th><th>Method / Reference</th><th>Work order</th><th>Status</th><th className="text-right">Amount</th></tr></thead><tbody>{vendorPaymentRows.map((payment) => <tr key={payment.id} className="border-b last:border-0"><td className="py-3 font-medium">{payment.vendorName}</td><td>{format(new Date(payment.paid_at ?? payment.created_at), 'MMM d, yyyy')}</td><td>{payment.payment_method || '-'}{payment.reference_number ? ` / ${payment.reference_number}` : ''}</td><td>{payment.maintenance_request_id || '-'}</td><td><Badge variant="outline">{payment.status}</Badge></td><td className="text-right">{formatCurrency(payment.amount)}</td></tr>)}</tbody></table></div>
              {vendorPaymentRows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No vendor payments in this reporting period.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
