import { ReactNode, useState } from 'react';
import { Menu, CircleHelp, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileBottomNav } from '@/design-system/components/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/useAuth';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { MfaReminderBanner } from '@/components/security/MfaReminderBanner';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useInboundSlaAlert } from '@/hooks/useInboundSlaAlert';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useInboundSlaAlert();
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <AppSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </aside>

      {/* Main Body Area */}
      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center justify-between gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation" className="shrink-0 h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 max-w-[90vw] border-slate-800 bg-slate-900 p-0 sm:w-96 [&>button]:hidden">
                <SheetTitle className="sr-only">Main navigation</SheetTitle>
                <SheetDescription className="sr-only">Navigate FishGate modules and account settings.</SheetDescription>
                <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{activeCompanyName}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isSuperAdmin ? '● Monitoring All Tenants & Operations' : 'Real estate operating platform'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => navigate('/notifications')}
                aria-label="Open notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute 1.5 top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Desktop Sticky Header */}
        <div className="hidden lg:block sticky top-0 z-20">
          <AppHeader />
        </div>

        {/* Workspace Main Viewport */}
        <main className="flex-1 pb-16 lg:pb-8">
          <MfaReminderBanner />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onOpenMenu={() => setMobileNavOpen(true)} />
      </div>
    </div>
  );
}
