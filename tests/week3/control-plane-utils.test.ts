import { describe, expect, it } from 'vitest';
import { isInTimeRange, matchesSearch, rowsToCsv } from '../../src/lib/controlPlane';

describe('controlPlane utils', () => {
  it('matches search case-insensitively', () => {
    expect(matchesSearch(['Alpha', 'beta'], 'ALP')).toBe(true);
    expect(matchesSearch(['Alpha', 'beta'], 'zeta')).toBe(false);
  });

  it('evaluates time ranges', () => {
    const nowIso = new Date().toISOString();
    const oldIso = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

    expect(isInTimeRange(nowIso, '24h')).toBe(true);
    expect(isInTimeRange(oldIso, '30d')).toBe(false);
    expect(isInTimeRange(oldIso, 'all')).toBe(true);
  });

  it('serializes rows to csv with escaping', () => {
    const csv = rowsToCsv([
      { id: '1', title: 'Simple', notes: 'ok' },
      { id: '2', title: 'Needs,quote', notes: 'line\nbreak' },
    ]);

    expect(csv.split('\n')[0]).toBe('id,title,notes');
    expect(csv).toContain('"Needs,quote"');
    expect(csv).toContain('"line\nbreak"');
  });
});
