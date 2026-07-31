import { describe, expect, it } from 'vitest';
import {
  computeAgingRows,
  computeMaintenanceCostRows,
  computeOccupancyTrend,
  computeRentRollRows,
  rowsToCsv,
} from '../../src/lib/pmReports';

describe('PM reporting aggregators', () => {
  it('builds a sorted rent roll', () => {
    const rows = computeRentRollRows([{ lease_number: 'L-1', status: 'active', start_date: '2026-01-01', end_date: '2026-12-31', monthly_rent: 1200, tenants: { name: 'Ada' }, properties: { name: 'Harbor' }, units: { unit_number: '2A' } }]);
    expect(rows[0]).toMatchObject({ tenant: 'Ada', unit: '2A', monthlyRent: 1200 });
  });

  it('buckets outstanding invoices by age', () => {
    const rows = computeAgingRows([{ invoice_number: 'I-1', amount: 1000, paid_amount: 250, due_date: '2026-01-01', status: 'overdue', tenants: { name: 'Ada' } }], Date.parse('2026-04-15'));
    expect(rows[0]).toMatchObject({ balance: 750, bucket: '90+' });
  });

  it('derives historical occupancy from lease dates', () => {
    const rows = computeOccupancyTrend([{ status: 'active', start_date: '2026-01-01', end_date: '2026-12-31' }], 2, 1, new Date('2026-06-15'));
    expect(rows[0]).toMatchObject({ occupied: 1, vacant: 1, occupancyRate: 50 });
  });

  it('computes maintenance cost variance', () => {
    const rows = computeMaintenanceCostRows([{ title: 'Boiler', status: 'completed', priority: 'high', estimated_cost: 100, actual_cost: 125, properties: { name: 'Harbor' } }]);
    expect(rows[0]).toMatchObject({ estimatedCost: 100, actualCost: 125, variance: 25 });
  });

  it('escapes CSV cells', () => {
    expect(rowsToCsv(['Name'], [['Harbor, North']])).toBe('Name\n"Harbor, North"');
  });
});