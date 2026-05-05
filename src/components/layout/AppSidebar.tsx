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
  Home,
  Receipt,
  RefreshCw,
  BarChart3,
  UserCog,
  CalendarCheck,
  Link2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

const pmNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'Properties', href: '/properties' },
  { icon: Home, label: 'Units', href: '/units' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: FileText, label: 'Leases', href: '/leases' },
  { icon: Receipt, label: 'Invoices', href: '/invoices' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: RefreshCw, label: 'Recurring Bills', href: '/recurring-bills' },
  { icon: Wrench, label: 'Maintenance', href: '/maintenance' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: CalendarCheck, label: 'Bookings', href: '/bookings' },
  { icon: Link2, label: 'Guest Booking Portal', href: '/guest-booking-portal' },
  { icon: MessageSquare, label: 'Messages', href: '/messages' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
];

const landlordNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: UserCog, label: 'Admin', href: '/team' },
  { icon: Building2, label: 'Properties', href: '/properties' },
  { icon: Home, label: 'Units', href: '/units' },
  { icon: Users, label: 'Tenants', href: '/tenants' },
  { icon: FileText, label: 'Leases', href: '/leases' },
  { icon: Receipt, label: 'Invoices', href: '/invoices' },
  { icon: CreditCard, label: 'Payments', href: '/payments' },
  { icon: RefreshCw, label: 'Recurring Bills', href: '/recurring-bills' },
  { icon: Wrench, label: 'Maintenance', href: '/maintenance' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
  { icon: CalendarCheck, label: 'Bookings', href: '/bookings' },
  { icon: Link2, label: 'Guest Booking Portal', href: '/guest-booking-portal' },
  { icon: MessageSquare, label: 'Messages', href: '/messages' },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
];

const bottomNavItems = [
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, profile, logout } = useAuth();
  const { isLandlord, role } = useUserRole();
  const collapsedView = !mobile && collapsed;

  const navItems = isLandlord ? landlordNavItems : pmNavItems;

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
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg">
              FG
            </div>
            {!collapsedView && (
              <span className="font-semibold text-lg text-sidebar-foreground">FishGate</span>
            )}
          </Link>
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
          <ul className="space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.href;
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
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-3">
          <ul className="space-y-1 mb-3">
            {bottomNavItems.map(item => {
              const isActive = location.pathname === item.href;
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
