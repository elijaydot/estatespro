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

  it('returns managed listing card data without widening access', () => {
    const migration = read('supabase/migrations/20260808140000_marketplace_managed_listing_card_data.sql');
    const hooks = read('src/hooks/useMarketplace.ts');

    expect(migration).toContain('DROP FUNCTION IF EXISTS public.get_managed_marketplace_listings_with_inquiry_counts(uuid)');
    expect(migration).toContain('SECURITY INVOKER');
    expect(migration).toContain('listing.bedrooms');
    expect(migration).toContain('listing.bathrooms');
    expect(migration).toContain('media.is_cover = true');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.get_managed_marketplace_listings_with_inquiry_counts(uuid) TO authenticated');
    expect(hooks).toContain('cover_media_path: string | null');
  });

  it('renders stable visual listing cards for all marketplace states', () => {
    const card = read('src/components/marketplace-crm/MarketplaceListingCard.tsx');
    const status = read('src/lib/marketplaceListingStatus.ts');

    for (const value of ['draft', 'pending_review', 'live', 'paused', 'pending_removal', 'archived', 'blocked']) {
      expect(status).toContain(`case '${value}'`);
    }
    expect(card).toContain("useSignedUrl('listing-media', listing.cover_media_path)");
    expect(card).toContain('aspect-video');
    expect(card).toContain('No photos yet');
    expect(card).toContain('<BedDouble');
    expect(card).toContain('<Bath');
    expect(card).toContain("listing.verification_state !== 'verified'");
    expect(card).toContain("listing.status === 'pending_removal'");
  });

  it('uses local inventory filters, urgency stats, pagination, and company verification', () => {
    const manage = read('src/pages/MarketplaceManage.tsx');

    expect(manage).toContain('usePublisherVerification(activeCompanyId)');
    expect(manage).toContain('Get verified to publish listings live');
    expect(manage).toContain('Verification in review');
    expect(manage).toContain('Verification needs attention');
    expect(manage).toContain('pendingRemovalCount > 0');
    expect(manage).toContain('const filteredListings = useMemo');
    expect(manage).toContain('Search title, city, or area');
    expect(manage).toContain('<option value="most_leads">Most leads</option>');
    expect(manage).toContain('const PAGE_SIZE = 6');
    expect(manage).toContain('paginatedListings.map');
    expect(manage).not.toContain("queryKey: ['marketplace', 'managed-listings', companyId, search");
  });

  it('auto-qualifies Free publishers from tenancy history and configurable account age', () => {
    const migration = read('supabase/migrations/20260808150000_marketplace_tiered_publisher_trust.sql');

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.evaluate_publisher_auto_trust(p_company_id uuid)');
    expect(migration).toContain('min_account_age_days integer NOT NULL DEFAULT 7');
    expect(migration).toContain('JOIN public.properties property ON property.id = tenant.property_id');
    expect(migration).toContain('v_auto_qualified := v_has_tenancy_history');
    expect(migration).toContain('v_account_age_days >= v_min_account_age_days OR v_has_active_paid_plan');
    expect(migration).not.toMatch(/v_auto_qualified\s*:=.*plan\.tier\s*<>\s*'free'/);
    expect(migration).not.toContain('unit_count > 0');
  });

  it('uses paid plans only as an age fast-track and never bypasses tenancy history', () => {
    const migration = read('supabase/migrations/20260808150000_marketplace_tiered_publisher_trust.sql');

    expect(migration).toContain("subscription.status = 'active'");
    expect(migration).toContain("plan.tier IN ('bronze', 'silver', 'gold', 'platinum')");
    expect(migration).toContain('price.amount_minor > 0');
    expect(migration).toMatch(/v_auto_qualified := v_has_tenancy_history\s+AND \(v_account_age_days >= v_min_account_age_days OR v_has_active_paid_plan\)\s+AND NOT v_has_manual_review_hold/);
    expect(migration).toContain("VALUES (p_company_id, 'pending', now())");
    expect(migration).toContain("IF v_auto_qualified AND v_verification.state = 'pending'");
  });

  it('records system trust and reason-required reviewer revocation without a second company flag', () => {
    const migration = read('supabase/migrations/20260808150000_marketplace_tiered_publisher_trust.sql');
    const reports = read('src/pages/Reports.tsx');
    const controlPlane = read('src/hooks/useControlPlane.ts');

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.publisher_verification_audit');
    expect(migration).toContain("'auto_verified'");
    expect(migration).toContain('verified_by = NULL');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.revoke_publisher_verification_to_manual_review');
    expect(migration).toContain("RAISE EXCEPTION 'REVIEW_REASON_REQUIRED'");
    expect(migration).toContain("SET state = 'needs_review'");
    expect(migration).toContain("'revoked_to_manual_review'");
    expect(migration).toContain("audit.action_type = 'revoked_to_manual_review'");
    expect(migration).toContain('AND NOT v_has_manual_review_hold');
    expect(migration).toContain('CREATE TRIGGER sync_marketplace_listing_publisher_trust_trigger');
    expect(migration).toContain('SET verification_state = NEW.state');
    expect(migration).toContain('ALTER TABLE public.companies DROP COLUMN IF EXISTS is_verified');
    expect(reports).not.toContain('row.is_verified');
    expect(controlPlane).not.toContain('is_verified');
  });

  it('evaluates trust before publish and presents manual review as the exception', () => {
    const hooks = read('src/hooks/useMarketplace.ts');
    const verification = read('src/pages/MarketplaceVerification.tsx');
    const reviewer = read('src/pages/MarketplaceReviewerQueue.tsx');

    expect(hooks).toContain("supabase.rpc('evaluate_publisher_auto_trust'");
    expect(hooks).toContain("supabase.rpc('revoke_publisher_verification_to_manual_review'");
    expect(verification).toContain('Verified · qualified automatically on');
    expect(verification).toContain('Free plan · standard qualification');
    expect(verification).toContain('Active paid plans skip only the age wait');
    expect(verification).toContain('<Collapsible open={documentsOpen}');
    expect(reviewer).toContain('No manual reviews pending');
    expect(reviewer).toContain('Most publishers are verified automatically from account history');
    expect(reviewer).toContain('Revoke and send to manual review');
      expect(read('supabase/migrations/20260808150000_marketplace_tiered_publisher_trust.sql')).toContain("NEW.status IN ('pending_review', 'live')");
  });

  it('shows public trust only for verified publishers', () => {
    const publicMarketplace = read('src/pages/MarketplacePublic.tsx');

    expect(publicMarketplace.match(/verification_state === 'verified'/g)?.length).toBe(2);
    expect(publicMarketplace.match(/Verified publisher/g)?.length).toBe(2);
    expect(publicMarketplace).not.toContain('<Badge variant="outline">{detail.verification_state}</Badge>');
  });
});
