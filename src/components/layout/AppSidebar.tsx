import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Bell,
  MessageSquare,
  Megaphone,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  Receipt,
  RefreshCw,
  BarChart3,
  UserCog,
  CalendarCheck,
  Store,
  ShieldAlert,
  ShieldCheck,
  Link2,
  Zap,
  Wallet,
  Lock,
  Radar,
  CircleHelp,
  BriefcaseBusiness,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSaasAccess, type SaasEntitlementKey } from '@/hooks/useSaasAccess';
import { useSuperAdminOverride } from '@/hooks/useSuperAdminOverride';
import { Switch } from '@/components/ui/switch';
import { useIsInternalMarketplaceReviewer } from '@/hooks/useMarketplace';
import { useOpenOperationalAlertCount } from '@/hooks/useOperationalAlerts';

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  entitlementKey?: SaasEntitlementKey;
  reviewerOnly?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sharedSections: NavSection[] = [
  {
    title: 'Home',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { icon: Building2, label: 'Properties', href: '/properties' },
      { icon: Home, label: 'Units', href: '/units' },
      { icon: Users, label: 'Tenants', href: '/tenants' },
      { icon: FileText, label: 'Leases', href: '/leases' },
      { icon: Wrench, label: 'Maintenance', href: '/maintenance' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: Bell, label: 'Alerts', href: '/alerts' },
      { icon: BriefcaseBusiness, label: 'Vendors', href: '/vendors' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { icon: Receipt, label: 'Invoices', href: '/invoices' },
      { icon: CreditCard, label: 'Payments', href: '/payments' },
      { icon: RefreshCw, label: 'Recurring Bills', href: '/recurring-bills' },
      { icon: BarChart3, label: 'Reports', href: '/reports' },
    ],
  },
  {
    title: 'Guest Operations',
    items: [
      { icon: CalendarCheck, label: 'Bookings', href: '/bookings' },
      { icon: Link2, label: 'Booking Links', href: '/guest-booking-portal' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { icon: Store, label: 'Listings', href: '/marketplace/manage', entitlementKey: 'marketplace.listings.manage' },
      { icon: ShieldAlert, label: 'Moderation', href: '/marketplace/moderation', entitlementKey: 'marketplace.moderation.view', reviewerOnly: true },
      { icon: ShieldCheck, label: 'Verification', href: '/marketplace/verification', entitlementKey: 'marketplace.moderation.view', reviewerOnly: true },
      { icon: ShieldCheck, label: 'Reviewer Queue', href: '/marketplace/reviewer', entitlementKey: 'marketplace.moderation.view', reviewerOnly: true },
    ],
  },
  {
    title: 'CRM',
    items: [
      { icon: BriefcaseBusiness, label: 'CRM Workspace', href: '/marketplace/crm', entitlementKey: 'crm.leads.manage' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { icon: MessageSquare, label: 'Messages', href: '/messages' },
      { icon: Bell, label: 'Notifications', href: '/notifications' },
    ],
  },
];

const managerCommunicationItem: NavItem = { icon: Megaphone, label: 'Broadcasts', href: '/broadcasts' };

const landlordOnlySection: NavSection = {
  title: 'Organization',
  items: [{ icon: UserCog, label: 'Team', href: '/team' }],
};

const superAdminSection: NavSection = {
  title: 'Platform',
  items: [{ icon: Radar, label: 'Control Plane', href: '/super-admin/control-plane' }],
};

const bottomNavItems = [
  { icon: CircleHelp, label: 'Support', href: '/support' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

const SIDEBAR_SECTIONS_STORAGE_KEY = 'fishgate_sidebar_sections';

function getInitialExpandedSections() {
  try {
    const saved = window.localStorage.getItem(SIDEBAR_SECTIONS_STORAGE_KEY);
    if (saved) return new Set<string>(JSON.parse(saved) as string[]);
  } catch {
    // Use the focused default when stored navigation preferences are unavailable.
  }

  return new Set(['Home', 'Portfolio']);
}

function isHrefActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ mobile = false, onNavigate, collapsed = false, onCollapsedChange }: AppSidebarProps) {
  const [showCompanies, setShowCompanies] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(getInitialExpandedSections);
  const location = useLocation();
  const { user, profile, logout } = useAuth();
  const { isLandlord, role } = useUserRole();
  const { companies, activeCompanyId, setActiveCompanyId } = useActiveCompany();
  const { entitlements, isLoading: saasLoading } = useSaasAccess();
  const { canOverride, overrideEnabled, isOverrideActive, setOverrideEnabled } = useSuperAdminOverride();
  const reviewerAccess = useIsInternalMarketplaceReviewer(user?.id);
  const { data: openAlertCount = 0 } = useOpenOperationalAlertCount();
  const collapsedView = !mobile && collapsed;
  const canReviewMarketplace = role === 'super_admin' || reviewerAccess.data === true;

  const navSectionsBase = role === 'super_admin'
    ? [...sharedSections, landlordOnlySection, superAdminSection]
    : isLandlord
      ? [...sharedSections, landlordOnlySection]
      : sharedSections;
  const navSections = navSectionsBase
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.reviewerOnly || canReviewMarketplace),
    }))
    .map((section) => {
      if (section.title !== 'Communication') return section;
      if (role === 'landlord' || role === 'property_manager' || role === 'super_admin') {
        return { ...section, items: [...section.items.slice(0, 1), managerCommunicationItem, ...section.items.slice(1)] };
      }
      return section;
    })
    .filter((section) => section.items.length > 0);
  const activeSectionTitle = navSections.find((section) =>
    section.items.some((item) => isHrefActive(location.pathname, item.href))
  )?.title;

  useEffect(() => {
    if (!activeSectionTitle) return;
    setExpandedSections((current) => {
      if (current.has(activeSectionTitle)) return current;
      return new Set([...current, activeSectionTitle]);
    });
  }, [activeSectionTitle]);

  const toggleSection = (title: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      window.localStorage.setItem(SIDEBAR_SECTIONS_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    onNavigate?.();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'landlord': return 'Landlord';
      case 'property_manager': return 'Property Manager';
      default: return role || 'User';
    }
  };

  const visibleCompanies = companies;

  return (
    <aside
      className={cn(
        mobile
          ? 'h-full bg-sidebar text-sidebar-foreground'
          : 'hidden lg:block fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsedView ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn("border-b border-sidebar-border", mobile ? 'p-4' : 'flex h-16 items-center justify-between px-4')}>
          {mobile ? (
            <div className="space-y-3">
              <button
                type="button"
                className="w-full flex items-center gap-3 text-left"
                onClick={() => setShowCompanies((prev) => !prev)}
              >
                <Avatar className="h-12 w-12 border border-sidebar-border">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    {profile?.name ? getInitials(profile.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sidebar-foreground truncate">{profile?.name || 'FishGate user'}</p>
                  <p className="text-sm text-sidebar-foreground/75 truncate">{profile?.email || user?.email}</p>
                </div>
                {showCompanies ? <ChevronUp className="h-4 w-4 text-sidebar-foreground/70" /> : <ChevronDown className="h-4 w-4 text-sidebar-foreground/70" />}
              </button>

              {showCompanies && (
                <div className="rounded-lg border border-sidebar-border/80 bg-sidebar-accent/60 p-2 space-y-1">
                  {visibleCompanies.length > 0 ? (
                    visibleCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          setActiveCompanyId(company.id);
                          onNavigate?.();
                        }}
                        className={cn(
                          'w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors',
                          activeCompanyId === company.id
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground/85 bg-sidebar/30 hover:bg-sidebar-accent'
                        )}
                      >
                        {company.name}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 bg-sidebar/30">
                      No linked companies
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link to="/dashboard" className="group flex items-center gap-3" onClick={onNavigate}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg">
                FG
              </div>
              {!collapsedView && (
                <div className="min-w-0">
                  <p className="font-display font-semibold text-lg leading-tight text-sidebar-foreground">FishGate</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/55">Portfolio OS</p>
                </div>
              )}
            </Link>
          )}
          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange?.(!collapsed)}
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 sidebar-scroll">
          {mobile && (
            <div className="mb-4 p-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/60">
              <p className="text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/60 mb-2">Quick actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild size="sm" variant="secondary" className="h-9 text-xs justify-center bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  <RouterLink to="/tenants?add=true" onClick={onNavigate}>
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Tenant
                  </RouterLink>
                </Button>
                <Button asChild size="sm" variant="secondary" className="h-9 text-xs justify-center bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  <RouterLink to="/payments?add=true" onClick={onNavigate}>
                    <Wallet className="h-3.5 w-3.5 mr-1" />
                    Payment
                  </RouterLink>
                </Button>
                <Button asChild size="sm" variant="secondary" className="h-9 text-xs justify-center col-span-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  <RouterLink to="/maintenance?add=true" onClick={onNavigate}>
                    <Wrench className="h-3.5 w-3.5 mr-1" />
                    Request
                  </RouterLink>
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {navSections.map((section) => (
              <div key={section.title}>
                {!collapsedView && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    aria-expanded={expandedSections.has(section.title)}
                    className="mb-1.5 flex w-full items-center justify-between rounded-md px-3 py-1 text-left text-[11px] font-display uppercase tracking-[0.14em] text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <span>{section.title}</span>
                    {expandedSections.has(section.title)
                      ? <ChevronUp className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
                <ul className={cn('space-y-1', !collapsedView && !expandedSections.has(section.title) && 'hidden')}>
                  {section.items.map((item) => {
                    const isActive = isHrefActive(location.pathname, item.href);
                    const isLocked = Boolean(item.entitlementKey) && !isOverrideActive && !saasLoading && !entitlements[item.entitlementKey as SaasEntitlementKey];
                    const targetHref = isLocked ? '/settings?tab=billing' : item.href;
                    const linkLabel = isLocked ? `${item.label} (Upgrade)` : item.label;

                    return (
                      <li key={item.href}>
                        <Link
                          to={targetHref}
                          onClick={onNavigate}
                          title={collapsedView ? linkLabel : undefined}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            isLocked && 'border border-dashed border-sidebar-border/60',
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5'
                          )}
                        >
                          {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-sidebar-primary-foreground/85" aria-hidden />}
                          <item.icon className={cn('h-5 w-5 flex-shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-105')} />
                          {!collapsedView && (
                            <span className="flex items-center gap-2">
                              <span>{item.label}</span>
                              {item.href === '/alerts' && openAlertCount > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                                  {openAlertCount > 99 ? '99+' : openAlertCount}
                                </span>
                              )}
                              {isLocked && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-sidebar-border/70 bg-sidebar/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/75">
                                  <Lock className="h-3 w-3" />
                                  Upgrade
                                </span>
                              )}
                            </span>
                          )}
                          {collapsedView && item.href === '/alerts' && openAlertCount > 0 && (
                            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-sidebar" aria-label={`${openAlertCount} active alerts`} />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-3">
          <ul className="space-y-1 mb-3">
            {bottomNavItems.map(item => {
              const isActive = isHrefActive(location.pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onNavigate}
                    title={collapsedView ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsedView && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Separator className="my-3 bg-sidebar-border" />

          {!collapsedView && canOverride && (
            <>
              <div className="mb-3 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/55">Platform Override</p>
                    <p className="text-xs text-sidebar-foreground/70">Bypass plan entitlement locks</p>
                  </div>
                  <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
                </div>
              </div>
              <Separator className="my-3 bg-sidebar-border" />
            </>
          )}

          {/* User Profile */}
          <div className={cn('flex items-center gap-3', collapsedView && 'justify-center')}>
            <Avatar className="h-9 w-9 border-2 border-sidebar-border">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {profile?.name ? getInitials(profile.name) : 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsedView && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.name || user?.email}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {getRoleLabel(role || profile?.role)}
                </p>
              </div>
            )}
            {!collapsedView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleLogout()}
                className="text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
