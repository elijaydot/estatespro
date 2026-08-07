import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('FishGate marketplace overhaul contracts', () => {
  it('allows landlord verification without reviewer controls', () => {
    const app = read('src/App.tsx');
    const verification = read('src/pages/MarketplaceVerification.tsx');
    const sidebar = read('src/components/layout/AppSidebar.tsx');

    expect(app).toContain('entitlementKey="marketplace.verification.manage"');
    expect(app).not.toMatch(/marketplace\/verification[\s\S]{0,250}MarketplaceReviewerRoute/);
    expect(sidebar).toContain("entitlementKey: 'marketplace.verification.manage'");
    expect(verification).not.toContain('Internal Reviewer Actions');
    expect(verification).not.toContain('useReviewerDecisionOnPublisherVerification');
  });

  it('uses the reviewer console as the only moderation route', () => {
    const app = read('src/App.tsx');
    const sidebar = read('src/components/layout/AppSidebar.tsx');
    const queue = read('src/pages/MarketplaceReviewerQueue.tsx');
    const ownershipMigration = read('supabase/migrations/20260807140000_moderation_case_company_ownership.sql');

    expect(app).not.toContain('path="/marketplace/moderation"');
    expect(sidebar).not.toContain("href: '/marketplace/moderation'");
    expect(queue).toContain('useReviewerModerationCaseQueue');
    expect(queue).toContain('Moderation Cases');
    expect(ownershipMigration).toContain('ADD COLUMN IF NOT EXISTS company_id');
    expect(ownershipMigration).toContain('MODERATION_CASE_COMPANY_MISMATCH');
  });

  it('keeps the CRM pipeline in the CRM workspace only', () => {
    const manage = read('src/pages/MarketplaceManage.tsx');
    const leads = read('src/pages/marketplace-crm/Leads.tsx');

    expect(manage).not.toContain('useUpdateCrmLeadStage');
    expect(manage).not.toContain('function LeadCard');
    expect(leads).toContain("localStorage.getItem('marketplace-crm-leads-view')");
    expect(leads).toContain("? 'table' : 'board'");
    expect(leads).toContain('LeadPipelineBoard');
    expect(leads).toContain('LeadDetailPanel');
  });

  it('enforces vacant same-company draft listings and one active listing per unit', () => {
    const migration = read('supabase/migrations/20260807110000_marketplace_listing_creation.sql');

    expect(migration).toContain('DROP POLICY IF EXISTS "Company users can create listings"');
    expect(migration).toContain("status = 'draft'");
    expect(migration).toContain("unit_record.status = 'vacant'");
    expect(migration).toContain('property_record.company_id = marketplace_listings.company_id');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_listings_active_unit');
  });

  it('assigns and notifies inquiry leads without rolling back on notification failure', () => {
    const migration = read('supabase/migrations/20260807120000_marketplace_lead_notifications.sql');
    const edgeSecurity = read('supabase/functions/_shared/security.ts');

    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("'marketplace_lead'");
    expect(migration).toContain("'/marketplace/crm/leads?lead='");
    expect(migration).toContain('AFTER INSERT ON public.marketplace_inquiries');
    expect(migration).toContain('EXCEPTION WHEN OTHERS');
    expect(migration).toContain('marketplace.lead.notification_failed');
    expect(edgeSecurity).toContain('idempotency-key');
  });

  it('flags only newly active signed leases and archives stale listings hourly', () => {
    const migration = read('supabase/migrations/20260807130000_marketplace_deal_closed_removal.sql');

    expect(migration).toContain("OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active'");
    expect(migration).toContain('NEW.landlord_signed_at IS NULL OR NEW.tenant_signed_at IS NULL');
    expect(migration).toContain("SET status = 'occupied'");
    expect(migration).toContain("status = 'pending_removal'");
    expect(migration).toContain("removal_flagged_at < now() - interval '24 hours'");
    expect(migration).toContain("'0 * * * *'");
  });

  it('keeps pending-removal listings out of public queries', () => {
    const publicHelpers = read('supabase/migrations/20260526160000_marketplace_public_and_inquiry_helpers.sql');
    expect(publicHelpers.match(/WHERE ml\.status = 'live'/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
