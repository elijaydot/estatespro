// src/pages/Occupancy.tsx
// FishGate Design Constitution v1.0 - Occupancy Management Center

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Home,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Layers,
  Search,
  Download,
  Eye,
  SlidersHorizontal,
  Calendar,
  FileText,
  Info,
  Wrench,
  Loader2,
  Table as TableIcon,
  LayoutGrid,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { PageContainer, PageHeader, PageActions } from '@/design-system/LayoutFramework';
import { useOccupancy } from '@/hooks/useOccupancy';
import { useSettings } from '@/contexts/useSettings';
import { cn } from '@/lib/utils';
import type { VacancyRecord } from '@/lib/occupancyEngine';

type ExplorerViewMode = 'cards' | 'table' | 'heatmap';

export default function Occupancy() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();

  // Selected filters
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [explorerView, setExplorerView] = useState<ExplorerViewMode>('cards');
  const [vacancySortField, setVacancySortField] = useState<'duration' | 'revenue'>('duration');

  // Modals
  const [isLeasingReviewOpen, setIsLeasingReviewOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState<any | null>(null);

  // Hook data
  const {
    isLoading,
    unitsError,
    refetch,
    units,
    properties,
    summary,
    attentionItems,
    vacancyRecords,
    trends,
    observations,
    propertyHeatmaps,
  } = useOccupancy(selectedPropertyFilter !== 'all' ? selectedPropertyFilter : undefined);

  // Filtered Vacancy Records for Section 4
  const sortedVacancies = useMemo(() => {
    return [...vacancyRecords].sort((a, b) => {
      if (vacancySortField === 'revenue') {
        return b.potentialMonthlyRevenue - a.potentialMonthlyRevenue;
      }
      return b.vacancyDurationDays - a.vacancyDurationDays;
    });
  }, [vacancyRecords, vacancySortField]);

  // Filtered Units for Section 5 (Occupancy Explorer)
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      // Property filter
      if (selectedPropertyFilter !== 'all' && u.property_id !== selectedPropertyFilter) {
        return false;
      }

      // Unit Type filter
      if (selectedTypeFilter !== 'all') {
        const ut = ((u as any).unit_type || '').toLowerCase();
        if (selectedTypeFilter === 'studio' && ut !== 'studio' && (u.bedrooms || 0) !== 0) return false;
        if (selectedTypeFilter === '1bed' && u.bedrooms !== 1 && !ut.includes('1')) return false;
        if (selectedTypeFilter === '2bed' && u.bedrooms !== 2 && !ut.includes('2')) return false;
        if (selectedTypeFilter === '3bed' && (u.bedrooms || 0) < 3 && !ut.includes('3')) return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        const status = u.status?.toLowerCase() || 'available';
        if (selectedStatusFilter === 'occupied' && status !== 'occupied') return false;
        if (selectedStatusFilter === 'vacant' && !['vacant', 'available', 'listed'].includes(status)) return false;
        if (selectedStatusFilter === 'maintenance' && !['maintenance', 'maintenance_hold'].includes(status)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = u.unit_number?.toLowerCase().includes(q);
        const matchesProp = u.properties?.name?.toLowerCase().includes(q);
        const matchesTenant = u.tenants?.some((t) => t.name?.toLowerCase().includes(q));
        if (!matchesNumber && !matchesProp && !matchesTenant) return false;
      }

      return true;
    });
  }, [units, selectedPropertyFilter, selectedTypeFilter, selectedStatusFilter, searchQuery]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Unit Number',
      'Property',
      'Floor',
      'Status',
      'Monthly Rent',
      'Current Tenant',
      'Days Vacant',
    ];
    const rows = filteredUnits.map((u) => [
      `"${u.unit_number}"`,
      `"${u.properties?.name || 'Unassigned'}"`,
      u.floor || 1,
      `"${u.status || 'available'}"`,
      u.rent_amount || 0,
      `"${u.tenants?.[0]?.name || 'Vacant'}"`,
      u.status === 'occupied' ? 0 : 14,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FishGate_Occupancy_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageContainer maxWidth="7xl">
      {/* ==================================================== */}
      {/* SECTION 1: HEADER                                    */}
      {/* ==================================================== */}
      <PageHeader
        title="Occupancy"
        description="Monitor occupancy health, vacancies, lease expirations and leasing opportunities."
        actions={
          <PageActions>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 text-xs h-9 border-border/80"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReportModalOpen(true)}
              className="gap-2 text-xs h-9 border-border/80"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Occupancy Report</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsLeasingReviewOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Leasing Review</span>
            </Button>
          </PageActions>
        }
      />

      {/* Query Error Notice */}
      {unitsError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold">Notice: </span>
            <span>{(unitsError as Error)?.message || 'Could not query occupancy data.'}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="h-7 text-xs border-rose-500/30 shrink-0 self-start sm:self-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading operational occupancy data...</p>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-8">
          {/* ==================================================== */}
          {/* SECTION 2: OCCUPANCY HEALTH SUMMARY (Max 4 Cards)    */}
          {/* ==================================================== */}
          <section aria-label="Occupancy Health Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Portfolio Occupancy */}
            <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:border-border transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Portfolio Occupancy</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-foreground">
                    {summary.portfolioOccupancy.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    ({summary.occupiedUnits} of {summary.totalUnits} units)
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      summary.varianceFromTarget >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {summary.varianceFromTarget >= 0 ? '+' : ''}
                    {summary.varianceFromTarget.toFixed(1)}% vs target
                  </span>
                  <span className="text-xs text-muted-foreground">({summary.occupancyTarget}% benchmark)</span>
                </div>
              </div>
            </Card>

            {/* Card 2: Vacant Units */}
            <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:border-border transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Vacant Units</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Home className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-foreground">
                    {summary.vacantUnits}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">units off-lease</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {summary.vacantStaged} staged & ready
                  </span>
                  <span className="text-xs text-muted-foreground">turnaround active</span>
                </div>
              </div>
            </Card>

            {/* Card 3: Potential Revenue Loss */}
            <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:border-border transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Potential Revenue Loss</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    {formatCurrency(summary.potentialRevenueLoss)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Monthly Unrealized
                  </span>
                  <span className="text-xs text-muted-foreground">from current vacancies</span>
                </div>
              </div>
            </Card>

            {/* Card 4: Upcoming Lease Expirations */}
            <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:border-border transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Upcoming Expirations</span>
                <div
                  className={cn(
                    'p-2 rounded-xl',
                    summary.upcomingExpirationsCount > 0
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600'
                  )}
                >
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-foreground">
                    {summary.upcomingExpirationsCount}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">leases in 60 days</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      summary.upcomingExpirationsCount > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600'
                    )}
                  >
                    {summary.upcomingExpirationsCount > 0 ? 'Action Recommended' : 'Low Turnaround Risk'}
                  </span>
                </div>
              </div>
            </Card>
          </section>

          {/* ==================================================== */}
          {/* SECTION 3: ATTENTION REQUIRED                        */}
          {/* ==================================================== */}
          {attentionItems.length > 0 && (
            <section aria-label="Attention Required" className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Attention Required ({attentionItems.length} Operational Items)
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">Urgent vacancies and renewal risks</span>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden shadow-2xs divide-y divide-amber-500/10">
                {attentionItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-500/10 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-2 shrink-0',
                          item.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                        )}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-foreground">{item.unitNumber}</span>
                          <span className="text-xs text-muted-foreground">• {item.propertyName}</span>
                        </div>
                        <p className="text-xs font-medium text-amber-950 dark:text-amber-200 mt-0.5">
                          {item.issue}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.impact}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(item.actionRoute)}
                        className="h-8 text-xs font-semibold bg-card border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15"
                      >
                        <span>{item.recommendedAction}</span>
                        <span>→</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================================================== */}
          {/* SECTION 4: VACANCY MANAGEMENT                        */}
          {/* ==================================================== */}
          <section aria-label="Vacancy Management" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Vacancy Management</span>
                  <Badge variant="outline" className="text-[11px] font-mono px-2 py-0">
                    {vacancyRecords.length} Vacant
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Prioritize longest vacant units to accelerate leasing velocity and protect yield.
                </p>
              </div>

              {/* Sort controls */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-muted-foreground">Sort by:</span>
                <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setVacancySortField('duration')}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-all',
                      vacancySortField === 'duration'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Longest Vacant
                  </button>
                  <button
                    type="button"
                    onClick={() => setVacancySortField('revenue')}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-semibold transition-all',
                      vacancySortField === 'revenue'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Highest Rent
                  </button>
                </div>
              </div>
            </div>

            {sortedVacancies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-2 bg-muted/5">
                <Check className="h-6 w-6 text-emerald-500 mx-auto" />
                <h4 className="text-xs font-bold text-foreground">Zero Vacant Units</h4>
                <p className="text-xs text-muted-foreground">
                  All rentable units across this selection are actively occupied under valid leases.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs divide-y divide-border/60">
                {sortedVacancies.map((v) => (
                  <div
                    key={v.unitId}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/15 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Home className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{v.unitNumber}</span>
                          <span className="text-xs text-muted-foreground">• {v.propertyName}</span>
                          <span className="text-xs text-muted-foreground">• {v.unitType} (Floor {v.floor})</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <Badge
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5',
                              v.vacancyDurationDays > 60
                                ? 'bg-rose-500/15 text-rose-600 border-rose-500/20'
                                : v.vacancyDurationDays > 30
                                ? 'bg-amber-500/15 text-amber-600 border-amber-500/20'
                                : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                            )}
                          >
                            Vacant {v.vacancyDurationDays} days
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            Potential: <span className="font-bold text-foreground">{formatCurrency(v.potentialMonthlyRevenue)}</span>/mo
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Status: <span className="capitalize text-foreground font-medium">{v.listingStatus}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/units?search=${encodeURIComponent(v.unitNumber)}`)}
                        className="h-8 text-xs font-semibold gap-1.5 border-border/80"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Inspect Unit</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate('/marketplace/manage')}
                        className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                      >
                        {v.recommendedAction}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ==================================================== */}
          {/* SECTION 5: OCCUPANCY EXPLORER (Cards | Table | Heatmap) */}
          {/* ==================================================== */}
          <section aria-label="Occupancy Explorer" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">Occupancy Explorer</h3>
                <p className="text-xs text-muted-foreground">
                  Explore unit inventory, physical distribution, and tenant occupancy records.
                </p>
              </div>

              {/* View Switcher: Cards | Table | Heatmap */}
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setExplorerView('cards')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                    explorerView === 'cards' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="h-3 w-3" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExplorerView('table')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                    explorerView === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <TableIcon className="h-3 w-3" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExplorerView('heatmap')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                    explorerView === 'heatmap' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Layers className="h-3 w-3" />
                  <span>Floor Heatmap</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search unit, property, tenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Property filter */}
              <Select value={selectedPropertyFilter} onValueChange={setSelectedPropertyFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Unit Type filter */}
              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Unit Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Unit Types</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="1bed">1 Bedroom</SelectItem>
                  <SelectItem value="2bed">2 Bedrooms</SelectItem>
                  <SelectItem value="3bed">3+ Bedrooms</SelectItem>
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacant">Vacant & Ready</SelectItem>
                  <SelectItem value="maintenance">Maintenance Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* VIEW 1: CARDS */}
            {explorerView === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUnits.map((u) => {
                  const isOccupied = u.status?.toLowerCase() === 'occupied';
                  const activeTenant = u.tenants?.[0];
                  return (
                    <Card
                      key={u.id}
                      className={cn(
                        'p-5 border rounded-2xl shadow-xs transition-all hover:border-border',
                        isOccupied ? 'border-border/80 bg-card' : 'border-blue-500/20 bg-blue-500/5'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{u.unit_number}</span>
                          <span className="text-xs text-muted-foreground">• Floor {u.floor || 1}</span>
                        </div>
                        <Badge
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5',
                            isOccupied
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          )}
                        >
                          {isOccupied ? 'Occupied' : 'Vacant'}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        {u.properties?.name || 'Assigned Property'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Monthly Rent</span>
                          <span className="font-bold text-foreground font-mono">
                            {formatCurrency(Number(u.rent_amount) || 0)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground block text-[11px]">Resident</span>
                          <span className="font-medium text-foreground">
                            {activeTenant?.name || (isOccupied ? 'Leased' : 'None')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUnitForDetail(u)}
                          className="w-full text-xs h-8 border-border/80"
                        >
                          View Details
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* VIEW 2: TABLE */}
            {explorerView === 'table' && (
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3.5 pl-4">Unit</th>
                        <th className="p-3.5">Property</th>
                        <th className="p-3.5">Floor</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Rent</th>
                        <th className="p-3.5">Current Tenant</th>
                        <th className="p-3.5 text-right pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredUnits.map((u) => {
                        const isOccupied = u.status?.toLowerCase() === 'occupied';
                        const activeTenant = u.tenants?.[0];
                        return (
                          <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-3.5 pl-4 font-bold text-foreground">{u.unit_number}</td>
                            <td className="p-3.5 text-muted-foreground">{u.properties?.name || '—'}</td>
                            <td className="p-3.5 text-muted-foreground">{u.floor || 1}</td>
                            <td className="p-3.5">
                              <Badge
                                className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5',
                                  isOccupied
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                )}
                              >
                                {isOccupied ? 'Occupied' : 'Vacant'}
                              </Badge>
                            </td>
                            <td className="p-3.5 font-mono font-medium text-foreground">
                              {formatCurrency(Number(u.rent_amount) || 0)}
                            </td>
                            <td className="p-3.5 text-foreground">{activeTenant?.name || (isOccupied ? 'Leased' : 'Vacant')}</td>
                            <td className="p-3.5 text-right pr-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedUnitForDetail(u)}
                                className="h-7 text-xs text-primary hover:text-primary/80"
                              >
                                Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: FLOOR HEATMAP */}
            {explorerView === 'heatmap' && (
              <div className="space-y-6">
                {propertyHeatmaps.map((group) => (
                  <div
                    key={group.propertyId}
                    className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h4 className="font-bold text-sm text-foreground">{group.propertyName}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Occupancy:</span>
                        <span className="font-bold text-foreground">{group.occupancyRate.toFixed(1)}%</span>
                        <span className="text-muted-foreground">({group.occupiedUnits} / {group.totalUnits} units)</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(group.floors)
                        .sort(([a], [b]) => Number(b) - Number(a)) // Highest floor first
                        .map(([floorNum, floorUnits]) => (
                          <div key={floorNum} className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-16 shrink-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Floor {floorNum}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                              {floorUnits.map((fu) => (
                                <button
                                  key={fu.unitId}
                                  type="button"
                                  onClick={() => setSelectedUnitForDetail(units.find((u) => u.id === fu.unitId))}
                                  className={cn(
                                    'px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left shadow-2xs hover:scale-105',
                                    fu.cardColor
                                  )}
                                  title={`Unit ${fu.unitNumber} - ${fu.status} (${formatCurrency(fu.rent)})`}
                                >
                                  <div className="text-[11px] font-bold text-foreground">{fu.unitNumber}</div>
                                  <div className="text-[10px] text-muted-foreground capitalize font-normal">
                                    {fu.status}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ==================================================== */}
          {/* SECTION 6: OCCUPANCY TRENDS (Max 3 Visuals)          */}
          {/* ==================================================== */}
          <section aria-label="Occupancy Trends" className="space-y-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-foreground">Occupancy Trends</h3>
              <p className="text-xs text-muted-foreground">
                Historical trajectory, vacancy aging distribution, and forward lease expirations.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Chart 1: Occupancy Trajectory */}
              <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Occupancy Trajectory</span>
                  <span className="text-muted-foreground">vs 95% Target</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends.occupancyTrajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="occGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#occGradient)" name="Occupancy %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 2: Vacancy Duration Distribution */}
              <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Vacancy Duration Aging</span>
                  <span className="text-muted-foreground">Days Off-Lease</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends.vacancyDurationBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '11px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Vacant Units" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Chart 3: Lease Expiration Schedule */}
              <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Lease Expiration Schedule</span>
                  <span className="text-muted-foreground">Next 6 Months</span>
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends.leaseExpirationSchedule} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', fontSize: '11px' }} />
                      <Bar dataKey="expiringCount" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Expiring Leases" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </section>

          {/* ==================================================== */}
          {/* SECTION 7: OCCUPANCY OBSERVATIONS                    */}
          {/* ==================================================== */}
          <section aria-label="Occupancy Observations" className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Operational Observations
              </h4>
            </div>

            <div className="space-y-2">
              {observations.map((obs, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p className="text-foreground leading-relaxed">{obs}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* MODAL 1: LEASING REVIEW */}
      <Dialog open={isLeasingReviewOpen} onOpenChange={setIsLeasingReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Operational Leasing Review</span>
            </DialogTitle>
            <DialogDescription>
              Review turnaround status and stage available units directly to the marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="p-4 rounded-xl bg-blue-500/10 text-xs text-blue-900 dark:text-blue-200">
              <span className="font-bold">Portfolio Status: </span>
              <span>
                {summary.vacantUnits} vacant units are currently tracking {formatCurrency(summary.potentialRevenueLoss)} in uncollected revenue.
              </span>
            </div>

            <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
              {vacancyRecords.slice(0, 6).map((v) => (
                <div key={v.unitId} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-foreground">{v.unitNumber}</span>
                    <span className="text-muted-foreground"> • {v.propertyName}</span>
                    <span className="text-[11px] text-muted-foreground block">
                      Vacant {v.vacancyDurationDays} days • {formatCurrency(v.potentialMonthlyRevenue)}/mo
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsLeasingReviewOpen(false);
                      navigate('/marketplace/manage');
                    }}
                    className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Stage Listing
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: OCCUPANCY REPORT PREVIEW */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Occupancy Health Statement</span>
            </DialogTitle>
            <DialogDescription>
              Audited summary of portfolio occupancy, physical inventory, and potential yield loss.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Total Rentable Units:</span>
              <span className="font-bold text-foreground">{summary.totalUnits}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Occupied Units:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{summary.occupiedUnits}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Current Occupancy Rate:</span>
              <span className="font-bold text-foreground">{summary.portfolioOccupancy.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Operational Target:</span>
              <span className="font-bold text-foreground">{summary.occupancyTarget}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Vacant Units:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{summary.vacantUnits}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Monthly Unrealized Revenue:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(summary.potentialRevenueLoss)}
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsReportModalOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleExportCSV} className="gap-1.5 bg-blue-600 text-white">
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: UNIT DETAIL PREVIEW */}
      {selectedUnitForDetail && (
        <Dialog open={Boolean(selectedUnitForDetail)} onOpenChange={() => setSelectedUnitForDetail(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                <span>Unit {selectedUnitForDetail.unit_number}</span>
              </DialogTitle>
              <DialogDescription>
                {selectedUnitForDetail.properties?.name || 'Assigned Property'} • Floor {selectedUnitForDetail.floor || 1}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-3 text-xs">
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 capitalize',
                    selectedUnitForDetail.status === 'occupied'
                      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                      : 'bg-blue-500/15 text-blue-600 border-blue-500/20'
                  )}
                >
                  {selectedUnitForDetail.status || 'available'}
                </Badge>
              </div>
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Contracted Rent:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(Number(selectedUnitForDetail.rent_amount) || 0)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground">Active Resident:</span>
                <span className="font-medium text-foreground">
                  {selectedUnitForDetail.tenants?.[0]?.name || (selectedUnitForDetail.status === 'occupied' ? 'Leased' : 'Vacant')}
                </span>
              </div>
              {selectedUnitForDetail.tenants?.[0]?.lease_end_date && (
                <div className="flex justify-between py-2 border-b border-border/60">
                  <span className="text-muted-foreground">Lease Expiration:</span>
                  <span className="font-mono text-foreground">
                    {selectedUnitForDetail.tenants[0].lease_end_date}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedUnitForDetail(null)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const num = selectedUnitForDetail.unit_number;
                  setSelectedUnitForDetail(null);
                  navigate(`/units?search=${encodeURIComponent(num)}`);
                }}
                className="bg-blue-600 text-white"
              >
                Open in Units Workspace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}
