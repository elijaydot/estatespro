import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Building, Home, Users, FileText, Receipt } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/use-toast';
import { useCreateProperty, useProperties } from '@/hooks/useProperties';
import { useCreateUnit, useUnits } from '@/hooks/useUnits';
import { useCreateTenant, useTenants } from '@/hooks/useTenants';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

type QuickAddType = 'property' | 'unit' | 'tenant' | 'lease' | 'invoice' | null;

export function AppHeader() {
  const navigate = useNavigate();
  const [quickAddType, setQuickAddType] = useState<QuickAddType>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const [searchResults, setSearchResults] = useState<Array<{ label: string; path: string; type: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: properties = [] } = useProperties();
  const allTenants = useTenants();
  const tenants = allTenants.data || [];

  // Live search across properties and tenants
  const filteredResults = searchQuery.trim().length >= 2
    ? [
        ...properties
          .filter((p: any) =>
            safeSearch(p.name).includes(searchQuery.toLowerCase()) ||
            safeSearch(p.address).includes(searchQuery.toLowerCase()) ||
            safeSearch(p.city).includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
          .map((p: any) => ({ label: p.name, sublabel: p.address, path: `/properties/${p.id}`, type: 'Property' })),
        ...tenants
          .filter((t: any) =>
            safeSearch(t.name).includes(searchQuery.toLowerCase()) ||
            safeSearch(t.email).includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
          .map((t: any) => ({ label: t.name, sublabel: t.email, path: `/tenants/${t.id}`, type: 'Tenant' })),
      ]
    : [];

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() && filteredResults.length > 0) {
      navigate(filteredResults[0].path);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border px-6 flex items-center justify-between gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties, tenants..."
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onBlur={() => setTimeout(() => setSearchQuery(''), 200)}
          />
          {filteredResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {filteredResults.map((result, i) => (
                <button
                  key={i}
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
            <Button size="sm" className="gap-2">
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
