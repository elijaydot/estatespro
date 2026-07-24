import { useMemo } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, MetricCard } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmLeads, useCrmLeadTasks, useManagedMarketplaceListings } from '@/hooks/useMarketplace';
import { useCrmAutomationRuns, useCrmDealHandoffs, useCrmDeals, useCrmMarketplaceFunnelMetrics, useCrmMeetings, useCrmTrustFlags } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmOverviewPage() {
  const { activeCompanyId } = useActiveCompany();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const listingsQuery = useManagedMarketplaceListings(activeCompanyId);
  const meetingsQuery = useCrmMeetings(activeCompanyId);
  const dealsQuery = useCrmDeals(activeCompanyId);
  const trustFlagsQuery = useCrmTrustFlags(activeCompanyId);
  const handoffsQuery = useCrmDealHandoffs(activeCompanyId);
  const funnelQuery = useCrmMarketplaceFunnelMetrics(activeCompanyId);
  const automationRunsQuery = useCrmAutomationRuns(activeCompanyId);

  const firstLeadId = leadsQuery.data?.[0]?.id;
  const leadTasksQuery = useCrmLeadTasks(firstLeadId);

  const metrics = useMemo(() => {
    const leads = leadsQuery.data || [];
    const listings = listingsQuery.data || [];
    const meetings = meetingsQuery.data || [];
    const deals = dealsQuery.data || [];
    const tasks = leadTasksQuery.data || [];
    const trustFlags = trustFlagsQuery.data || [];
    const handoffs = handoffsQuery.data || [];
    const funnel = funnelQuery.data;
    const automationRuns = automationRunsQuery.data || [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      openTasks: tasks.filter((task) => task.status === 'open').length,
      upcomingMeetings: meetings.filter((meeting) => new Date(meeting.starts_at).getTime() >= Date.now()).length,
      todaysLeads: leads.filter((lead) => {
        const day = new Date(lead.created_at);
        const today = new Date();
        return day.toDateString() === today.toDateString();
      }).length,
      dealsClosingThisMonth: deals.filter((deal) => {
        if (!deal.expected_close_date) return false;
        if (deal.stage === 'converted' || deal.stage === 'lost') return false;

        const closeDate = new Date(deal.expected_close_date);
        return closeDate.getMonth() === currentMonth && closeDate.getFullYear() === currentYear;
      }).length,
      activeListings: listings.filter((listing) => listing.status === 'live').length,
      totalLeads: leads.length,
      avgLeadScore: leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0,
      topLeadsByScore: [...leads]
        .sort((a, b) => b.score - a.score || Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 5),
      activeTrustFlags: trustFlags.filter((flag) => flag.state === 'active').length,
      handoffsReady: handoffs.filter((handoff) => handoff.status === 'ready').length,
      handoffsRequiresInput: handoffs.filter((handoff) => handoff.status === 'requires_input').length,
      inquiryToWonRate: funnel?.inquiry_to_won_rate_pct || 0,
      automationPending: automationRuns.filter((run) => run.status === 'pending').length,
      automationFailed: automationRuns.filter((run) => run.status === 'failed').length,
    };
  }, [
    leadsQuery.data,
    listingsQuery.data,
    meetingsQuery.data,
    dealsQuery.data,
    leadTasksQuery.data,
    trustFlagsQuery.data,
    handoffsQuery.data,
    funnelQuery.data,
    automationRunsQuery.data,
  ]);

  return (
    <CrmWorkspace
      title="Overview"
      subtitle="Marketplace CRM command center for daily execution and portfolio growth."
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="My Open Tasks" value={metrics.openTasks} helper="Tasks currently pending action." />
        <MetricCard label="My Meetings" value={metrics.upcomingMeetings} helper="Upcoming scheduled meetings and visits." />
        <MetricCard label="Today's Leads" value={metrics.todaysLeads} helper="Newly created leads today." />
        <MetricCard label="Deals Closing This Month" value={metrics.dealsClosingThisMonth} helper="Open deals with expected close dates in the current month." />
        <MetricCard label="Active Listings" value={metrics.activeListings} helper="Live listings currently discoverable." />
        <MetricCard label="Total Leads" value={metrics.totalLeads} helper="All leads under current company scope." />
        <MetricCard label="Avg Lead Score" value={metrics.avgLeadScore} helper="Quality signal based on activity, recency, and budget fit." />
        <MetricCard label="Active Trust Flags" value={metrics.activeTrustFlags} helper="Verification/moderation concerns requiring attention." />
        <MetricCard label="Handoffs Ready" value={metrics.handoffsReady} helper="Closed-won deals ready for property operations handoff." />
        <MetricCard label="Inquiry to Won %" value={`${metrics.inquiryToWonRate}%`} helper="30-day public marketplace inquiry conversion." />
        <MetricCard label="Automation Pending" value={metrics.automationPending} helper="Rules waiting for successful processing." />
        <MetricCard label="Automation Failed" value={metrics.automationFailed} helper="Automation runs that need retry or intervention." />
      </section>

      <CrmDataCard title="Quick Summary" description="Operational pulse from leads and listings.">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Lead pipeline is connected and updating from marketplace records.</li>
          <li>FishGate CRM modules are now available under Marketplace CRM section.</li>
          <li>Trust flags now couple verification/moderation outcomes into CRM operations.</li>
          <li>Closed-won deals generate handoff readiness records for tenant and lease workflows.</li>
        </ul>
      </CrmDataCard>

      <CrmDataCard title="Top Priority Leads" description="Highest-scoring leads to action first.">
        <div className="space-y-2">
          {metrics.topLeadsByScore.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads available yet.</p>
          ) : (
            metrics.topLeadsByScore.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{lead.contact_name || 'Unnamed lead'}</p>
                  <p className="text-xs text-muted-foreground">{lead.stage} · {lead.contact_email || lead.contact_phone || 'No contact info'}</p>
                </div>
                <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {lead.score}
                </span>
              </div>
            ))
          )}
        </div>
      </CrmDataCard>

      <CrmDataCard title="Handoff Watch" description="Deals that require property operations action before completion.">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Ready handoffs: {metrics.handoffsReady}</li>
          <li>Requires input: {metrics.handoffsRequiresInput}</li>
          <li>Active trust flags: {metrics.activeTrustFlags}</li>
        </ul>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
