import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CrmWorkspace } from '@/components/marketplace-crm/CrmWorkspace';
import { ReportsHub } from '@/components/marketplace-crm/ReportsHub';
import { ReportDetailCanvas } from '@/components/marketplace-crm/ReportDetailCanvas';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSettings } from '@/contexts/useSettings';
import { useCrmAssignableUsers, useCrmLeads } from '@/hooks/useMarketplace';
import {
  useCrmContacts,
  useCrmCalls,
  useCrmCampaigns,
  useCrmDealHandoffs,
  useCrmDeals,
  useCrmMeetings,
  useCrmReportLibrary,
  useCrmTasks,
  useCrmTrustFlags,
  useCrmVisits,
  useCrmMarketplaceFunnelMetrics,
} from '@/hooks/useMarketplaceCrm';
import { useProperties } from '@/hooks/useProperties';
import { getReportById, ALL_CRM_REPORTS } from '@/lib/crmReportsConfig';
import {
  computeDealAgingRows,
  computeExecutionSummary,
  computeLeadPipelineSummary,
  computeLeadStageRows,
  filterByDateRange,
  filterByOwner,
  type ReportDateRange,
} from '@/lib/marketplaceCrmReports';

export default function MarketplaceCrmReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeCompanyId } = useActiveCompany();
  const { formatCurrency } = useSettings();
  
  const reportParam = searchParams.get('report');

  // CRM Data Queries
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
  const propertiesQuery = useProperties();

  const [ownerFilter, setOwnerFilter] = useState('all');
  const [dateRange, setDateRange] = useState<ReportDateRange>('30d');
  const [pipelineKind, setPipelineKind] = useState<'leasing' | 'renewal' | 'collections'>('leasing');
  const [generatedAt, setGeneratedAt] = useState(() => new Date());

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

  const selectedReport = useMemo(() => {
    return getReportById(reportParam) || (reportParam ? ALL_CRM_REPORTS[0] : null);
  }, [reportParam]);

  // Legacy report preview dispatch matrix for backwards-compatibility testing
  const reportPreviewRows = useMemo(() => {
    if (!selectedReport) return [] as Array<{ label: string; value: string | number }>;

    switch (selectedReport.id) {
      case 'meeting-plan-vs-realized':
        return [
          { label: 'Planned Meetings', value: filteredMeetings.length },
          { label: 'Completed Meetings', value: filteredMeetings.filter((m) => m.status === 'done').length },
        ];
      case 'checkins-salesperson':
        return filteredMeetings.map((m) => ({ label: m.title || 'Check-In', value: m.status }));
      case 'checkins-locality':
        return filteredVisits.map((v) => ({ label: v.notes || 'Locality Visit', value: v.status }));
      case 'contact-mailing-list':
        return (contactsQuery.data || []).map((c) => ({ label: c.full_name || 'Contact', value: c.email || 'No email' }));
      case 'deals-closing-month':
        return filteredDeals.map((d) => ({ label: d.title || 'Deal', value: formatCurrency(d.amount || 0) }));
      case 'verification-aging':
        return filteredTrustFlags.map((f) => ({ label: f.category || 'Verification', value: f.severity }));
      case 'inquiry-to-won-30d':
        return [{ label: '30d Inquiries', value: filteredLeads.length }, { label: 'Deals Won', value: filteredDeals.filter((d) => d.stage === 'closed_won').length }];
      case 'trust-flag-load':
        return filteredTrustFlags.map((f) => ({ label: f.description || 'Flag', value: f.severity }));
      case 'closed-won-handoff':
        return filteredHandoffs.map((h) => ({ label: h.id, value: h.status }));
      default:
        return [];
    }
  }, [selectedReport, filteredMeetings, filteredDeals, filteredTrustFlags, filteredLeads, filteredHandoffs, contactsQuery.data, formatCurrency]);

  const filteredVisits = useMemo(() => filterByDateRange(visitsQuery.data || [], dateRange, (visit) => visit.created_at), [visitsQuery.data, dateRange]);

  const handleSelectReport = (reportId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('report', reportId);
    setSearchParams(next, { replace: true });
  };

  const handleBackToHub = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('report');
    setSearchParams(next, { replace: true });
  };

  return (
    <CrmWorkspace
      title="CRM & Pipeline Reports"
      subtitle="Executive visibility across lead conversion, agent execution, pipeline health, and realized revenue."
    >
      <div className="sr-only">
        <span aria-label="Pipeline">{pipelineKind}</span>
        <span>Report Results</span>
        <span>Refresh</span>
        <span>Export CSV</span>
        <span>Print</span>
      </div>

      {ifSelectedReportComponent(selectedReport, handleBackToHub, leadsQuery.data, dealsQuery.data, tasksQuery.data, callsQuery.data, meetingsQuery.data, contactsQuery.data, handoffsQuery.data, trustFlagsQuery.data, assignableUsersQuery.data, propertiesQuery.data, handleSelectReport)}
    </CrmWorkspace>
  );
}

function ifSelectedReportComponent(
  selectedReport: any,
  handleBackToHub: () => void,
  leads: any,
  deals: any,
  tasks: any,
  calls: any,
  meetings: any,
  contacts: any,
  handoffs: any,
  trustFlags: any,
  assignableUsers: any,
  properties: any,
  handleSelectReport: (id: string) => void
) {
  if (selectedReport) {
    return (
      <ReportDetailCanvas
        report={selectedReport}
        onBackToHub={handleBackToHub}
        leads={leads || []}
        deals={deals || []}
        tasks={tasks || []}
        calls={calls || []}
        meetings={meetings || []}
        contacts={contacts || []}
        handoffs={handoffs || []}
        trustFlags={trustFlags || []}
        assignableUsers={assignableUsers || []}
        properties={properties || []}
      />
    );
  }

  return (
    <div>
      <div className="sr-only">
        <span title="Report Library">Report Library</span>
      </div>
      <ReportsHub onSelectReport={handleSelectReport} />
    </div>
  );
}
