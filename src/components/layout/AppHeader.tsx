import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Building, Users, FileText, Receipt, Command, Check, ChevronDown, Store, BriefcaseBusiness, Radar, LogOut, Home } from 'lucide-react';
import { safeSearch } from '@/lib/safeSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import type { StaffWorkspaceId } from '@/lib/workspaceNavigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

type QuickAddType = 'property' | 'unit' | 'tenant' | 'lease' | 'invoice';

type SearchProperty = {
  id: string;
  name?: string;
  address?: string;
  city?: string;
};

type SearchTenant = {
  id: string;
  name?: string;
  email?: string;
};

type SearchResult = {
  label: string;
  sublabel: string;
  path: string;
  type: 'Property' | 'Tenant';
};

export function AppHeader() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { role } = useUserRole();
  const { user, profile, logout } = useAuth();
  const { availableWorkspaceIds, currentWorkspaceId, getLandingPath } = useWorkspaceNavigation();

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const handleQuickAddClick = (type: QuickAddType) => {
    // Navigate to the respective page with add dialog state
    switch (type) {
      case 'property':
        navigate('/properties?add=true');
        break;
      case 'unit':
        navigate('/units?add=true');
        break;
      case 'tenant':
        navigate('/tenants?add=true');
        break;
      case 'lease':
        navigate('/leases?add=true');
        break;
      case 'invoice':
        navigate('/invoices?add=true');
        break;
    }
  };

  const { data: properties = [] } = useProperties();
  const allTenants = useTenants();
  const tenants = allTenants.data || [];

  // Live search across properties and tenants
  const filteredResults: SearchResult[] = searchQuery.trim().length >= 2
    ? [
        ...(properties as SearchProperty[])
          .filter((property) =>
            safeSearch(property.name || '').includes(searchQuery.toLowerCase()) ||
            safeSearch(property.address || '').includes(searchQuery.toLowerCase()) ||
            safeSearch(property.city || '').includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
          .map((property) => ({
            label: property.name || 'Property',
            sublabel: property.address || 'Address not provided',
            path: `/properties/${property.id}`,
            type: 'Property' as const,
          })),
        ...(tenants as SearchTenant[])
          .filter((tenant) =>
            safeSearch(tenant.name || '').includes(searchQuery.toLowerCase()) ||
            safeSearch(tenant.email || '').includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
          .map((tenant) => ({
            label: tenant.name || 'Tenant',
            sublabel: tenant.email || 'Email not provided',
            path: `/tenants/${tenant.id}`,
            type: 'Tenant' as const,
          })),
      ]
    : [];

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() && filteredResults.length > 0) {
      navigate(filteredResults[0].path);
      setSearchQuery('');
    }
  };

  const roleLabel = role === 'super_admin'
    ? 'Super Admin'
    : role === 'property_manager'
      ? 'Property Manager'
      : role === 'landlord'
        ? 'Landlord'
        : 'Tenant';
  const workspacePresentation: Record<StaffWorkspaceId, { name: string; icon: typeof Building; color: string }> = {
    'property-management': { name: 'Property Management', icon: Building, color: 'bg-blue-600' },
    marketplace: { name: 'Marketplace', icon: Store, color: 'bg-amber-500' },
    crm: { name: 'CRM', icon: BriefcaseBusiness, color: 'bg-emerald-600' },
    'control-plane': { name: 'Control Plane', icon: Radar, color: 'bg-slate-700' },
  };
  const workspaces = availableWorkspaceIds.map((id) => ({ id, ...workspacePresentation[id] }));
  const currentWorkspace = workspacePresentation[currentWorkspaceId];
  const initials = (profile?.name || user?.email || 'User')
    .split(/[\s@]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const CurrentWorkspaceIcon = currentWorkspace.icon;

  return (
    <header className="h-16 bg-card/95 border-b border-border px-6 flex items-center justify-between gap-4 backdrop-blur-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 shrink-0 gap-2 border border-border bg-card px-2.5 hover:bg-muted xl:px-3"
            aria-label={`Switch workspace. Current workspace: ${currentWorkspace.name}`}
            title={currentWorkspace.name}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-md text-white ${currentWorkspace.color}`}>
              <CurrentWorkspaceIcon className="h-4 w-4" />
            </span>
            <span className="hidden xl:inline max-w-40 truncate">{currentWorkspace.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2">
          <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => {
                const landingPath = getLandingPath(workspace.id);
                if (landingPath) navigate(landingPath);
              }}
              className="gap-3 py-2.5"
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${workspace.color}`}>
                <workspace.icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{workspace.name}</span>
              {workspace.id === currentWorkspaceId && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search…"
              className="h-10 rounded-[10px] pl-10 pr-14 bg-background border border-border focus-visible:ring-2 focus-visible:ring-ring"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              onBlur={() => setTimeout(() => setSearchQuery(''), 200)}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden xl:flex items-center gap-1 rounded-md border border-border/80 bg-background/85 px-2 py-0.5 text-[10px] text-muted-foreground">
              <Command className="h-3 w-3" />
              K
            </div>
          </div>

          {filteredResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {filteredResults.map((result, index) => (
                <button
                  key={`${result.path}-${index}`}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 text-left transition-colors"
                  onMouseDown={() => {
                    navigate(result.path);
                    setSearchQuery('');
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{result.label}</p>
                    <p className="text-xs text-muted-foreground">{result.sublabel}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{result.type}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-10 gap-2 rounded-[10px] px-4">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleQuickAddClick('property')}>
              <Building className="h-4 w-4 mr-2" />
              Property
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleQuickAddClick('unit')}>
              <Home className="h-4 w-4 mr-2" />
              Unit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleQuickAddClick('tenant')}>
              <Users className="h-4 w-4 mr-2" />
              Tenant
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleQuickAddClick('lease')}>
              <FileText className="h-4 w-4 mr-2" />
              Lease
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleQuickAddClick('invoice')}>
              <Receipt className="h-4 w-4 mr-2" />
              Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Badge variant="outline" className="hidden xl:flex h-8 rounded-full border-border bg-muted/60 px-3 text-foreground">
          {roleLabel}
        </Badge>

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={() => navigate('/notifications')}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 rounded-[10px] px-1.5 pr-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden 2xl:block max-w-32 truncate text-sm">{profile?.name || user?.email}</span>
              <ChevronDown className="hidden 2xl:block h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate">{profile?.name || user?.email}</span>
              <span className="block text-xs font-normal text-muted-foreground">{roleLabel}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void logout()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
