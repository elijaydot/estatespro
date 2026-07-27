import { describe, expect, it } from 'vitest';
import {
  getDisplayedRevocationHistoryPage,
  getNextRevocationHistoryPage,
  getPrevRevocationHistoryPage,
  getRevocationHistoryTotalPages,
  resetRevocationHistoryPage,
  shouldDisableRevocationNext,
  shouldDisableRevocationPrev,
} from '../../src/lib/controlPlaneRevocationHistory';

describe('controlPlane revocation history pagination behavior', () => {
  it('computes total pages safely from total count and page size', () => {
    expect(getRevocationHistoryTotalPages(0, 20)).toBe(1);
    expect(getRevocationHistoryTotalPages(1, 20)).toBe(1);
    expect(getRevocationHistoryTotalPages(21, 20)).toBe(2);
    expect(getRevocationHistoryTotalPages(undefined, undefined)).toBe(1);
  });

  it('uses server page when present and falls back to local state otherwise', () => {
    expect(getDisplayedRevocationHistoryPage(3, 1)).toBe(3);
    expect(getDisplayedRevocationHistoryPage(undefined, 2)).toBe(2);
    expect(getDisplayedRevocationHistoryPage(undefined, 0)).toBe(1);
  });

  it('clamps prev and next navigation within valid bounds', () => {
    expect(getPrevRevocationHistoryPage(1)).toBe(1);
    expect(getPrevRevocationHistoryPage(4)).toBe(3);
    expect(getNextRevocationHistoryPage(1, 3)).toBe(2);
    expect(getNextRevocationHistoryPage(3, 3)).toBe(3);
  });

  it('disables navigation buttons at boundaries or while fetching', () => {
    expect(shouldDisableRevocationPrev(1, false)).toBe(true);
    expect(shouldDisableRevocationPrev(2, false)).toBe(false);
    expect(shouldDisableRevocationPrev(2, true)).toBe(true);

    expect(shouldDisableRevocationNext(1, 3, false)).toBe(false);
    expect(shouldDisableRevocationNext(3, 3, false)).toBe(true);
    expect(shouldDisableRevocationNext(2, 3, true)).toBe(true);
  });

  it('resets to first page when filters/scope change', () => {
    expect(resetRevocationHistoryPage()).toBe(1);
  });
});
