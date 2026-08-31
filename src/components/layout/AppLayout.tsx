import { ReactNode, useEffect, useState } from 'react';
import { Menu, CircleHelp, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/useAuth';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { MfaReminderBanner } from '@/components/security/MfaReminderBanner';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { role } = useUserRole();
  const { companies, activeCompanyId } = useActiveCompany();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const isSuperAdmin = role === 'super_admin';
  const activeCompanyName = isSuperAdmin 
    ? 'FishGate • Global Platform' 
    : (companies.find((company) => company.id === activeCompanyId)?.name || profile?.name || 'FishGate');

  useEffect(() => {
    const prefetchRoutes = () => {
      void import('@/pages/Payments');
      void import('@/pages/Invoices');
      void import('@/pages/MessagesPageV2');
      void import('@/pages/Reports');
      void import('@/pages/Tenants');
    };

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(() => prefetchRoutes());
      return () => w.cancelIdleCallback?.(handle);
    }

    const timeout = window.setTimeout(prefetchRoutes, 1200);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <div className={`${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out relative z-10`}>
        <header className="lg:hidden sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur-sm px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 max-w-[90vw] border-sidebar-border bg-sidebar p-0 sm:w-96 [&>button]:hidden">
                <SheetTitle className="sr-only">Main navigation</SheetTitle>
                <SheetDescription className="sr-only">Navigate FishGate modules and account settings.</SheetDescription>
                <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{activeCompanyName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {isSuperAdmin ? '● Monitoring All Tenants & Operations' : 'Your organization overview'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-border/70"
                onClick={() => navigate('/support')}
                aria-label="Open support"
              >
                <CircleHelp className="h-4.5 w-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full border border-border/70"
                onClick={() => navigate('/notifications')}
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

        <div className="hidden lg:block sticky top-0 z-20">
          <AppHeader />
        </div>

        <main className="flex-1 p-4 lg:p-6">
          <MfaReminderBanner />
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
