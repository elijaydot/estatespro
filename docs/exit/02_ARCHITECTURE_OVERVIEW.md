# Document 2 — Application Architecture Overview

## 1. Runtime topology (current)

```text
                    ┌───────────────────────────────────────────┐
  Browsers          │  Lovable hosting (estatespro.lovable.app)  │
  (5 personas) ───▶ │  Vite 8 + React 18 SPA, static bundle      │
                    └─────────────┬─────────────────────────────┘
                                  │ supabase-js v2 (anon key, JWT)
                                  ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │      Lovable-managed Supabase project  zuwpvevqijwkkucmpkkr          │
   │                                                                      │
   │  PostgREST Data API ──▶ Postgres (130 tables, 304 fns, 131 trg,      │
   │                          761 RLS policies, pg_cron, pgcrypto)        │
   │  GoTrue Auth (email/password, magic-link reset, native TOTP MFA)     │
   │  Storage API (12 buckets, folder-level RLS on auth.uid())            │
   │  Realtime (messages, notifications)                                  │
   │  Edge Runtime (Deno) — 41 functions, verify_jwt=false + manual JWT   │
   └───────┬───────────────────────────────┬──────────────────────────────┘
           │                               │
           ▼                               ▼
  https://ai.gateway.lovable.dev   Resend (email) · Flutterwave ·
  (google/gemini-3-flash-preview)  Paystack · MTN MoMo · partner webhooks
```

## 2. Frontend architecture

- **Build**: Vite 8, `@vitejs/plugin-react-swc`, TypeScript 5.8, Tailwind 3.4 + `tailwindcss-animate` + typography, shadcn/ui (Radix primitives), `lucide-react`.
- **Routing**: `react-router-dom` v7 in `src/App.tsx`. Route guards are composed components: `PublicRoute`, `PrivateRoute`, `MfaChallengeRoute`, `TenantPortalRoute`, `OwnerPortalRoute`, `SuperAdminRoute`, `MarketplaceReviewerRoute`, and `FeatureRoute` (entitlement-gated, e.g. `entitlementKey="crm.leads.manage"`). All pages are `React.lazy` + `withSuspense`.
- **Route trees**:
  - Public: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/mfa-challenge`, `/book/:propertyId`, `/bookings/guest-action`, `/marketplace`, `/marketplace/:idOrSlug`, `/rent`, `/rent/:citySlug[/:areaSlug[/:idOrSlug]]`, `/api/docs`
  - Operator app: `/dashboard`, `/team`, `/properties[/:id]`, `/units[/:id]`, `/tenants[/:id]`, `/tenant-exit/:exitId`, `/tenant-inventory-baseline/:tenantId`, `/leases`, `/invoices`, `/payments`, `/maintenance`, `/recurring-bills`, `/messages`, `/bookings`, `/notifications`, `/alerts`, `/vendors[/:id]`, `/reports`, `/settings`, `/owner-portal`, `/account/billing`, `/upgrade`, `/support`, `/broadcasts`, `/guest-booking-portal`
  - Marketplace + CRM: `/marketplace/manage`, `/verification`, `/reviewer`, and 15 CRM sub-routes (`crm`, `reports`, `automation`, `modules`, `leads`, `contacts`, `accounts`, `deals`, `tasks`, `meetings`, `calls`, `campaigns`, `documents`, `visits`, `projects`)
  - Super admin: `/super-admin/control-plane`, `/super-admin/catalog`, `/super-admin/billing-groups`
  - Tenant portal: `/tenant/login`, `/tenant/signup`, `/tenant/forgot-password`, `/tenant/reset-password`, `/tenant`, `/tenant/payments`, and further tenant sub-routes in `src/pages/tenant-portal`
- **State management**: TanStack Query v5 is the server-state layer (all 40 hooks). No Redux/Zustand. Local UI state via React hooks; forms via `react-hook-form` + `zod` resolvers.
- **Contexts** (`src/contexts`): `AuthContext` (session, MFA enrolment, sign-in/out), `ActiveCompanyContext` (multi-company scoping — every data hook filters on the active `company_id`), `SettingsContext` (appearance/accent tokens, currency, locale). Each context is split into a `*-context-shared.ts` value module plus a `use*.ts` consumer hook to keep fast-refresh boundaries clean.
- **Client-side storage**:
  - `localStorage` — Supabase session (`sb-<ref>-auth-token`, configured in `src/integrations/supabase/client.ts`), trusted-device MFA token (`src/lib/trustedDevice.ts`, 30-day), theme (`next-themes`), CRM view preferences (`src/lib/crmPreferences.ts`), default-company preference.
  - No cookies are set by the application itself.
- **Presentation/domain libraries** (`src/lib`): 30 modules including `controlPlane*.ts` (9 files), `marketplaceCrm*.ts`, `leaseLifecycle.ts`, `inspectionChecklist.ts`, `pmReports.ts`, `saasGuards.ts`, `security.ts`, `auditEvents.ts`, `safeSearch.ts`, `download.ts`, `aiResultExport.ts`.

## 3. Backend architecture

### 3.1 Data API path
Most reads/writes go **directly from the browser to PostgREST** using the anon key plus the user JWT, with RLS as the sole authorisation boundary. This is the most important architectural fact for migration: **authorisation lives in the database, not in application code.** 761 policy statements and 304 SECURITY DEFINER / helper functions implement it.

### 3.2 Edge function path
41 Deno functions handle everything that needs secrets, third-party calls, or privilege elevation. Config in `supabase/config.toml`; all but `evaluate-operational-alerts` run `verify_jwt = false` and validate the JWT in code (`auth.getClaims(token)` / `auth.getUser(token)`), per the signing-keys model. Shared code lives in `supabase/functions/_shared/` (`security.ts` — CORS allowlist via `ALLOWED_ORIGINS`, in-memory rate limiting, preflight; `saas-quota.ts` — credit/quota enforcement; `payment-contract.ts` — gateway contract types).

### 3.3 Scheduled work
`pg_cron` inside the database, plus HTTP-invocable worker functions:

| Job | Schedule | Target |
|---|---|---|
| `marketplace_stale_listing_removal` | `0 * * * *` | `public.auto_remove_stale_pending_listings()` |
| `operational_alerts_daily` | `0 6 * * *` | `public.evaluate_operational_alerts(NULL)` |
| `platform_administration_snapshot_hourly` | `23 * * * *` | `public.platform_refresh_administration_snapshot()` |
| `platform_bulk_risk_triage_every_minute` | `* * * * *` | bulk risk triage worker |
| `platform_impersonation_expiry_every_minute` | `* * * * *` | impersonation session expiry |
| trial expiry / renewals / CRM retry workers | see `20260811120000`, `20260725110000`, `20260724143000` migrations | MANUAL REVIEW REQUIRED against live `cron.job` |

Worker-style edge functions triggered on schedule or by secret header: `check-lease-renewals`, `check-trial-expirations`, `run-subscription-renewals`, `process-scheduled-messages`, `dispatch-webhooks`, `evaluate-operational-alerts`.

### 3.4 Outbound webhooks (partner API)
`webhook_endpoints` → `webhook_events` → `dispatch-webhooks` → `webhook_delivery_attempts` → `webhook_dead_letters`, signed with `PARTNER_WEBHOOK_SECRET`, worker authenticated with `WEBHOOK_WORKER_SECRET`. Envelope version `v1.0`; `payment.verified` is the reference event.

## 4. Domain subsystems

| Subsystem | Representative tables |
|---|---|
| Core PM | `companies`, `company_members`, `properties`, `units`, `tenants`, `leases`, `lease_templates`, `lease_attachments`, `invoices`, `payments`, `recurring_bills`, `maintenance_requests`, `vendors`, `vendor_payments`, `vendor_documents` |
| Tenant lifecycle | `tenant_invites`, `pm_invites`, `tenant_exits`, `exit_inspection_items`, `lease_inventory_snapshots`, `lease_inventory_items`, `default_inspection_checklist` |
| Short-let | `bookings` |
| Messaging | `messages`, `message_attachments`, `message_drafts`, `message_presence`, `scheduled_messages`, `broadcasts`, `notifications` |
| Marketplace | `marketplace_listings`, `listing_media`, `listing_publish_history`, `listing_search_index`, `marketplace_inquiries`, `marketplace_trust_config`, `publisher_verifications`, `publisher_verification_audit`, `verification_documents`, `moderation_cases`, `moderation_actions`, `risk_decisions`, `abuse_signals` |
| CRM | `leads`, `lead_contacts`, `lead_activities`, `lead_tasks`, `lead_stage_history`, `crm_accounts`, `crm_deals`, `crm_deal_stage_history`, `crm_deal_handoffs`, `crm_calls`, `crm_meetings`, `crm_visits`, `crm_projects`, `crm_campaigns`, `crm_documents`, `crm_document_comments`, `crm_automation_rules`, `crm_automation_runs`, `crm_followup_automation_log`, `crm_trust_flags` |
| SaaS billing & entitlements | 30 `saas_*` tables (products, plans, prices, quotas, entitlements, addons, subscriptions, invoices, payment attempts, usage counters/events, change logs, catalog change sets) plus `owner_billing_groups`, `owner_billing_group_members`, `entitlement_decisions`, `usage_snapshots` |
| Platform control plane | `platform_operator_roles`, `platform_sessions`, `platform_impersonation_sessions`, `platform_audit_events`, `platform_analytics_snapshots`, `platform_administration_snapshots`, `platform_drift_checks`, `platform_entitlement_overrides`, `platform_principal_suspensions`, `platform_bulk_risk_triage_jobs(+_items)`, `platform_risk_queue_triage_actions`, `platform_saved_exception_queues`, `governance_alerts`, `alert_thresholds`, `operational_alerts` |
| Partner API | `api_keys`, `api_request_events`, `api_rate_limit_windows`, `api_idempotency_records`, `webhook_*` (4 tables) |
| Security & audit | `user_roles`, `user_mfa`, `security_recovery_codes`, `security_audit_events`, `audit_events`, `profiles`, `app_settings`, `company_settings`, `reports` |

## 5. Target topology (recommended, Document 20)

```text
  Browsers ─▶ Vercel (SPA, custom domain, preview envs from GitHub PRs)
                   │
                   ▼
     Self-owned Supabase Cloud project (Pro plan, PITR enabled)
       Postgres · GoTrue · Storage · Realtime · Deno Edge Runtime
                   │
                   ▼
       _shared/ai-provider.ts ──▶ AI_PROVIDER = openai | azure | anthropic | gemini
                   │
                   ▼
       Resend · Flutterwave · Paystack · MoMo · partner webhooks
```

The only code diffs required are: `.env` URL/key values, the AI provider shim, removal of `lovable-tagger` from `vite.config.ts`, and CI/CD wiring. Everything else — 153 migrations, 41 functions, RLS, Storage paths, Realtime channels — replays unchanged.
