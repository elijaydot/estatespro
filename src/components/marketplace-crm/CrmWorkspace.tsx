import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CRM_NAV_GROUPS } from '@/components/marketplace-crm/crmNavigation';

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
        <aside className="h-fit rounded-xl border border-border/70 bg-card/70 p-3 xl:sticky xl:top-24">
          <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 xl:grid-cols-1">
            {CRM_NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          'flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                          active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="space-y-4">{children}</section>
      </div>
    </div>
  );
}
