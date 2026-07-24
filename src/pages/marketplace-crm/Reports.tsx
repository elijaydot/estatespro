import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, MetricCard, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSettings } from '@/contexts/useSettings';
import { useCrmAssignableUsers } from '@/hooks/useMarketplace';
import {
  useCrmContacts,
  useCrmCalls,
  useCrmCampaigns,
  useCrmDealHandoffs,
  useCrmDeals,
  useCrmMarketplaceFunnelMetrics,
  useCrmMeetings,
  useCrmReportLibrary,
  useCrmTasks,
  useCrmTrustFlags,
  useCrmVisits,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeCompanyId } = useActiveCompany();
  const { formatCurrency } = useSettings();
  const reportsQuery = useCrmReportLibrary();
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const dealsQuery = useCrmDeals(activeCompanyId);
  const tasksQuery = useCrmTasks(activeCompanyId);
  const callsQuery = useCrmCalls(activeCompanyId);
  const meetingsQuery = useCrmMeetings(activeCompanyId);
  const contactsQuery = useCrmContacts(activeCompanyId);
  const visitsQuery = useCrmVisits(activeCompanyId);
  const campaignsQuery = useCrmCampaigns(activeCompanyId);
  const trustFlagsQuery = useCrmTrustFlags(activeCompanyId);
  const handoffsQuery = useCrmDealHandoffs(activeCompanyId);
  const funnelQuery = useCrmMarketplaceFunnelMetrics(activeCompanyId);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dateRange, setDateRange] = useState<ReportDateRange>('30d');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(searchParams.get('report'));

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

  const selectedReport = useMemo(() => (reportsQuery.data || []).find((row) => row.id === selectedReportId) || null, [reportsQuery.data, selectedReportId]);

  useEffect(() => {
    const fromUrl = searchParams.get('report');
    setSelectedReportId((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get('report');
    if (!fromUrl || !(reportsQuery.data || []).length) return;

    const exists = (reportsQuery.data || []).some((report) => report.id === fromUrl);
    if (exists) return;

    const next = new URLSearchParams(searchParams);
    next.delete('report');
    setSearchParams(next, { replace: true });
    setSelectedReportId(null);
  }, [reportsQuery.data, searchParams, setSearchParams]);

  const openReport = (reportId: string) => {
    setSelectedReportId(reportId);
    const next = new URLSearchParams(searchParams);
    next.set('report', reportId);
    setSearchParams(next, { replace: true });
  };

  const clearSelectedReport = () => {
    setSelectedReportId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('report');
    setSearchParams(next, { replace: true });
  };

  const ownerLookup = useMemo(() => {
    const map = new Map<string, string>();
    (assignableUsersQuery.data || []).forEach((user) => {
      map.set(user.user_id, user.name || user.user_id);
    });
    return map;
  }, [assignableUsersQuery.data]);

  const reportPreviewRows = useMemo(() => {
    if (!selectedReport) return [] as Array<{ label: string; value: string | number }>;

    switch (selectedReport.id) {
      case 'email-top-click':
        return [...filteredCampaigns]
          .sort((a, b) => (b.click_rate || 0) - (a.click_rate || 0))
          .slice(0, 10)
          .map((campaign) => ({ label: campaign.name, value: `${campaign.click_rate ?? 0}%` }));
      case 'email-top-open':
        return [...filteredCampaigns]
          .sort((a, b) => (b.open_rate || 0) - (a.open_rate || 0))
          .slice(0, 10)
          .map((campaign) => ({ label: campaign.name, value: `${campaign.open_rate ?? 0}%` }));
      case 'email-bounce':
        return [...filteredCampaigns]
          .sort((a, b) => (b.bounce_rate || 0) - (a.bounce_rate || 0))
          .slice(0, 10)
          .map((campaign) => ({ label: campaign.name, value: `${campaign.bounce_rate ?? 0}%` }));
      case 'email-analytics':
      case 'email-activity':
      case 'email-call':
        return [
          { label: 'Campaigns in Scope', value: filteredCampaigns.length },
          { label: 'Calls Logged', value: filteredCalls.length },
          { label: 'Meetings Done', value: filteredMeetings.filter((meeting) => meeting.status === 'done').length },
          { label: 'Open Tasks', value: filteredTasks.filter((task) => task.status === 'open').length },
        ];
      case 'email-top-users': {
        const counts = new Map<string, number>();
        filteredCalls.forEach((call) => {
          const key = call.owner_user_id || 'unassigned';
          counts.set(key, (counts.get(key) || 0) + 1);
        });

        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([ownerId, count]) => ({ label: ownerLookup.get(ownerId) || ownerId, value: count }));
      }
      case 'meeting-plan-vs-realized':
        return [
          { label: 'Planned Meetings', value: filteredMeetings.filter((meeting) => meeting.status === 'planned').length },
          { label: 'Completed Meetings', value: filteredMeetings.filter((meeting) => meeting.status === 'done').length },
        ];
      case 'checkins-salesperson': {
        const counts = new Map<string, number>();
        filteredMeetings
          .filter((meeting) => meeting.status === 'done')
          .forEach((meeting) => {
            const key = meeting.host_user_id || 'unassigned';
            counts.set(key, (counts.get(key) || 0) + 1);
          });

        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([hostId, count]) => ({ label: ownerLookup.get(hostId) || hostId, value: count }));
      }
      case 'checkins-locality': {
        const counts = new Map<string, number>();
        (visitsQuery.data || [])
          .filter((visit) => visit.status === 'completed')
          .forEach((visit) => {
            const key = visit.locality || 'unknown';
            counts.set(key, (counts.get(key) || 0) + 1);
          });

        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([locality, count]) => ({ label: locality, value: count }));
      }
      case 'contact-mailing-list':
        return (contactsQuery.data || [])
          .filter((contact) => !!contact.email)
          .slice(0, 50)
          .map((contact) => ({ label: contact.full_name, value: contact.email || '-' }));
      case 'deals-closing-month': {
        const now = new Date();
        return filteredDeals
          .filter((deal) => {
            if (!deal.expected_close_date) return false;
            const expected = new Date(deal.expected_close_date);
            return expected.getUTCFullYear() === now.getUTCFullYear() && expected.getUTCMonth() === now.getUTCMonth();
          })
          .map((deal) => ({ label: deal.deal_name, value: deal.expected_close_date || '-' }));
      }
      case 'verification-aging':
        return filteredTrustFlags
          .filter((flag) => flag.source === 'verification' && flag.state === 'active')
          .map((flag) => ({
            label: `${flag.entity_type}:${flag.entity_id || 'n/a'}`,
            value: `${Math.max(0, Math.floor((Date.now() - new Date(flag.created_at).getTime()) / (1000 * 60 * 60 * 24)))}d`,
          }));
      case 'inquiry-to-won-30d':
        return [{ label: 'Inquiry to Won Rate', value: `${executionSummary.inquiryToWonRate}%` }];
      case 'trust-flag-load': {
        const counts = new Map<string, number>();
        filteredTrustFlags
          .filter((flag) => flag.state === 'active')
          .forEach((flag) => {
            counts.set(flag.severity, (counts.get(flag.severity) || 0) + 1);
          });

        return Array.from(counts.entries()).map(([severity, count]) => ({ label: severity, value: count }));
      }
      case 'closed-won-handoff': {
        const statusCounts = new Map<string, number>();
        filteredHandoffs.forEach((handoff) => {
          statusCounts.set(handoff.status, (statusCounts.get(handoff.status) || 0) + 1);
        });

        return Array.from(statusCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => ({ label: status, value: count }));
      }
      default:
        return [];
    }
  }, [
    selectedReport,
    filteredCampaigns,
    filteredCalls,
    filteredMeetings,
    filteredTasks,
    filteredDeals,
    filteredTrustFlags,
    filteredHandoffs,
    executionSummary.inquiryToWonRate,
    ownerLookup,
    visitsQuery.data,
    contactsQuery.data,
  ]);

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
        <MetricCard label="Open Pipeline Value" value={formatCurrency(pipelineSummary.openValue)} helper="Gross value of non-closed deals." />
        <MetricCard label="Weighted Pipeline" value={formatCurrency(Math.round(pipelineSummary.weightedValue))} helper="Probability-adjusted open pipeline." />
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
                  <td className="px-3 py-2 font-medium">
                    <button className="text-left text-primary hover:underline" onClick={() => openReport(row.id)}>
                      {row.name}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
                  <td className="px-3 py-2">{row.folder}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="p-4"><EmptyState label="No reports found for this filter." /></div> : null}
        </div>
      </CrmDataCard>

      {selectedReport ? (
        <CrmDataCard
          title={`Report View: ${selectedReport.name}`}
          description="Live view generated from current report filters and data scope."
          action={<button className="h-8 rounded-md border border-input px-3 text-xs" onClick={clearSelectedReport}>Close Report</button>}
        >
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {reportPreviewRows.map((row) => (
                  <tr key={`${selectedReport.id}-${row.label}`} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{row.label}</td>
                    <td className="px-3 py-2">{String(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportPreviewRows.length === 0 ? <div className="p-4"><EmptyState label="No data available for this report in current filters." /></div> : null}
          </div>
        </CrmDataCard>
      ) : null}
    </CrmWorkspace>
  );
}
