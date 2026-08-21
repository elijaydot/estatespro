# Document 17 — Asset Inventory

## 1. Code assets

| Asset | Count / detail |
|---|---|
| Repository | Vite + React + TS SPA with `supabase/` backend directory |
| Pages | 78 modules under `src/pages` (incl. `tenant-portal/`, `marketplace-crm/`, `guest-booking/`) |
| Routes | 100+ declared in `src/App.tsx` |
| Component directories | `ai`, `control-plane`, `dashboard`, `forms`, `invites`, `layout`, `leases`, `marketplace-crm`, `security`, `settings`, `shared`, `tenants`, `theme`, `ui` (shadcn) |
| Hooks | 40 (`src/hooks`) |
| Contexts | 3 (Auth, ActiveCompany, Settings) + shared/consumer split files |
| Domain libraries | 30 modules (`src/lib`), incl. 9 control-plane modules |
| Types | `src/types/index.ts`, `src/integrations/supabase/types.ts` (generated) |
| Edge functions | 41 + `_shared` (3 modules) |
| Migrations | 153 SQL files |
| Tests | ~90 files (`tests/week2`, `tests/week3`, `tests/week4`) |
| Scripts | 6 (`check-audit-threshold`, `check-contract-inventory`, `contract-inventory-check-core`, `generate-public-openapi`, `generate-supabase-types`, `deploy-week3-billing-functions.ps1`) |
| CI workflows | 3 (`week1-ci`, `week2-quality`, `rls-isolation`) |
| Config | `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json` (3), `eslint.config.js`, `postcss.config.js`, `vitest.config.ts`, `vercel.json`, `components.json`, `supabase/config.toml` |

## 2. Documentation assets (already in repo)

Root: `README.md`, `WEEK1_SMOKE_TEST_CHECKLIST.md`, `WEEK2_*` (5), `WEEK3_*` (2), `WEEK4_*` (2), `WHOLE_APP_REMAINING_SCOPE.md`, `WORLD_CLASS_CONTROL_PLANE_1_TO_13_EXECUTION_PLAN.md`, `MARKETPLACE_CRM_IMPLEMENTATION_BLUEPRINT.md`, `FUTURE_FEATURE_MULTI_CHANNEL_MESSAGING.md`.

`docs/ops/` (14 files): alert routing matrix, audit event taxonomy, control-plane readiness runbook, public API + webhooks spec, messaging scheduler runbook, phase 7–9 specs, reporting architecture, RLS test coverage, SaaS packaging plan, renewals scheduler runbook, security audit residual risk, SLO/SLI plan, webhook staging test README.

`docs/marketplace/` (8): API contract v1, testing guide, execution logs, deploy runbook, seed SQL, OpenAPI spec, Postman collection.

`docs/parity/` (10): API contract inventory, versioning policy, CRM parity master plan and scorecard, wave implementation and sign-off docs, UI/UX execution plan.

Prior migration artifacts (from an earlier engagement): `FishGate_Migration_Runbook.md`, `Risk_Register.md`, `Parity_Checklist.md`, `GoNoGo_Checklist.md`, `Known_Limitations.md`, `storage-migration-script.js`, `create-auth-users-script.js` — **verify these are still present and reconcile them with this package.**

`supabase/verification/`: `control_plane_phase_d_checks.sql`, `wave2_m1_m3_post_migration_checks.sql`.

## 3. Database assets

130 public tables (full list in Document 2 §4), 304 distinct `public.*` function definitions, 131 triggers, 761 RLS policy statements, 5+ pg_cron jobs, 2 Realtime-published tables. Views/matviews, indexes, exact live grants: **MANUAL REVIEW REQUIRED**.

## 4. Storage assets

12 buckets (Document 7 §1). Object counts and bytes: **MANUAL REVIEW REQUIRED**.

## 5. Public/static assets

`public/favicon.ico`, `public/placeholder.svg`, `public/robots.txt`, `public/openapi.json` (generated partner API spec), `index.html`. No large binaries are tracked (nothing qualifies for CDN asset migration).

## 6. Third-party accounts to transfer or re-provision

| Account | Action at exit |
|---|---|
| Resend | Keep; verify the new sending domain (SPF/DKIM/DMARC), rotate the key |
| Flutterwave | Keep; re-register callback and webhook URLs on the new domain |
| Paystack | Keep; same |
| MTN MoMo | Keep; same |
| AI provider (new) | Create; set spend cap |
| GitHub | Keep; add mirror remote |
| Vercel (new) | Create |
| Supabase (new org) | Create |
| Domain registrar / DNS | Keep; low TTL before cutover |
| Sentry / uptime (new) | Create |

## 7. Intellectual property and knowledge assets

- The 153-file migration history is the authoritative schema definition and the most valuable single artifact.
- The 761-policy RLS model encodes the multi-tenant security design; it is not documented anywhere else and must not be re-derived by hand.
- The 9 AI prompts encode domain tone and output contracts (Document 8 §2).
- The partner API contract (`public/openapi.json` + `docs/parity/API_CONTRACT_INVENTORY.md`) is a customer-facing commitment.
- Project memory conventions (RWF currency, Rwanda default, navy/amber Zoho-style design system, `SearchableSelect` usage, `.maybeSingle()` fetch rule, PERMISSIVE RLS with SECURITY DEFINER bypass, `auth.uid()` vs `tenant.id` identifier split) — preserve these in `CONTRIBUTING.md` on the target so they survive the platform move.
