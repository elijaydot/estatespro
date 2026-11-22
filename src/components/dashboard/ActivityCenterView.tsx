import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Wrench,
  FileText,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  Clock,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building2,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentActivity } from '@/hooks/useDashboardStats';
import { formatDistanceToNow, format } from 'date-fns';
import { useSettings } from '@/contexts/useSettings';
import { cn } from '@/lib/utils';

type ActivityFilterType = 'all' | 'payment' | 'maintenance' | 'invoice';

export function ActivityCenterView() {
  const navigate = useNavigate();
  const { data: activities = [], isLoading, refetch, isFetching } = useRecentActivity();
  const { formatCurrency } = useSettings();
  const [filterType, setFilterType] = useState<ActivityFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [activities, filterType, searchQuery]);

  const paymentCount = activities.filter((a) => a.type === 'payment').length;
  const maintenanceCount = activities.filter((a) => a.type === 'maintenance').length;
  const invoiceCount = activities.filter((a) => a.type === 'invoice').length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return CreditCard;
      case 'maintenance':
        return Wrench;
      default:
        return FileText;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'payment':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'maintenance':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
    }
  };

  const getAction = (type: string) => {
    switch (type) {
      case 'payment':
        return { label: 'View Ledger', href: '/payments' };
      case 'maintenance':
        return { label: 'Triage Ticket', href: '/maintenance' };
      default:
        return { label: 'Review Invoices', href: '/rent-collection' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Activity Metric Badges Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Events Logged</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{activities.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Real-time operational ledger</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Payments Settled</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{paymentCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Completed rental transactions</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Maintenance Events</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{maintenanceCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Tickets opened & status shifts</p>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 shadow-2xs">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">Billing Statements</p>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{invoiceCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Scheduled tenant rent invoices</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Button
            variant={filterType === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="text-xs h-8"
          >
            All Activity ({activities.length})
          </Button>
          <Button
            variant={filterType === 'payment' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('payment')}
            className="text-xs h-8 gap-1.5"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Payments ({paymentCount})</span>
          </Button>
          <Button
            variant={filterType === 'maintenance' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('maintenance')}
            className="text-xs h-8 gap-1.5"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Maintenance ({maintenanceCount})</span>
          </Button>
          <Button
            variant={filterType === 'invoice' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterType('invoice')}
            className="text-xs h-8 gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Invoices ({invoiceCount})</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event timeline..."
              className="pl-9 h-8 text-xs border-border/80 bg-background"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8 shrink-0"
            title="Refresh activity timeline"
          >
            <RotateCcw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin text-primary')} />
          </Button>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Chronological Operational Timeline</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Showing {filteredActivities.length} of {activities.length} logged events
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Clock className="h-8 w-8 text-muted-foreground/60 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No matching events found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filter or search criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredActivities.map((activity) => {
              const Icon = getIcon(activity.type);
              const action = getAction(activity.type);
              const relativeTime = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
              const fullDate = format(new Date(activity.timestamp), 'PPpp');

              return (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={cn('p-2.5 rounded-xl shrink-0 mt-0.5', getBadgeStyle(activity.type))}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{activity.title}</span>
                        <Badge variant="outline" className={cn('text-[10px] font-bold uppercase', getBadgeStyle(activity.type))}>
                          {activity.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{activity.description}</p>
                      <p className="text-[11px] text-muted-foreground/80 font-mono" title={fullDate}>
                        {relativeTime} · {fullDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(action.href)}
                      className="text-xs gap-1.5 h-8 text-primary hover:text-primary"
                    >
                      <span>{action.label}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
