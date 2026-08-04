import { describe, expect, it } from 'vitest';
import {
  computeDealAgingRows,
  computeExecutionSummary,
  computeLeadPipelineSummary,
  computeLeadStageRows,
  filterByDateRange,
  filterByOwner,
  rangeToStartTimestamp,
} from '../../src/lib/marketplaceCrmReports';

describe('marketplace CRM reports helpers', () => {
  it('keeps lead funnels non-empty and separated when there are no deals', () => {
    const leads = [
      { id: 'l1', company_id: 'c1', listing_id: null, pipeline_kind: 'leasing' as const, stage: 'qualified', status: 'open', priority: 'normal', score: 0, assigned_to: null, created_at: '2026-06-01T00:00:00.000Z', last_activity_at: null, converted_at: null, lost_reason: null },
      { id: 'l2', company_id: 'c1', listing_id: null, pipeline_kind: 'leasing' as const, stage: 'converted', status: 'won', priority: 'normal', score: 0, assigned_to: null, created_at: '2026-06-02T00:00:00.000Z', last_activity_at: null, converted_at: null, lost_reason: null },
      { id: 'l3', company_id: 'c1', listing_id: null, pipeline_kind: 'renewal' as const, stage: 'new', status: 'open', priority: 'normal', score: 0, assigned_to: null, created_at: '2026-06-03T00:00:00.000Z', last_activity_at: null, converted_at: null, lost_reason: null },
    ];
    const leasing = leads.filter((lead) => lead.pipeline_kind === 'leasing');

    expect(computeLeadStageRows(leasing).map((row) => row.stage).sort()).toEqual(['converted', 'qualified']);
    expect(computeLeadPipelineSummary(leasing, [])).toMatchObject({ openDeals: 1, closedWon: 1, openValue: 0 });
    expect(computeLeadStageRows(leasing).some((row) => row.stage === 'new')).toBe(false);
  });

  it('computes deal aging rows and stale counts', () => {
    const deals = [
      {
        id: '1',
        company_id: 'c1',
        lead_id: null,
        account_id: null,
        contact_id: null,
        listing_id: null,
        unit_id: null,
        deal_name: 'Deal A',
        amount: 100000,
        currency: 'NGN',
        stage: 'negotiation',
        probability: 50,
        expected_close_date: null,
        owner_user_id: null,
        created_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: '2',
        company_id: 'c1',
        lead_id: null,
        account_id: null,
        contact_id: null,
        listing_id: null,
        unit_id: null,
        deal_name: 'Deal B',
        amount: 25000,
        currency: 'NGN',
        stage: 'negotiation',
        probability: 30,
        expected_close_date: null,
        owner_user_id: null,
        created_at: '2026-06-15T00:00:00.000Z',
      },
      {
        id: '3',
        company_id: 'c1',
        lead_id: null,
        account_id: null,
        contact_id: null,
        listing_id: null,
        unit_id: null,
        deal_name: 'Deal C',
        amount: 30000,
        currency: 'NGN',
        stage: 'proposal',
        probability: 20,
        expected_close_date: null,
        owner_user_id: null,
        created_at: '2026-06-19T00:00:00.000Z',
      },
    ];

    const rows = computeDealAgingRows(deals, new Date('2026-06-21T00:00:00.000Z').getTime());

    const negotiation = rows.find((row) => row.stage === 'negotiation');
    expect(negotiation?.count).toBe(2);
    expect(negotiation?.staleCount).toBe(1);

    const proposal = rows.find((row) => row.stage === 'proposal');
    expect(proposal?.avgAgeDays).toBe(2);
  });

  it('computes execution summary with trust and handoff indicators', () => {
    const summary = computeExecutionSummary({
      tasks: [
        { id: '1', lead_id: 'l1', task_type: 'follow_up', owner_user_id: 'u1', due_at: '', status: 'open', notes: null, created_at: '' },
        { id: '2', lead_id: 'l1', task_type: 'follow_up', owner_user_id: 'u1', due_at: '', status: 'done', notes: null, created_at: '' },
      ],
      calls: [
        { id: '1', company_id: 'c1', subject: 'Call', call_type: 'outbound', related_type: 'lead', related_id: 'l1', contact_name: null, owner_user_id: null, started_at: '', duration_minutes: 10, result: 'answered', created_at: '' },
      ],
      meetings: [
        { id: '1', company_id: 'c1', title: 'M1', related_type: 'lead', related_id: 'l1', host_user_id: null, starts_at: '', ends_at: '', status: 'done', notes: null, created_at: '' },
      ],
      campaigns: [
        { id: '1', company_id: 'c1', name: 'Camp', channel: 'email', status: 'active', budget_amount: null, spend_amount: null, starts_on: null, ends_on: null, open_rate: null, click_rate: null, bounce_rate: null, created_at: '' },
      ],
      trustFlags: [
        { id: '1', company_id: 'c1', entity_type: 'deal', entity_id: null, severity: 'high', state: 'active', source: 'moderation', source_id: null, reason: null, metadata: {}, created_at: '', updated_at: '' },
      ],
      handoffs: [
        { id: '1', deal_id: 'd1', company_id: 'c1', status: 'ready', checklist_json: {}, readiness_notes: null, tenant_id: null, lease_id: null, started_at: null, completed_at: null, created_at: '', updated_at: '' },
      ],
      funnel: {
        company_id: 'c1',
        company_name: 'Company',
        inquiries_30d: 20,
        leads_open: 8,
        deals_open: 4,
        deals_won_30d: 2,
        inquiry_to_won_rate_pct: 10,
      },
    });

    expect(summary.openTasks).toBe(1);
    expect(summary.completedTasks).toBe(1);
    expect(summary.callsLogged).toBe(1);
    expect(summary.meetingsDone).toBe(1);
    expect(summary.activeCampaigns).toBe(1);
    expect(summary.activeTrustFlags).toBe(1);
    expect(summary.handoffsReady).toBe(1);
    expect(summary.inquiryToWonRate).toBe(10);
  });

  it('filters records by date range and owner', () => {
    const now = Date.now();
    const fiveDaysAgo = new Date(now - (5 * 24 * 60 * 60 * 1000)).toISOString();
    const fortyDaysAgo = new Date(now - (40 * 24 * 60 * 60 * 1000)).toISOString();
    const oneHundredDaysAgo = new Date(now - (100 * 24 * 60 * 60 * 1000)).toISOString();

    const rows = [
      { owner_user_id: 'u1', created_at: fiveDaysAgo },
      { owner_user_id: 'u2', created_at: fortyDaysAgo },
      { owner_user_id: 'u1', created_at: oneHundredDaysAgo },
    ];

    const byOwner = filterByOwner(rows, 'u1', (row) => row.owner_user_id);
    expect(byOwner).toHaveLength(2);

    const byDate = filterByDateRange(rows, '30d', (row) => row.created_at);
    expect(byDate).toHaveLength(1);
  });

  it('computes date range start timestamp', () => {
    const base = new Date('2026-06-21T00:00:00.000Z').getTime();
    expect(rangeToStartTimestamp('all', base)).toBeNull();
    expect(rangeToStartTimestamp('7d', base)).toBe(base - (7 * 24 * 60 * 60 * 1000));
  });
});
