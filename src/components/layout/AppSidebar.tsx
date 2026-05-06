import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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
  Link2,
  Zap,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useMyCompanies, useMyMembership } from '@/hooks/useCompanies';

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

type NavItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sharedSections: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Building2, label: 'Properties', href: '/properties' },
      { icon: Home, label: 'Units', href: '/units' },
      { icon: Users, label: 'Tenants', href: '/tenants' },
      { icon: FileText, label: 'Leases', href: '/leases' },
      { icon: Wrench, label: 'Maintenance', href: '/maintenance' },
      { icon: CalendarCheck, label: 'Bookings', href: '/bookings' },
      { icon: Link2, label: 'Guest Booking Portal', href: '/guest-booking-portal' },
    ],
  },
  {
    title: 'Financials',
    items: [
      { icon: Receipt, label: 'Invoices', href: '/invoices' },
      { icon: CreditCard, label: 'Payments', href: '/payments' },
      { icon: RefreshCw, label: 'Recurring Bills', href: '/recurring-bills' },
      { icon: BarChart3, label: 'Reports', href: '/reports' },
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

const landlordOnlySection: NavSection = {
  title: 'Admin',
  items: [{ icon: UserCog, label: 'Team', href: '/team' }],
};

const bottomNavItems = [
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);
  const location = useLocation();
  const { user, profile, logout } = useAuth();
  const { isLandlord, role } = useUserRole();
  const { data: ownedCompanies = [] } = useMyCompanies();
  const { data: membership } = useMyMembership();
  const collapsedView = !mobile && collapsed;

  const navSections = isLandlord ? [landlordOnlySection, ...sharedSections] : sharedSections;

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
      case 'landlord': return 'Landlord';
      case 'property_manager': return 'Property Manager';
      default: return role || 'User';
    }
  };

  const isItemActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const visibleCompanies = ownedCompanies.length > 0
    ? ownedCompanies
    : membership?.companies
      ? [membership.companies]
      : [];

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
                      <div key={company.id} className="rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/85 bg-sidebar/30">
                        {company.name}
                      </div>
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
            <Link to="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg">
                FG
              </div>
              {!collapsedView && (
                <span className="font-semibold text-lg text-sidebar-foreground">FishGate</span>
              )}
            </Link>
          )}
          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
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

          <div className="space-y-4">
            {navSections.map((section) => (
              <div key={section.title}>
                {!collapsedView && (
                  <p className="px-3 mb-1.5 text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/45">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = isItemActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          onClick={onNavigate}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                        >
                          {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-sidebar-primary-foreground/85" aria-hidden />}
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!collapsedView && <span>{item.label}</span>}
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
              const isActive = isItemActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
