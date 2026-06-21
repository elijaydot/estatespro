import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReactNode } from 'react';

export function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card className="border-border/70 bg-gradient-to-b from-background to-muted/20 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
      </CardHeader>
      {helper && <CardContent className="text-xs text-muted-foreground">{helper}</CardContent>}
    </Card>
  );
}

export function CrmDataCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-gradient-to-b from-background to-muted/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description ? <CardDescription className="pt-1 text-xs leading-relaxed text-muted-foreground">{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function SimpleToolbar({
  search,
  setSearch,
  createLabel,
  onCreate,
}: {
  search: string;
  setSearch: (value: string) => void;
  createLabel?: string;
  onCreate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/20 p-2 sm:flex-row sm:items-center sm:justify-between">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" className="h-9 border-border/70 bg-background sm:max-w-xs" />
      {createLabel && onCreate ? (
        <Button className="h-9" onClick={onCreate}>{createLabel}</Button>
      ) : null}
    </div>
  );
}
