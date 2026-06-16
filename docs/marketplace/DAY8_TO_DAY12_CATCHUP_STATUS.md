# Day 8-12 Catch-up Status (Accelerated)

Date: 2026-06-16
Branch: feat/marketplace-crm-foundation

## Goal
Recover schedule by shipping highest-risk backend guardrails and minimum viable UI/route coverage for Days 8-12.

## Completed in This Slice

1. Day 8 (Moderation pipeline foundation)
- Added moderation actions table and indexes.
- Added moderation RLS policies for read/manage by company managers.
- Added moderation queue data hooks and state-update mutation in app layer.
- Added moderation queue section to internal marketplace manage UI.
- Added dedicated moderation page and route (/marketplace/moderation).

Files:
- supabase/migrations/20260616091500_marketplace_moderation_verification_enforcement.sql
- src/hooks/useMarketplace.ts
- src/pages/MarketplaceManage.tsx

2. Day 9 (Verification enforcement)
- Added publisher verification and verification documents schema.
- Added listing publish history schema.
- Added server-side trigger enforcement:
  - landlord-only status transitions for publish/pause/archive/block.
  - verified-only requirement before moving to live.
- Added publish history trigger logging on status changes.
- Added verification state panel in internal manage UI.
- Added dedicated verification workflow page and route (/marketplace/verification).

Files:
- supabase/migrations/20260616091500_marketplace_moderation_verification_enforcement.sql
- src/pages/MarketplaceManage.tsx
- src/hooks/useMarketplace.ts

3. Day 10 (SEO route foundation)
- Added public rent routes:
  - /rent
  - /rent/:citySlug
  - /rent/:citySlug/:areaSlug
  - /rent/:citySlug/:areaSlug/:idOrSlug
- Added dynamic page title/meta description updates on marketplace public page.
- Added DB search index table and location listing RPC helpers.

Files:
- src/App.tsx
- src/pages/MarketplacePublic.tsx
- supabase/migrations/20260616102000_marketplace_seo_risk_and_crm_automation.sql

4. Day 11 (CRM automation foundation)
- Added DB function generate_crm_followup_tasks(company_id) to create stale lead follow-up tasks.

Files:
- supabase/migrations/20260616102000_marketplace_seo_risk_and_crm_automation.sql

5. Day 12 (Risk and abuse foundation)
- Added risk_decisions persistence.
- Added abuse_signals table.
- Added evaluate_marketplace_inquiry_risk(inquiry_id) function with velocity heuristics and moderation case creation.
- Integrated risk evaluation call into marketplace inquiry edge function.

Files:
- supabase/migrations/20260616091500_marketplace_moderation_verification_enforcement.sql
- supabase/migrations/20260616102000_marketplace_seo_risk_and_crm_automation.sql

## Remaining for Full Day 8-12 Completion

1. Day 8
- Edge/service endpoints for moderation workflow actions and assignment.

2. Day 9
- Verification reviewer decision flow (approve/reject) and operational playbook.

3. Day 10
- Structured data JSON-LD per listing detail page.
- Canonical tags and sitemap feed generation.

4. Day 11
- Scheduler/cron wiring for generate_crm_followup_tasks.
- SLA overdue indicators and countdown timers in CRM UI.

5. Day 12
- Risk badges and drilldown in moderation UI.

## Validation Notes
- Scoped eslint for changed marketplace files passed:
  - src/pages/MarketplaceManage.tsx
  - src/hooks/useMarketplace.ts
  - src/components/layout/AppSidebar.tsx
  - src/App.tsx
  - src/lib/marketplaceApi.ts
  - src/pages/MarketplacePublic.tsx

## Next Slice Recommendation (Priority Order)
1. Add reviewer approve/reject workflow for publisher verification.
2. Add cron job invocation path for generate_crm_followup_tasks.
3. Add risk badges and drilldown details in moderation UI.
4. Add structured data + canonical/sitemap outputs for SEO readiness.
5. Run staging migration + smoke checklist and attach evidence.
