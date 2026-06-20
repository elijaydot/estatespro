import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useReviewerDecisionOnPublisherVerification,
  useReviewerDecisionOnVerificationDocument,
  useReviewerProfiles,
  useReviewerPublisherDecisionHistory,
  useReviewerPublisherVerificationQueue,
  useReviewerVerificationDocumentHistory,
  useReviewerVerificationDocumentQueue,
} from '@/hooks/useMarketplace';

function ageInDays(value: string) {
  const ageMs = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));
}

function getSlaLevel(ageDays: number): 'healthy' | 'warning' | 'critical' {
  if (ageDays >= 7) return 'critical';
  if (ageDays >= 3) return 'warning';
  return 'healthy';
}

export default function MarketplaceReviewerQueue() {
  const { isSuperAdmin } = useUserRole();
  const { activeCompanyId } = useActiveCompany();

  const [scopeAllCompanies, setScopeAllCompanies] = useState(true);
  const [search, setSearch] = useState('');
  const [verificationReasons, setVerificationReasons] = useState<Record<string, string>>({});
  const [documentReasons, setDocumentReasons] = useState<Record<string, string>>({});

  const scopedCompanyId = scopeAllCompanies ? null : activeCompanyId;

  const publisherQueue = useReviewerPublisherVerificationQueue(scopedCompanyId);
  const documentQueue = useReviewerVerificationDocumentQueue(scopedCompanyId);
  const publisherHistory = useReviewerPublisherDecisionHistory(scopedCompanyId);
  const documentHistory = useReviewerVerificationDocumentHistory(scopedCompanyId);
  const reviewPublisher = useReviewerDecisionOnPublisherVerification(scopedCompanyId);
  const reviewDocument = useReviewerDecisionOnVerificationDocument();

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

    return Array.from(new Set(ids));
  }, [publisherQueue.data, documentQueue.data, publisherHistory.data, documentHistory.data]);

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

  const documentRows = useMemo(() => {
    const rows = documentQueue.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => (`${row.company_name} ${row.document_type} ${row.storage_path}`).toLowerCase().includes(query));
  }, [documentQueue.data, search]);

  const avgPublisherAge = publisherRows.length
    ? Math.round(publisherRows.reduce((sum, row) => sum + ageInDays(row.last_submitted_at), 0) / publisherRows.length)
    : 0;

  const avgDocumentAge = documentRows.length
    ? Math.round(documentRows.reduce((sum, row) => sum + ageInDays(row.created_at), 0) / documentRows.length)
    : 0;

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

    return [...publisherEvents, ...documentEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 20);
  }, [publisherHistory.data, documentHistory.data, reviewerMap]);

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-emerald-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trust Ops</p>
        <h1 className="text-2xl font-semibold">Reviewer Queue</h1>
        <p className="text-sm text-muted-foreground">Pending publisher verifications and verification documents across marketplace operations.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Queue Controls</CardTitle>
          <CardDescription>Filter by company scope and search queue records.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-md border border-border px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">All companies</span>
              <Switch checked={scopeAllCompanies} onCheckedChange={setScopeAllCompanies} />
            </div>
          </div>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, state, document type" />
          <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
            {publisherRows.length} verification items · {documentRows.length} document items
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Publisher Queue</CardDescription><CardTitle>{publisherRows.length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Document Queue</CardDescription><CardTitle>{documentRows.length}</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Avg Publisher Age</CardDescription><CardTitle>{avgPublisherAge}d</CardTitle></CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Avg Document Age</CardDescription><CardTitle>{avgDocumentAge}d</CardTitle></CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA Escalation</CardTitle>
          <CardDescription>Escalation thresholds: warning at 3+ days, critical at 7+ days.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-medium">Publisher Queue SLA</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">Healthy: {publisherSla.healthy}</Badge>
              <Badge variant="secondary">Warning: {publisherSla.warning}</Badge>
              <Badge variant="destructive">Critical: {publisherSla.critical}</Badge>
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-medium">Document Queue SLA</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">Healthy: {documentSla.healthy}</Badge>
              <Badge variant="secondary">Warning: {documentSla.warning}</Badge>
              <Badge variant="destructive">Critical: {documentSla.critical}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publisher Verification Queue</CardTitle>
          <CardDescription>Review pending and needs-review company verifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {publisherRows.map((row) => (
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

          {!publisherQueue.isLoading && publisherRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No publisher verification records in the reviewer queue.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification Document Queue</CardTitle>
          <CardDescription>Review pending verification documents and capture decision reasons.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documentRows.map((row) => (
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

          {!documentQueue.isLoading && documentRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No verification document records in the reviewer queue.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>Latest reviewer decisions across publisher and document workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditTrail.map((event) => (
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

          {!publisherHistory.isLoading && !documentHistory.isLoading && auditTrail.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No reviewer decision history yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
