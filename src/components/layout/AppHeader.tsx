import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Building, Home, Users, FileText, Receipt } from 'lucide-react';
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
import { useCreateTenant } from '@/hooks/useTenants';
import { useNotifications } from '@/hooks/useNotifications';

type QuickAddType = 'property' | 'unit' | 'tenant' | 'lease' | 'invoice' | null;

export function AppHeader() {
  const navigate = useNavigate();
  const [quickAddType, setQuickAddType] = useState<QuickAddType>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

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

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Navigate to a general search or filter the current page
      toast({ title: 'Search', description: `Searching for "${searchQuery}"...` });
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b border-border px-6 flex items-center justify-between gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties, tenants, leases..."
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
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
