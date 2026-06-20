import { describe, expect, it } from 'vitest';
import { ageInDays, getSlaLevel, matchesDecisionFilter, matchesSlaFilter } from '../../src/lib/reviewerQueue';

describe('reviewerQueue SLA helpers', () => {
  it('calculates age in days from a fixed timestamp', () => {
    const now = new Date('2026-06-20T12:00:00.000Z').getTime();
    const value = '2026-06-17T11:59:59.000Z';
    expect(ageInDays(value, now)).toBe(3);
  });

  it('maps ages to SLA levels', () => {
    expect(getSlaLevel(0)).toBe('healthy');
    expect(getSlaLevel(2)).toBe('healthy');
    expect(getSlaLevel(3)).toBe('warning');
    expect(getSlaLevel(6)).toBe('warning');
    expect(getSlaLevel(7)).toBe('critical');
  });

  it('matches SLA filters correctly', () => {
    expect(matchesSlaFilter(1, 'all')).toBe(true);
    expect(matchesSlaFilter(2, 'healthy')).toBe(true);
    expect(matchesSlaFilter(4, 'healthy')).toBe(false);
    expect(matchesSlaFilter(4, 'warning')).toBe(true);
    expect(matchesSlaFilter(8, 'critical')).toBe(true);
  });

  it('matches decision filters correctly', () => {
    expect(matchesDecisionFilter('verified', 'all')).toBe(true);
    expect(matchesDecisionFilter('verified', 'verified')).toBe(true);
    expect(matchesDecisionFilter('approved', 'verified')).toBe(false);
    expect(matchesDecisionFilter('rejected', 'rejected')).toBe(true);
  });
});
