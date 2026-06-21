import { useMemo, useState } from 'react';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { CrmDataCard, EmptyState, MetricCard, SimpleToolbar } from '@/components/marketplace-crm/CrmWidgets';
import { useActiveCompany } from '@/contexts/useActiveCompany';
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
import { computeDealAgingRows, computeExecutionSummary, computePipelineSummary } from '@/lib/marketplaceCrmReports';

export default function MarketplaceCrmReportsPage() {
  const { activeCompanyId } = useActiveCompany();
  const reportsQuery = useCrmReportLibrary();
  const dealsQuery = useCrmDeals(activeCompanyId);
  const tasksQuery = useCrmTasks(activeCompanyId);
  const callsQuery = useCrmCalls(activeCompanyId);
  const meetingsQuery = useCrmMeetings(activeCompanyId);
  const campaignsQuery = useCrmCampaigns(activeCompanyId);
  const trustFlagsQuery = useCrmTrustFlags(activeCompanyId);
  const handoffsQuery = useCrmDealHandoffs(activeCompanyId);
  const funnelQuery = useCrmMarketplaceFunnelMetrics(activeCompanyId);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const reportRows = reportsQuery.data || [];
    const query = search.toLowerCase().trim();
    if (!query) return reportRows;
    return reportRows.filter((row) => (`${row.name} ${row.description} ${row.folder}`).toLowerCase().includes(query));
  }, [reportsQuery.data, search]);

  const pipelineSummary = useMemo(() => computePipelineSummary(dealsQuery.data || []), [dealsQuery.data]);
  const executionSummary = useMemo(() => computeExecutionSummary({
    tasks: tasksQuery.data || [],
    calls: callsQuery.data || [],
    meetings: meetingsQuery.data || [],
    campaigns: campaignsQuery.data || [],
    trustFlags: trustFlagsQuery.data || [],
    handoffs: handoffsQuery.data || [],
    funnel: funnelQuery.data || null,
  }), [
    tasksQuery.data,
    callsQuery.data,
    meetingsQuery.data,
    campaignsQuery.data,
    trustFlagsQuery.data,
    handoffsQuery.data,
    funnelQuery.data,
  ]);
  const dealAgingRows = useMemo(() => computeDealAgingRows(dealsQuery.data || []), [dealsQuery.data]);

  return (
    <CrmWorkspace title="Reports" subtitle="Report library modeled in FishGate CRM sequence with domain-specific analytics folders.">
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
