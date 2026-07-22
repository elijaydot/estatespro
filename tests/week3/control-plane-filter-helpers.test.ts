import { describe, expect, it } from 'vitest';
import {
  matchesCompanyFilter,
  matchesUserFilter,
  type CompanyDirectoryEntry,
  type UserDirectoryEntry,
} from '../../src/lib/controlPlaneFilterHelpers';

describe('controlPlane filter helpers', () => {
  it('matches company query by uuid, name, and email', () => {
    const directory = new Map<string, CompanyDirectoryEntry>([
      ['company-1', { id: 'company-1', name: 'Blue Harbor', email: 'ops@blueharbor.com' }],
    ]);

    expect(matchesCompanyFilter('company-1', 'company-1', directory)).toBe(true);
    expect(matchesCompanyFilter('company-1', 'blue', directory)).toBe(true);
    expect(matchesCompanyFilter('company-1', 'ops@blueharbor.com', directory)).toBe(true);
    expect(matchesCompanyFilter('company-1', 'other', directory)).toBe(false);
  });

  it('matches user query by uuid, name, and email', () => {
    const directory = new Map<string, UserDirectoryEntry>([
      ['user-1', { user_id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' }],
    ]);

    expect(matchesUserFilter('user-1', 'user-1', directory)).toBe(true);
    expect(matchesUserFilter('user-1', 'ada', directory)).toBe(true);
    expect(matchesUserFilter('user-1', 'example.com', directory)).toBe(true);
    expect(matchesUserFilter('user-1', 'grace', directory)).toBe(false);
  });

  it('supports unknown and unscoped sentinel values', () => {
    const companyDirectory = new Map<string, CompanyDirectoryEntry>();
    const userDirectory = new Map<string, UserDirectoryEntry>();

    expect(matchesCompanyFilter(null, 'unscoped', companyDirectory)).toBe(true);
    expect(matchesUserFilter(null, 'unknown', userDirectory)).toBe(true);
  });
});
