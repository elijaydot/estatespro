import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DashboardChartEmptyState,
  DashboardKpiStrip,
  type DashboardKpiData,
} from '../../src/components/dashboard/DashboardOverview';

const zeroData: DashboardKpiData = {
  overdueAmount: 0,
  overdueCount: 0,
  occupiedUnits: 0,
  totalUnits: 0,
  maintenanceOpen: 0,
  maintenanceInProgress: 0,
  renewals30d: 0,
  activeVendors: 0,
  pendingPayables: 0,
  alerts: 0,
};

const formatCurrency = (amount: number) => `RWF ${amount.toLocaleString('en-US')}`;

describe('company dashboard overview', () => {
  it.each([
    ['zero', zeroData],
    ['partial', { ...zeroData, occupiedUnits: 4, totalUnits: 10, maintenanceOpen: 2 }],
    ['full', { ...zeroData, overdueAmount: 1_500_000, overdueCount: 3, occupiedUnits: 18, totalUnits: 20, maintenanceOpen: 4, maintenanceInProgress: 2, renewals30d: 3, activeVendors: 6, pendingPayables: 250_000, alerts: 2 }],
  ])('renders the six-tile KPI strip with %s data', (_, data) => {
    const markup = renderToStaticMarkup(createElement(DashboardKpiStrip, { data, formatCurrency }));

    for (const label of ['Overdue', 'Occupancy', 'Maintenance', 'Renewals (30d)', 'Active vendors', 'Alerts']) {
      expect(markup).toContain(label);
    }
    expect((markup.match(/rounded-xl bg-card/g) || [])).toHaveLength(6);
  });

  it('renders designed empty states for zero revenue and occupancy', () => {
    const revenue = renderToStaticMarkup(createElement(DashboardChartEmptyState, { message: 'No revenue recorded yet this period' }));
    const occupancy = renderToStaticMarkup(createElement(DashboardChartEmptyState, { message: 'No units available for occupancy reporting' }));

    expect(revenue).toContain('No revenue recorded yet this period');
    expect(occupancy).toContain('No units available for occupancy reporting');
  });
});