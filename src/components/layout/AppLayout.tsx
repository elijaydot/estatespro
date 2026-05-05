import { ReactNode, useEffect, useState } from 'react';
import { Menu, Plus, Sparkles, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-sm">
                FG
              </div>
              <div>
                <span className="font-semibold text-foreground leading-none">FishGate</span>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Sparkles className="h-3 w-3" />
                  Smart operations cockpit
                </p>
              </div>
            </div>

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 sm:w-96 max-w-[90vw]">
                <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
              Week 4 Polish
            </Badge>
            <div className="flex items-center gap-1.5">
              <Button asChild size="sm" variant="secondary" className="h-8 px-3 rounded-full">
                <Link to="/tenants?add=true">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tenant
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="h-8 px-3 rounded-full">
                <Link to="/maintenance?add=true">
                  <Wrench className="h-3.5 w-3.5 mr-1" />
                  Request
                </Link>
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
