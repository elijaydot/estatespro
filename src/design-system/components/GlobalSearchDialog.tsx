import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Home,
  Users,
  FileText,
  Receipt,
  Wrench,
  MessageSquare,
  BarChart3,
  Search,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyCompanies } from '@/hooks/useCompanies';

export interface GlobalSearchDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalSearchDialog({ open: controlledOpen, onOpenChange }: GlobalSearchDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const navigate = useNavigate();
  const { isSuperAdmin } = useUserRole();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const { data: invoices = [] } = useInvoices();
  const { data: companies = [] } = useMyCompanies();

  // Global CMD+K / CTRL+K listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Search properties, units, tenants, invoices, maintenance, reports... (⌘K)" />
      <CommandList className="max-h-[380px] p-2">
        <CommandEmpty>No results found for your search.</CommandEmpty>

        {/* Quick Navigation Commands */}
        <CommandGroup heading="Navigation Shortcuts">
          <CommandItem
            onSelect={() => runCommand(() => navigate('/dashboard'))}
            className="gap-2.5 py-2"
          >
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <span>Executive Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/properties'))}
            className="gap-2.5 py-2"
          >
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span>Properties Directory</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/units'))}
            className="gap-2.5 py-2"
          >
            <Home className="h-4 w-4 text-amber-600" />
            <span>Units & Floorplans</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/tenants'))}
            className="gap-2.5 py-2"
          >
            <Users className="h-4 w-4 text-indigo-600" />
            <span>Tenants & Resident Roster</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/payments?view=collections'))}
            className="gap-2.5 py-2"
          >
            <Receipt className="h-4 w-4 text-rose-600" />
            <span>Rent Collections & Payments</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate('/maintenance'))}
            className="gap-2.5 py-2"
          >
            <Wrench className="h-4 w-4 text-amber-600" />
            <span>Maintenance & Work Orders</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Properties Matching */}
        {properties.length > 0 && (
          <CommandGroup heading="Properties">
            {properties.slice(0, 5).map((property) => (
              <CommandItem
                key={property.id}
                onSelect={() => runCommand(() => navigate(`/properties/${property.id}`))}
                className="gap-2.5 py-2 justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="font-medium truncate">{property.name}</span>
                  <span className="text-xs text-slate-400 truncate">({property.city})</span>
                </div>
                <span className="text-[11px] text-slate-400 capitalize">{property.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Tenants Matching */}
        {tenants.length > 0 && (
          <CommandGroup heading="Tenants">
            {tenants.slice(0, 5).map((tenant) => (
              <CommandItem
                key={tenant.id}
                onSelect={() => runCommand(() => navigate(`/tenants/${tenant.id}`))}
                className="gap-2.5 py-2 justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="font-medium truncate">{tenant.name}</span>
                  <span className="text-xs text-slate-400 truncate">{tenant.email}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {isSuperAdmin && companies.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customer Organizations">
              {companies.slice(0, 4).map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => runCommand(() => navigate(`/super-admin/control-plane?companyId=${c.id}`))}
                  className="gap-2.5 py-2 justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Org Inspect</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
