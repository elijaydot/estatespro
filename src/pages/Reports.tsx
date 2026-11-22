import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  Download,
  Calendar,
  Printer,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  PageActions,
} from '@/design-system/LayoutFramework';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/useSettings';
import { useI18n } from '@/contexts/useI18n';
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
import { useCompanyExecutiveReport } from '@/hooks/useCompanyExecutiveReport';
import { computeRraRentalTaxReport, generateRraTaxExportCsv } from '@/lib/rraCompliance';

import {
  ReportDomainId,
  REPORT_DOMAINS,
  resolveDomainAndReport,
} from '@/components/reports/types';
import {
  Level1DomainTabs,
  Level2ContextSidebar,
  MobileReportSelector,
} from '@/components/reports/ReportsNavigation';
import { ExecutiveOverview } from '@/components/reports/ExecutiveOverview';
import { FinancialReports } from '@/components/reports/FinancialReports';
import { OperationsReports } from '@/components/reports/OperationsReports';
import { PortfolioReports } from '@/components/reports/PortfolioReports';
import { ForecastingReports } from '@/components/reports/ForecastingReports';
import { AiInsightsReports } from '@/components/reports/AiInsightsReports';

const COLORS = ['hsl(var(--primary))', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export default function Reports() {
  const { formatCurrency, settings } = useSettings();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const domainParam = searchParams.get('domain');
  const reportParam = searchParams.get('report');
  const legacyTabParam = searchParams.get('tab');

  const { domainId: initialDomain, reportId: initialReport } = useMemo(
    () => resolveDomainAndReport(domainParam, reportParam, legacyTabParam),
    [domainParam, reportParam, legacyTabParam]
  );

  const [currentDomainId, setCurrentDomainId] = useState<ReportDomainId>(initialDomain);
  const [currentReportId, setCurrentReportId] = useState<string>(initialReport);
  const [dateRange, setDateRange] = useState('6m');

  // Keep state synchronized with URL search params
  useEffect(() => {
    const { domainId, reportId } = resolveDomainAndReport(domainParam, reportParam, legacyTabParam);
    setCurrentDomainId(domainId);
    setCurrentReportId(reportId);
  }, [domainParam, reportParam, legacyTabParam]);

  const handleSelectDomain = (domainId: ReportDomainId) => {
    setCurrentDomainId(domainId);
    if (domainId === 'overview') {
      setCurrentReportId('');
      setSearchParams({}, { replace: true });
    } else {
      const domain = REPORT_DOMAINS.find((d) => d.id === domainId);
      const defaultRep = domain?.defaultReportId || domain?.reports[0]?.id || '';
      setCurrentReportId(defaultRep);
      setSearchParams({ domain: domainId, report: defaultRep }, { replace: true });
    }
  };

  const handleSelectReport = (reportId: string) => {
    setCurrentReportId(reportId);
    setSearchParams({ domain: currentDomainId, report: reportId }, { replace: true });
  };

  const handleDirectNavigate = (domainId: ReportDomainId, reportId: string) => {
    setCurrentDomainId(domainId);
    setCurrentReportId(reportId);
    if (domainId === 'overview') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ domain: domainId, report: reportId }, { replace: true });
    }
  };

  // Live Data Hooks
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

  // Statistics
  const totalRevenue = useMemo(() => {
    return payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const outstandingBalance = useMemo(() => {
    return invoices
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + ((Number(i.amount) || 0) - (Number(i.paid_amount) || 0)), 0);
  }, [invoices]);

  const occupiedUnits = units.filter((u) => u.status === 'occupied').length;
  const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;
  const activeTenants = tenants.filter((t) => t.status === 'active').length;

  // Monthly Revenue Inflow & Invoiced Data
  const reportMonths = dateRange === '12m' ? 12 : dateRange === '6m' ? 6 : 3;

  const revenueData = useMemo(() => {
    const data = [];
    for (let i = reportMonths - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthPayments = payments.filter((p) => {
        const paymentDate = new Date(p.created_at);
        return paymentDate >= monthStart && paymentDate <= monthEnd && p.status === 'completed';
      });

      const monthInvoices = invoices.filter((inv) => {
        const invoiceDate = new Date(inv.due_date);
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
      });

      data.push({
        month: format(date, 'MMM yyyy'),
        revenue: monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        invoiced: monthInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
      });
    }
    return data;
  }, [reportMonths, payments, invoices]);

  const rentRollRows = useMemo(() => computeRentRollRows(leases), [leases]);
  const agingRows = useMemo(() => computeAgingRows(invoices), [invoices]);
  const occupancyTrendRows = useMemo(
    () => computeOccupancyTrend(leases, units.length, reportMonths),
    [leases, units.length, reportMonths]
  );
  const maintenanceCostRows = useMemo(
    () => computeMaintenanceCostRows(maintenanceRequests),
    [maintenanceRequests]
  );

  const vendorById = useMemo(() => new Map(vendors.map((v) => [v.id, v.name])), [vendors]);

  const vendorPaymentRows = useMemo(() => {
    return vendorPayments
      .filter((p) => new Date(p.paid_at ?? p.created_at) >= subMonths(new Date(), reportMonths))
      .map((payment) => ({
        ...payment,
        vendorName: vendorById.get(payment.vendor_id) ?? 'Unknown vendor',
      }));
  }, [vendorPayments, reportMonths, vendorById]);

  const vendorPaymentTotals = useMemo(
    () => summarizeVendorPayments(vendorPaymentRows),
    [vendorPaymentRows]
  );

  // RRA Rental Income Tax Declaration
  const rraRecords = useMemo(() => {
    return leases.map((lease) => {
      const leaseInvoices = invoices.filter((i) => i.lease_id === lease.id);
      const leaseInvoiceIds = new Set(leaseInvoices.map((i) => i.id));
      const leasePayments = payments.filter(
        (p) => p.status === 'completed' && p.invoice_id && leaseInvoiceIds.has(p.invoice_id)
      );
      const grossCollected = leasePayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        propertyId: lease.property_id,
        propertyName: lease.properties?.name || 'Property',
        unitId: lease.unit_id,
        unitNumber: lease.units?.unit_number || 'Unit',
        tenantName: lease.tenants?.name || 'Tenant',
        tenantTin: (lease.tenants as unknown as { tin?: string })?.tin || '',
        grossRentCollected: grossCollected > 0 ? grossCollected : lease.monthly_rent * 12,
        currency: settings.currencyCode || 'RWF',
      };
    });
  }, [leases, invoices, payments, settings.currencyCode]);

  const rraTaxSummary = useMemo(() => {
    return computeRraRentalTaxReport(rraRecords, new Date().getFullYear());
  }, [rraRecords]);

  // Occupancy by Property
  const occupancyByProperty = useMemo(() => {
    return properties.map((p) => ({
      name: p.name,
      occupied: p.occupied_units,
      vacant: p.total_units - p.occupied_units,
      rate: p.total_units > 0 ? Math.round((p.occupied_units / p.total_units) * 100) : 0,
    }));
  }, [properties]);

  // Payment Status Distribution
  const paymentStatusData = useMemo(() => {
    return [
      { name: 'Paid', value: invoices.filter((i) => i.status === 'paid').length, color: '#10B981' },
      { name: 'Pending', value: invoices.filter((i) => i.status === 'pending').length, color: '#F59E0B' },
      { name: 'Overdue', value: invoices.filter((i) => i.status === 'overdue').length, color: '#EF4444' },
    ].filter((d) => d.value > 0);
  }, [invoices]);

  // Global CSV Export Handler
  const handleExportReport = () => {
    let fileName = 'portfolio-summary';
    let csvContent = rowsToCsv(
      ['Metric', 'Value'],
      [
        ['Total Revenue', formatCurrency(totalRevenue)],
        ['Outstanding Balance', formatCurrency(outstandingBalance)],
        ['Total Properties', properties.length.toString()],
        ['Total Units', units.length.toString()],
        ['Occupied Units', occupiedUnits.toString()],
        ['Occupancy Rate', `${occupancyRate.toFixed(1)}%`],
        ['Active Tenants', activeTenants.toString()],
        ['Open Maintenance Requests', maintenanceRequests.filter((m) => m.status !== 'completed').length.toString()],
        ['Vendor Payments Paid', formatCurrency(vendorPaymentTotals.paid)],
        ['Vendor Payments Pending', formatCurrency(vendorPaymentTotals.pending)],
        ['Shortlet Conversion Rate', `${dashboardStats?.shortletConversionRate ?? 0}%`],
        ['Shortlet Acceptance Rate', `${dashboardStats?.shortletAcceptanceRate ?? 0}%`],
        ['Shortlet Avg Time To Pay (hours)', `${dashboardStats?.shortletAvgTimeToPayHours ?? 0}`],
      ]
    );

    if (currentReportId === 'executive') {
      fileName = 'all-companies-executive-report';
      csvContent = rowsToCsv(
        ['Company', 'Access', 'Email', 'Phone', 'Address', 'Properties', 'Units', 'Occupied Units', 'Occupancy Rate', 'Active Tenants', 'Team Members', 'Collected', 'Outstanding', 'Open Maintenance', 'AI Credits Used'],
        executiveRows.map((row) => [
          row.company_name,
          row.access_role,
          row.company_email ?? '',
          row.company_phone ?? '',
          row.company_address ?? '',
          row.property_count,
          row.unit_count,
          row.occupied_unit_count,
          `${row.occupancy_rate}%`,
          row.active_tenant_count,
          row.team_member_count,
          row.total_collected,
          row.outstanding_balance,
          row.open_maintenance_count,
          row.ai_credits_used ?? 'Restricted',
        ])
      );
    } else if (currentReportId === 'rra-tax') {
      fileName = `rra-rental-income-tax-declaration-${rraTaxSummary.taxYear}`;
      csvContent = generateRraTaxExportCsv(rraTaxSummary);
    } else if (currentReportId === 'rent-roll') {
      fileName = 'rent-roll';
      csvContent = rowsToCsv(
        ['Property', 'Unit', 'Tenant', 'Lease', 'Start', 'End', 'Monthly Rent', 'Status'],
        rentRollRows.map((row) => [row.property, row.unit, row.tenant, row.leaseNumber, row.startDate, row.endDate, row.monthlyRent, row.status])
      );
    } else if (currentReportId === 'aging') {
      fileName = 'aging-collections';
      csvContent = rowsToCsv(
        ['Invoice', 'Tenant', 'Due Date', 'Days Overdue', 'Bucket', 'Balance', 'Status'],
        agingRows.map((row) => [row.invoiceNumber, row.tenant, row.dueDate, row.daysOverdue, row.bucket, row.balance, row.status])
      );
    } else if (currentReportId === 'occupancy-trend') {
      fileName = 'occupancy-trend';
      csvContent = rowsToCsv(
        ['Month', 'Occupied', 'Vacant', 'Occupancy Rate'],
        occupancyTrendRows.map((row) => [row.month, row.occupied, row.vacant, `${row.occupancyRate}%`])
      );
    } else if (currentReportId === 'maintenance-cost') {
      fileName = 'maintenance-cost';
      csvContent = rowsToCsv(
        ['Property', 'Request', 'Priority', 'Status', 'Estimated Cost', 'Actual Cost', 'Variance'],
        maintenanceCostRows.map((row) => [row.property, row.request, row.priority, row.status, row.estimatedCost, row.actualCost, row.variance])
      );
    } else if (currentReportId === 'vendor-payments') {
      fileName = 'vendor-payments';
      csvContent = rowsToCsv(
        ['Vendor', 'Date', 'Amount', 'Currency', 'Status', 'Payment Method', 'Reference', 'Work Order ID'],
        vendorPaymentRows.map((p) => [p.vendorName, p.paid_at ?? p.created_at, p.amount, p.currency, p.status, p.payment_method ?? '', p.reference_number ?? '', p.maintenance_request_id ?? ''])
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
    const rows = executiveRows
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row.company_name)}</td><td>${escapeHtml(row.access_role)}</td><td>${row.property_count}</td><td>${row.unit_count}</td><td>${row.occupancy_rate}%</td><td>${row.active_tenant_count}</td><td>${escapeHtml(formatCurrency(row.total_collected))}</td><td>${escapeHtml(formatCurrency(row.outstanding_balance))}</td><td>${row.open_maintenance_count}</td><td>${escapeHtml(row.ai_credits_used ?? 'Restricted')}</td></tr>`
      )
      .join('');
    printWindow.document.write(
      `<!doctype html><html><head><title>All Companies Executive Report</title><style>body{font-family:Inter,sans-serif;color:#0f172a;padding:28px}h1{font-size:22px;margin:0 0 6px}p{color:#64748b;margin:0 0 24px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}@media print{@page{size:landscape;margin:12mm}}</style></head><body><h1>All Companies Executive Report</h1><p>Generated ${escapeHtml(format(new Date(), 'PPP'))}</p><table><thead><tr><th>Company</th><th>Access</th><th>Properties</th><th>Units</th><th>Occupancy</th><th>Active tenants</th><th>Collected</th><th>Outstanding</th><th>Open maintenance</th><th>AI credits</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();window.close()}</script></body></html>`
    );
    printWindow.document.close();
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* 1. Header & Primary Action Area */}
      <PageHeader
        title={t('reports', 'Executive Reports')}
        description={t('page_reports_subtitle', 'Portfolio intelligence, forward revenue forecasts, operational triage, and audited tax compliance.')}
        actions={
          <PageActions>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExportReport} variant="outline" size="sm" className="gap-1.5 h-9 text-xs">
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>

            {currentReportId === 'executive' && (
              <Button onClick={handleExecutivePdf} variant="outline" size="sm" className="gap-1.5 h-9 text-xs" disabled={executiveRows.length === 0}>
                <Printer className="h-3.5 w-3.5" />
                <span>PDF</span>
              </Button>
            )}
          </PageActions>
        }
      />

      {/* 2. LEVEL 1: DOMAIN NAVIGATION TABS (Strict Max 6 Domains) */}
      <div className="space-y-6">
        <Level1DomainTabs
          currentDomainId={currentDomainId}
          onSelectDomain={handleSelectDomain}
        />

        {/* 3. WORKSPACE: OVERVIEW OR DOMAIN SPLIT LAYOUT */}
        {currentDomainId === 'overview' ? (
          <div className="pt-2">
            <ExecutiveOverview
              properties={properties}
              units={units}
              tenants={tenants}
              invoices={invoices}
              payments={payments}
              maintenanceRequests={maintenanceRequests}
              leases={leases}
              revenueData={revenueData}
              occupancyTrendRows={occupancyTrendRows}
              paymentStatusData={paymentStatusData}
              formatCurrency={formatCurrency}
              onNavigate={handleDirectNavigate}
            />
          </div>
        ) : (
          <div className="pt-2">
            {/* Mobile / Tablet Domain & Report Selector Drawer */}
            <MobileReportSelector
              currentDomainId={currentDomainId}
              currentReportId={currentReportId}
              onSelectDomain={handleSelectDomain}
              onSelectReport={handleSelectReport}
            />

            {/* Desktop Split Layout (240px Sidebar + Flexible Content Canvas) */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <Level2ContextSidebar
                currentDomainId={currentDomainId}
                currentReportId={currentReportId}
                onSelectReport={handleSelectReport}
              />

              <div className="flex-1 min-w-0 w-full space-y-6">
                {currentDomainId === 'financial' && (
                  <FinancialReports
                    reportId={currentReportId}
                    revenueData={revenueData}
                    paymentStatusData={paymentStatusData}
                    rentRollRows={rentRollRows}
                    agingRows={agingRows}
                    vendorPaymentRows={vendorPaymentRows}
                    vendorPaymentTotals={vendorPaymentTotals}
                    rraTaxSummary={rraTaxSummary}
                    payments={payments}
                    invoices={invoices}
                    formatCurrency={formatCurrency}
                    onExport={handleExportReport}
                  />
                )}

                {currentDomainId === 'operations' && (
                  <OperationsReports
                    reportId={currentReportId}
                    maintenanceRequests={maintenanceRequests}
                    maintenanceCostRows={maintenanceCostRows}
                    formatCurrency={formatCurrency}
                    onExport={handleExportReport}
                  />
                )}

                {currentDomainId === 'portfolio' && (
                  <PortfolioReports
                    reportId={currentReportId}
                    properties={properties}
                    units={units}
                    leases={leases}
                    occupancyByProperty={occupancyByProperty}
                    occupancyTrendRows={occupancyTrendRows}
                    executiveRows={executiveRows}
                    executiveLoading={executiveLoading}
                    formatCurrency={formatCurrency}
                    onExport={handleExportReport}
                    onExecutivePdf={handleExecutivePdf}
                  />
                )}

                {currentDomainId === 'forecasting' && (
                  <ForecastingReports
                    reportId={currentReportId}
                    totalRevenue={totalRevenue}
                    units={units}
                    leases={leases}
                    formatCurrency={formatCurrency}
                  />
                )}

                {currentDomainId === 'ai' && (
                  <AiInsightsReports
                    reportId={currentReportId}
                    totalRevenue={totalRevenue}
                    outstandingBalance={outstandingBalance}
                    occupancyRate={occupancyRate}
                    formatCurrency={formatCurrency}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
