import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useModerationCases, useUpdateModerationCaseState } from '@/hooks/useMarketplace';

export default function MarketplaceModeration() {
  const { activeCompanyId } = useActiveCompany();
  const { isPropertyManager, isLandlord } = useUserRole();
  const moderationCasesQuery = useModerationCases(activeCompanyId);
  const updateModerationState = useUpdateModerationCaseState(activeCompanyId);

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'in_review' | 'resolved' | 'dismissed'>('all');

  const cases = useMemo(() => moderationCasesQuery.data ?? [], [moderationCasesQuery.data]);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesState = stateFilter === 'all' ? true : item.state === stateFilter;
      const text = `${item.reason_code} ${item.severity} ${item.queue}`.toLowerCase();
      const matchesSearch = search.trim() === '' ? true : text.includes(search.toLowerCase());
      return matchesState && matchesSearch;
    });
  }, [cases, search, stateFilter]);

  if (!isPropertyManager && !isLandlord) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 p-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Marketplace Safety Ops</p>
            <h1 className="text-2xl font-semibold">Moderation Queue</h1>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Quickly find cases by state or reason.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="Search reason/severity/queue"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select value={stateFilter} onValueChange={(value) => setStateFilter(value as typeof stateFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
            Showing {filteredCases.length} / {cases.length} cases
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case Queue</CardTitle>
          <CardDescription>Update case status as triage progresses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(moderationCasesQuery.isLoading || updateModerationState.isPending) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing moderation queue...
            </div>
          )}

          {filteredCases.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{item.reason_code}</p>
                  <p className="text-xs text-muted-foreground">Queue: {item.queue} · Opened: {new Date(item.opened_at).toLocaleString()}</p>
                  <div className="flex gap-2">
                    <Badge variant={item.severity === 'critical' ? 'destructive' : 'secondary'}>{item.severity}</Badge>
                    <Badge variant="outline">{item.state}</Badge>
                  </div>
                </div>
                <Select
                  value={item.state}
                  onValueChange={(state) =>
                    updateModerationState.mutate({
                      caseId: item.id,
                      state: state as 'open' | 'in_review' | 'resolved' | 'dismissed',
                    })
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {!moderationCasesQuery.isLoading && filteredCases.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No moderation cases match current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
