import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Building, Home, Users, FileText, Receipt, Command } from 'lucide-react';
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
            label: property.name || 'Unnamed property',
            sublabel: property.address || 'No address',
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
            label: tenant.name || 'Unnamed tenant',
            sublabel: tenant.email || 'No email',
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

  const handleFlowClick = () => {
    searchInputRef.current?.focus();
  };

  return (
    <header className="h-16 bg-card/90 border-b border-border/70 px-6 flex items-center justify-between gap-4 backdrop-blur-sm">
      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search properties, tenants..."
              className="pl-10 pr-14 bg-secondary/70 border border-border/60 focus-visible:ring-2 focus-visible:ring-ring"
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

          <button
            type="button"
            onClick={handleFlowClick}
            className="hidden md:flex items-center h-9 px-3 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
          >
            FishGate Flow
          </button>
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
        {/* Quick Add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 rounded-full px-4">
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
      </div>
    </header>
  );
}
