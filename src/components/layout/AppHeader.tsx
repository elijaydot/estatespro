import { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Building, Users, FileText, Receipt, Command, Check, ChevronDown, Store, BriefcaseBusiness, Radar, LogOut, Home, Building2, Globe } from 'lucide-react';
import { safeSearch } from '@/lib/safeSearch';
import { cn } from '@/lib/utils';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useUserRole } from '@/hooks/useUserRole';
import { useActiveCompany } from '@/contexts/useActiveCompany';
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
  const { companies, activeCompanyId, setActiveCompanyId } = useActiveCompany();
  const { availableWorkspaceIds, currentWorkspaceId, getLandingPath } = useWorkspaceNavigation();
  const [scopeOpen, setScopeOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const filteredScopeCompanies = useMemo(() => {
    const q = companySearchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }, [companies, companySearchQuery]);

  const activeScopeName = useMemo(() => {
    if (activeCompanyId === 'all') return 'All Organizations (Global Seer)';
    return companies.find((c) => c.id === activeCompanyId)?.name || 'Select Organization';
  }, [companies, activeCompanyId]);

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
      <div className="flex items-center gap-2.5">
        {/* Platform Scope & Company Switcher (Searchable) */}
        {(role === 'super_admin' || companies.length > 0) && (
          <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-10 gap-2 rounded-[10px] px-3 font-normal max-w-[210px] sm:max-w-[260px] justify-between border-border bg-card hover:bg-muted text-foreground transition-all shadow-xs",
                  activeCompanyId === 'all' && "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium"
                )}
                title={`Scope: ${activeScopeName}`}
              >
                <div className="flex items-center gap-2 min-w-0 truncate text-xs sm:text-sm">
                  {activeCompanyId === 'all' ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <Globe className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Building2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate">{activeScopeName}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-xl border-border bg-popover" sideOffset={6}>
              <div className="p-3 border-b border-border bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground tracking-wide uppercase">
                    {role === 'super_admin' ? 'Select Platform Scope' : 'Select Organization'}
                  </p>
                  <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-background border border-border">
                    {companies.length} {companies.length === 1 ? 'org' : 'orgs'}
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    placeholder="Search organizations..."
                    className="h-8 pl-8 pr-7 text-xs bg-background"
                    autoFocus
                  />
                  {companySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCompanySearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
                {role === 'super_admin' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCompanyId('all');
                        setScopeOpen(false);
                      }}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between group",
                        activeCompanyId === 'all'
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <Globe className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs leading-tight flex items-center gap-1.5">
                            All Organizations
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                              Global Seer
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            Unified bird-eye platform monitoring & all tenant data
                          </p>
                        </div>
                      </div>
                      {activeCompanyId === 'all' && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                    </button>
                    <div className="my-1 border-t border-border/60" />
                  </>
                )}

                {filteredScopeCompanies.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No organizations matching "{companySearchQuery}"
                  </div>
                ) : (
                  filteredScopeCompanies.map((c) => {
                    const isSelected = activeCompanyId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setActiveCompanyId(c.id);
                          setScopeOpen(false);
                        }}
                        className={cn(
                          "w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between group",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                            isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <Building2 className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-xs leading-tight truncate">{c.name}</p>
                            <p className={cn("text-[10px] truncate mt-0.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                              {c.email || c.address || 'Tenant organization'}
                            </p>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0 ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <ThemeToggle />

        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-10 gap-2 rounded-[10px] px-4 shadow-xs">
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

        {role === 'super_admin' ? (
          <Badge className="hidden xl:flex h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 font-semibold items-center gap-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Super Admin (Global Seer)
          </Badge>
        ) : (
          <Badge variant="outline" className="hidden xl:flex h-8 rounded-full border-border bg-muted/60 px-3 text-foreground">
            {roleLabel}
          </Badge>
        )}

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
