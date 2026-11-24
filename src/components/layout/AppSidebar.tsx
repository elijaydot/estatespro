import { useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  CircleHelp,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FISHGATE_IA_GROUPS, type IANavGroup, type IANavItem } from '@/design-system/information-architecture';
import { useUserRole } from '@/hooks/useUserRole';
import { useSaasAccess } from '@/hooks/useSaasAccess';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useI18n } from '@/contexts/useI18n';

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AppSidebar({
  mobile = false,
  onNavigate,
  collapsed = false,
  onCollapsedChange,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isSuperAdmin } = useUserRole();
  const { entitlements, isTrialExpired } = useSaasAccess();
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const { data: unreadNotificationCount = 0 } = useUnreadNotificationsCount();
  const { t } = useI18n();

  const isCollapsed = !mobile && collapsed;

  // Filter groups and items based on role permissions
  const visibleGroups = useMemo(() => {
    return FISHGATE_IA_GROUPS.map((group) => {
      const filteredItems = group.items.filter((item) => {
        // Role check
        if (item.roles && !item.roles.includes(role as any)) {
          return false;
        }
        return true;
      });

      return {
        ...group,
        items: filteredItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [role]);

  const isItemActive = (href: string) => {
    const url = new URL(href, 'http://localhost');
    const pathname = url.pathname;
    const viewParam = url.searchParams.get('view');
    const tabParam = url.searchParams.get('tab');
    const categoryParam = url.searchParams.get('category');
    const domainParam = url.searchParams.get('domain');

    if (location.pathname !== pathname) {
      return false;
    }

    if (pathname === '/dashboard') {
      if (viewParam === 'activity') {
        return location.search.includes('view=activity');
      }
      return !location.search.includes('view=activity');
    }

    if (pathname === '/payments') {
      if (viewParam === 'collections') {
        return location.search.includes('view=collections');
      }
      return !location.search.includes('view=collections');
    }

    if (pathname === '/maintenance') {
      if (tabParam) {
        return location.search.includes(`tab=${tabParam}`);
      }
      return !location.search.includes('tab=');
    }

    if (pathname === '/reports') {
      if (categoryParam) {
        return location.search.includes(`category=${categoryParam}`);
      }
      if (domainParam) {
        return location.search.includes(`domain=${domainParam}`);
      }
      return !location.search.includes('category=') && !location.search.includes('domain=');
    }

    if (tabParam) {
      return location.search.includes(`tab=${tabParam}`);
    }

    return true;
  };

  const getItemBadge = (item: IANavItem) => {
    if (item.id === 'triggers' && openAlertCount > 0) {
      return openAlertCount;
    }
    if (item.id === 'notifications' && unreadNotificationCount > 0) {
      return unreadNotificationCount;
    }
    return null;
  };

  const isLocked = (item: IANavItem) => {
    if (isSuperAdmin) return false;
    if (item.entitlementKey && entitlements && !entitlements[item.entitlementKey]) {
      return true;
    }
    return false;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col justify-between bg-slate-900 text-slate-200 select-none border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-2.5 font-bold text-white tracking-tight text-lg"
          >
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs shrink-0">
              FG
            </div>
            {!isCollapsed && (
              <span className="text-[16px] font-semibold tracking-tight text-white">
                FishGate
              </span>
            )}
          </Link>

          {!mobile && onCollapsedChange && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(!collapsed)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation Groups (Max 2 Levels: Group Header -> Nav Items) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {visibleGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.name}
                </div>
              ) : (
                <div className="h-2" />
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isItemActive(item.href);
                  const Icon = item.icon;
                  const badge = getItemBadge(item);
                  const locked = isLocked(item);

                  const linkContent = (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        navigate(item.href);
                        onNavigate?.();
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left relative',
                        active
                          ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                        isCollapsed && 'justify-center px-0'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />

                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          <div className="flex items-center gap-1.5 ml-2">
                            {locked && (
                              <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                            )}
                            {badge !== null && badge > 0 && (
                              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700 text-xs font-medium">
                          <p>{item.label}</p>
                          {locked && <p className="text-[10px] text-amber-400">Upgrade Required</p>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Utility Bar */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <button
            type="button"
            onClick={() => {
              navigate('/settings');
              onNavigate?.();
            }}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors',
              location.pathname === '/settings' && 'bg-slate-800 text-white font-semibold',
              isCollapsed && 'justify-center px-0'
            )}
          >
            <Settings className="h-4 w-4 text-slate-400" />
            {!isCollapsed && <span>{t('nav_settings', 'Settings')}</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              navigate('/support');
              onNavigate?.();
            }}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors',
              location.pathname === '/support' && 'bg-slate-800 text-white font-semibold',
              isCollapsed && 'justify-center px-0'
            )}
          >
            <CircleHelp className="h-4 w-4 text-slate-400" />
            {!isCollapsed && <span>{t('nav_support', 'Support & Help')}</span>}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
}
