import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const sidebar = readFileSync(resolve(process.cwd(), 'src/components/layout/AppSidebar.tsx'), 'utf8');
const access = readFileSync(resolve(process.cwd(), 'src/hooks/useSaasAccess.ts'), 'utf8');
const portal = readFileSync(resolve(process.cwd(), 'src/pages/OwnerPortal.tsx'), 'utf8');

describe('owner investor portal', () => {
  it('is role and entitlement gated in the authenticated application shell', () => {
    expect(app).toContain('function OwnerPortalRoute');
    expect(app).toContain("role !== 'landlord' && role !== 'super_admin'");
    expect(app).toContain('entitlementKey="portal.owner.enabled"');
    expect(app).toContain('path="/owner-portal"');
    expect(access).toContain("| 'portal.owner.enabled'");
    expect(sidebar).toContain("href: '/owner-portal', entitlementKey: 'portal.owner.enabled'");
  });

  it('uses the access-controlled executive report with useful owner metrics', () => {
    expect(portal).toContain('useCompanyExecutiveReport()');
    expect(portal).toContain('Portfolio command view');
    expect(portal).toContain('Outstanding');
    expect(portal).toContain('Open maintenance');
    expect(portal).toContain('<TablePagination');
  });

  it('drills into existing portfolio, maintenance, reports, and billing workflows', () => {
    for (const route of ['/properties', '/maintenance', '/reports', '/account/billing']) {
      expect(portal).toContain(`to="${route}"`);
    }
    expect(portal).toContain('setActiveCompanyId(row.company_id)');
  });
});