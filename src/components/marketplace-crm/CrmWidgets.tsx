import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReactNode } from 'react';

export function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" className="sm:max-w-xs" />
      {createLabel && onCreate ? (
        <Button onClick={onCreate}>{createLabel}</Button>
      ) : null}
    </div>
  );
}
