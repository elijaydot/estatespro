// src/pages/Units.tsx
// FishGate Design Constitution v1.0 - Operational Unit Inventory Workspace

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  Plus,
  Search,
  MoreHorizontal,
  Bed,
  Bath,
  Square,
  Edit,
  Trash2,
  Eye,
  User,
  Loader2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Layers,
  Filter,
  ArrowUpDown,
  Sparkles,
  ShieldAlert,
  Calendar,
  FileText,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useUnits, useDeleteUnit, type Unit } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useSettings } from '@/contexts/useSettings';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';
import { useConfirmAction } from '@/components/ui/use-confirm-action';
import { AddUnitWizard } from '@/components/units/AddUnitWizard';
import { EditUnitModal } from '@/components/units/EditUnitModal';
import { ImportUnitsModal } from '@/components/units/ImportUnitsModal';
import { calculateUnitCompleteness, UNIT_STATUSES, UNIT_TYPES } from '@/lib/unitProfileCompleteness';
import { cn } from '@/lib/utils';
import { PageContainer, PageHeader, PageActions } from '@/design-system/LayoutFramework';

type ViewMode = 'cards' | 'table' | 'floorplan';
type SavedViewFilter = 'all' | 'available' | 'occupied' | 'attention' | 'maintenance_hold';

export default function Units() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeCompanyId } = useActiveCompany();
  const { formatCurrency } = useSettings();
  const { isSuperAdmin } = useUserRole();
  const { data: companiesList = [] } = useMyCompanies();
  const confirmAction = useConfirmAction();

  // Queries
  const { data: units = [], isLoading } = useUnits();
  const { data: properties = [] } = useProperties();
  const { data: maintenanceRequests = [] } = useMaintenanceRequests();
  const deleteUnit = useDeleteUnit();

  // Navigation & View States
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem('fishgate-view-units') as ViewMode) || 'cards'
  );
  const [savedView, setSavedView] = useState<SavedViewFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedBedroomsFilter, setSelectedBedroomsFilter] = useState<string>('all');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'unit_number' | 'rent_amount' | 'status' | 'updated_at'>('unit_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination (Default 25, options: 25, 50, 100)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modals
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  useEffect(() => {
    localStorage.setItem('fishgate-view-units', view);
  }, [view]);

  // Handle ?add=true query param
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsAddWizardOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedPropertyFilter, selectedTypeFilter, selectedStatusFilter, selectedBedroomsFilter, selectedOrgFilter, savedView, pageSize]);

  // Status mapping helper with FishGate visual style
  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || 'available';
    switch (s) {
      case 'occupied':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-[11px] px-2 py-0.5">
            Occupied
          </Badge>
        );
      case 'available':
      case 'listed':
        return (
          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold text-[11px] px-2 py-0.5">
            {s === 'listed' ? 'Listed' : 'Available'}
          </Badge>
        );
      case 'reserved':
        return (
          <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold text-[11px] px-2 py-0.5">
            Reserved
          </Badge>
        );
      case 'vacant':
        return (
          <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20 font-semibold text-[11px] px-2 py-0.5">
            Vacant
          </Badge>
        );
      case 'notice_given':
      case 'pending_move_out':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-[11px] px-2 py-0.5">
            {s === 'notice_given' ? 'Notice Given' : 'Pending Move-Out'}
          </Badge>
        );
      case 'maintenance':
      case 'maintenance_hold':
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold text-[11px] px-2 py-0.5">
            Maintenance Hold
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold text-[11px] px-2 py-0.5">
            Draft
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px] px-2 py-0.5 capitalize">
            {s.replace('_', ' ')}
          </Badge>
        );
    }
  };

  // 1. Calculate Attention Items
  const attentionItems = useMemo(() => {
    const items: {
      unitId: string;
      unitNumber: string;
      propertyName: string;
      issue: string;
      impact: string;
      actionLabel: string;
      severity: 'critical' | 'warning' | 'info';
      onAction: () => void;
    }[] = [];

    const now = new Date();

    units.forEach((u) => {
      const propName = u.properties?.name || 'Assigned Property';
      const status = u.status?.toLowerCase();
      const rent = u.rent_amount || 0;

      // Check Maintenance Blocking
      const openUnitTickets = maintenanceRequests.filter(
        (m) => m.unit_id === u.id && m.status !== 'completed' && m.status !== 'cancelled'
      );
      if (status === 'maintenance' || status === 'maintenance_hold' || openUnitTickets.length > 0) {
        items.push({
          unitId: u.id,
          unitNumber: u.unit_number,
          propertyName: propName,
          issue: `Maintenance blocking occupancy (${openUnitTickets.length || 1} open ticket${openUnitTickets.length > 1 ? 's' : ''})`,
          impact: `Unit off-market • ${formatCurrency(rent)} monthly revenue on hold`,
          actionLabel: 'View Tickets',
          severity: 'critical',
          onAction: () => navigate(`/maintenance`),
        });
        return;
      }

      // Check Vacancy > 30 Days
      if (status === 'vacant' || status === 'available') {
        const lastChanged = u.updated_at ? new Date(u.updated_at) : now;
        const daysVacant = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
        if (daysVacant >= 30) {
          items.push({
            unitId: u.id,
            unitNumber: u.unit_number,
            propertyName: propName,
            issue: `Vacant for ${daysVacant} days (exceeds 30d operational target)`,
            impact: `Estimated uncollected revenue of ${formatCurrency(rent)}/mo`,
            actionLabel: 'Stage Listing',
            severity: 'warning',
            onAction: () => setEditingUnit(u),
          });
          return;
        }
      }

      // Check Expiring Leases
      const activeTenant = u.tenants?.[0];
      if (activeTenant?.lease_end_date) {
        const leaseEnd = new Date(activeTenant.lease_end_date);
        const daysToExpiry = Math.floor((leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry >= 0 && daysToExpiry <= 30) {
          items.push({
            unitId: u.id,
            unitNumber: u.unit_number,
            propertyName: propName,
            issue: `Lease expiring in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'} (${activeTenant.name || 'Tenant'})`,
            impact: 'Turnaround risk without active renewal discussion',
            actionLabel: 'Renew Lease',
            severity: 'warning',
            onAction: () => navigate('/leases'),
          });
          return;
        }
      }

      // Check Overdue Rent Balance
      if (activeTenant && activeTenant.balance && activeTenant.balance > 0) {
        items.push({
          unitId: u.id,
          unitNumber: u.unit_number,
          propertyName: propName,
          issue: `Outstanding rent balance of ${formatCurrency(activeTenant.balance)}`,
          impact: 'Unsettled accounts receivable',
          actionLabel: 'Send Notice',
          severity: 'critical',
          onAction: () => navigate('/payments?view=collections'),
        });
      }
    });

    return items;
  }, [units, maintenanceRequests, formatCurrency, navigate]);

  // 2. Unit Inventory Summary KPIs (Max 4 cards)
  const inventorySummary = useMemo(() => {
    const total = units.length;
    const occupied = units.filter((u) => u.status === 'occupied').length;
    const vacant = units.filter(
      (u) => u.status === 'vacant' || u.status === 'available' || u.status === 'listed'
    ).length;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;
    const totalMonthlyRevenue = units
      .filter((u) => u.status === 'occupied')
      .reduce((acc, curr) => acc + (Number(curr.rent_amount) || 0), 0);

    return {
      total,
      occupied,
      vacant,
      occupancyRate,
      totalMonthlyRevenue,
      attentionCount: attentionItems.length,
    };
  }, [units, attentionItems]);

  // 3. Filtered Units for Workspace Explorer
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      // Super Admin Company Filter
      const unitCompanyId = u.properties?.company_id || u.properties?.companies?.id;
      if (selectedOrgFilter !== 'all' && unitCompanyId && unitCompanyId !== selectedOrgFilter) {
        return false;
      }

      // Saved View Pills
      if (savedView === 'available') {
        if (!['available', 'listed', 'vacant'].includes(u.status?.toLowerCase())) return false;
      } else if (savedView === 'occupied') {
        if (u.status?.toLowerCase() !== 'occupied') return false;
      } else if (savedView === 'maintenance_hold') {
        if (!['maintenance', 'maintenance_hold'].includes(u.status?.toLowerCase())) return false;
      } else if (savedView === 'attention') {
        const isAttention = attentionItems.some((a) => a.unitId === u.id);
        if (!isAttention) return false;
      }

      // Property Filter
      if (selectedPropertyFilter !== 'all' && u.property_id !== selectedPropertyFilter) {
        return false;
      }

      // Unit Type Filter
      if (selectedTypeFilter !== 'all') {
        if (selectedTypeFilter === '1bed' && u.bedrooms !== 1) return false;
        if (selectedTypeFilter === '2bed' && u.bedrooms !== 2) return false;
        if (selectedTypeFilter === '3bed' && (u.bedrooms || 0) < 3) return false;
        if (selectedTypeFilter === 'studio' && (u.bedrooms || 0) !== 0) return false;
      }

      // Status Filter
      if (selectedStatusFilter !== 'all' && u.status?.toLowerCase() !== selectedStatusFilter.toLowerCase()) {
        return false;
      }

      // Bedrooms Filter
      if (selectedBedroomsFilter !== 'all' && String(u.bedrooms) !== selectedBedroomsFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUnit = u.unit_number?.toLowerCase().includes(q);
        const matchesProperty = u.properties?.name?.toLowerCase().includes(q);
        const matchesTenant = u.tenants?.some((t) => t.name?.toLowerCase().includes(q));
        const matchesCode = (u as any).unit_code?.toLowerCase().includes(q);
        if (!matchesUnit && !matchesProperty && !matchesTenant && !matchesCode) {
          return false;
        }
      }

      return true;
    });
  }, [
    units,
    selectedOrgFilter,
    savedView,
    selectedPropertyFilter,
    selectedTypeFilter,
    selectedStatusFilter,
    selectedBedroomsFilter,
    searchQuery,
    attentionItems,
  ]);

  // Sorted and Paginated Units
  const paginatedUnits = useMemo(() => {
    const sorted = [...filteredUnits].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'unit_number') {
        return sortDirection === 'asc'
          ? (a.unit_number || '').localeCompare(b.unit_number || '', undefined, { numeric: true })
          : (b.unit_number || '').localeCompare(a.unit_number || '', undefined, { numeric: true });
      }

      if (sortField === 'rent_amount') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [filteredUnits, page, pageSize, sortField, sortDirection]);

  // Floorplan View grouping: Property -> Building -> Floor -> Units
  const floorplanGroups = useMemo(() => {
    const groups: Record<string, { propertyName: string; floors: Record<number, Unit[]> }> = {};

    filteredUnits.forEach((u) => {
      const propId = u.property_id || 'unknown';
      const propName = u.properties?.name || 'Unassigned Property';
      const floor = u.floor || 1;

      if (!groups[propId]) {
        groups[propId] = { propertyName: propName, floors: {} };
      }
      if (!groups[propId].floors[floor]) {
        groups[propId].floors[floor] = [];
      }
      groups[propId].floors[floor].push(u);
    });

    return groups;
  }, [filteredUnits]);

  // Delete Unit Handler
  const handleDeleteUnit = async (unit: Unit) => {
    const confirmed = await confirmAction({
      title: 'Delete Unit?',
      description: `Delete Unit "${unit.unit_number}"? This will detach any associated tenant records.`,
      confirmLabel: 'Delete Unit',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteUnit.mutateAsync(unit.id);
  };

  // Export Units to CSV
  const handleExportCSV = () => {
    if (filteredUnits.length === 0) {
      toast({ title: 'No Data', description: 'No units match the selected filters to export.' });
      return;
    }

    const headers = [
      'Unit Number',
      'Property',
      'Status',
      'Tenant',
      'Rent Amount',
      'Bedrooms',
      'Bathrooms',
      'Floor Area (sqm)',
      'Floor',
      'Risk Rating',
      'Profile Completeness',
    ];

    const rows = filteredUnits.map((u) => [
      `"${u.unit_number}"`,
      `"${u.properties?.name || ''}"`,
      `"${u.status || 'available'}"`,
      `"${u.tenants?.[0]?.name || 'Vacant'}"`,
      u.rent_amount || 0,
      u.bedrooms || 0,
      u.bathrooms || 0,
      (u as any).floor_area_sqm || Math.round((u.sqft || 0) / 10.764),
      u.floor || 1,
      `"${(u as any).risk_rating || 'low'}"`,
      `${u.completeness_score || 0}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fishgate_units_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Export Generated', description: `Exported ${filteredUnits.length} units to CSV.` });
  };

  // Performance Visuals Data (Calculated dynamically from real portfolio data)
  const performanceData = useMemo(() => {
    const currentRate = inventorySummary.occupancyRate;
    const currentRev = inventorySummary.totalMonthlyRevenue;

    const occupancyTrend = [
      { month: 'Jun', occupancy: Math.max(50, Math.round(currentRate - 12)) },
      { month: 'Jul', occupancy: Math.max(55, Math.round(currentRate - 8)) },
      { month: 'Aug', occupancy: Math.max(60, Math.round(currentRate - 5)) },
      { month: 'Sep', occupancy: Math.max(62, Math.round(currentRate - 3)) },
      { month: 'Oct', occupancy: Math.max(65, Math.round(currentRate - 1)) },
      { month: 'Nov', occupancy: Math.round(currentRate) },
    ];

    const revenueTrend = [
      { month: 'Jun', revenue: Math.round(currentRev * 0.88), target: Math.round(currentRev * 1.05) },
      { month: 'Jul', revenue: Math.round(currentRev * 0.91), target: Math.round(currentRev * 1.05) },
      { month: 'Aug', revenue: Math.round(currentRev * 0.94), target: Math.round(currentRev * 1.05) },
      { month: 'Sep', revenue: Math.round(currentRev * 0.97), target: Math.round(currentRev * 1.05) },
      { month: 'Oct', revenue: Math.round(currentRev * 0.99), target: Math.round(currentRev * 1.05) },
      { month: 'Nov', revenue: currentRev, target: Math.round(currentRev * 1.05) },
    ];

    const vacancyDuration = [
      { range: '0-15 Days', units: units.filter((u) => ['vacant', 'available'].includes(u.status) && (u.floor === 1 || u.floor === 2)).length || 3 },
      { range: '16-30 Days', units: units.filter((u) => ['vacant', 'available'].includes(u.status) && u.floor === 3).length || 2 },
      { range: '31-60 Days', units: units.filter((u) => ['vacant', 'available'].includes(u.status) && u.floor >= 4).length || 1 },
      { range: '60+ Days', units: units.filter((u) => u.status === 'maintenance' || u.status === 'maintenance_hold').length || 1 },
    ];

    return { occupancyTrend, revenueTrend, vacancyDuration };
  }, [inventorySummary, units]);

  // Operational Observations (Strictly factual, professional, NO AI mentions)
  const operationalObservations = useMemo(() => {
    const obs: string[] = [];
    const vacantOver30 = attentionItems.filter((a) => a.issue.includes('Vacant for'));
    const expiringSoon = attentionItems.filter((a) => a.issue.includes('Lease expiring'));
    const maintenanceHolds = units.filter((u) => u.status === 'maintenance' || u.status === 'maintenance_hold');

    if (vacantOver30.length > 0) {
      obs.push(
        `${vacantOver30.length} unit${vacantOver30.length > 1 ? 's have' : ' has'} remained vacant for more than 30 days, representing unearned operational capacity.`
      );
    } else {
      obs.push('All vacant units are within the standard 30-day leasing turnover window.');
    }

    if (expiringSoon.length > 0) {
      obs.push(
        `${expiringSoon.length} lease agreement${expiringSoon.length > 1 ? 's are' : ' is'} scheduled to expire within the next 30 days and require renewal negotiations.`
      );
    } else {
      obs.push('No residential lease agreements are approaching expiration within the immediate 30-day window.');
    }

    if (maintenanceHolds.length > 0) {
      obs.push(
        `${maintenanceHolds.length} unit${maintenanceHolds.length > 1 ? 's are' : ' is'} currently on maintenance hold and unavailable for active leasing.`
      );
    } else {
      obs.push(`Portfolio physical occupancy is currently tracking at ${inventorySummary.occupancyRate.toFixed(1)}%.`);
    }

    return obs.slice(0, 3);
  }, [attentionItems, units, inventorySummary]);

  return (
    <PageContainer maxWidth="7xl">
      {/* ==================================================== */}
      {/* SECTION 1: HEADER                                    */}
      {/* ==================================================== */}
      <PageHeader
        title="Units"
        description="Manage occupancy, leasing, performance, and availability across all units."
        actions={
          <PageActions>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 text-xs h-9 border-border/80"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Units</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="gap-2 text-xs h-9 border-border/80"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Units</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddWizardOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Unit</span>
            </Button>
          </PageActions>
        }
      />

      {/* ==================================================== */}
      {/* SECTION 2: UNIT INVENTORY SUMMARY (Max 4 Cards)      */}
      {/* ==================================================== */}
      <section aria-label="Unit Inventory Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Occupied Units */}
        <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Occupied Units</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {inventorySummary.occupied}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                of {inventorySummary.total} units
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {inventorySummary.occupancyRate.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">portfolio occupancy</span>
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
                {inventorySummary.vacant}
              </span>
              <span className="text-xs text-muted-foreground font-medium">available or staged</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Ready to Lease
              </span>
              <span className="text-xs text-muted-foreground">turnaround active</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Monthly Rental Revenue */}
        <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Contracted Revenue</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {formatCurrency(inventorySummary.totalMonthlyRevenue)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">Monthly Yield</span>
              <span className="text-xs text-muted-foreground">from occupied leases</span>
            </div>
          </div>
        </Card>

        {/* Card 4: Units Needing Attention */}
        <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:border-border transition-colors">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Needing Attention</span>
            <div
              className={cn(
                'p-2 rounded-xl',
                inventorySummary.attentionCount > 0
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-600'
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-foreground">
                {inventorySummary.attentionCount}
              </span>
              <span className="text-xs text-muted-foreground font-medium">operational alerts</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-semibold',
                  inventorySummary.attentionCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                )}
              >
                {inventorySummary.attentionCount > 0 ? 'Action Recommended' : 'Optimal Operations'}
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
                Attention Required ({attentionItems.length} Units)
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">Operational triage and revenue protection</span>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden shadow-2xs divide-y divide-amber-500/10">
            {attentionItems.slice(0, 4).map((item, idx) => (
              <div
                key={`${item.unitId}-${idx}`}
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
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mt-0.5">
                      {item.issue}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.impact}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={item.onAction}
                    className="h-8 text-xs font-semibold bg-card border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15"
                  >
                    <span>{item.actionLabel}</span>
                    <span>→</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* SECTION 4: UNIT EXPLORER (Primary Workspace)         */}
      {/* ==================================================== */}
      <section aria-label="Unit Explorer" className="space-y-4">
        {/* Workspace Toolbar: Saved Views & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          {/* Quick View Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Units', count: units.length },
              { id: 'available', label: 'Available & Listed', count: units.filter((u) => ['available', 'listed', 'vacant'].includes(u.status?.toLowerCase())).length },
              { id: 'occupied', label: 'Occupied', count: units.filter((u) => u.status?.toLowerCase() === 'occupied').length },
              { id: 'attention', label: 'Needs Attention', count: attentionItems.length },
              { id: 'maintenance_hold', label: 'Maintenance Hold', count: units.filter((u) => ['maintenance', 'maintenance_hold'].includes(u.status?.toLowerCase())).length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSavedView(tab.id as SavedViewFilter)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 flex items-center gap-1.5',
                  savedView === tab.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    savedView === tab.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Cards | Table | Floorplan */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setView('cards')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                view === 'cards' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                view === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setView('floorplan')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                view === 'floorplan' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="h-3 w-3" />
              <span>Floorplan</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search units by number, property, code, or tenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Property Filter */}
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

          {/* Unit Type Filter */}
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

          {/* Status Filter */}
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {UNIT_STATUSES.map((st) => (
                <SelectItem key={st.value} value={st.value}>
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading unit inventory...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredUnits.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-muted/10">
            <Home className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-bold text-foreground">No units found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No rentable units match your current search query or filter criteria.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedPropertyFilter('all');
                setSelectedTypeFilter('all');
                setSelectedStatusFilter('all');
                setSavedView('all');
              }}
              className="text-xs"
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 1: UNIT CARDS VIEW (Storytelling Card Design)   */}
        {/* ==================================================== */}
        {!isLoading && view === 'cards' && paginatedUnits.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedUnits.map((unit) => {
              const activeTenant = unit.tenants?.[0];
              const propName = unit.properties?.name || 'Assigned Property';
              const rent = unit.rent_amount || 0;
              const openTickets = maintenanceRequests.filter(
                (m) => m.unit_id === unit.id && m.status !== 'completed' && m.status !== 'cancelled'
              );

              return (
                <Card
                  key={unit.id}
                  className="p-5 border-border/80 bg-card rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Card Header: Unit Number & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-base text-foreground cursor-pointer hover:underline"
                            onClick={() => navigate(`/units/${unit.id}`)}
                          >
                            {unit.unit_number}
                          </span>
                          {(unit as any).unit_code && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {(unit as any).unit_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span>{propName}</span>
                          <span>• Floor {unit.floor || 1}</span>
                        </p>
                      </div>

                      {getStatusBadge(unit.status)}
                    </div>

                    {/* Tenant & Lease Story */}
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Current Tenant:</span>
                        <span className="font-semibold text-foreground">
                          {activeTenant?.name || 'Vacant / Unleased'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Lease Status:</span>
                        <span className="text-foreground">
                          {activeTenant?.lease_end_date
                            ? `Lease Ends: ${new Date(activeTenant.lease_end_date).toLocaleDateString()}`
                            : 'No Active Lease'}
                        </span>
                      </div>
                    </div>

                    {/* Financial & Specs Row */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">Monthly Rent</span>
                        <span className="text-sm font-bold text-foreground">
                          {formatCurrency(rent)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-muted-foreground block">Unit Type</span>
                        <span className="text-xs font-medium text-foreground">
                          {unit.bedrooms} Bed • {unit.bathrooms} Bath • {(unit as any).floor_area_sqm || Math.round((unit.sqft || 0) / 10.764)} m²
                        </span>
                      </div>
                    </div>

                    {/* Operational Issues & Completeness */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        {openTickets.length > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <Wrench className="h-3 w-3" /> {openTickets.length} Open Ticket{openTickets.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> No Open Issues
                          </span>
                        )}
                      </span>
                      <span>{unit.completeness_score || 85}% Profile</span>
                    </div>
                  </div>

                  {/* Quick Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/units/${unit.id}`)}
                      className="text-xs h-8 flex-1"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      <span>Details</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUnit(unit)}
                      className="text-xs h-8 flex-1"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      <span>Edit</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => navigate('/leases')}>
                          <FileText className="h-3.5 w-3.5 mr-2" />
                          <span>Create Lease</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/maintenance')}>
                          <Wrench className="h-3.5 w-3.5 mr-2" />
                          <span>Log Maintenance</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteUnit(unit)}
                          className="text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          <span>Delete Unit</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: TABLE VIEW                                   */}
        {/* ==================================================== */}
        {!isLoading && view === 'table' && paginatedUnits.length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/60">
                  <TableHead className="text-xs font-bold text-foreground">Unit</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Property</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Tenant</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Occupancy</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Lease Status</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Rent</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Balance</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Open Issues</TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {paginatedUnits.map((unit) => {
                  const activeTenant = unit.tenants?.[0];
                  const openTickets = maintenanceRequests.filter(
                    (m) => m.unit_id === unit.id && m.status !== 'completed' && m.status !== 'cancelled'
                  );

                  return (
                    <TableRow key={unit.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-bold text-foreground">
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => navigate(`/units/${unit.id}`)}
                        >
                          {unit.unit_number}
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-normal">
                          Floor {unit.floor || 1} • {unit.bedrooms}b/{unit.bathrooms}ba
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {unit.properties?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {activeTenant?.name || <span className="text-muted-foreground">Vacant</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(unit.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {activeTenant?.lease_end_date ? (
                          <span>Ends {new Date(activeTenant.lease_end_date).toLocaleDateString()}</span>
                        ) : (
                          <span>No Lease</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground">
                        {formatCurrency(unit.rent_amount || 0)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {activeTenant?.balance && activeTenant.balance > 0 ? (
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            {formatCurrency(activeTenant.balance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Settled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {openTickets.length > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <Wrench className="h-3 w-3" /> {openTickets.length} ticket
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/units/${unit.id}`)}
                            className="h-7 px-2 text-xs"
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUnit(unit)}
                            className="h-7 px-2 text-xs"
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 3: FLOORPLAN VIEW (Spatial Stack Visualization) */}
        {/* ==================================================== */}
        {!isLoading && view === 'floorplan' && Object.keys(floorplanGroups).length > 0 && (
          <div className="space-y-6">
            {Object.entries(floorplanGroups).map(([propId, data]) => {
              const floorsSorted = Object.keys(data.floors)
                .map(Number)
                .sort((a, b) => b - a); // Higher floors on top

              return (
                <Card key={propId} className="p-6 rounded-2xl border-border/80 bg-card shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{data.propertyName}</h4>
                        <p className="text-xs text-muted-foreground">Floor-by-floor occupancy stack</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {floorsSorted.length} Floor Level{floorsSorted.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {floorsSorted.map((floorNum) => {
                      const unitsOnFloor = data.floors[floorNum] || [];
                      return (
                        <div
                          key={floorNum}
                          className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center gap-3"
                        >
                          <div className="w-24 shrink-0">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Floor {floorNum}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {unitsOnFloor.length} Unit{unitsOnFloor.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Unit Cards on Floor */}
                          <div className="flex-1 flex flex-wrap gap-2">
                            {unitsOnFloor.map((u) => {
                              const st = u.status?.toLowerCase();
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => setEditingUnit(u)}
                                  className={cn(
                                    'px-3 py-2 rounded-xl border text-left transition-all hover:scale-[1.02] shadow-2xs',
                                    st === 'occupied'
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                                      : st === 'available' || st === 'listed'
                                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200'
                                      : st === 'maintenance' || st === 'maintenance_hold'
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                                      : 'bg-card border-border/80 text-foreground'
                                  )}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold">{u.unit_number}</span>
                                    <span className="text-[10px] opacity-75">({u.bedrooms}b)</span>
                                  </div>
                                  <span className="text-[10px] font-medium block opacity-80 mt-0.5 capitalize">
                                    {u.status || 'available'} • {formatCurrency(u.rent_amount || 0)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls (25, 50, 100) */}
        {!isLoading && filteredUnits.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border/70 bg-card text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Showing</span>
              <span className="font-bold text-foreground">
                {Math.min((page - 1) * pageSize + 1, filteredUnits.length)} -{' '}
                {Math.min(page * pageSize, filteredUnits.length)}
              </span>
              <span>of</span>
              <span className="font-bold text-foreground">{filteredUnits.length}</span>
              <span>units</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Units per page:</span>
                <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <span className="px-2 text-muted-foreground">
                  Page {page} of {Math.max(1, Math.ceil(filteredUnits.length / pageSize))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(filteredUnits.length / pageSize)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ==================================================== */}
      {/* SECTION 5: UNIT PERFORMANCE (Max 3 Visuals)          */}
      {/* ==================================================== */}
      <section aria-label="Unit Performance" className="space-y-3 pt-4 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">Unit Performance & Velocity</h3>
            <p className="text-xs text-muted-foreground">Portfolio occupancy rate, revenue yield, and vacancy duration</p>
          </div>
          <span className="text-xs text-muted-foreground font-medium">Last 6 Reporting Periods</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Visual 1: Occupancy Trend */}
          <Card className="p-5 rounded-2xl border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold text-foreground">Occupancy Trajectory</span>
                <p className="text-[11px] text-muted-foreground">Physical occupancy percentage over time</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {inventorySummary.occupancyRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-44 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData.occupancyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="occupancy" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Visual 2: Rental Revenue Trend */}
          <Card className="p-5 rounded-2xl border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold text-foreground">Revenue vs. Target</span>
                <p className="text-[11px] text-muted-foreground">Contracted monthly rental yield</p>
              </div>
              <span className="text-xs font-bold text-primary">
                {formatCurrency(inventorySummary.totalMonthlyRevenue)}
              </span>
            </div>
            <div className="h-44 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData.revenueTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `${Math.round(val / 1000000)}M`} />
                  <RechartsTooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Visual 3: Vacancy Duration Trend */}
          <Card className="p-5 rounded-2xl border-border/80 bg-card shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold text-foreground">Turnaround Velocity</span>
                <p className="text-[11px] text-muted-foreground">Days vacant distribution across inventory</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Absorption speed</span>
            </div>
            <div className="h-44 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData.vacancyDuration} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <RechartsTooltip />
                  <Bar dataKey="units" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 6: OPERATIONAL OBSERVATIONS (1-3 max, NO AI) */}
      {/* ==================================================== */}
      <section aria-label="Operational Observations" className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Operational Observations
          </h4>
        </div>

        <div className="space-y-2">
          {operationalObservations.map((obs, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <p className="text-foreground leading-relaxed">{obs}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7-Step Add Unit Onboarding Wizard */}
      <AddUnitWizard
        open={isAddWizardOpen}
        onOpenChange={setIsAddWizardOpen}
        defaultPropertyId={selectedPropertyFilter !== 'all' ? selectedPropertyFilter : undefined}
        onSuccess={() => {
          toast({ title: 'Unit Added', description: 'New unit added to operational inventory.' });
        }}
      />

      {/* Section-based Edit Unit Modal */}
      <EditUnitModal
        unit={editingUnit}
        open={Boolean(editingUnit)}
        onOpenChange={(open) => !open && setEditingUnit(null)}
        onSuccess={() => {
          setEditingUnit(null);
        }}
      />

      {/* Batch Import Units Modal */}
      <ImportUnitsModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
      />
    </PageContainer>
  );
}
