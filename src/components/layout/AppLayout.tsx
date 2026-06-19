import { ReactNode, useEffect, useState } from 'react';
import { Menu, CircleHelp, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/useAuth';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { MfaReminderBanner } from '@/components/security/MfaReminderBanner';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { companies, activeCompanyId } = useActiveCompany();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const activeCompanyName = companies.find((company) => company.id === activeCompanyId)?.name || profile?.name || 'FishGate';

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
    <div className="min-h-screen bg-background app-shell-gradient">
      <div className="app-shell-orb app-shell-orb-a" aria-hidden />
      <div className="app-shell-orb app-shell-orb-b" aria-hidden />
      <AppSidebar />
      <div className="lg:ml-64 flex flex-col min-h-screen transition-all duration-300 relative z-10">
        <header className="lg:hidden sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur-sm px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 sm:w-96 max-w-[90vw] [&>button]:hidden">
                <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{activeCompanyName}</p>
              <p className="text-[11px] text-muted-foreground truncate">Your organization overview</p>
            </div>

            <div className="flex items-center gap-1">
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
          <div className="mb-4 rounded-xl border border-border/70 bg-card/85 backdrop-blur-sm px-3 py-2.5 card-shadow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Operations Focus</p>
                <p className="text-sm text-foreground font-medium truncate">
                  Monitor exceptions, assign actions, and keep portfolio operations in motion.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Button variant="outline" size="sm" className="rounded-full h-8" onClick={() => navigate('/payments')}>
                  Payment Exceptions
                </Button>
                <Button variant="outline" size="sm" className="rounded-full h-8" onClick={() => navigate('/maintenance')}>
                  Maintenance Queue
                </Button>
              </div>
            </div>
          </div>
          <MfaReminderBanner />
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
