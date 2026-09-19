import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  Shield,
  Siren,
  Activity,
  Layers,
  Check,
  Building2,
  Users,
  Key,
  PieChart,
  UserCheck,
  Sliders,
  AlertTriangle,
  History,
  Workflow,
  BarChart3,
  BadgePercent,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface ControlPlaneNavItem {
  id: string;
  label: string;
  description: string;
  badge?: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ControlPlaneNavGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ControlPlaneNavItem[];
}

export const CONTROL_PLANE_NAV_GROUPS: ControlPlaneNavGroup[] = [
  {
    id: 'monetization',
    title: 'Platform Monetization',
    icon: CreditCard,
    items: [
      {
        id: 'invoices',
        label: 'Invoices & Ledger',
        description: 'Multi-company invoice ledger, manual billing, and wire reconciliation',
        icon: FileText,
      },
      {
        id: 'subscriptions',
        label: 'Subscriptions & Plans',
        description: 'Manage landlord tiers, grace periods, and manual plan assignments',
        icon: BadgePercent,
      },
      {
        id: 'addons',
        label: 'Add-on Management',
        description: 'Enable or disable bespoke add-on modules and feature packages',
        icon: Sliders,
      },
      {
        id: 'revenue_analytics',
        label: 'Gateway & Revenue Analytics',
        description: 'Multi-currency revenue reconciliation, MRR, ARR, and payment gateways',
        icon: TrendingUp,
      },
    ],
  },
  {
    id: 'governance',
    title: 'Governance & Security',
    icon: Shield,
    items: [
      {
        id: 'safety',
        label: 'Safety & Overrides',
        description: 'Tenant isolation boundaries, principal suspensions, and overrides',
        icon: Shield,
      },
      {
        id: 'events',
        label: 'Audit Events Log',
        description: 'Immutable platform action audit logs, actor traces, and payload inspection',
        icon: History,
      },
      {
        id: 'decisions',
        label: 'Entitlement Decisions',
        description: 'Real-time policy evaluation traces, permission decisions, and reason codes',
        icon: Key,
      },
      {
        id: 'operators',
        label: 'Platform Operators',
        description: 'Assign or revoke SuperAdmin and Platform Operator roles',
        icon: UserCheck,
      },
      {
        id: 'impersonation',
        label: 'Impersonation Sessions',
        description: 'Audit and track active operator company support impersonations',
        icon: Users,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Health & Operations',
    icon: Activity,
    items: [
      {
        id: 'drift',
        label: 'System Drift Checks',
        description: 'Database schema, RLS drift detection, and health telemetry',
        icon: Activity,
      },
      {
        id: 'usage',
        label: 'Usage Snapshots',
        description: 'Resource consumption, property quotas, and tenant envelopes',
        icon: BarChart3,
      },
      {
        id: 'risk_queue',
        label: 'Risk Triage Queue',
        description: 'High-risk automated actions, security alerts, and operator interventions',
        icon: AlertTriangle,
      },
      {
        id: 'analytics_ops',
        label: 'Analytics / Ops Signals',
        description: 'Consolidated incident timelines, correlation patterns, and signals',
        icon: PieChart,
      },
    ],
  },
  {
    id: 'directory',
    title: 'Directories (360°)',
    icon: Building2,
    items: [
      {
        id: 'company360',
        label: 'Company 360° Directory',
        description: 'Inspect full portfolio, billing, members, and quota states per company',
        icon: Building2,
      },
      {
        id: 'user360',
        label: 'User 360° Directory',
        description: 'Cross-organization user profile, memberships, and platform roles',
        icon: Users,
      },
      {
        id: 'publisher_verifications',
        label: 'Publisher Verifications',
        description: 'Review and approve marketplace publisher credentials and identity',
        icon: UserCheck,
      },
    ],
  },
];

interface ControlPlaneSidebarNavProps {
  activeView: string;
  onSelectView: (viewId: string) => void;
  openAlertsCount?: number;
  openInvoicesCount?: number;
}

export function ControlPlaneSidebarNav({
  activeView,
  onSelectView,
  openAlertsCount = 0,
  openInvoicesCount = 0,
}: ControlPlaneSidebarNavProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Expand all groups by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(['monetization', 'governance', 'operations', 'directory'])
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const query = searchQuery.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    return CONTROL_PLANE_NAV_GROUPS.map((group) => {
      if (!query) return group;
      const matchedItems = group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
      );
      return {
        ...group,
        items: matchedItems,
      };
    }).filter((group) => !query || group.items.length > 0);
  }, [query]);

  return (
    <div className="flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border/70 select-none shrink-0">
      {/* Header with Back Arrow to Main Dashboard */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border/70">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 px-2 py-1.5 rounded-lg transition-colors group w-full"
          title="Return to Main Dashboard"
        >
          <ArrowLeft className="h-4 w-4 text-sidebar-foreground/70 group-hover:-translate-x-0.5 transition-transform" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm tracking-tight">Control Plane</span>
            <span className="text-[10px] text-sidebar-foreground/50 font-mono">Platform Admin</span>
          </div>
        </button>
      </div>

      {/* Real-time Search Input */}
      <div className="p-3 border-b border-sidebar-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search control plane..."
            className="h-8 pl-8 text-xs bg-sidebar-accent/30 border-sidebar-border/60 text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground bg-sidebar-border/40 rounded px-1"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-sm scrollbar-thin scrollbar-thumb-sidebar-border">
        {/* All Platform Hub Landing Link */}
        <button
          type="button"
          onClick={() => onSelectView('overview')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
            activeView === 'overview'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Platform Overview Hub</span>
          </div>
          {activeView === 'overview' && <Check className="h-3.5 w-3.5" />}
        </button>

        {/* Categories List */}
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id) || !!query;
          const GroupIcon = group.icon;
          const hasActiveChild = group.items.some((item) => item.id === activeView);

          return (
            <div key={group.id} className="space-y-0.5">
              {/* Accordion Toggle Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  hasActiveChild && !isExpanded
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <GroupIcon className="h-3.5 w-3.5 text-primary" />
                  <span className="uppercase tracking-wider text-[11px] font-bold">{group.title}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                )}
              </button>

              {/* Sub-items List */}
              {isExpanded && (
                <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l border-sidebar-border/40 ml-4">
                  {group.items.map((item) => {
                    const isActive = item.id === activeView;
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectView(item.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left group',
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemIcon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground')} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.id === 'invoices' && openInvoicesCount > 0 && (
                          <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 font-bold border-0', isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-500')}>
                            {openInvoicesCount}
                          </Badge>
                        )}
                        {item.id === 'safety' && openAlertsCount > 0 && (
                          <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 font-bold border-0', isActive ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-500')}>
                            {openAlertsCount}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
