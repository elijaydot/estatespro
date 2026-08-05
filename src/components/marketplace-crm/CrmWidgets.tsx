import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { FilterBar } from '@/components/shared/FilterBar';
import { EmptyState as SharedEmptyState } from '@/components/shared/EmptyState';

export function MetricCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase text-muted-foreground">{label}</CardDescription>
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
    <Card>
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
  return <SharedEmptyState icon={Inbox} title={label} />;
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
    <FilterBar className="p-3">
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" className="h-9 border-border/70 bg-background sm:max-w-xs" />
      {createLabel && onCreate ? (
        <Button className="h-9" onClick={onCreate}>{createLabel}</Button>
      ) : null}
    </FilterBar>
  );
}
