import { ReactNode, useEffect, useState } from 'react';
import { Menu, CircleHelp, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  useEffect(() => {
    const prefetchRoutes = () => {
      void import('@/pages/Payments');
      void import('@/pages/Invoices');
      void import('@/pages/MessagesPageV2');
      void import('@/pages/Reports');
      void import('@/pages/Tenants');
    };

    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => prefetchRoutes());
      return () => window.cancelIdleCallback(handle);
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
              <p className="text-sm font-semibold text-foreground truncate">{profile?.name || 'FishGate'}</p>
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
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
