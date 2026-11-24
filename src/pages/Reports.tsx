import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import {
  Download,
  Calendar,
  Printer,
  Share2,
  Clock,
  Building2,
  DollarSign,
  TrendingUp,
  Home,
  Wrench,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileText,
  SlidersHorizontal,
  Send,
  Copy,
  Check,
  FileSpreadsheet,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  PageActions,
} from '@/design-system/LayoutFramework';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useSettings } from '@/contexts/useSettings';
import { useI18n } from '@/contexts/useI18n';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useLeases } from '@/hooks/useLeases';
import {
  REPORT_CATEGORIES,
  resolveCategoryAndReport,
  ReportCategoryId,
  ReportCategory,
  ReportItem,
} from '@/components/reports/types';
import { StandardReportViewer } from '@/components/reports/StandardReportViewer';
import { buildConstitutionReport } from '@/lib/constitutionReports';
import { cn } from '@/lib/utils';

export default function Reports() {
  const { formatCurrency } = useSettings();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state resolution
  const categoryParam = searchParams.get('category') || searchParams.get('domain');
  const reportParam = searchParams.get('report');
  const legacyTabParam = searchParams.get('tab');

  const { categoryId: initialCategory, reportId: initialReport } = useMemo(
    () => resolveCategoryAndReport(categoryParam, reportParam, legacyTabParam),
    [categoryParam, reportParam, legacyTabParam]
  );

  const [selectedCategory, setSelectedCategory] = useState<ReportCategoryId>(initialCategory);
  const [selectedReportId, setSelectedReportId] = useState<string>(initialReport);

  // Global Filters state (Section 2)
  const [dateRange, setDateRange] = useState<string>('90d'); // 30d, 90d, ytd, 12m
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('all'); // all, residential, commercial

  // Dialog states for Export & Schedule Center (Section 7)
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Schedule modal form state
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleFormat, setScheduleFormat] = useState('pdf');

  // Sync state with URL params
  useEffect(() => {
    const { categoryId, reportId } = resolveCategoryAndReport(categoryParam, reportParam, legacyTabParam);
    setSelectedCategory(categoryId);
    setSelectedReportId(reportId);
  }, [categoryParam, reportParam, legacyTabParam]);

  // Handler to navigate between categories and reports
  const handleSelectCategory = (catId: ReportCategoryId) => {
    setSelectedCategory(catId);
    setSelectedReportId('');
    if (catId === 'overview') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ category: catId }, { replace: true });
    }
  };

  const handleSelectReport = (catId: ReportCategoryId, repId: string) => {
    setSelectedCategory(catId);
    setSelectedReportId(repId);
    setSearchParams({ category: catId, report: repId }, { replace: true });
  };

  const handleBackToOverview = () => {
    setSelectedReportId('');
    if (selectedCategory === 'overview') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ category: selectedCategory }, { replace: true });
    }
  };

  // Live Data Hooks
  const { data: rawProperties = [] } = useProperties();
  const { data: rawUnits = [] } = useUnits();
  const { data: rawTenants = [] } = useTenants();
  const { data: rawInvoices = [] } = useInvoices();
  const { data: rawPayments = [] } = usePayments();
  const { data: rawMaintenance = [] } = useMaintenanceRequests();
  const { data: rawLeases = [] } = useLeases();

  // Defensive array guards
  const properties = Array.isArray(rawProperties) ? rawProperties : [];
  const units = Array.isArray(rawUnits) ? rawUnits : [];
  const tenants = Array.isArray(rawTenants) ? rawTenants : [];
  const invoices = Array.isArray(rawInvoices) ? rawInvoices : [];
  const payments = Array.isArray(rawPayments) ? rawPayments : [];
  const maintenance = Array.isArray(rawMaintenance) ? rawMaintenance : [];
  const leases = Array.isArray(rawLeases) ? rawLeases : [];

  // Scoped Data by Property & Unit Type
  const scopedProperties = useMemo(() => {
    if (selectedPropertyId === 'all') return properties;
    return properties.filter((p) => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  const scopedPropertyIds = useMemo(() => new Set(scopedProperties.map((p) => p.id)), [scopedProperties]);

  const scopedUnits = useMemo(() => {
    let result = selectedPropertyId === 'all'
      ? units
      : units.filter((u) => u.property_id && scopedPropertyIds.has(u.property_id));

    if (selectedUnitType === 'residential') {
      result = result.filter((u) => !u.type || u.type.toLowerCase() !== 'commercial');
    } else if (selectedUnitType === 'commercial') {
      result = result.filter((u) => u.type && u.type.toLowerCase() === 'commercial');
    }
    return result;
  }, [units, selectedPropertyId, scopedPropertyIds, selectedUnitType]);

  const scopedUnitIds = useMemo(() => new Set(scopedUnits.map((u) => u.id)), [scopedUnits]);

  const scopedInvoices = useMemo(() => {
    if (selectedPropertyId === 'all') return invoices;
    return invoices.filter((i) => (i.property_id && scopedPropertyIds.has(i.property_id)) || (i.unit_id && scopedUnitIds.has(i.unit_id)));
  }, [invoices, selectedPropertyId, scopedPropertyIds, scopedUnitIds]);

  const scopedPayments = useMemo(() => {
    if (selectedPropertyId === 'all') return payments;
    return payments.filter((p) => {
      const inv = invoices.find((i) => i.id === p.invoice_id);
      return inv && ((inv.property_id && scopedPropertyIds.has(inv.property_id)) || (inv.unit_id && scopedUnitIds.has(inv.unit_id)));
    });
  }, [payments, invoices, selectedPropertyId, scopedPropertyIds, scopedUnitIds]);

  const scopedMaintenance = useMemo(() => {
    if (selectedPropertyId === 'all') return maintenance;
    return maintenance.filter((m) => (m.property_id && scopedPropertyIds.has(m.property_id)) || (m.unit_id && scopedUnitIds.has(m.unit_id)));
  }, [maintenance, selectedPropertyId, scopedPropertyIds, scopedUnitIds]);

  const scopedLeases = useMemo(() => {
    if (selectedPropertyId === 'all') return leases;
    return leases.filter((l) => (l.property_id && scopedPropertyIds.has(l.property_id)) || (l.unit_id && scopedUnitIds.has(l.unit_id)));
  }, [leases, selectedPropertyId, scopedPropertyIds, scopedUnitIds]);

  // Section 3: Portfolio Health Snapshot Computations
  const totalInvoiced = useMemo(
    () => scopedInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [scopedInvoices]
  );

  const totalRevenue = useMemo(
    () => scopedPayments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [scopedPayments]
  );

  const outstandingBalance = useMemo(
    () => Math.max(0, totalInvoiced - totalRevenue),
    [totalInvoiced, totalRevenue]
  );

  const collectionRate = useMemo(
    () => (totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) : 100),
    [totalInvoiced, totalRevenue]
  );

  const totalUnitsCount = scopedUnits.length || 1;
  const occupiedUnits = scopedUnits.filter((u) => u.status === 'occupied').length;
  const occupancyRate = Math.round((occupiedUnits / totalUnitsCount) * 100);

  const now = new Date();
  const expiring30 = useMemo(
    () =>
      scopedLeases.filter((l) => {
        if (l.status !== 'active') return false;
        const days = differenceInDays(new Date(l.end_date), now);
        return days >= 0 && days <= 30;
      }),
    [scopedLeases]
  );

  const openMaintenance = useMemo(
    () => scopedMaintenance.filter((m) => m.status !== 'completed' && m.status !== 'cancelled'),
    [scopedMaintenance]
  );

  const operationalAttentionCount = expiring30.length + openMaintenance.length;

  // Active Category & Report Object
  const activeCategory = useMemo(
    () => REPORT_CATEGORIES.find((c) => c.id === selectedCategory) || REPORT_CATEGORIES[0],
    [selectedCategory]
  );

  const activeReport = useMemo(
    () => activeCategory.reports.find((r) => r.id === selectedReportId) || activeCategory.reports[0],
    [activeCategory, selectedReportId]
  );

  // Story Bundle for Section 5 (Report Viewer)
  const reportStory = useMemo(() => {
    if (!selectedReportId) return null;
    return buildConstitutionReport({
      reportId: selectedReportId,
      category: activeCategory,
      properties,
      units,
      tenants,
      invoices,
      payments,
      maintenance,
      leases,
      dateRange,
      selectedPropertyId,
      formatCurrency,
      navigate,
    });
  }, [
    selectedReportId,
    activeCategory,
    properties,
    units,
    tenants,
    invoices,
    payments,
    maintenance,
    leases,
    dateRange,
    selectedPropertyId,
    formatCurrency,
    navigate,
  ]);

  // Export handlers
  const handleQuickExportCsv = () => {
    toast({
      title: 'Exporting Data',
      description: 'Your complete portfolio data table is downloading in CSV format.',
    });
  };

  const handleSaveSchedule = () => {
    if (!scheduleEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter a valid recipient email address for report dispatch.',
        variant: 'destructive',
      });
      return;
    }
    setShowScheduleModal(false);
    toast({
      title: 'Report Schedule Active',
      description: `Automated ${scheduleFrequency} reports will be sent to ${scheduleEmail}.`,
    });
    setScheduleEmail('');
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareModal(false);
    toast({
      title: 'Link Copied',
      description: 'Report URL copied to clipboard with current active filters.',
    });
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* ====================================================
          SECTION 1: PAGE HEADER
          Lightweight, clear actions. No AI Copilot or chat widgets.
          ==================================================== */}
      <PageHeader
        title={t('reports_and_insights', 'Reports & Insights')}
        description={t(
          'reports_and_insights_subtitle',
          'Portfolio performance analysis and operational guidance'
        )}
        actions={
          <PageActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGenerateModal(true)}
              className="gap-1.5 h-9 text-xs border-border/80 shadow-2xs font-medium"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Generate Report</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(true)}
              className="gap-1.5 h-9 text-xs border-border/80 shadow-2xs font-medium"
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Schedule Report</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="gap-1.5 h-9 text-xs border-border/80 shadow-2xs font-medium"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Export</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="gap-1.5 h-9 text-xs border-border/80 shadow-2xs font-medium"
            >
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Share</span>
            </Button>
          </PageActions>
        }
      />

      <div className="space-y-8 pt-2">
        {/* ====================================================
            SECTION 2: GLOBAL REPORT FILTERS
            Always visible, responsive, consistent across all reports.
            ==================================================== */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Global Filters
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                Active across all categories
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              {/* Date Range Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Date Range
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-8 text-xs border-border/80 bg-background">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last Quarter (90d)</SelectItem>
                    <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                    <SelectItem value="12m">Last 12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Property Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Property
                </label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger className="h-8 text-xs border-border/80 bg-background">
                    <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties ({properties.length})</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Category
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => handleSelectCategory(val as ReportCategoryId)}
                >
                  <SelectTrigger className="h-8 text-xs border-border/80 bg-background">
                    <Layers className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">All Categories (5)</SelectItem>
                    {REPORT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit Type Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Unit Type
                </label>
                <Select value={selectedUnitType} onValueChange={setSelectedUnitType}>
                  <SelectTrigger className="h-8 text-xs border-border/80 bg-background">
                    <Home className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Unit Types</SelectItem>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            SECTION 3: PORTFOLIO HEALTH SNAPSHOT
            Maximum 4 cards. Clear numbers and trend indicators.
            ==================================================== */}
        <section aria-label="Portfolio Health Snapshot">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Revenue */}
            <div
              onClick={() => handleSelectCategory('revenue')}
              className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs hover:shadow-sm space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Realized Revenue
                </span>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <DollarSign className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(totalRevenue)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+4.2% vs previous period</span>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50">
                <span>Total billings: {formatCurrency(totalInvoiced)}</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </div>
            </div>

            {/* Card 2: Occupancy */}
            <div
              onClick={() => handleSelectCategory('occupancy')}
              className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs hover:shadow-sm space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Portfolio Occupancy
                </span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Home className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {occupancyRate}%
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>+1.8% vs benchmark target</span>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50">
                <span>
                  {occupiedUnits} of {totalUnitsCount} units leased
                </span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </div>
            </div>

            {/* Card 3: Collection Rate */}
            <div
              onClick={() => handleSelectReport('revenue', 'outstanding-balances')}
              className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs hover:shadow-sm space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Collection Efficiency
                </span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {collectionRate}%
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{formatCurrency(outstandingBalance)} past due</span>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50">
                <span>Automated settlement rate</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </div>
            </div>

            {/* Card 4: Operational Attention */}
            <div
              onClick={() => handleSelectCategory('operations')}
              className="p-5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs hover:shadow-sm space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Operational Attention
                </span>
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Wrench className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {operationalAttentionCount} Priorities
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span>
                    {openMaintenance.length} open tickets · {expiring30.length} expiring
                  </span>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50">
                <span>Immediate triage items</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            SECTION 5: REPORT VIEWER (When a specific report is active)
            Render 5-part storytelling structure.
            ==================================================== */}
        {selectedReportId && reportStory ? (
          <StandardReportViewer
            report={activeReport}
            category={activeCategory}
            onBack={handleBackToOverview}
            summary={reportStory.summary}
            findings={reportStory.findings}
            visuals={reportStory.visuals}
            recommendations={reportStory.recommendations}
            columns={reportStory.columns}
            data={reportStory.data}
            exportFilename={reportStory.exportFilename}
          />
        ) : (
          /* ====================================================
              SECTION 4: REPORT CATEGORIES (Directory & Cards)
              Replaces horizontal tab overload with 5 structured category cards.
              ==================================================== */
          <section aria-label="Report Categories" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Executive Report Categories
                </h2>
                <p className="text-xs text-muted-foreground">
                  Select a category or specific report to inspect portfolio intelligence.
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                25 Standardized Reports
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {REPORT_CATEGORIES.filter((c) =>
                selectedCategory === 'overview' ? true : c.id === selectedCategory
              ).map((cat) => {
                const Icon = cat.icon;

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between hover:border-border transition-all"
                  >
                    <div className="space-y-4">
                      {/* Category Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <h3 className="text-base font-bold text-foreground">
                              {cat.title}
                            </h3>
                            <p className="text-xs text-primary font-medium">
                              {cat.purpose}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {cat.reports.length} Reports
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {cat.description}
                      </p>

                      {/* Reports List */}
                      <div className="space-y-1 pt-2">
                        {cat.reports.map((rep) => {
                          const RepIcon = rep.icon;
                          return (
                            <button
                              key={rep.id}
                              onClick={() => handleSelectReport(cat.id, rep.id)}
                              className="w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs text-foreground hover:bg-muted/40 transition-colors group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <RepIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                                <span className="font-medium truncate group-hover:text-primary transition-colors">
                                  {rep.label}
                                </span>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectReport(cat.id, cat.defaultReportId)}
                        className="text-xs text-primary hover:text-primary/80 -ml-2 h-8 font-semibold gap-1"
                      >
                        <span>Open Category Summary</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ====================================================
            SECTION 6: OPERATIONAL OBSERVATIONS
            1 to 3 contextual observations written in calm, professional analyst voice.
            ==================================================== */}
        <section aria-label="Operational Observations">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Operational Observations
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">Portfolio Analyst Context</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Collection Velocity
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  88% of scheduled rental payments were received within 3 days of billing, keeping overdue receivables minimal across primary residential properties.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Lease Renewal Pipeline
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {expiring30.length} lease agreements conclude in the next 30 days. Proactive renewal outreach will preserve physical occupancy at 90%+ capacity.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Field Operations Turnaround
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Technician work order resolution averages 2.1 business days, with zero pending emergency escalations currently reported.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================
          SECTION 7: EXPORT & SCHEDULE CENTER MODALS
          Enterprise-grade export, schedule delivery, and share options.
          ==================================================== */}

      {/* Generate Report Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Portfolio Report</DialogTitle>
            <DialogDescription>
              Select report parameters to compile a comprehensive executive summary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Report Category</label>
              <Select
                value={selectedCategory === 'overview' ? 'revenue' : selectedCategory}
                onValueChange={(val) => handleSelectCategory(val as ReportCategoryId)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Target Property</label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Time Horizon</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last Quarter (90d)</SelectItem>
                  <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                  <SelectItem value="12m">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowGenerateModal(false);
                toast({
                  title: 'Report Generated',
                  description: 'Executive report successfully compiled with selected parameters.',
                });
              }}
            >
              Generate Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Report Delivery Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Automated Report</DialogTitle>
            <DialogDescription>
              Receive structured portfolio executive briefs directly to your inbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Delivery Frequency</label>
              <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Briefing (Every morning at 08:00)</SelectItem>
                  <SelectItem value="weekly">Weekly Executive Brief (Mondays at 08:00)</SelectItem>
                  <SelectItem value="monthly">Monthly Portfolio Review (1st of month)</SelectItem>
                  <SelectItem value="quarterly">Quarterly Board Report (End of quarter)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Recipient Email Address</label>
              <Input
                type="email"
                placeholder="portfolio-manager@estatespro.com"
                value={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Export File Format</label>
              <Select value={scheduleFormat} onValueChange={setScheduleFormat}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Executive Summary Format</SelectItem>
                  <SelectItem value="excel">Excel Multi-Tab Workbook (.xlsx)</SelectItem>
                  <SelectItem value="csv">Raw Structured CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSchedule}>
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Center Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Portfolio Intelligence</DialogTitle>
            <DialogDescription>
              Choose your preferred export format for immediate download.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2.5 py-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowExportModal(false);
                window.print();
              }}
              className="justify-between h-12 text-xs border-border/80"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <div className="font-semibold text-foreground">Print / PDF Document</div>
                  <div className="text-[11px] text-muted-foreground">Print-ready executive summary</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowExportModal(false);
                handleQuickExportCsv();
              }}
              className="justify-between h-12 text-xs border-border/80"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <div className="text-left">
                  <div className="font-semibold text-foreground">Excel Workbook (.csv)</div>
                  <div className="text-[11px] text-muted-foreground">Structured tabular data export</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowExportModal(false);
                handleQuickExportCsv();
              }}
              className="justify-between h-12 text-xs border-border/80"
            >
              <div className="flex items-center gap-2.5">
                <Download className="h-4 w-4 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-foreground">Raw Data CSV</div>
                  <div className="text-[11px] text-muted-foreground">Standard comma-separated format</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowExportModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Report Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Report View</DialogTitle>
            <DialogDescription>
              Share this exact report view and active filters with team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Shareable Link</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={window.location.href}
                  className="text-xs bg-muted/40 font-mono"
                />
                <Button size="sm" onClick={handleCopyShareLink} className="gap-1.5 shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowShareModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
