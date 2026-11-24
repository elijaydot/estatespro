import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Wrench,
  FileText,
  Search,
  Filter,
  Download,
  ArrowRight,
  Clock,
  Calendar,
  Building2,
  Users,
  Home,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';
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
import { usePayments, type Payment } from '@/hooks/usePayments';
import { useInvoices, type Invoice } from '@/hooks/useInvoices';
import { useMaintenanceRequests, type MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useLeases, type Lease } from '@/hooks/useLeases';
import { useTenants, type Tenant } from '@/hooks/useTenants';
import { useProperties, type Property } from '@/hooks/useProperties';
import { useUnits, type Unit } from '@/hooks/useUnits';
import { useSettings } from '@/contexts/useSettings';
import { toast } from '@/components/ui/use-toast';
import {
  format,
  isToday,
  isYesterday,
  subDays,
  differenceInDays,
} from 'date-fns';
import { cn } from '@/lib/utils';

type ActivityCategory = 'all' | 'payment' | 'maintenance' | 'invoice' | 'lease' | 'tenant';
type DateRangeOption = 'all' | 'today' | '7days' | '30days';

interface UnifiedActivityItem {
  id: string;
  category: 'payment' | 'maintenance' | 'invoice' | 'lease' | 'tenant' | 'inspection' | 'communication';
  description: string;
  propertyContext: string;
  timestamp: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action?: {
    label: string;
    href: string;
  };
}

interface AttentionItem {
  id: string;
  priority: string;
  badgeStyle: string;
  title: string;
  description: string;
  impact: string;
  actionLabel: string;
  actionHref: string;
}

export function ActivityCenterView() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();

  // Primary operational hooks
  const { data: rawPayments = [], isLoading: paymentsLoading } = usePayments();
  const { data: rawInvoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: rawMaintenance = [], isLoading: maintenanceLoading } = useMaintenanceRequests();
  const { data: rawLeases = [], isLoading: leasesLoading } = useLeases();
  const { data: rawTenants = [] } = useTenants();
  const { data: rawProperties = [] } = useProperties();
  const { data: rawUnits = [] } = useUnits();

  const payments = Array.isArray(rawPayments) ? (rawPayments as Payment[]) : [];
  const invoices = Array.isArray(rawInvoices) ? (rawInvoices as Invoice[]) : [];
  const maintenance = Array.isArray(rawMaintenance) ? (rawMaintenance as MaintenanceRequest[]) : [];
  const leases = Array.isArray(rawLeases) ? (rawLeases as Lease[]) : [];
  const tenants = Array.isArray(rawTenants) ? (rawTenants as Tenant[]) : [];
  const properties = Array.isArray(rawProperties) ? (rawProperties as Property[]) : [];
  const units = Array.isArray(rawUnits) ? (rawUnits as Unit[]) : [];

  const isLoading = paymentsLoading || invoicesLoading || maintenanceLoading || leasesLoading;

  // Lookup maps for fast and human-friendly property context
  const propertyMap = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const tenantMap = useMemo(() => new Map(tenants.map((t) => [t.id, t.name])), [tenants]);

  // Filter & Search state
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Helper to resolve property & unit text
  const resolveContext = (propertyId?: string | null, unitId?: string | null) => {
    const propName = propertyId ? propertyMap.get(propertyId) : null;
    const unit = unitId ? unitMap.get(unitId) : null;

    if (propName && unit?.unit_number) {
      return `${propName} • Unit ${unit.unit_number}`;
    }
    if (propName) return propName;
    if (unit?.unit_number) return `Unit ${unit.unit_number}`;
    return 'Portfolio Estate';
  };

  // 1. Synthesize Human-Language Unified Activity Feed
  const allActivities = useMemo<UnifiedActivityItem[]>(() => {
    const items: UnifiedActivityItem[] = [];

    // Payments -> Human Language
    payments.forEach((payment) => {
      const tenantName = payment.tenant_id ? tenantMap.get(payment.tenant_id) : null;
      const context = resolveContext(null, null);

      items.push({
        id: `pay-${payment.id}`,
        category: 'payment',
        description: tenantName
          ? `${tenantName} paid rent of ${formatCurrency(payment.amount)}.`
          : `Rental payment of ${formatCurrency(payment.amount)} was received.`,
        propertyContext: context,
        timestamp: payment.created_at,
        priority: 'low',
        action: {
          label: 'View Payment',
          href: '/payments',
        },
      });
    });

    // Invoices -> Human Language
    invoices.forEach((invoice) => {
      const tenantName = invoice.tenant_id ? tenantMap.get(invoice.tenant_id) : null;
      const context = resolveContext(invoice.property_id, invoice.unit_id);

      items.push({
        id: `inv-${invoice.id}`,
        category: 'invoice',
        description: tenantName
          ? `An invoice of ${formatCurrency(invoice.amount)} was created for ${tenantName}.`
          : `Invoice #${invoice.invoice_number} of ${formatCurrency(invoice.amount)} was generated.`,
        propertyContext: context,
        timestamp: invoice.created_at,
        priority: invoice.status === 'overdue' ? 'high' : 'low',
        action: {
          label: 'Review Invoice',
          href: '/invoices',
        },
      });
    });

    // Maintenance -> Human Language
    maintenance.forEach((req) => {
      const context = resolveContext(req.property_id, req.unit_id);
      const isDone = req.status === 'completed';

      items.push({
        id: `maint-${req.id}`,
        category: 'maintenance',
        description: isDone
          ? `${req.title} was completed at ${context}.`
          : `${req.title} was reported at ${context}.`,
        propertyContext: context,
        timestamp: req.created_at,
        priority: req.priority === 'urgent' ? 'urgent' : req.priority === 'high' ? 'high' : 'medium',
        action: {
          label: isDone ? 'View Record' : 'Triage Ticket',
          href: '/maintenance',
        },
      });
    });

    // Leases -> Human Language
    leases.forEach((lease) => {
      const tenantName = lease.tenant_id ? tenantMap.get(lease.tenant_id) : 'Resident';
      const context = resolveContext(lease.property_id, lease.unit_id);

      items.push({
        id: `lease-${lease.id}`,
        category: 'lease',
        description: `New lease agreement was activated for ${tenantName} in ${context}.`,
        propertyContext: context,
        timestamp: lease.created_at || lease.start_date,
        priority: 'low',
        action: {
          label: 'View Lease',
          href: '/leases',
        },
      });
    });

    // Tenants -> Human Language
    tenants.forEach((tenant) => {
      const context = resolveContext(tenant.property_id, tenant.unit_id);

      items.push({
        id: `tenant-${tenant.id}`,
        category: 'tenant',
        description: `Resident profile was registered for ${tenant.name}.`,
        propertyContext: context,
        timestamp: tenant.created_at || new Date().toISOString(),
        priority: 'low',
        action: {
          label: 'View Profile',
          href: `/tenants/${tenant.id}`,
        },
      });
    });

    // Sort chronologically descending (newest first)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [payments, invoices, maintenance, leases, tenants, tenantMap, propertyMap, unitMap, formatCurrency]);

  // 2. Filtered Activities
  const filteredActivities = useMemo(() => {
    const now = new Date();

    return allActivities.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Property filter
      if (selectedPropertyId !== 'all') {
        const selectedName = propertyMap.get(selectedPropertyId) || '';
        if (!item.propertyContext.toLowerCase().includes(selectedName.toLowerCase())) {
          return false;
        }
      }

      // Date range filter
      if (dateRange !== 'all') {
        const itemDate = new Date(item.timestamp);
        if (dateRange === 'today' && !isToday(itemDate)) {
          return false;
        }
        if (dateRange === '7days' && differenceInDays(now, itemDate) > 7) {
          return false;
        }
        if (dateRange === '30days' && differenceInDays(now, itemDate) > 30) {
          return false;
        }
      }

      // Search query (Properties, Tenants, Invoices, Maintenance Tickets, Leases)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDescription = item.description.toLowerCase().includes(q);
        const matchesContext = item.propertyContext.toLowerCase().includes(q);
        if (!matchesDescription && !matchesContext) {
          return false;
        }
      }

      return true;
    });
  }, [allActivities, selectedCategory, selectedPropertyId, dateRange, searchQuery, propertyMap]);

  // 3. SECTION 2: TODAY SUMMARY COUNTS (Minimal vertical space, counts only)
  const todayPaymentsCount = useMemo(() => {
    return payments.filter((p) => isToday(new Date(p.created_at))).length;
  }, [payments]);

  const todayInvoicesCount = useMemo(() => {
    return invoices.filter((i) => isToday(new Date(i.created_at))).length;
  }, [invoices]);

  const todayMaintenanceCount = useMemo(() => {
    return maintenance.filter((m) => isToday(new Date(m.created_at))).length;
  }, [maintenance]);

  // 4. SECTION 3: ATTENTION REQUIRED (HERO SECTION - Immediate Prioritization)
  const attentionRequiredItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    const now = new Date();

    // 1. Expiring Leases within 30 days
    const expiringLeases = leases.filter((l) => {
      if (l.status !== 'active') return false;
      const days = differenceInDays(new Date(l.end_date), now);
      return days >= 0 && days <= 30;
    });
    if (expiringLeases.length > 0) {
      items.push({
        id: 'attention-leases',
        priority: 'Requires Action',
        badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        title: 'Lease Renewal Required',
        description: `${expiringLeases.length} ${expiringLeases.length === 1 ? 'lease expires' : 'leases expire'} within thirty days.`,
        impact: 'Early engagement prevents unplanned vacancy.',
        actionLabel: 'Review Renewals',
        actionHref: '/leases',
      });
    }

    // 2. Overdue Rent Invoices
    const overdueInvoices = invoices.filter((inv) => {
      return inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.due_date) < now);
    });
    if (overdueInvoices.length > 0) {
      const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + (inv.amount - (inv.paid_amount || 0)), 0);
      items.push({
        id: 'attention-overdue',
        priority: 'Financial Follow-Up',
        badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        title: 'Overdue Rent',
        description: `${overdueInvoices.length} payment ${overdueInvoices.length === 1 ? 'account requires' : 'accounts require'} follow-up.`,
        impact: `Outstanding arrears balance of ${formatCurrency(overdueTotal)}.`,
        actionLabel: 'Review Accounts',
        actionHref: '/payments?view=collections',
      });
    }

    // 3. Urgent / Open Maintenance Tickets
    const urgentTickets = maintenance.filter(
      (m) => (m.priority === 'urgent' || m.priority === 'high') && m.status !== 'completed' && m.status !== 'cancelled'
    );
    if (urgentTickets.length > 0) {
      items.push({
        id: 'attention-maintenance',
        priority: 'High Priority',
        badgeStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        title: 'Urgent Maintenance Dispatch',
        description: `${urgentTickets.length} urgent repair ${urgentTickets.length === 1 ? 'ticket requires' : 'tickets require'} contractor dispatch.`,
        impact: 'Delays impact tenant satisfaction and asset integrity.',
        actionLabel: 'Dispatch Contractor',
        actionHref: '/maintenance',
      });
    }

    // 4. Vacant Units Available for Lease
    const vacantUnits = units.filter((u) => u.status === 'vacant');
    if (vacantUnits.length > 0) {
      items.push({
        id: 'attention-vacant',
        priority: 'Yield Opportunity',
        badgeStyle: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        title: 'Vacant Units Ready for Marketing',
        description: `${vacantUnits.length} unoccupied ${vacantUnits.length === 1 ? 'unit is' : 'units are'} ready for prospective tenants.`,
        impact: 'Unleased units represent unrealized monthly cashflow.',
        actionLabel: 'View Vacancies',
        actionHref: '/properties',
      });
    }

    return items;
  }, [leases, invoices, maintenance, units, formatCurrency]);

  // 5. SECTION 4: TIME GROUPING (Today, Yesterday, This Week, Earlier)
  const groupedActivities = useMemo(() => {
    const groups: {
      today: UnifiedActivityItem[];
      yesterday: UnifiedActivityItem[];
      thisWeek: UnifiedActivityItem[];
      earlier: UnifiedActivityItem[];
    } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };

    const now = new Date();

    filteredActivities.forEach((item) => {
      const itemDate = new Date(item.timestamp);
      if (isToday(itemDate)) {
        groups.today.push(item);
      } else if (isYesterday(itemDate)) {
        groups.yesterday.push(item);
      } else if (differenceInDays(now, itemDate) <= 7) {
        groups.thisWeek.push(item);
      } else {
        groups.earlier.push(item);
      }
    });

    return groups;
  }, [filteredActivities]);

  // 6. SECTION 5: OPERATIONAL OBSERVATIONS (One single, useful 2-line observation in human PM voice)
  const operationalObservation = useMemo(() => {
    const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;
    const openTicketsCount = maintenance.filter((m) => m.status !== 'completed').length;
    const expiringCount = leases.filter((l) => {
      if (l.status !== 'active') return false;
      const days = differenceInDays(new Date(l.end_date), new Date());
      return days >= 0 && days <= 30;
    }).length;

    if (overdueCount === 0 && openTicketsCount === 0) {
      return 'Portfolio operations are running smoothly with complete rent settlement and all maintenance requests resolved.';
    }
    if (overdueCount > 0) {
      return `Rent collection remains active this cycle, with ${overdueCount} tenant ${overdueCount === 1 ? 'account' : 'accounts'} requiring targeted collection follow-up.`;
    }
    if (expiringCount > 0) {
      return `Several leases will require renewal planning soon to maintain steady physical occupancy across properties.`;
    }
    if (openTicketsCount > 0) {
      return `Maintenance turnaround is steady this week with active repair dispatches progressing across managed estates.`;
    }
    return 'Operational velocity is consistent across your properties with regular rent collection and tenant communications.';
  }, [invoices, maintenance, leases]);

  // Export Activity to CSV
  const handleExportCsv = () => {
    if (filteredActivities.length === 0) {
      toast({ title: 'No Activity', description: 'There are no activities matching current filters to export.' });
      return;
    }

    const headers = ['Timestamp', 'Category', 'Description', 'Property Context'];
    const rows = filteredActivities.map((a) => [
      `"${format(new Date(a.timestamp), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"${a.category}"`,
      `"${a.description.replace(/"/g, '""')}"`,
      `"${a.propertyContext.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fishgate-activity-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Export Complete', description: 'Activity timeline exported successfully.' });
  };

  // Helper category icon
  const getCategoryIcon = (category: UnifiedActivityItem['category']) => {
    switch (category) {
      case 'payment':
        return CreditCard;
      case 'maintenance':
        return Wrench;
      case 'invoice':
        return FileText;
      case 'lease':
        return Calendar;
      case 'tenant':
        return Users;
      case 'inspection':
        return ClipboardList;
      default:
        return Home;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ====================================================
          SECTION 1: PAGE HEADER
          ==================================================== */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Activity Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Stay informed about important events occurring across your portfolio.
          </p>
        </div>

        {/* Clean, Non-Intrusive Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Toggle */}
          <Button
            variant={isFilterBarOpen ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
            className="gap-1.5 text-xs h-9 border-border/80"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {(selectedCategory !== 'all' || selectedPropertyId !== 'all' || dateRange !== 'all') && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary ml-0.5" />
            )}
          </Button>

          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(val: DateRangeOption) => setDateRange(val)}>
            <SelectTrigger className="h-9 text-xs w-[130px] border-border/80">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Activity */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs h-9 border-border/80"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Activity</span>
          </Button>
        </div>
      </header>

      {/* ====================================================
          SECTION 2: TODAY SUMMARY (Counts only, minimal vertical space)
          ==================================================== */}
      <section aria-label="Today Operational Summary">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground block truncate">
              Payments Received
            </span>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              {todayPaymentsCount}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground block truncate">
              Invoices Generated
            </span>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              {todayInvoicesCount}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground block truncate">
              Maintenance Updates
            </span>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              {todayMaintenanceCount}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground block truncate">
              Attention Needed
            </span>
            <p className={cn(
              'text-2xl sm:text-3xl font-bold tracking-tight mt-1',
              attentionRequiredItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
            )}>
              {attentionRequiredItems.length}
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================
          SECTION 3: ATTENTION REQUIRED (HERO SECTION - Immediate Prioritization)
          ==================================================== */}
      <section aria-label="Attention Required" className="space-y-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {attentionRequiredItems.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Attention Required
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Immediate operational priorities requiring awareness or action.
              </p>
            </div>
            {attentionRequiredItems.length > 0 && (
              <Badge variant="outline" className="text-xs font-mono">
                {attentionRequiredItems.length} {attentionRequiredItems.length === 1 ? 'Action Item' : 'Action Items'}
              </Badge>
            )}
          </div>

          {attentionRequiredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
              {attentionRequiredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/80 p-4 bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground">{item.title}</span>
                      <Badge className={cn('text-[10px] font-semibold uppercase tracking-wider', item.badgeStyle)}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{item.impact}</p>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(item.actionHref)}
                      className="gap-1.5 text-xs h-8 border-border/80 hover:bg-background"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center space-y-2 bg-emerald-500/5">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-foreground">All operations on track</p>
              <p className="text-xs text-muted-foreground">
                No urgent arrears, expiring leases, or pending work orders require attention.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ====================================================
          SECTION 4: RECENT ACTIVITY TIMELINE (Grouped by time)
          ==================================================== */}
      <section aria-label="Recent Operational Activity" className="space-y-4">
        {/* Lightweight Search & Filter Toolbar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties, tenants, invoices, or tickets..."
                className="pl-9 h-9 text-xs border-border/80 bg-card"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'payment', label: 'Payments' },
                { id: 'maintenance', label: 'Maintenance' },
                { id: 'invoice', label: 'Invoices' },
                { id: 'lease', label: 'Leases' },
                { id: 'tenant', label: 'Tenants' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as ActivityCategory)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Expanded Property Filter */}
          {isFilterBarOpen && (
            <div className="p-3 rounded-xl border border-border/80 bg-card flex items-center gap-3 animate-enter">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Filter by Property:</span>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="h-8 text-xs max-w-xs border-border/80">
                  <SelectValue placeholder="All Properties" />
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
          )}
        </div>

        {/* Chronological Activity Feed */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Recent Activity
            </h3>
            <span className="text-xs text-muted-foreground">
              {filteredActivities.length} {filteredActivities.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading operational events...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center space-y-2 bg-muted/10">
              <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No recent events found</p>
              <p className="text-xs text-muted-foreground">
                There are no activity records matching your active filters.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group 1: Today */}
              {groupedActivities.today.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
                    Today
                  </span>
                  <div className="space-y-2">
                    {groupedActivities.today.map((item) => (
                      <ActivityRow
                        key={item.id}
                        item={item}
                        getCategoryIcon={getCategoryIcon}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Group 2: Yesterday */}
              {groupedActivities.yesterday.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
                    Yesterday
                  </span>
                  <div className="space-y-2">
                    {groupedActivities.yesterday.map((item) => (
                      <ActivityRow
                        key={item.id}
                        item={item}
                        getCategoryIcon={getCategoryIcon}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Group 3: This Week */}
              {groupedActivities.thisWeek.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
                    This Week
                  </span>
                  <div className="space-y-2">
                    {groupedActivities.thisWeek.map((item) => (
                      <ActivityRow
                        key={item.id}
                        item={item}
                        getCategoryIcon={getCategoryIcon}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Group 4: Earlier */}
              {groupedActivities.earlier.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 block">
                    Earlier
                  </span>
                  <div className="space-y-2">
                    {groupedActivities.earlier.map((item) => (
                      <ActivityRow
                        key={item.id}
                        item={item}
                        getCategoryIcon={getCategoryIcon}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ====================================================
          SECTION 5: OPERATIONAL OBSERVATIONS (No AI branding, human manager voice)
          ==================================================== */}
      <section aria-label="Operational Observations">
        <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 sm:p-6 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Operational Observation
          </span>
          <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed">
            {operationalObservation}
          </p>
        </div>
      </section>
    </div>
  );
}

// Consistent, Human-Centric Activity Row Component
function ActivityRow({
  item,
  getCategoryIcon,
  onNavigate,
}: {
  item: UnifiedActivityItem;
  getCategoryIcon: (cat: UnifiedActivityItem['category']) => React.ElementType;
  onNavigate: (href: string) => void;
}) {
  const Icon = getCategoryIcon(item.category);
  const formattedTime = format(new Date(item.timestamp), 'h:mm a');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-center text-foreground shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-foreground leading-snug">
            {item.description}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {item.propertyContext && <span>{item.propertyContext}</span>}
            {item.propertyContext && <span>•</span>}
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {item.action && (
        <div className="flex items-center justify-end sm:self-center shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item.action!.href)}
            className="text-xs gap-1 h-7 text-muted-foreground hover:text-foreground"
          >
            <span>{item.action.label}</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
