import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  CircleOff,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Megaphone,
  Shield,
  ToggleLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useModerationCases,
  usePublisherVerification,
  useUpdateModerationCaseState,
  useCrmLeads,
  useManagedMarketplaceListings,
  useToggleMarketplacePublish,
  useUpdateCrmLeadStage,
  type CrmLead,
} from '@/hooks/useMarketplace';

const LEAD_STAGE_ORDER = [
  'new',
  'attempted_contact',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'offer_made',
  'lease_in_progress',
  'converted',
  'lost',
] as const;

const LEAD_STAGE_LABEL: Record<string, string> = {
  new: 'New',
  attempted_contact: 'Attempted',
  contacted: 'Contacted',
  qualified: 'Qualified',
  viewing_scheduled: 'Viewing',
  offer_made: 'Offer',
  lease_in_progress: 'Lease In Progress',
  converted: 'Converted',
  lost: 'Lost',
};

const STAGE_ACCENT: Record<string, string> = {
  new: 'bg-sky-500/10 border-sky-500/30',
  attempted_contact: 'bg-amber-500/10 border-amber-500/30',
  contacted: 'bg-indigo-500/10 border-indigo-500/30',
  qualified: 'bg-emerald-500/10 border-emerald-500/30',
  viewing_scheduled: 'bg-cyan-500/10 border-cyan-500/30',
  offer_made: 'bg-violet-500/10 border-violet-500/30',
  lease_in_progress: 'bg-fuchsia-500/10 border-fuchsia-500/30',
  converted: 'bg-green-500/10 border-green-500/30',
  lost: 'bg-rose-500/10 border-rose-500/30',
};

function formatCurrency(amount: number, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  }
}

function LeadCard({
  lead,
  onChangeStage,
  disabled,
}: {
  lead: CrmLead;
  onChangeStage: (leadId: string, stage: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{lead.contact_name || 'Unnamed Lead'}</p>
          <p className="text-xs text-muted-foreground">{lead.contact_phone || lead.contact_email || 'No contact details'}</p>
        </div>
        <Badge variant="outline">Score {lead.score ?? 0}</Badge>
      </div>

      <div className="mb-3">
        <p className="text-xs text-muted-foreground">Listing</p>
        <p className="text-sm truncate">{lead.listing_title || 'No listing linked'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p>
          <Badge variant="secondary" className="mt-1 text-[11px]">{lead.priority}</Badge>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
          <Badge variant="outline" className="mt-1 text-[11px]">{lead.status}</Badge>
        </div>
      </div>

      <Select value={lead.stage} onValueChange={(value) => onChangeStage(lead.id, value)} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Update stage" />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STAGE_ORDER.map((stage) => (
            <SelectItem key={stage} value={stage} className="text-xs">
              {LEAD_STAGE_LABEL[stage]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MarketplaceManage() {
  const { activeCompanyId, companies } = useActiveCompany();
  const { isLandlord, isPropertyManager } = useUserRole();

  const leadsQuery = useCrmLeads(activeCompanyId);
  const listingsQuery = useManagedMarketplaceListings(activeCompanyId);
  const moderationCasesQuery = useModerationCases(activeCompanyId);
  const verificationQuery = usePublisherVerification(activeCompanyId);

  const updateLeadStage = useUpdateCrmLeadStage(activeCompanyId);
  const togglePublish = useToggleMarketplacePublish(activeCompanyId);
  const updateModerationState = useUpdateModerationCaseState(activeCompanyId);

  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);
  const listings = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);
  const moderationCases = useMemo(() => moderationCasesQuery.data ?? [], [moderationCasesQuery.data]);

  const groupedLeads = useMemo(() => {
    const bucket: Record<string, CrmLead[]> = {};
    for (const stage of LEAD_STAGE_ORDER) bucket[stage] = [];
    for (const lead of leads) {
      const key = bucket[lead.stage] ? lead.stage : 'new';
      bucket[key].push(lead);
    }
    return bucket;
  }, [leads]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const qualified = leads.filter((l) => ['qualified', 'viewing_scheduled', 'offer_made', 'lease_in_progress'].includes(l.stage)).length;
    const converted = leads.filter((l) => l.stage === 'converted').length;
    const activeListings = listings.filter((l) => l.status === 'live').length;
    return { total, qualified, converted, activeListings };
  }, [leads, listings]);

  if (!isLandlord && !isPropertyManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const companyName = companies.find((company) => company.id === activeCompanyId)?.name || 'Active company';
  const verificationState = verificationQuery.data?.state ?? 'pending';
  const verificationBadgeVariant = verificationState === 'verified' ? 'default' : verificationState === 'rejected' ? 'destructive' : 'secondary';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 p-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" aria-hidden />
        <div className="absolute -left-20 -bottom-24 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Marketplace Control Room</p>
            <h1 className="text-2xl font-semibold">Marketplace + CRM</h1>
            <p className="text-sm text-muted-foreground">Operate listing visibility and lead conversion for {companyName}.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Live control enabled
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-2xl">{metrics.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">All captured marketplace leads.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified Pipeline</CardDescription>
            <CardTitle className="text-2xl">{metrics.qualified}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Leads ready for viewing and offer flow.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Converted</CardDescription>
            <CardTitle className="text-2xl">{metrics.converted}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Leads moved to lease conversion.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Listings</CardDescription>
            <CardTitle className="text-2xl">{metrics.activeListings}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Listings currently visible publicly.</CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Verification + Trust Gate</h2>
          {verificationQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationState === 'verified' ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              Publisher Verification
            </CardTitle>
            <CardDescription>
              Publish-to-live is now server-enforced for landlord role and verified publishers only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current state:</span>
              <Badge variant={verificationBadgeVariant}>{verificationState}</Badge>
            </div>
            {verificationQuery.data?.rejection_reason && (
              <p className="text-muted-foreground">Reason: {verificationQuery.data.rejection_reason}</p>
            )}
            {!verificationQuery.data && (
              <p className="text-muted-foreground">No verification record yet. Submit verification artifacts to unlock publishing.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <h2 className="text-lg font-semibold">CRM Leads Pipeline</h2>
          {(leadsQuery.isLoading || updateLeadStage.isPending) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {LEAD_STAGE_ORDER.map((stage) => (
            <Card key={stage} className={`border ${STAGE_ACCENT[stage] || ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{LEAD_STAGE_LABEL[stage]}</span>
                  <Badge variant="secondary">{groupedLeads[stage]?.length || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(groupedLeads[stage] || []).slice(0, 6).map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    disabled={updateLeadStage.isPending}
                    onChangeStage={(leadId, nextStage) => updateLeadStage.mutate({ leadId, stage: nextStage })}
                  />
                ))}

                {(groupedLeads[stage] || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No leads in this stage.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ToggleLeft className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Listing Publish Controls</h2>
          {(listingsQuery.isLoading || togglePublish.isPending) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin-only Visibility Toggles</CardTitle>
            <CardDescription>
              {isLandlord
                ? 'You can publish or pause listings instantly. Property managers can view status only.'
                : 'You can view listing visibility. Ask a landlord to change publish status.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listings.map((listing) => {
              const isLive = listing.status === 'live';
              return (
                <div
                  key={listing.id}
                  className="rounded-xl border border-border/70 bg-card/70 p-4 transition hover:bg-card"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{listing.title}</h3>
                        <Badge variant={isLive ? 'default' : 'outline'}>
                          {isLive ? 'Live' : listing.status}
                        </Badge>
                        <Badge variant="secondary">{listing.verification_state}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {listing.city}{listing.area ? `, ${listing.area}` : ''} · {formatCurrency(listing.rent_amount, listing.currency)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isLandlord && (
                        <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                          <CircleOff className="h-3 w-3" />
                          Landlord only
                        </div>
                      )}
                      <Switch
                        checked={isLive}
                        disabled={!isLandlord || togglePublish.isPending}
                        onCheckedChange={(checked) => togglePublish.mutate({ listingId: listing.id, publish: checked })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {!listingsQuery.isLoading && listings.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No marketplace listings yet for this company.
              </div>
            )}

            <div className="pt-2">
              <Button variant="outline" asChild>
                <a href="/marketplace" target="_blank" rel="noreferrer">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Open Public Marketplace View
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Moderation Queue</h2>
          {(moderationCasesQuery.isLoading || updateModerationState.isPending) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Open and In-Review Cases</CardTitle>
            <CardDescription>
              Resolve flagged listing risk events before broad rollout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {moderationCases.slice(0, 12).map((moderationCase) => (
              <div key={moderationCase.id} className="rounded-xl border border-border/70 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium">{moderationCase.reason_code}</p>
                    <p className="text-xs text-muted-foreground">
                      Severity: {moderationCase.severity} · Queue: {moderationCase.queue}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={moderationCase.state === 'open' ? 'destructive' : 'secondary'}>{moderationCase.state}</Badge>
                    <Select
                      value={moderationCase.state}
                      onValueChange={(nextState) =>
                        updateModerationState.mutate({
                          caseId: moderationCase.id,
                          state: nextState as 'open' | 'in_review' | 'resolved' | 'dismissed',
                        })
                      }
                      disabled={!isPropertyManager && !isLandlord}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue placeholder="Set state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open" className="text-xs">Open</SelectItem>
                        <SelectItem value="in_review" className="text-xs">In Review</SelectItem>
                        <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
                        <SelectItem value="dismissed" className="text-xs">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            {!moderationCasesQuery.isLoading && moderationCases.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No active moderation cases for this company.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
