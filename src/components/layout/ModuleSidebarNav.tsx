import { useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Building2,
  Store,
  Flame,
  Radar,
  MessageSquare,
  Megaphone,
  Bell,
  Check,
  Star,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  WORKSPACE_MODULE_CONFIGS,
  type ModuleNavItem,
  type ModuleNavGroup,
} from '@/lib/moduleNavigationConfig';
import type { StaffWorkspaceId } from '@/lib/workspaceNavigation';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsInternalMarketplaceReviewer } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/useAuth';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

interface ModuleSidebarNavProps {
  workspaceId: StaffWorkspaceId;
  onBackToFullMenu: () => void;
  onNavigate?: () => void;
  availableWorkspaces?: StaffWorkspaceId[];
  onSwitchWorkspace?: (wsId: StaffWorkspaceId) => void;
  collapsed?: boolean;
}

export function ModuleSidebarNav({
  workspaceId,
  onBackToFullMenu,
  onNavigate,
  availableWorkspaces = ['property-management', 'marketplace', 'crm'],
  onSwitchWorkspace,
  collapsed = false,
}: ModuleSidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, isLandlord } = useUserRole();
  const { entitlements } = useSaasAccess();
  const reviewerAccess = useIsInternalMarketplaceReviewer(user?.id);
  const canReviewMarketplace = role === 'super_admin' || reviewerAccess.data === true;
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: unreadNotificationCount = 0 } = useUnreadNotificationsCount();

  const config = WORKSPACE_MODULE_CONFIGS[workspaceId] || WORKSPACE_MODULE_CONFIGS['property-management'];
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expanded groups (default all expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(config.groups.map((g) => g.id))
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

  // Filter groups and items based on permissions and search query
  const filteredGroups = useMemo(() => {
    return config.groups
      .map((group) => {
        const allowedItems = group.items.filter((item) => {
          if (item.entitlementKey && !entitlements[item.entitlementKey] && role !== 'super_admin') {
            return false;
          }
          if (item.reviewerOnly && !canReviewMarketplace) {
            return false;
          }
          return true;
        });

        if (!query) {
          return { ...group, items: allowedItems };
        }

        const matchedItems = allowedItems.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.tags.some((tag) => tag.toLowerCase().includes(query))
        );

        return { ...group, items: matchedItems };
      })
      .filter((group) => group.items.length > 0);
  }, [config, query, entitlements, role, canReviewMarketplace]);

  const handleSelectItem = (href: string) => {
    navigate(href);
    onNavigate?.();
  };

  const getWorkspaceIcon = (id: StaffWorkspaceId) => {
    switch (id) {
      case 'property-management': return Building2;
      case 'marketplace': return Store;
      case 'crm': return Flame;
      case 'control-plane': return Radar;
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground select-none">
      {/* Header with Back Arrow and Module Title */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border/70">
        <button
          type="button"
          onClick={onBackToFullMenu}
          className="flex items-center gap-2 text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 px-2 py-1.5 rounded-lg transition-colors group text-left"
          title="Back to all modules"
        >
          <ArrowLeft className="h-4 w-4 text-sidebar-foreground/70 group-hover:-translate-x-0.5 transition-transform" />
          <div>
            <span className="font-semibold text-sm leading-none block">{config.shortName}</span>
            <span className="text-[10px] text-sidebar-foreground/50 leading-none">Module navigation</span>
          </div>
        </button>

        <Badge variant="outline" className="text-[10px] bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground/70">
          {config.name.split(' ')[0]}
        </Badge>
      </div>

      {/* Real-time Search Input */}
      <div className="p-3 border-b border-sidebar-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${config.shortName}...`}
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

      {/* Module Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-sm scrollbar-thin scrollbar-thumb-sidebar-border">
        {filteredGroups.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-sidebar-foreground/40 italic">
            No matching features found in {config.name}.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id) || !!query;
            const GroupIcon = group.icon;
            const hasActiveItem = group.items.some(
              (item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
            );

            return (
              <div key={group.id} className="space-y-0.5">
                {/* Group Header Accordion */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    hasActiveItem && !isExpanded
                      ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                    <span>{group.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50" />
                  )}
                </button>

                {/* Sub-Items */}
                {isExpanded && (
                  <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-sidebar-border/40 ml-4">
                    {group.items.map((item) => {
                      const isActive =
                        location.pathname === item.href ||
                        (item.href !== '/dashboard' && item.href !== '/marketplace' && location.pathname.startsWith(`${item.href}/`));
                      const ItemIcon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectItem(item.href)}
                          className={cn(
                            'w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded text-xs transition-all group',
                            isActive
                              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                          )}
                          title={item.description}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-80 group-hover:opacity-100" />
                            <span className="truncate">{item.shortLabel || item.label}</span>
                          </div>

                          {item.id === 'pm-alerts' && openAlertCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="h-4 px-1.5 text-[9px] bg-destructive text-destructive-foreground"
                            >
                              {openAlertCount}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Quick Workspace Switcher */}
      <div className="p-3 border-t border-sidebar-border/60 bg-sidebar-accent/20 space-y-1.5">
        <p className="px-1 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Switch Module
        </p>
        <div className="grid grid-cols-3 gap-1">
          {availableWorkspaces.map((wsId) => {
            const wsConfig = WORKSPACE_MODULE_CONFIGS[wsId];
            if (!wsConfig) return null;
            const WsIcon = getWorkspaceIcon(wsId);
            const isCurrent = wsId === workspaceId;

            return (
              <button
                key={wsId}
                type="button"
                onClick={() => {
                  onSwitchWorkspace?.(wsId);
                  const landingHref = wsConfig.groups[0]?.items[0]?.href || '/dashboard';
                  navigate(landingHref);
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-1.5 rounded text-[10px] font-medium transition-all',
                  isCurrent
                    ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
                title={wsConfig.name}
              >
                <WsIcon className="h-3.5 w-3.5 mb-0.5" />
                <span className="truncate max-w-[4rem] text-center leading-tight">
                  {wsConfig.shortName.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
