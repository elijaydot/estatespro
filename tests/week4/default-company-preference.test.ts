import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve('supabase/migrations/20260808120000_profile_default_company.sql'), 'utf8');
const provider = readFileSync(resolve('src/contexts/ActiveCompanyContext.tsx'), 'utf8');
const teamManagement = readFileSync(resolve('src/pages/TeamManagement.tsx'), 'utf8');

describe('default company preference', () => {
  it('stores only a company the user can access', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS default_company_id uuid REFERENCES public.companies(id)');
    expect(migration).toContain('validate_profile_default_company');
    expect(migration).toContain("member.status = 'approved'");
    expect(migration).toContain("RAISE EXCEPTION 'DEFAULT_COMPANY_ACCESS_DENIED'");
  });

  it('loads the server default before the browser company cache', () => {
    const defaultBranch = provider.indexOf('if (hasAccessibleDefault)');
    const localCacheBranch = provider.indexOf('const savedCompany = localStorage.getItem');
    expect(defaultBranch).toBeGreaterThan(-1);
    expect(localCacheBranch).toBeGreaterThan(defaultBranch);
    expect(provider).toContain("queryKey: ['profile-default-company', user?.id]");
    expect(provider).toContain(".update({ default_company_id: companyId })");
  });

  it('exposes a clear Team Management login-default action', () => {
    expect(teamManagement).toContain('Set active as login default');
    expect(teamManagement).toContain('Set as login default');
    expect(teamManagement).toContain('will open automatically when you sign in');
    expect(teamManagement).toContain('defaultCompanyId === company.id');
  });
});
