import { describe, expect, it } from 'vitest';
import {
  ageInDays,
  getSlaLevel,
  matchesDecisionFilter,
  matchesSlaFilter,
  nextVisibleCount,
  sliceRows,
} from '../../src/lib/reviewerQueue';

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

  it('slices rows for incremental rendering', () => {
    const rows = ['a', 'b', 'c', 'd'];
    expect(sliceRows(rows, 2)).toEqual(['a', 'b']);
    expect(sliceRows(rows, 99)).toEqual(rows);
    expect(sliceRows(rows, -4)).toEqual([]);
  });

  it('increments visible count without exceeding total', () => {
    expect(nextVisibleCount(25, 100, 25)).toBe(50);
    expect(nextVisibleCount(90, 100, 25)).toBe(100);
    expect(nextVisibleCount(100, 100, 25)).toBe(100);
  });
});
