import { describe, expect, it } from 'vitest';
import { buildProjectSlaSummary, findDuplicateContactGroups } from '../../src/lib/marketplaceCrmWorkflow';

describe('marketplace CRM workflow helpers', () => {
  it('finds duplicate contacts by email and phone', () => {
    const contacts = [
      { id: '1', lead_id: 'l1', full_name: 'A', email: 'a@test.com', phone_e164: '+1000', preferred_channel: null, created_at: '2026-06-01T00:00:00.000Z' },
      { id: '2', lead_id: 'l2', full_name: 'A2', email: 'A@test.com', phone_e164: '+2000', preferred_channel: null, created_at: '2026-06-02T00:00:00.000Z' },
      { id: '3', lead_id: 'l3', full_name: 'B', email: null, phone_e164: '+3000', preferred_channel: null, created_at: '2026-06-03T00:00:00.000Z' },
      { id: '4', lead_id: 'l4', full_name: 'B2', email: null, phone_e164: '+3000', preferred_channel: null, created_at: '2026-06-04T00:00:00.000Z' },
    ];

    const groups = findDuplicateContactGroups(contacts);

    expect(groups).toHaveLength(2);
    expect(groups[0].contacts.length).toBeGreaterThan(1);
  });

  it('builds project SLA summary', () => {
    const projects = [
      { id: '1', company_id: 'c1', name: 'P1', description: null, status: 'active', owner_user_id: null, due_date: '2026-06-01', progress_percent: 20, created_at: '' },
      { id: '2', company_id: 'c1', name: 'P2', description: null, status: 'active', owner_user_id: null, due_date: '2026-06-24', progress_percent: 60, created_at: '' },
      { id: '3', company_id: 'c1', name: 'P3', description: null, status: 'completed', owner_user_id: null, due_date: '2026-06-20', progress_percent: 100, created_at: '' },
    ];

    const summary = buildProjectSlaSummary(projects as never, new Date('2026-06-21T00:00:00.000Z').getTime());

    expect(summary.overdue).toBe(1);
    expect(summary.dueSoon).toBe(1);
  });
});
