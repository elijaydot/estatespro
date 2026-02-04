import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  DollarSign, 
  Wrench, 
  FileText, 
  MessageSquare,
  LogOut,
  Home,
  Menu,
  Loader2,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantPortalData } from '@/hooks/useTenantPortalData';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/tenant' },
  { label: 'Payments', icon: DollarSign, href: '/tenant/payments' },
  { label: 'Invoices', icon: Receipt, href: '/tenant/invoices' },
  { label: 'Recurring Bills', icon: RefreshCw, href: '/tenant/recurring-bills' },
  { label: 'Maintenance', icon: Wrench, href: '/tenant/maintenance' },
  { label: 'Lease', icon: FileText, href: '/tenant/lease' },
  { label: 'Messages', icon: MessageSquare, href: '/tenant/messages' },
];

interface TenantPortalLayoutProps {
  children: ReactNode;
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function TenantPortalLayout({ children }: TenantPortalLayoutProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: portalData, isLoading } = useTenantPortalData();

  const handleLogout = () => {
    logout();
    navigate('/tenant/login');
  };

  const tenantName = portalData?.tenant?.name || 'Tenant';
  const unitNumber = portalData?.unit?.unit_number;
  const propertyName = portalData?.property?.name || 'Property';

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col bg-card border-r border-border">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
            <div className="p-2 rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground">Tenant Portal</span>
              <p className="text-xs text-muted-foreground">{propertyName}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-4 py-6">
            <NavLinks />
          </div>

          {/* User Section */}
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

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-card px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
                <div className="p-2 rounded-lg bg-primary">
                  <Home className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">Tenant Portal</span>
              </div>
              <div className="flex-1 px-4 py-6">
                <NavLinks />
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
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Tenant Portal</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
