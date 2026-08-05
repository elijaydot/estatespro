import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, RefreshCw } from 'lucide-react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, MetricCard, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSettings } from '@/contexts/useSettings';
import { useCrmAssignableUsers, useCrmLeads } from '@/hooks/useMarketplace';
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
  computeExecutionSummary,
  computeLeadPipelineSummary,
  computeLeadStageRows,
  filterByDateRange,
  filterByOwner,
  type ReportDateRange,
} from '@/lib/marketplaceCrmReports';
import { downloadCsv } from '@/lib/download';

export default function MarketplaceCrmReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeCompanyId } = useActiveCompany();
  const { formatCurrency } = useSettings();
  const reportsQuery = useCrmReportLibrary();
  const assignableUsersQuery = useCrmAssignableUsers(activeCompanyId);
  const leadsQuery = useCrmLeads(activeCompanyId);
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
  const [pipelineKind, setPipelineKind] = useState<'leasing' | 'renewal' | 'collections'>('leasing');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(searchParams.get('report'));
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

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

  const filteredLeads = useMemo(() => {
    const byPipeline = (leadsQuery.data || []).filter((lead) => lead.pipeline_kind === pipelineKind);
    const byOwner = filterByOwner(byPipeline, ownerFilter, (lead) => lead.assigned_to);
    return filterByDateRange(byOwner, dateRange, (lead) => lead.created_at);
  }, [leadsQuery.data, pipelineKind, ownerFilter, dateRange]);

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

  const pipelineSummary = useMemo(() => computeLeadPipelineSummary(filteredLeads, filteredDeals), [filteredLeads, filteredDeals]);
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
  const leadStageRows = useMemo(() => computeLeadStageRows(filteredLeads), [filteredLeads]);
  const maxStageCount = Math.max(1, ...leadStageRows.map((row) => row.count));

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
    setGeneratedAt(new Date());
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

  type ReportQueryState = {
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
  };

  let selectedReportQueries: ReportQueryState[] = [];
  switch (selectedReport?.id) {
    case 'meeting-plan-vs-realized':
    case 'checkins-salesperson':
      selectedReportQueries = [meetingsQuery, assignableUsersQuery];
      break;
    case 'checkins-locality':
      selectedReportQueries = [visitsQuery];
      break;
    case 'contact-mailing-list':
      selectedReportQueries = [contactsQuery];
      break;
    case 'deals-closing-month':
      selectedReportQueries = [dealsQuery];
      break;
    case 'verification-aging':
    case 'trust-flag-load':
      selectedReportQueries = [trustFlagsQuery];
      break;
    case 'inquiry-to-won-30d':
      selectedReportQueries = [funnelQuery];
      break;
    case 'closed-won-handoff':
      selectedReportQueries = [handoffsQuery];
      break;
  }

  const reportIsLoading = selectedReportQueries.some((query) => query.isLoading || query.isFetching);
  const reportError = selectedReportQueries.find((query) => query.error)?.error;

  const refreshReport = async () => {
    await Promise.all(selectedReportQueries.map((query) => query.refetch()));
    setGeneratedAt(new Date());
  };

  const exportReport = () => {
    if (!selectedReport) return;
    downloadCsv(`${selectedReport.id}-${generatedAt.toISOString().slice(0, 10)}.csv`, reportPreviewRows.map((row) => ({
      label: row.label,
      value: row.value,
    })));
  };

  const reportFilters = (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <select aria-label="Owner" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
        <option value="all">All Owners</option>
        {(assignableUsersQuery.data || []).map((user) => (
          <option key={user.user_id} value={user.user_id}>{user.name}</option>
        ))}
      </select>
      <select aria-label="Date range" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={dateRange} onChange={(event) => setDateRange(event.target.value as ReportDateRange)}>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>
      <select aria-label="Pipeline" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={pipelineKind} onChange={(event) => setPipelineKind(event.target.value as typeof pipelineKind)}>
        <option value="leasing">Leasing</option>
        <option value="renewal">Renewal</option>
        <option value="collections">Collections</option>
      </select>
    </div>
  );

  if (selectedReport) {
    return (
      <CrmWorkspace title={selectedReport.name} subtitle={selectedReport.description}>
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Button variant="ghost" className="w-fit gap-2" onClick={clearSelectedReport}>
            <ArrowLeft className="h-4 w-4" />
            Report Library
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={refreshReport} disabled={reportIsLoading}>
              <RefreshCw className={`h-4 w-4 ${reportIsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportReport} disabled={reportIsLoading || reportPreviewRows.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{selectedReport.folder}</Badge>
          <span>Generated {generatedAt.toLocaleString()}</span>
          <span aria-hidden="true">•</span>
          <span>{reportPreviewRows.length} result{reportPreviewRows.length === 1 ? '' : 's'}</span>
        </div>

        <CrmDataCard title="Report Filters" description="Adjust the scope; results update immediately.">
          {reportFilters}
        </CrmDataCard>

        <CrmDataCard title="Report Results" description={`Generated from live CRM data for ${selectedReport.name}.`}>
          {reportError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Unable to generate this report. {reportError instanceof Error ? reportError.message : 'Please refresh and try again.'}
            </div>
          ) : reportIsLoading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating report...
            </div>
          ) : (
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
              {reportPreviewRows.length === 0 ? <div className="p-4"><EmptyState label="No data available for this report in the selected scope." /></div> : null}
            </div>
          )}
        </CrmDataCard>
      </CrmWorkspace>
    );
  }

  return (
    <CrmWorkspace title="Reports" subtitle="Pipeline, activity, and conversion reporting.">
      <CrmDataCard title="Report Filters" description="Filter reports by owner and date range.">
        {reportFilters}
      </CrmDataCard>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Leads" value={pipelineSummary.openDeals} helper="Leads not yet converted or lost in this pipeline." />
        <MetricCard label="Open Pipeline Value" value={formatCurrency(pipelineSummary.openValue)} helper="Gross value of non-closed deals." />
        <MetricCard label="Weighted Pipeline" value={formatCurrency(Math.round(pipelineSummary.weightedValue))} helper="Probability-adjusted open pipeline." />
        <MetricCard label="Inquiry to Won %" value={`${executionSummary.inquiryToWonRate}%`} helper="30-day marketplace conversion." />
        <MetricCard label="Open Tasks" value={executionSummary.openTasks} helper="Tasks awaiting completion." />
        <MetricCard label="Calls Logged" value={executionSummary.callsLogged} helper="Total call records in current scope." />
        <MetricCard label="Active Trust Flags" value={executionSummary.activeTrustFlags} helper="Verification and moderation escalations." />
        <MetricCard label="Handoffs Ready" value={executionSummary.handoffsReady} helper="Closed-won deals ready for property operations." />
      </section>

      <CrmDataCard title="Pipeline Stage Aging" description="Lead-stage bottlenecks and stagnation risk for the selected pipeline.">
        {leadStageRows.length > 0 ? (
          <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4" aria-label="Lead distribution by pipeline stage">
            {leadStageRows.map((row) => (
              <div key={row.stage} className="grid grid-cols-[minmax(100px,160px)_1fr_36px] items-center gap-3">
                <span className="truncate text-xs font-medium capitalize text-muted-foreground">{row.stage.replace(/_/g, ' ')}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-info"
                    style={{ width: `${Math.max(3, (row.count / maxStageCount) * 100)}%` }}
                  />
                </div>
                <span className="text-right text-xs font-semibold text-foreground">{row.count}</span>
              </div>
            ))}
          </div>
        ) : null}
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
              {leadStageRows.map((row) => (
                <tr key={row.stage} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{row.stage.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2">{row.count}</td>
                  <td className="px-3 py-2">{row.avgAgeDays}</td>
                  <td className="px-3 py-2">{row.staleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leadStageRows.length === 0 ? <div className="p-4"><EmptyState label="No leads available for this pipeline." /></div> : null}
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

    </CrmWorkspace>
  );
}
