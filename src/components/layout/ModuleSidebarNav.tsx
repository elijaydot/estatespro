import { useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
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
  CircleHelp,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSuperAdminOverride } from '@/hooks/useSuperAdminOverride';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

interface ModuleSidebarNavProps {
  workspaceId: StaffWorkspaceId;
  onNavigate?: () => void;
  availableWorkspaces?: StaffWorkspaceId[];
  onSwitchWorkspace?: (wsId: StaffWorkspaceId) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobile?: boolean;
}

export function ModuleSidebarNav({
  workspaceId,
  onNavigate,
  availableWorkspaces = ['property-management', 'marketplace', 'crm'],
  onSwitchWorkspace,
  collapsed = false,
  onCollapsedChange,
  mobile = false,
}: ModuleSidebarNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { role } = useUserRole();
  const { companies, activeCompanyId, setActiveCompanyId } = useActiveCompany();
  const { entitlements } = useSaasAccess();
  const { canOverride, overrideEnabled, setOverrideEnabled } = useSuperAdminOverride();
  const reviewerAccess = useIsInternalMarketplaceReviewer(user?.id);
  const canReviewMarketplace = role === 'super_admin' || reviewerAccess.data === true;
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: unreadNotificationCount = 0 } = useUnreadNotificationsCount();

  const [showCompanies, setShowCompanies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const config = WORKSPACE_MODULE_CONFIGS[workspaceId] || WORKSPACE_MODULE_CONFIGS['property-management'];

  // Communication items
  const communicationItems: ModuleNavItem[] = useMemo(() => {
    const items: ModuleNavItem[] = [
      {
        id: 'global-messages',
        label: 'Messages',
        shortLabel: 'Messages',
        href: '/messages',
        icon: MessageSquare,
        description: 'Direct messages with tenants, vendors, and staff.',
        tags: ['messages', 'chat', 'inbox'],
      },
    ];

    if (role === 'landlord' || role === 'property_manager' || role === 'super_admin') {
      items.push({
        id: 'global-broadcasts',
        label: 'Broadcasts',
        shortLabel: 'Broadcasts',
        href: '/broadcasts',
        icon: Megaphone,
        description: 'Portfolio-wide and estate-wide tenant announcements.',
        tags: ['broadcasts', 'announcements', 'notices'],
      });
    }

    items.push({
      id: 'global-notifications',
      label: 'Notifications',
      shortLabel: 'Notifications',
      href: '/notifications',
      icon: Bell,
      description: 'System alerts, task updates, and event alerts.',
      tags: ['notifications', 'alerts', 'inbox'],
    });

    return items;
  }, [role]);

  const communicationGroup: ModuleNavGroup = useMemo(() => ({
    id: 'group-communication',
    title: 'Communication',
    icon: MessageSquare,
    description: 'Tenant messages, broadcast announcements, and notification logs.',
    items: communicationItems,
  }), [communicationItems]);

  // Combined groups
  const allGroups = useMemo(() => {
    return [...config.groups, communicationGroup];
  }, [config.groups, communicationGroup]);

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(allGroups.map((g) => g.id))
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

  // Filtered groups based on search & entitlements
  const filteredGroups = useMemo(() => {
    return allGroups
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
  }, [allGroups, query, entitlements, role, canReviewMarketplace]);

  const handleSelectItem = (href: string) => {
    navigate(href);
    onNavigate?.();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (r?: string) => {
    switch (r) {
      case 'super_admin': return 'Super Admin • Global Seer';
      case 'landlord': return 'Landlord';
      case 'property_manager': return 'Property Manager';
      default: return r || 'User';
    }
  };

  const getWorkspaceInfo = (id: StaffWorkspaceId) => {
    switch (id) {
      case 'property-management':
        return { label: 'PM Operations', shortLabel: 'PM', icon: Building2, href: '/dashboard', title: 'Property Management' };
      case 'marketplace':
        return { label: 'Marketplace', shortLabel: 'Marketplace', icon: Store, href: '/marketplace/manage', title: 'Marketplace' };
      case 'crm':
        return { label: 'CRM', shortLabel: 'CRM', icon: Flame, href: '/marketplace/crm', title: 'Marketplace CRM' };
      case 'control-plane':
        return { label: 'Control Plane', shortLabel: 'Control Plane', icon: Radar, href: '/super-admin/control-plane', title: 'Control Plane' };
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground select-none">
      {/* Header: FishGate Brand & Company Switcher */}
      <div className={cn('border-b border-sidebar-border/70', mobile ? 'p-4' : 'flex h-16 items-center justify-between px-3')}>
        <div className={cn('flex items-center gap-2.5 min-w-0', collapsed && 'justify-center w-full')}>
          <Link
            to={getWorkspaceInfo(workspaceId).href}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm"
            onClick={onNavigate}
            title="FishGate Home"
          >
            FG
          </Link>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <Link
                to={getWorkspaceInfo(workspaceId).href}
                className="block text-left w-full group py-0.5"
                onClick={onNavigate}
                title="FishGate Home"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-sm leading-tight text-sidebar-foreground truncate group-hover:text-primary transition-colors">
                    FishGate
                  </span>
                  {role === 'super_admin' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                      Global Seer
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-sidebar-foreground/60 leading-none truncate mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  {config.shortName}
                </p>
              </Link>
            </div>
          )}
        </div>

        {!mobile && onCollapsedChange && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(true)}
            aria-label="Collapse sidebar"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Expand Toggle Button in Collapsed Mode Header */}
      {!mobile && onCollapsedChange && collapsed && (
        <div className="py-2 flex justify-center border-b border-sidebar-border/40">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(false)}
            aria-label="Expand sidebar"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            title="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Real-time Search Input (Visible only in expanded mode) */}
      {!collapsed && (
        <div className="p-2.5 border-b border-sidebar-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${config.shortName}...`}
              className="h-8 pl-8 pr-7 text-xs bg-sidebar-accent/30 border-sidebar-border/60 text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-primary/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground bg-sidebar-border/40 rounded px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Scroll Area */}
      {collapsed ? (
        /* COLLAPSED MODE: Clean centered icon list with tooltips */
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3 scrollbar-none flex flex-col items-center">
          {filteredGroups.map((group, groupIdx) => (
            <div key={group.id} className="w-full flex flex-col items-center space-y-1.5">
              {groupIdx > 0 && <div className="w-6 h-px bg-sidebar-border/50 my-1" />}
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    item.href !== '/marketplace' &&
                    item.href !== '/marketplace/crm' &&
                    location.pathname.startsWith(`${item.href}/`));
                const ItemIcon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item.href)}
                    title={`${group.title}: ${item.label}`}
                    className={cn(
                      'relative flex h-9 w-9 items-center justify-center rounded-xl transition-all group',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40 font-semibold'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <ItemIcon className="h-4 w-4 shrink-0" />
                    {item.id === 'pm-alerts' && openAlertCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                        {openAlertCount > 9 ? '9+' : openAlertCount}
                      </span>
                    )}
                    {item.id === 'global-notifications' && unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        /* EXPANDED MODE: Rich categorized accordions */
        <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-3.5 text-sm scrollbar-thin scrollbar-thumb-sidebar-border">
          {filteredGroups.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-sidebar-foreground/40 italic">
              No matching features found in {config.name}.
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id) || !!query;
              const GroupIcon = group.icon;
              const hasActiveItem = group.items.some(
                (item) =>
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    item.href !== '/marketplace' &&
                    item.href !== '/marketplace/crm' &&
                    location.pathname.startsWith(`${item.href}/`))
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
                    <div className="flex items-center gap-2 truncate">
                      <GroupIcon className="h-3.5 w-3.5 text-sidebar-foreground/70 shrink-0" />
                      <span className="truncate">{group.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
                    )}
                  </button>

                  {/* Sub-Items */}
                  {isExpanded && (
                    <div className="pl-5 pr-1 py-0.5 space-y-0.5 border-l border-sidebar-border/40 ml-3.5">
                      {group.items.map((item) => {
                        const isActive =
                          location.pathname === item.href ||
                          (item.href !== '/dashboard' &&
                            item.href !== '/marketplace' &&
                            item.href !== '/marketplace/crm' &&
                            location.pathname.startsWith(`${item.href}/`));
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
                                {openAlertCount > 99 ? '99+' : openAlertCount}
                              </Badge>
                            )}
                            {item.id === 'global-notifications' && unreadNotificationCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-4 px-1.5 text-[9px] bg-destructive text-destructive-foreground"
                              >
                                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
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
      )}

      {/* Bottom Fixed Footer Section */}
      {collapsed ? (
        /* COLLAPSED FOOTER: Clean centered icon buttons */
        <div className="border-t border-sidebar-border/70 bg-sidebar-accent/20 p-2 space-y-2.5 flex flex-col items-center">
          {/* Switch Module in Collapsed Mode */}
          <div className="flex flex-col items-center gap-1 w-full">
            {availableWorkspaces.map((wsId) => {
              const info = getWorkspaceInfo(wsId);
              if (!info) return null;
              const WsIcon = info.icon;
              const isCurrent = wsId === workspaceId;

              return (
                <button
                  key={wsId}
                  type="button"
                  onClick={() => {
                    onSwitchWorkspace?.(wsId);
                    navigate(info.href);
                    onNavigate?.();
                  }}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                    isCurrent
                      ? 'bg-primary/25 text-primary border border-primary/50 font-semibold shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                  title={`Switch to ${info.title}`}
                >
                  <WsIcon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <div className="w-6 h-px bg-sidebar-border/50" />

          {/* Global Utilities */}
          <div className="flex flex-col items-center gap-1">
            <Link
              to="/support"
              onClick={onNavigate}
              title="Support"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                location.pathname === '/support'
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/settings"
              onClick={onNavigate}
              title="Settings"
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                location.pathname === '/settings'
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="w-6 h-px bg-sidebar-border/50" />

          {/* User Avatar + Sign Out */}
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <Avatar
              className="h-7 w-7 border border-sidebar-border"
              title={`${profile?.name || user?.email} (${getRoleLabel(role || profile?.role)})`}
            >
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                {profile?.name ? getInitials(profile.name) : 'U'}
              </AvatarFallback>
            </Avatar>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleLogout()}
              className="h-6 w-6 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        /* EXPANDED FOOTER: 2x2 Grid Module Switcher, Utilities, Platform Override, User Profile */
        <div className="border-t border-sidebar-border/70 bg-sidebar-accent/20 p-2.5 space-y-2.5">
          {/* Switch Module 2x2 Clean Grid */}
          <div className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Switch Module
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {availableWorkspaces.map((wsId) => {
                const info = getWorkspaceInfo(wsId);
                if (!info) return null;
                const WsIcon = info.icon;
                const isCurrent = wsId === workspaceId;

                return (
                  <button
                    key={wsId}
                    type="button"
                    onClick={() => {
                      onSwitchWorkspace?.(wsId);
                      navigate(info.href);
                      onNavigate?.();
                    }}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left group',
                      isCurrent
                        ? 'bg-primary/20 text-primary border border-primary/40 font-semibold shadow-sm'
                        : 'bg-sidebar-accent/40 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground border border-sidebar-border/40'
                    )}
                    title={info.title}
                  >
                    <WsIcon className={cn('h-4 w-4 shrink-0', isCurrent ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground')} />
                    <span className="truncate leading-tight font-medium">
                      {info.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-sidebar-border/50" />

          {/* Global Utilities: Support & Settings */}
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              to="/support"
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors',
                location.pathname === '/support'
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <CircleHelp className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Support</span>
            </Link>
            <Link
              to="/settings"
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors',
                location.pathname === '/settings'
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Settings</span>
            </Link>
          </div>

          {/* Platform Override Toggle (Super Admin Only) */}
          {canOverride && (
            <>
              <div className="rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/70">
                      Platform Override
                    </p>
                    <p className="text-[10px] text-sidebar-foreground/50 leading-tight">
                      Bypass plan entitlement locks
                    </p>
                  </div>
                  <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
                </div>
              </div>
            </>
          )}

          <Separator className="bg-sidebar-border/50" />

          {/* User Profile Bar & Logout */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {profile?.name ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 overflow-hidden">
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                  {profile?.name || user?.email}
                </p>
                <p className="text-[10px] text-sidebar-foreground/60 truncate leading-tight">
                  {getRoleLabel(role || profile?.role)}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleLogout()}
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
