import { describe, expect, it } from 'vitest';
import {
  calculateRraLeaseFilingDeadline,
  computeRraRentalTaxReport,
  generateRraTaxExportCsv,
} from '../../src/lib/rraCompliance';

describe('Rwanda Revenue Authority (RRA) & East Africa Compliance Spine', () => {
  it('correctly calculates 15-day statutory lease filing deadline and statuses', () => {
    // 1. Lease started 2 days ago -> ~13 days left
    const recentLease = new Date();
    recentLease.setDate(recentLease.getDate() - 2);
    const recentStatus = calculateRraLeaseFilingDeadline(recentLease.toISOString());
    expect(recentStatus.isOverdue).toBe(false);
    expect(recentStatus.daysRemaining).toBeGreaterThanOrEqual(12);
    expect(recentStatus.status).toBe('pending');

    // 2. Lease started 12 days ago -> ~3 days left (Urgent warning <= 5 days)
    const urgentLease = new Date();
    urgentLease.setDate(urgentLease.getDate() - 12);
    const urgentStatus = calculateRraLeaseFilingDeadline(urgentLease.toISOString());
    expect(urgentStatus.isOverdue).toBe(false);
    expect(urgentStatus.isUrgent).toBe(true);
    expect(urgentStatus.badgeLabel).toContain('Due in');

    // 3. Lease started 20 days ago -> Overdue (> 15 days)
    const overdueLease = new Date();
    overdueLease.setDate(overdueLease.getDate() - 20);
    const overdueStatus = calculateRraLeaseFilingDeadline(overdueLease.toISOString());
    expect(overdueStatus.isOverdue).toBe(true);
    expect(overdueStatus.status).toBe('overdue');
    expect(overdueStatus.badgeLabel).toContain('Overdue');

    // 4. Already filed lease
    const filedStatus = calculateRraLeaseFilingDeadline('2026-01-01', true, '2026-01-05');
    expect(filedStatus.status).toBe('filed');
    expect(filedStatus.badgeLabel).toBe('RRA Filed ✓');
  });

  it('accurately computes Rwandan 50% statutory deduction rental income tax report', () => {
    const grossIncome = 12_000_000; // 12M RWF gross rental income
    const report = computeRraRentalTaxReport(grossIncome, 'RWF', 2026, 4, 12);

    expect(report.grossRentalIncome).toBe(12_000_000);
    expect(report.statutoryDeductionAmount).toBe(6_000_000); // 50% statutory deduction
    expect(report.netTaxableIncome).toBe(6_000_000);
    expect(report.filingDeadline).toBe('January 31, 2027');
    expect(report.estimatedTaxAmount).toBeGreaterThan(0);
  });

  it('generates compliant RRA annual tax CSV export with breakdown', () => {
    const report = computeRraRentalTaxReport(5_000_000, 'RWF', 2026, 2, 6);
    const csv = generateRraTaxExportCsv(report, [
      { propertyName: 'Kibagabaga Heights', units: 4, collected: 3_500_000 },
      { propertyName: 'Gacuriro Villa', units: 2, collected: 1_500_000 },
    ]);

    expect(csv).toContain('RWANDA REVENUE AUTHORITY (RRA) - ANNUAL RENTAL INCOME TAX DECLARATION');
    expect(csv).toContain('Kibagabaga Heights');
    expect(csv).toContain('Gacuriro Villa');
    expect(csv).toContain('January 31, 2027');
  });
});
