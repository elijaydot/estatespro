import { ReactNode } from 'react';

export function CrmWorkspace({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <section className="border-b border-border pb-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Marketplace CRM</p>
        <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </section>

      <section className="space-y-4">{children}</section>
    </div>
  );
}
