import { useMemo } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, MetricCard } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmLeads, useCrmLeadTasks, useManagedMarketplaceListings } from '@/hooks/useMarketplace';
import { useCrmMeetings } from '@/hooks/useMarketplaceCrm';

export default function MarketplaceCrmOverviewPage() {
  const { activeCompanyId } = useActiveCompany();
  const leadsQuery = useCrmLeads(activeCompanyId);
  const listingsQuery = useManagedMarketplaceListings(activeCompanyId);
  const meetingsQuery = useCrmMeetings(activeCompanyId);

  const firstLeadId = leadsQuery.data?.[0]?.id;
  const leadTasksQuery = useCrmLeadTasks(firstLeadId);

  const metrics = useMemo(() => {
    const leads = leadsQuery.data || [];
    const listings = listingsQuery.data || [];
    const meetings = meetingsQuery.data || [];
    const tasks = leadTasksQuery.data || [];

    return {
      openTasks: tasks.filter((task) => task.status === 'open').length,
      upcomingMeetings: meetings.filter((meeting) => new Date(meeting.starts_at).getTime() >= Date.now()).length,
      todaysLeads: leads.filter((lead) => {
        const day = new Date(lead.created_at);
        const today = new Date();
        return day.toDateString() === today.toDateString();
      }).length,
      dealsClosingThisMonth: 0,
      activeListings: listings.filter((listing) => listing.status === 'live').length,
      totalLeads: leads.length,
    };
  }, [leadsQuery.data, listingsQuery.data, meetingsQuery.data, leadTasksQuery.data]);

  return (
    <CrmWorkspace
      title="Overview"
      subtitle="Marketplace CRM command center for daily execution and portfolio growth."
    >
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="My Open Tasks" value={metrics.openTasks} helper="Tasks currently pending action." />
        <MetricCard label="My Meetings" value={metrics.upcomingMeetings} helper="Upcoming scheduled meetings and visits." />
        <MetricCard label="Today's Leads" value={metrics.todaysLeads} helper="Newly created leads today." />
        <MetricCard label="Deals Closing This Month" value={metrics.dealsClosingThisMonth} helper="Will activate after deals stage mapping rollout." />
        <MetricCard label="Active Listings" value={metrics.activeListings} helper="Live listings currently discoverable." />
        <MetricCard label="Total Leads" value={metrics.totalLeads} helper="All leads under current company scope." />
      </section>

      <CrmDataCard title="Quick Summary" description="Operational pulse from leads and listings.">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Lead pipeline is connected and updating from marketplace records.</li>
          <li>FishGate CRM modules are now available under Marketplace CRM section.</li>
          <li>Reviewer-only trust gating will be enforced in subsequent migration pass.</li>
        </ul>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
