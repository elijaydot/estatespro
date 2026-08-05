import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  Wrench,
  FileText,
  MessageSquare,
  Bell,
  LogOut,
  Home,
  Menu,
  Loader2,
  Receipt,
  RefreshCw,
  CircleHelp,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/useAuth';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';
import { TenantChatbot } from '@/components/ai/TenantChatbot';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { MfaReminderBanner } from '@/components/security/MfaReminderBanner';

const navGroups = [
  {
    title: 'Home',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/tenant' },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Payments', icon: DollarSign, href: '/tenant/payments' },
      { label: 'Invoices', icon: Receipt, href: '/tenant/invoices' },
      { label: 'Recurring Bills', icon: RefreshCw, href: '/tenant/recurring-bills' },
    ],
  },
  {
    title: 'Tenancy',
    items: [
      { label: 'Lease', icon: FileText, href: '/tenant/lease' },
      { label: 'Maintenance', icon: Wrench, href: '/tenant/maintenance' },
      { label: 'Exit Status', icon: LogOut, href: '/tenant/exit' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Messages', icon: MessageSquare, href: '/tenant/messages' },
      { label: 'Notifications', icon: Bell, href: '/tenant/notifications' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', icon: Shield, href: '/tenant/settings' },
      { label: 'Support', icon: CircleHelp, href: '/tenant/support' },
    ],
  },
];

interface TenantPortalLayoutProps {
  children: ReactNode;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="space-y-4">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const isActive = location.pathname === item.href
                || (item.href !== '/tenant' && location.pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-r before:bg-accent'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TenantPortalLayout({ children }: TenantPortalLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, session, refreshSession, isLoading: authLoading } = useAuth();
  const { data: portalData, isLoading } = useTenantPortalData();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const handleLogout = () => {
    logout();
    navigate('/tenant/login');
  };

  useEffect(() => {
    if (session) {
      refreshSession();
    }
  }, [session, refreshSession]);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/tenant/login', { replace: true });
    }
  }, [authLoading, session, navigate]);

  const tenantName = portalData?.tenant?.name || 'Tenant';
  const unitNumber = portalData?.unit?.unit_number;
  const propertyName = portalData?.property?.name || 'Property';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col bg-card border-r border-border">
          <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
            <div className="p-2 rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display font-bold text-foreground">Tenant Portal</span>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{propertyName}</p>
            </div>
          </div>

          <div className="flex-1 px-4 py-6">
            <NavLinks />
          </div>

          <div className="p-4 border-t border-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(tenantName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tenantName}</p>
                    <p className="text-xs text-muted-foreground">
                      {unitNumber ? `Unit ${unitNumber}` : 'No unit assigned'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-50 border-b border-border/70 bg-card/95 backdrop-blur-sm px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 [&>button]:hidden">
              <div className="flex flex-col h-full">
                <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
                  <div className="p-2 rounded-lg bg-primary">
                    <Home className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-foreground">Tenant Portal</span>
                </div>
                <div className="flex-1 px-4 py-6">
                  <NavLinks onNavigate={() => setMobileNavOpen(false)} />
                </div>
                <div className="p-4 border-t border-border">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{propertyName}</p>
            <p className="text-[11px] text-muted-foreground truncate">Tenant organization overview</p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-border/70"
              onClick={() => navigate('/tenant/support')}
              aria-label="Open support"
            >
              <CircleHelp className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full border border-border/70"
              onClick={() => navigate('/tenant/notifications')}
              aria-label="Open notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <header className="hidden lg:flex sticky top-0 z-40 h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-6 lg:ml-64">
        <div>
          <p className="text-sm font-semibold text-foreground truncate">{propertyName}</p>
          <p className="text-[11px] text-muted-foreground truncate">Tenant organization overview</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden h-8 rounded-full border-border bg-muted/60 px-3 text-foreground xl:flex">
            Tenant
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-border/70"
            onClick={() => navigate('/tenant/support')}
            aria-label="Open support"
          >
            <CircleHelp className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full border border-border/70"
            onClick={() => navigate('/tenant/notifications')}
            aria-label="Open notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">
          <MfaReminderBanner />
          {children}
        </div>
      </main>

      <TenantChatbot />
    </div>
  );
}
