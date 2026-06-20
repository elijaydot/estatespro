import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  BarChart3,
  Grid3X3,
  UserRound,
  Users,
  Building2,
  HandCoins,
  CheckSquare,
  Calendar,
  Phone,
  Megaphone,
  FileText,
  MapPin,
  FolderKanban,
} from 'lucide-react';

export type CrmNavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const CRM_NAV_ITEMS: CrmNavItem[] = [
  { label: 'Overview', href: '/marketplace/crm', icon: LayoutGrid },
  { label: 'Reports', href: '/marketplace/crm/reports', icon: BarChart3 },
  { label: 'Modules', href: '/marketplace/crm/modules', icon: Grid3X3 },
  { label: 'Leads', href: '/marketplace/crm/leads', icon: UserRound },
  { label: 'Contacts', href: '/marketplace/crm/contacts', icon: Users },
  { label: 'Accounts', href: '/marketplace/crm/accounts', icon: Building2 },
  { label: 'Deals', href: '/marketplace/crm/deals', icon: HandCoins },
  { label: 'Tasks', href: '/marketplace/crm/tasks', icon: CheckSquare },
  { label: 'Meetings', href: '/marketplace/crm/meetings', icon: Calendar },
  { label: 'Calls', href: '/marketplace/crm/calls', icon: Phone },
  { label: 'Campaigns', href: '/marketplace/crm/campaigns', icon: Megaphone },
  { label: 'Documents', href: '/marketplace/crm/documents', icon: FileText },
  { label: 'Visits', href: '/marketplace/crm/visits', icon: MapPin },
  { label: 'Projects', href: '/marketplace/crm/projects', icon: FolderKanban },
];

export function CrmWorkspace({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/70 bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-cyan-500/10 p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Marketplace CRM</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-border/70 bg-card/70 p-3 h-fit xl:sticky xl:top-24">
          <div className="space-y-1">
            {CRM_NAV_ITEMS.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">{children}</section>
      </div>
    </div>
  );
}
