import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import { useCrmAssignableUsers, useIsInternalMarketplaceReviewer, useModerationCases, useUpdateModerationCaseState } from '@/hooks/useMarketplace';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';

export default function MarketplaceModeration() {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { isPropertyManager, isLandlord, isSuperAdmin } = useUserRole();
  const reviewerAccessQuery = useIsInternalMarketplaceReviewer(user?.id);
  const moderationCasesQuery = useModerationCases(activeCompanyId);
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const updateModerationState = useUpdateModerationCaseState(activeCompanyId);

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'in_review' | 'resolved' | 'dismissed'>('all');
  const [resolutionNotesDraft, setResolutionNotesDraft] = useState<Record<string, string>>({});

  const cases = useMemo(() => moderationCasesQuery.data ?? [], [moderationCasesQuery.data]);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesState = stateFilter === 'all' ? true : item.state === stateFilter;
      const text = `${item.reason_code} ${item.severity} ${item.queue}`.toLowerCase();
      const matchesSearch = search.trim() === '' ? true : text.includes(search.toLowerCase());
      return matchesState && matchesSearch;
    });
  }, [cases, search, stateFilter]);

  const moderatorNameById = useMemo(() => {
    const map = new Map<string, string>();
    (assignableUsersQuery.data || []).forEach((user) => {
      map.set(user.user_id, user.name || user.user_id);
    });
    return map;
  }, [assignableUsersQuery.data]);

  if (!isPropertyManager && !isLandlord && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const canModerate = isSuperAdmin || reviewerAccessQuery.data === true;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Marketplace Safety Ops" title="Moderation Queue" description="Triage, assign, and resolve marketplace trust cases." action={<StatusPill variant={canModerate ? 'success' : 'warning'}>{canModerate ? 'Reviewer Access' : 'Read Only'}</StatusPill>} />

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
          {!canModerate && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              Reviewer role required to assign moderators or transition cases to in-review/resolved/dismissed.
            </div>
          )}

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
                  <p className="text-xs text-muted-foreground">Assigned: {item.assigned_moderator ? (moderatorNameById.get(item.assigned_moderator) || item.assigned_moderator) : 'Unassigned'}</p>
                  {item.resolved_at ? (
                    <p className="text-xs text-muted-foreground">Resolved: {new Date(item.resolved_at).toLocaleString()} · By: {item.resolved_by || 'unknown'}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <StatusPill variant={item.severity === 'critical' ? 'destructive' : item.severity === 'high' ? 'warning' : 'neutral'}>{item.severity}</StatusPill>
                    <StatusPill variant={item.state === 'resolved' ? 'success' : item.state === 'in_review' ? 'info' : 'neutral'}>{item.state.replace('_', ' ')}</StatusPill>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 md:w-[320px]">
                  <Select
                    value={item.assigned_moderator || 'unassigned'}
                    disabled={!canModerate || updateModerationState.isPending}
                    onValueChange={(moderatorId) =>
                      updateModerationState.mutate({
                        caseId: item.id,
                        state: item.state,
                        assignedModerator: moderatorId === 'unassigned' ? null : moderatorId,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign moderator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(assignableUsersQuery.data || []).map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={item.state}
                    disabled={!canModerate || updateModerationState.isPending}
                    onValueChange={(state) =>
                      updateModerationState.mutate({
                        caseId: item.id,
                        state: state as 'open' | 'in_review' | 'resolved' | 'dismissed',
                        assignedModerator: item.assigned_moderator,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_review">In review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Resolution notes"
                    value={resolutionNotesDraft[item.id] ?? item.resolution_notes ?? ''}
                    onChange={(event) => setResolutionNotesDraft((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canModerate || updateModerationState.isPending}
                    onClick={() =>
                      updateModerationState.mutate({
                        caseId: item.id,
                        state: item.state,
                        assignedModerator: item.assigned_moderator,
                        resolutionNotes: resolutionNotesDraft[item.id] ?? item.resolution_notes ?? '',
                      })
                    }
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!moderationCasesQuery.isLoading && filteredCases.length === 0 && (
            <EmptyState icon={ShieldAlert} title="No matching moderation cases" description="Adjust the search or state filter to broaden the queue." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
