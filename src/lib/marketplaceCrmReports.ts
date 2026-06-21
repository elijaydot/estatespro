import type { CrmDeal, CrmTask, CrmCampaign, CrmCall, CrmMeeting, CrmTrustFlag, CrmDealHandoff, CrmMarketplaceFunnelMetric } from '@/hooks/useMarketplaceCrm';

export interface DealAgingRow {
  stage: string;
  count: number;
  avgAgeDays: number;
  staleCount: number;
}

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export function computeDealAgingRows(deals: CrmDeal[], nowMs = Date.now()): DealAgingRow[] {
  const stageMap = new Map<string, CrmDeal[]>();

  for (const deal of deals) {
    const current = stageMap.get(deal.stage) || [];
    current.push(deal);
    stageMap.set(deal.stage, current);
  }

  return Array.from(stageMap.entries())
    .map(([stage, stageDeals]) => {
      const ages = stageDeals.map((deal) => Math.max(0, Math.floor((nowMs - new Date(deal.created_at).getTime()) / MS_IN_DAY)));
      const totalAge = ages.reduce((sum, age) => sum + age, 0);
      const staleCount = ages.filter((age) => age >= 14).length;

      return {
        stage,
        count: stageDeals.length,
        avgAgeDays: stageDeals.length > 0 ? Math.round(totalAge / stageDeals.length) : 0,
        staleCount,
      };
    })
    .sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage));
}

export function computePipelineSummary(deals: CrmDeal[]) {
  const openDeals = deals.filter((deal) => !['closed_won', 'closed_lost'].includes(deal.stage));
  const openValue = openDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
  const weightedValue = openDeals.reduce((sum, deal) => sum + ((deal.amount || 0) * (deal.probability / 100)), 0);
  const closedWon = deals.filter((deal) => deal.stage === 'closed_won').length;
  const closedLost = deals.filter((deal) => deal.stage === 'closed_lost').length;

  return {
    openDeals: openDeals.length,
    openValue,
    weightedValue,
    closedWon,
    closedLost,
  };
}

export function computeExecutionSummary(params: {
  tasks: CrmTask[];
  calls: CrmCall[];
  meetings: CrmMeeting[];
  campaigns: CrmCampaign[];
  trustFlags: CrmTrustFlag[];
  handoffs: CrmDealHandoff[];
  funnel: CrmMarketplaceFunnelMetric | null;
}) {
  const { tasks, calls, meetings, campaigns, trustFlags, handoffs, funnel } = params;

  return {
    openTasks: tasks.filter((task) => task.status === 'open').length,
    completedTasks: tasks.filter((task) => task.status === 'done').length,
    callsLogged: calls.length,
    meetingsDone: meetings.filter((meeting) => meeting.status === 'done').length,
    activeCampaigns: campaigns.filter((campaign) => campaign.status === 'active').length,
    activeTrustFlags: trustFlags.filter((flag) => flag.state === 'active').length,
    handoffsReady: handoffs.filter((handoff) => handoff.status === 'ready').length,
    handoffsRequiresInput: handoffs.filter((handoff) => handoff.status === 'requires_input').length,
    inquiryToWonRate: funnel?.inquiry_to_won_rate_pct || 0,
  };
}
