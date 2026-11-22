import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Plus,
  Building,
  Home,
  Users,
  FileText,
  Receipt,
  Wrench,
  Command,
  Check,
  ChevronDown,
  Building2,
  Globe,
  LogOut,
  Settings,
  HelpCircle,
} from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useUserRole } from '@/hooks/useUserRole';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useAuth } from '@/contexts/useAuth';
import { useI18n } from '@/contexts/useI18n';
import { GlobalSearchDialog } from '@/design-system/components/GlobalSearchDialog';

type QuickAddType = 'property' | 'unit' | 'tenant' | 'lease' | 'invoice' | 'maintenance';

export function AppHeader() {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const { user, profile, logout } = useAuth();
  const { t } = useI18n();
  const { companies, activeCompanyId, setActiveCompanyId } = useActiveCompany();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  const [searchOpen, setSearchOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  const isSuperAdmin = role === 'super_admin';

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
    if (activeCompanyId === 'all') return t('all_organizations', 'All Organizations (Global Seer)');
    return companies.find((c) => c.id === activeCompanyId)?.name || t('select_organization', 'Select Organization');
  }, [companies, activeCompanyId, t]);

  const handleQuickAddClick = (type: QuickAddType) => {
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
      case 'maintenance':
        navigate('/maintenance?add=true');
        break;
    }
  };

  const roleLabel = isSuperAdmin
    ? t('role_super_admin', 'Super Admin')
    : role === 'property_manager'
      ? t('role_property_manager', 'Property Manager')
      : role === 'landlord'
        ? t('role_landlord', 'Landlord')
        : t('role_tenant', 'Tenant');

  const initials = (profile?.name || user?.email || 'User')
    .split(/[\s@]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="h-16 bg-white/95 border-b border-slate-200/80 px-6 flex items-center justify-between gap-4 backdrop-blur-sm dark:bg-slate-900/95 dark:border-slate-800">
        {/* 1. Organization / Scope Switcher */}
        <div className="flex items-center gap-3">
          {(isSuperAdmin || companies.length > 0) && (
            <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 gap-2 rounded-lg px-3 font-normal max-w-[210px] sm:max-w-[260px] justify-between border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all shadow-2xs',
                    activeCompanyId === 'all' &&
                      'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 font-medium'
                  )}
                  title={`Scope: ${activeScopeName}`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate text-xs sm:text-sm">
                    {activeCompanyId === 'all' ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                        <Globe className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <Building2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className="truncate">{activeScopeName}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 p-0 shadow-lg border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" sideOffset={6}>
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-wide uppercase">
                      {isSuperAdmin ? t('select_platform_scope', 'Select Platform Scope') : t('select_organization', 'Select Organization')}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {companies.length} {companies.length === 1 ? 'org' : 'orgs'}
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery(e.target.value)}
                      placeholder={t('search_organizations', 'Search organizations...')}
                      className="h-8 pl-8 pr-7 text-xs bg-white dark:bg-slate-800"
                      autoFocus
                    />
                    {companySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCompanySearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                  {isSuperAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCompanyId('all');
                          setScopeOpen(false);
                        }}
                        className={cn(
                          'w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between group',
                          activeCompanyId === 'all'
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                            <Globe className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs leading-tight flex items-center gap-1.5">
                              {t('all_organizations', 'All Organizations')}
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 font-bold">
                                Global Seer
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              Unified bird-eye platform monitoring
                            </p>
                          </div>
                        </div>
                        {activeCompanyId === 'all' && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                      </button>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    </>
                  )}

                  {filteredScopeCompanies.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">
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
                            'w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between group',
                            isSelected
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              )}
                            >
                              <Building2 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-xs leading-tight truncate">{c.name}</p>
                              <p className={cn('text-[10px] truncate mt-0.5', isSelected ? 'text-white/80' : 'text-slate-400')}>
                                {c.email || c.address || 'Tenant organization'}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 shrink-0 ml-2 text-white" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* 2. Global Universal Search (CMD+K / Trigger) */}
        <div className="flex-1 max-w-xl mx-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full h-9 flex items-center justify-between px-3 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-100/70 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/80"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>{t('header_search_placeholder', 'Search properties, units, tenants, invoices...')}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          </button>
        </div>

        {/* 3. Actions: Quick Create + Notifications + Profile */}
        <div className="flex items-center gap-2.5">
          {/* Quick Create Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5 rounded-lg px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-2xs">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('quick_add', 'Create')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs uppercase text-slate-400 font-semibold">
                {t('create_new', 'Quick Create')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleQuickAddClick('property')} className="gap-2 text-xs">
                <Building className="h-3.5 w-3.5 text-slate-500" />
                {t('quick_add_property', 'Property')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAddClick('unit')} className="gap-2 text-xs">
                <Home className="h-3.5 w-3.5 text-slate-500" />
                {t('quick_add_unit', 'Unit')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAddClick('tenant')} className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                {t('quick_add_tenant', 'Tenant')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAddClick('lease')} className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                {t('quick_add_lease', 'Lease')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAddClick('invoice')} className="gap-2 text-xs">
                <Receipt className="h-3.5 w-3.5 text-slate-500" />
                {t('quick_add_invoice', 'Invoice')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAddClick('maintenance')} className="gap-2 text-xs">
                <Wrench className="h-3.5 w-3.5 text-slate-500" />
                {t('quick_add_maintenance', 'Maintenance Ticket')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            onClick={() => navigate('/notifications')}
            aria-label="Open notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute 1.5 top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </Button>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 rounded-lg px-1.5 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold dark:bg-blue-900 dark:text-blue-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:block max-w-32 truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                  {profile?.name || user?.email}
                </span>
                <ChevronDown className="hidden xl:block h-3.5 w-3.5 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.name || user?.email}
                </span>
                <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                  {roleLabel}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/settings')} className="gap-2 text-xs">
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                {t('nav_settings', 'Settings')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/support')} className="gap-2 text-xs">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                {t('nav_support', 'Help & Support')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void logout()}
                className="gap-2 text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('nav_logout', 'Sign out')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Raycast/Spotlight Universal Search Modal */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
