import { describe, expect, it } from 'vitest';
import {
  matchesCompanyFilter,
  matchesUserFilter,
  buildCorrelationFilterOptions,
} from '../../src/lib/controlPlaneFilterHelpers';

describe('control-plane filters regression', () => {
  it('accepts uuid/email/name style lookups for company and user filters', () => {
    const companyDirectory = new Map([
      ['c1', { id: 'c1', name: 'Sunset Homes', email: 'hello@sunset.test' }],
    ]);
    const userDirectory = new Map([
      ['u1', { user_id: 'u1', name: 'Jane Doe', email: 'jane@sunset.test' }],
    ]);

    expect(matchesCompanyFilter('c1', 'sunset', companyDirectory as never)).toBe(true);
    expect(matchesCompanyFilter('c1', 'hello@sunset.test', companyDirectory as never)).toBe(true);
    expect(matchesUserFilter('u1', 'jane', userDirectory as never)).toBe(true);
    expect(matchesUserFilter('u1', 'jane@sunset.test', userDirectory as never)).toBe(true);
  });

  it('builds correlation options with clear-all row', () => {
    const options = buildCorrelationFilterOptions([
      { correlation_id: 'corr-1', created_at: '2026-07-22T00:00:00.000Z' },
    ]);

    expect(options[0].value).toBe('');
    expect(options[0].label).toContain('All correlations');
    expect(options[1].value).toBe('corr-1');
  });
});
