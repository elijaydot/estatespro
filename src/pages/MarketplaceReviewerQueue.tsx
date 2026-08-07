import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock3, FileCheck2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import {
  ageInDays,
  getSlaLevel,
  matchesDecisionFilter,
  matchesSlaFilter,
  nextVisibleCount,
  REVIEWER_AUDIT_PAGE_SIZE,
  REVIEWER_QUEUE_PAGE_SIZE,
  sliceRows,
} from '@/lib/reviewerQueue';
import {
  useReviewerDecisionOnPublisherVerification,
  useReviewerDecisionOnVerificationDocument,
  useIsInternalMarketplaceReviewer,
  useReviewerModerationCaseHistory,
  useReviewerModerationCaseQueue,
  useReviewerProfiles,
  useReviewerPublisherDecisionHistory,
  useReviewerPublisherVerificationQueue,
  useReviewerVerificationDocumentHistory,
  useReviewerVerificationDocumentQueue,
  useUpdateModerationCaseState,
} from '@/hooks/useMarketplace';
import { EmptyState } from '@/components/shared/EmptyState';
import { QueryErrorState } from '@/components/marketplace-crm/CrmWidgets';
import { MetricCard } from '@/components/shared/MetricCard';
import { PageHeader } from '@/components/shared/PageHeader';

export default function MarketplaceReviewerQueue() {
  const { user } = useAuth();
  const { isSuperAdmin, isLandlord, isPropertyManager } = useUserRole();
  const { activeCompanyId } = useActiveCompany();
  const reviewerAccessQuery = useIsInternalMarketplaceReviewer(user?.id);

  const [scopeAllCompanies, setScopeAllCompanies] = useState(true);
  const [activeQueue, setActiveQueue] = useState<'publishers' | 'documents' | 'moderation' | 'history'>('publishers');
  const [search, setSearch] = useState('');
  const [publisherSlaFilter, setPublisherSlaFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [documentSlaFilter, setDocumentSlaFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [moderationSlaFilter, setModerationSlaFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [auditDecisionFilter, setAuditDecisionFilter] = useState<'all' | 'verified' | 'needs_review' | 'rejected' | 'approved' | 'resolved' | 'dismissed'>('all');
  const [verificationReasons, setVerificationReasons] = useState<Record<string, string>>({});
  const [documentReasons, setDocumentReasons] = useState<Record<string, string>>({});
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});
  const [publisherVisibleCount, setPublisherVisibleCount] = useState(REVIEWER_QUEUE_PAGE_SIZE);
  const [documentVisibleCount, setDocumentVisibleCount] = useState(REVIEWER_QUEUE_PAGE_SIZE);
  const [moderationVisibleCount, setModerationVisibleCount] = useState(REVIEWER_QUEUE_PAGE_SIZE);
  const [auditVisibleCount, setAuditVisibleCount] = useState(REVIEWER_AUDIT_PAGE_SIZE);

  const scopedCompanyId = scopeAllCompanies ? null : activeCompanyId;

  const publisherQueue = useReviewerPublisherVerificationQueue(scopedCompanyId);
  const documentQueue = useReviewerVerificationDocumentQueue(scopedCompanyId);
  const moderationQueue = useReviewerModerationCaseQueue(scopedCompanyId);
  const publisherHistory = useReviewerPublisherDecisionHistory(scopedCompanyId);
  const documentHistory = useReviewerVerificationDocumentHistory(scopedCompanyId);
  const moderationHistory = useReviewerModerationCaseHistory(scopedCompanyId);
  const reviewPublisher = useReviewerDecisionOnPublisherVerification(scopedCompanyId);
  const reviewDocument = useReviewerDecisionOnVerificationDocument();
  const updateModerationState = useUpdateModerationCaseState(scopedCompanyId);

  const reviewerIds = useMemo(() => {
    const ids: string[] = [];

    (publisherQueue.data || []).forEach((row) => {
      if (row.verified_by) ids.push(row.verified_by);
    });

    (documentQueue.data || []).forEach((row) => {
      if (row.reviewed_by) ids.push(row.reviewed_by);
    });

    (publisherHistory.data || []).forEach((row) => {
      if (row.reviewed_by) ids.push(row.reviewed_by);
    });

    (documentHistory.data || []).forEach((row) => {
      if (row.reviewed_by) ids.push(row.reviewed_by);
    });

    (moderationQueue.data || []).forEach((row) => {
      if (row.assigned_moderator) ids.push(row.assigned_moderator);
    });

    (moderationHistory.data || []).forEach((row) => {
      if (row.resolved_by) ids.push(row.resolved_by);
    });

    return Array.from(new Set(ids));
  }, [publisherQueue.data, documentQueue.data, publisherHistory.data, documentHistory.data, moderationQueue.data, moderationHistory.data]);

  const reviewerProfiles = useReviewerProfiles(reviewerIds);
  const reviewerMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    (reviewerProfiles.data || []).forEach((profile) => {
      map.set(profile.user_id, { name: profile.name, email: profile.email });
    });
    return map;
  }, [reviewerProfiles.data]);

  const resolveReviewerLabel = (reviewerId?: string | null) => {
    if (!reviewerId) return 'Unknown reviewer';
    const profile = reviewerMap.get(reviewerId);
    if (!profile) return reviewerId;
    return `${profile.name} (${profile.email})`;
  };

  const publisherRows = useMemo(() => {
    const rows = publisherQueue.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => (`${row.company_name} ${row.state}`).toLowerCase().includes(query));
  }, [publisherQueue.data, search]);

  const filteredPublisherRows = useMemo(() => {
    return publisherRows.filter((row) => matchesSlaFilter(ageInDays(row.last_submitted_at), publisherSlaFilter));
  }, [publisherRows, publisherSlaFilter]);

  const visiblePublisherRows = useMemo(
    () => sliceRows(filteredPublisherRows, publisherVisibleCount),
    [filteredPublisherRows, publisherVisibleCount],
  );

  const documentRows = useMemo(() => {
    const rows = documentQueue.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => (`${row.company_name} ${row.document_type} ${row.storage_path}`).toLowerCase().includes(query));
  }, [documentQueue.data, search]);

  const filteredDocumentRows = useMemo(() => {
    return documentRows.filter((row) => matchesSlaFilter(ageInDays(row.created_at), documentSlaFilter));
  }, [documentRows, documentSlaFilter]);

  const visibleDocumentRows = useMemo(
    () => sliceRows(filteredDocumentRows, documentVisibleCount),
    [filteredDocumentRows, documentVisibleCount],
  );

  const moderationRows = useMemo(() => {
    const rows = moderationQueue.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => (`${row.company_name} ${row.reason_code} ${row.severity} ${row.queue}`).toLowerCase().includes(query));
  }, [moderationQueue.data, search]);

  const filteredModerationRows = useMemo(() => {
    return moderationRows.filter((row) => matchesSlaFilter(ageInDays(row.opened_at), moderationSlaFilter));
  }, [moderationRows, moderationSlaFilter]);

  const visibleModerationRows = useMemo(
    () => sliceRows(filteredModerationRows, moderationVisibleCount),
    [filteredModerationRows, moderationVisibleCount],
  );

  const publisherSla = useMemo(() => {
    return publisherRows.reduce(
      (acc, row) => {
        const level = getSlaLevel(ageInDays(row.last_submitted_at));
        acc[level] += 1;
        return acc;
      },
      { healthy: 0, warning: 0, critical: 0 },
    );
  }, [publisherRows]);

  const documentSla = useMemo(() => {
    return documentRows.reduce(
      (acc, row) => {
        const level = getSlaLevel(ageInDays(row.created_at));
        acc[level] += 1;
        return acc;
      },
      { healthy: 0, warning: 0, critical: 0 },
    );
  }, [documentRows]);

  const moderationSla = useMemo(() => {
    return moderationRows.reduce(
      (acc, row) => {
        const level = getSlaLevel(ageInDays(row.opened_at));
        acc[level] += 1;
        return acc;
      },
      { healthy: 0, warning: 0, critical: 0 },
    );
  }, [moderationRows]);

  const activeQueueError = activeQueue === 'publishers'
    ? publisherQueue.error
    : activeQueue === 'documents'
      ? documentQueue.error
      : activeQueue === 'moderation'
        ? moderationQueue.error
        : publisherHistory.error || documentHistory.error || moderationHistory.error;
  const retryActiveQueue = () => {
    if (activeQueue === 'publishers') void publisherQueue.refetch();
    else if (activeQueue === 'documents') void documentQueue.refetch();
    else if (activeQueue === 'moderation') void moderationQueue.refetch();
    else void Promise.all([publisherHistory.refetch(), documentHistory.refetch(), moderationHistory.refetch()]);
  };

  const auditTrail = useMemo(() => {
    const publisherEvents = (publisherHistory.data || []).map((row) => {
      const reviewer = row.reviewed_by ? reviewerMap.get(row.reviewed_by) : null;
      return {
      id: `publisher-${row.id}`,
      type: 'Publisher Verification',
      company: row.company_name,
      decision: row.state,
      actor: reviewer ? `${reviewer.name} (${reviewer.email})` : row.reviewed_by || 'Unknown reviewer',
      at: row.reviewed_at,
      reason: row.rejection_reason,
      };
    });

    const documentEvents = (documentHistory.data || []).map((row) => {
      const reviewer = row.reviewed_by ? reviewerMap.get(row.reviewed_by) : null;
      return {
      id: `document-${row.id}`,
      type: `Document (${row.document_type})`,
      company: row.company_name,
      decision: row.state,
      actor: reviewer ? `${reviewer.name} (${reviewer.email})` : row.reviewed_by || 'Unknown reviewer',
      at: row.reviewed_at,
      reason: row.rejection_reason,
      };
    });

    const moderationEvents = (moderationHistory.data || []).map((row) => ({
      id: `moderation-${row.id}`,
      type: `Moderation (${row.reason_code})`,
      company: row.company_name,
      decision: row.state,
      actor: resolveReviewerLabel(row.resolved_by),
      at: row.resolved_at,
      reason: row.resolution_notes,
    }));

    return [...publisherEvents, ...documentEvents, ...moderationEvents]
      .filter((event) => matchesDecisionFilter(event.decision, auditDecisionFilter))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 200);
  }, [publisherHistory.data, documentHistory.data, moderationHistory.data, reviewerMap, auditDecisionFilter]);

  const visibleAuditTrail = useMemo(
    () => sliceRows(auditTrail, auditVisibleCount),
    [auditTrail, auditVisibleCount],
  );

  if (!(isSuperAdmin || isLandlord || isPropertyManager)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isSuperAdmin && reviewerAccessQuery.isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Checking reviewer access...</div>;
  }

  const canReview = isSuperAdmin || reviewerAccessQuery.data === true;
  if (!canReview) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Trust Ops" title="Reviewer Console" description="Publisher verification, document review, and moderation cases in one operational queue." />

      <Card>
        <CardHeader>
          <CardTitle>Queue Controls</CardTitle>
          <CardDescription>Filter by company scope and search queue records.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-md border border-border px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">All companies</span>
              <Switch checked={scopeAllCompanies} onCheckedChange={setScopeAllCompanies} />
            </div>
          </div>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, state, document type" />
          {activeQueue === 'publishers' ? <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={publisherSlaFilter}
            onChange={(event) => setPublisherSlaFilter(event.target.value as 'all' | 'healthy' | 'warning' | 'critical')}
          >
            <option value="all">Publisher SLA: All</option>
            <option value="healthy">Publisher SLA: Healthy</option>
            <option value="warning">Publisher SLA: Warning</option>
            <option value="critical">Publisher SLA: Critical</option>
          </select> : null}
          {activeQueue === 'documents' ? <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={documentSlaFilter}
            onChange={(event) => setDocumentSlaFilter(event.target.value as 'all' | 'healthy' | 'warning' | 'critical')}
          >
            <option value="all">Document SLA: All</option>
            <option value="healthy">Document SLA: Healthy</option>
            <option value="warning">Document SLA: Warning</option>
            <option value="critical">Document SLA: Critical</option>
          </select> : null}
          {activeQueue === 'moderation' ? <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={moderationSlaFilter}
            onChange={(event) => setModerationSlaFilter(event.target.value as 'all' | 'healthy' | 'warning' | 'critical')}
          >
            <option value="all">Moderation SLA: All</option>
            <option value="healthy">Moderation SLA: Healthy</option>
            <option value="warning">Moderation SLA: Warning</option>
            <option value="critical">Moderation SLA: Critical</option>
          </select> : null}
          {activeQueue === 'history' ? <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={auditDecisionFilter}
            onChange={(event) => setAuditDecisionFilter(event.target.value as typeof auditDecisionFilter)}
          >
            <option value="all">All decisions</option>
            <option value="verified">Verified</option>
            <option value="needs_review">Needs Review</option>
            <option value="rejected">Rejected</option>
            <option value="approved">Approved</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select> : null}
          <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
            {filteredPublisherRows.length} verifications · {filteredDocumentRows.length} documents · {filteredModerationRows.length} cases
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard title="Publisher Queue" value={publisherQueue.isError ? '—' : filteredPublisherRows.length} icon={Building2} />
        <MetricCard title="Document Queue" value={documentQueue.isError ? '—' : filteredDocumentRows.length} icon={FileCheck2} accent="info" />
        <MetricCard title="Moderation Queue" value={moderationQueue.isError ? '—' : filteredModerationRows.length} icon={ShieldAlert} accent="warning" />
        <MetricCard title="Critical SLA" value={publisherQueue.isError || documentQueue.isError || moderationQueue.isError ? '—' : publisherSla.critical + documentSla.critical + moderationSla.critical} icon={Clock3} accent="warning" />
      </div>

      <Tabs value={activeQueue} onValueChange={(value) => setActiveQueue(value as typeof activeQueue)} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1">
          <TabsTrigger value="publishers">Publishers <Badge variant="secondary" className="ml-2">{filteredPublisherRows.length}</Badge></TabsTrigger>
          <TabsTrigger value="documents">Documents <Badge variant="secondary" className="ml-2">{filteredDocumentRows.length}</Badge></TabsTrigger>
          <TabsTrigger value="moderation">Moderation <Badge variant="secondary" className="ml-2">{filteredModerationRows.length}</Badge></TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

      {activeQueueError ? <Card><QueryErrorState message={activeQueueError.message} onRetry={retryActiveQueue} /></Card> : null}

      <TabsContent value="publishers" className={activeQueueError ? 'hidden' : undefined}>
      <Card>
        <CardHeader>
          <CardTitle>Publisher Verification Queue</CardTitle>
          <CardDescription>Review pending and needs-review company verifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visiblePublisherRows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border/70 p-3">
              {(() => {
                const level = getSlaLevel(ageInDays(row.last_submitted_at));
                return (
                  <div className="mb-2">
                    {level === 'critical' ? <Badge variant="destructive">Critical SLA</Badge> : level === 'warning' ? <Badge variant="secondary">Warning SLA</Badge> : <Badge variant="outline">Healthy SLA</Badge>}
                  </div>
                );
              })()}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{row.company_name}</p>
                  <p className="text-xs text-muted-foreground">Submitted {new Date(row.last_submitted_at).toLocaleString()} · {ageInDays(row.last_submitted_at)}d ago</p>
                  {row.verified_by && row.verified_at ? (
                    <p className="text-xs text-muted-foreground">Last reviewed by {resolveReviewerLabel(row.verified_by)} on {new Date(row.verified_at).toLocaleString()}</p>
                  ) : null}
                </div>
                <Badge variant={row.state === 'needs_review' ? 'secondary' : 'outline'}>{row.state}</Badge>
              </div>

              <Input
                className="mt-2"
                placeholder="Reason (required for rejection)"
                value={verificationReasons[row.id] || ''}
                onChange={(event) => setVerificationReasons((prev) => ({ ...prev, [row.id]: event.target.value }))}
              />

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => reviewPublisher.mutate({ verificationId: row.id, companyId: row.company_id, state: 'verified' })}
                  disabled={reviewPublisher.isPending}
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => reviewPublisher.mutate({ verificationId: row.id, companyId: row.company_id, state: 'needs_review' })}
                  disabled={reviewPublisher.isPending}
                >
                  Needs Review
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    reviewPublisher.mutate({
                      verificationId: row.id,
                      companyId: row.company_id,
                      state: 'rejected',
                      rejectionReason: verificationReasons[row.id] || '',
                    })
                  }
                  disabled={reviewPublisher.isPending || !(verificationReasons[row.id] || '').trim()}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}

          {!publisherQueue.isLoading && filteredPublisherRows.length === 0 && (
            <EmptyState icon={Building2} title="No publisher verifications" description="No publisher records match the current queue filters." />
          )}
          {filteredPublisherRows.length > visiblePublisherRows.length ? (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setPublisherVisibleCount((current) =>
                    nextVisibleCount(current, filteredPublisherRows.length, REVIEWER_QUEUE_PAGE_SIZE),
                  )
                }
              >
                Load More Publisher Items ({visiblePublisherRows.length}/{filteredPublisherRows.length})
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="documents" className={activeQueueError ? 'hidden' : undefined}>
      <Card>
        <CardHeader>
          <CardTitle>Verification Document Queue</CardTitle>
          <CardDescription>Review pending verification documents and capture decision reasons.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleDocumentRows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border/70 p-3">
              {(() => {
                const level = getSlaLevel(ageInDays(row.created_at));
                return (
                  <div className="mb-2">
                    {level === 'critical' ? <Badge variant="destructive">Critical SLA</Badge> : level === 'warning' ? <Badge variant="secondary">Warning SLA</Badge> : <Badge variant="outline">Healthy SLA</Badge>}
                  </div>
                );
              })()}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{row.company_name}</p>
                  <p className="text-xs text-muted-foreground">{row.document_type} · Uploaded {new Date(row.created_at).toLocaleString()} · {ageInDays(row.created_at)}d ago</p>
                  {row.reviewed_by && row.reviewed_at ? (
                    <p className="text-xs text-muted-foreground">Last reviewed by {resolveReviewerLabel(row.reviewed_by)} on {new Date(row.reviewed_at).toLocaleString()}</p>
                  ) : null}
                </div>
                <Badge variant="secondary">pending</Badge>
              </div>

              <p className="mt-1 text-xs text-muted-foreground break-all">{row.storage_path}</p>

              <Input
                className="mt-2"
                placeholder="Reason (required for rejection)"
                value={documentReasons[row.id] || ''}
                onChange={(event) => setDocumentReasons((prev) => ({ ...prev, [row.id]: event.target.value }))}
              />

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => reviewDocument.mutate({ documentId: row.id, verificationId: row.verification_id, state: 'approved' })}
                  disabled={reviewDocument.isPending}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    reviewDocument.mutate({
                      documentId: row.id,
                      verificationId: row.verification_id,
                      state: 'rejected',
                      rejectionReason: documentReasons[row.id] || '',
                    })
                  }
                  disabled={reviewDocument.isPending || !(documentReasons[row.id] || '').trim()}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}

          {!documentQueue.isLoading && filteredDocumentRows.length === 0 && (
            <EmptyState icon={FileCheck2} title="No verification documents" description="No document records match the current queue filters." />
          )}
          {filteredDocumentRows.length > visibleDocumentRows.length ? (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setDocumentVisibleCount((current) =>
                    nextVisibleCount(current, filteredDocumentRows.length, REVIEWER_QUEUE_PAGE_SIZE),
                  )
                }
              >
                Load More Document Items ({visibleDocumentRows.length}/{filteredDocumentRows.length})
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="moderation" className={activeQueueError ? 'hidden' : undefined}>
      <Card>
        <CardHeader>
          <CardTitle>Moderation Cases</CardTitle>
          <CardDescription>Self-assign cases before triage. Resolution and dismissal require notes; separation of duties is enforced by the database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleModerationRows.map((row) => {
            const level = getSlaLevel(ageInDays(row.opened_at));
            const notes = moderationNotes[row.id] || '';
            return (
              <div key={row.id} className="rounded-lg border border-border/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant={level === 'critical' ? 'destructive' : level === 'warning' ? 'secondary' : 'outline'}>{level} SLA</Badge>
                      <Badge variant={row.severity === 'critical' ? 'destructive' : 'outline'}>{row.severity}</Badge>
                      <Badge variant="secondary">{row.state.replace('_', ' ')}</Badge>
                    </div>
                    <p className="font-medium">{row.company_name} · {row.reason_code}</p>
                    <p className="text-xs text-muted-foreground">Queue: {row.queue} · Opened {new Date(row.opened_at).toLocaleString()} · {ageInDays(row.opened_at)}d ago</p>
                    <p className="text-xs text-muted-foreground">Assigned: {resolveReviewerLabel(row.assigned_moderator)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateModerationState.isPending || row.assigned_moderator === user?.id}
                    onClick={() => updateModerationState.mutate({ caseId: row.id, state: 'in_review', assignedModerator: user?.id || null })}
                  >
                    Assign to me
                  </Button>
                </div>
                <Input
                  className="mt-3"
                  placeholder="Resolution notes (required to resolve or dismiss)"
                  value={notes}
                  onChange={(event) => setModerationNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={updateModerationState.isPending || !notes.trim()}
                    onClick={() => updateModerationState.mutate({ caseId: row.id, state: 'resolved', assignedModerator: row.assigned_moderator || user?.id || null, resolutionNotes: notes })}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={updateModerationState.isPending || !notes.trim()}
                    onClick={() => updateModerationState.mutate({ caseId: row.id, state: 'dismissed', assignedModerator: row.assigned_moderator || user?.id || null, resolutionNotes: notes })}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            );
          })}

          {!moderationQueue.isLoading && filteredModerationRows.length === 0 && (
            <EmptyState icon={ShieldAlert} title="No moderation cases" description="No open moderation cases match the current queue filters." />
          )}
          {filteredModerationRows.length > visibleModerationRows.length ? (
            <Button
              variant="outline"
              onClick={() => setModerationVisibleCount((current) => nextVisibleCount(current, filteredModerationRows.length, REVIEWER_QUEUE_PAGE_SIZE))}
            >
              Load More Cases ({visibleModerationRows.length}/{filteredModerationRows.length})
            </Button>
          ) : null}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="history" className={activeQueueError ? 'hidden' : undefined}>
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Latest reviewer decisions across publisher and document workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {visibleAuditTrail.map((event) => (
            <div key={event.id} className="rounded-md border border-border/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{event.type} · {event.company}</p>
                <Badge variant="outline">{event.decision}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Reviewed by: {event.actor}</p>
              <p className="text-xs text-muted-foreground">At: {new Date(event.at).toLocaleString()}</p>
              {event.reason ? <p className="text-xs text-muted-foreground">Reason: {event.reason}</p> : null}
            </div>
          ))}

          {!publisherHistory.isLoading && !documentHistory.isLoading && !moderationHistory.isLoading && auditTrail.length === 0 && (
            <EmptyState icon={ShieldCheck} title="No reviewer history" description="Completed verification, document, and moderation decisions will appear here." />
          )}
          {auditTrail.length > visibleAuditTrail.length ? (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setAuditVisibleCount((current) =>
                    nextVisibleCount(current, auditTrail.length, REVIEWER_AUDIT_PAGE_SIZE),
                  )
                }
              >
                Load More Audit Events ({visibleAuditTrail.length}/{auditTrail.length})
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
}
