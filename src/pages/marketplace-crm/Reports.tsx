import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, MetricCard, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useCrmAssignableUsers } from '@/hooks/useMarketplace';
import {
  useCrmCalls,
  useCrmCampaigns,
  useCrmDealHandoffs,
  useCrmDeals,
  useCrmMarketplaceFunnelMetrics,
  useCrmMeetings,
  useCrmReportLibrary,
  useCrmTasks,
  useCrmTrustFlags,
} from '@/hooks/useMarketplaceCrm';
import {
  computeDealAgingRows,
  computeExecutionSummary,
  computePipelineSummary,
  filterByDateRange,
  filterByOwner,
  type ReportDateRange,
} from '@/lib/marketplaceCrmReports';

export default function MarketplaceCrmReportsPage() {
  const { activeCompanyId } = useActiveCompany();
  const reportsQuery = useCrmReportLibrary();
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const dealsQuery = useCrmDeals(activeCompanyId);
  const tasksQuery = useCrmTasks(activeCompanyId);
  const callsQuery = useCrmCalls(activeCompanyId);
  const meetingsQuery = useCrmMeetings(activeCompanyId);
  const campaignsQuery = useCrmCampaigns(activeCompanyId);
  const trustFlagsQuery = useCrmTrustFlags(activeCompanyId);
  const handoffsQuery = useCrmDealHandoffs(activeCompanyId);
  const funnelQuery = useCrmMarketplaceFunnelMetrics(activeCompanyId);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dateRange, setDateRange] = useState<ReportDateRange>('30d');

  const rows = useMemo(() => {
    const reportRows = reportsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return reportRows;
    return reportRows.filter((row) => (`${row.name} ${row.description} ${row.folder}`).toLowerCase().includes(query));
  }, [reportsQuery.data, search]);

  const filteredDeals = useMemo(() => {
    const byOwner = filterByOwner(dealsQuery.data || [], ownerFilter, (deal) => deal.owner_user_id);
    return filterByDateRange(byOwner, dateRange, (deal) => deal.created_at);
  }, [dealsQuery.data, ownerFilter, dateRange]);

  const filteredTasks = useMemo(() => {
    const byOwner = filterByOwner(tasksQuery.data || [], ownerFilter, (task) => task.owner_user_id);
    return filterByDateRange(byOwner, dateRange, (task) => task.created_at);
  }, [tasksQuery.data, ownerFilter, dateRange]);

  const filteredCalls = useMemo(() => {
    const byOwner = filterByOwner(callsQuery.data || [], ownerFilter, (call) => call.owner_user_id);
    return filterByDateRange(byOwner, dateRange, (call) => call.created_at);
  }, [callsQuery.data, ownerFilter, dateRange]);

  const filteredMeetings = useMemo(() => {
    const byOwner = filterByOwner(meetingsQuery.data || [], ownerFilter, (meeting) => meeting.host_user_id);
    return filterByDateRange(byOwner, dateRange, (meeting) => meeting.created_at);
  }, [meetingsQuery.data, ownerFilter, dateRange]);

  const filteredCampaigns = useMemo(() => filterByDateRange(campaignsQuery.data || [], dateRange, (campaign) => campaign.created_at), [campaignsQuery.data, dateRange]);
  const filteredTrustFlags = useMemo(() => filterByDateRange(trustFlagsQuery.data || [], dateRange, (flag) => flag.created_at), [trustFlagsQuery.data, dateRange]);
  const filteredHandoffs = useMemo(() => filterByDateRange(handoffsQuery.data || [], dateRange, (handoff) => handoff.created_at), [handoffsQuery.data, dateRange]);

  const pipelineSummary = useMemo(() => computePipelineSummary(filteredDeals), [filteredDeals]);
  const executionSummary = useMemo(() => computeExecutionSummary({
    tasks: filteredTasks,
    calls: filteredCalls,
    meetings: filteredMeetings,
    campaigns: filteredCampaigns,
    trustFlags: filteredTrustFlags,
    handoffs: filteredHandoffs,
    funnel: funnelQuery.data || null,
  }), [
    filteredTasks,
    filteredCalls,
    filteredMeetings,
    filteredCampaigns,
    filteredTrustFlags,
    filteredHandoffs,
    funnelQuery.data,
  ]);
  const dealAgingRows = useMemo(() => computeDealAgingRows(filteredDeals), [filteredDeals]);

  return (
    <CrmWorkspace title="Reports" subtitle="Report library modeled in FishGate CRM sequence with domain-specific analytics folders.">
      <CrmDataCard title="Report Filters" description="Hardened owner/date controls for operational reporting scopes.">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="all">All Owners</option>
            {(assignableUsersQuery.data || []).map((user) => (
              <option key={user.user_id} value={user.user_id}>{user.name}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={dateRange} onChange={(event) => setDateRange(event.target.value as ReportDateRange)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </CrmDataCard>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Deals" value={pipelineSummary.openDeals} helper="Deals not yet in final outcome stage." />
        <MetricCard label="Open Pipeline Value" value={`NGN ${pipelineSummary.openValue.toLocaleString()}`} helper="Gross value of non-closed deals." />
        <MetricCard label="Weighted Pipeline" value={`NGN ${Math.round(pipelineSummary.weightedValue).toLocaleString()}`} helper="Probability-adjusted open pipeline." />
        <MetricCard label="Inquiry to Won %" value={`${executionSummary.inquiryToWonRate}%`} helper="30-day marketplace conversion." />
        <MetricCard label="Open Tasks" value={executionSummary.openTasks} helper="Execution workload currently pending." />
        <MetricCard label="Calls Logged" value={executionSummary.callsLogged} helper="Total call records in current scope." />
        <MetricCard label="Active Trust Flags" value={executionSummary.activeTrustFlags} helper="Verification and moderation escalations." />
        <MetricCard label="Handoffs Ready" value={executionSummary.handoffsReady} helper="Closed-won deals ready for property operations." />
      </section>

      <CrmDataCard title="Deal Stage Aging" description="Stage bottlenecks and stagnation risk by deal volume.">
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Deals</th>
                <th className="px-3 py-2">Avg Age (days)</th>
                <th className="px-3 py-2">Stale 14d+</th>
              </tr>
            </thead>
            <tbody>
              {dealAgingRows.map((row) => (
                <tr key={row.stage} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.stage.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">{row.count}</td>
                  <td className="px-3 py-2">{row.avgAgeDays}</td>
                  <td className="px-3 py-2">{row.staleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dealAgingRows.length === 0 ? <div className="p-4"><EmptyState label="No deals available for aging analytics." /></div> : null}
        </div>
      </CrmDataCard>

      <CrmDataCard title="Report Library" description="Search and open report definitions.">
        <SimpleToolbar search={search} setSearch={setSearch} />
        <div className="mt-3 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Report Name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Folder</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
                  <td className="px-3 py-2">{row.folder}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No reports found for this filter." /></div> : null}
        </div>
      </CrmDataCard>
    </CrmWorkspace>
  );
}
