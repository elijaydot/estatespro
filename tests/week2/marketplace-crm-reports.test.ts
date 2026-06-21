import { describe, expect, it } from 'vitest';
import { computeDealAgingRows, computeExecutionSummary, computePipelineSummary } from '../../src/lib/marketplaceCrmReports';

describe('marketplace CRM reports helpers', () => {
  it('computes pipeline summary with weighted value', () => {
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
        amount: 40000,
        currency: 'NGN',
        stage: 'closed_won',
        probability: 100,
        expected_close_date: null,
        owner_user_id: null,
        created_at: '2026-06-02T00:00:00.000Z',
      },
    ];

    const summary = computePipelineSummary(deals);

    expect(summary.openDeals).toBe(1);
    expect(summary.openValue).toBe(100000);
    expect(summary.weightedValue).toBe(50000);
    expect(summary.closedWon).toBe(1);
    expect(summary.closedLost).toBe(0);
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
});
