# Document 1 — Executive Summary

## 1. What this application is

A multi-tenant property-management and real-estate marketplace SaaS ("FishGate" / EstatesPro), published at `https://estatespro.lovable.app`. It serves five distinct personas across separate route trees:

1. Landlords / company owners (`/dashboard`, `/properties`, `/leases`, `/payments`, …)
2. Property managers (scoped by company membership and assignment)
3. Tenants (`/tenant/*` portal, separate auth entry point)
4. Guests / public (marketplace `/rent/*`, `/marketplace`, short-let booking `/book/:propertyId`)
5. Platform operators / super admins (`/super-admin/*` control plane, impersonation, risk triage, catalog and billing administration)

It additionally exposes a **public partner API** (`fishgate-api` edge function, API keys, rate limits, idempotency, webhooks with dead-letter and replay) documented by `public/openapi.json` and served at `/api/docs`.

## 2. Scale of the platform (measured)

| Dimension | Count |
|---|---|
| React pages | 78 page modules (`src/pages`, incl. `tenant-portal`, `marketplace-crm`, `guest-booking`) |
| Application routes | 100+ (`src/App.tsx`) |
| Custom hooks | 40 |
| React contexts | 3 (Auth, ActiveCompany, Settings) |
| Public-schema tables (from DDL) | **130** |
| Database functions (`CREATE OR REPLACE FUNCTION public.*`) | **304 distinct** |
| Triggers | **131** |
| RLS policy statements in migrations | **761** |
| Migrations | **153** |
| Edge functions | **41** |
| Storage buckets referenced | **12** |
| pg_cron jobs (explicitly scheduled in DDL) | **5+** — MANUAL REVIEW REQUIRED for live `cron.job` list |
| AI features | **9** edge functions, all on one model |
| Realtime-published tables | `messages`, `notifications` (`bookings` was added then dropped for PII) |

This is **not** a small app. It is an enterprise-grade control plane with billing, entitlements, quotas, moderation, audit and webhook subsystems.

## 3. The dependency reality

Every backend capability runs on a **Lovable-managed Supabase project** (`zuwpvevqijwkkucmpkkr`), plus the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev`) for all nine AI features. There is no other server runtime. The frontend is a Vite/React SPA with a `vercel.json` already present, so the frontend is trivially portable; the backend is where all exit risk sits.

Critical single points of failure if credits reach zero or the project is paused:

- Database (130 tables) — application is 100% non-functional
- Auth — no user can sign in (landlord, tenant, operator)
- Storage — 12 buckets of leases, IDs, verification documents, property media inaccessible
- Edge functions — payments, invites, PDFs, emails, webhooks, cron workers all stop
- AI Gateway — nine AI features fail (degrade gracefully only where defaults exist, e.g. maintenance triage)

## 4. Headline finding

**The application is ~85% portable and ~15% Lovable-specific.**

- The Supabase layer (Postgres + RLS + Auth + Storage + Deno functions) is **standard Supabase**, therefore it moves to a self-managed or Supabase-Cloud-hosted project with high fidelity. The migrations directory is a complete, replayable schema definition — this is the single largest de-risking asset the project has.
- The genuinely Lovable-locked components are: the AI Gateway calls (9 files, one model id, ~30 lines each), the managed hosting/preview/publish pipeline, `lovable-tagger` in `vite.config.ts`, and the absence of dashboard-level access to auth config, service-role key and DB password.

## 5. Recommended target (detail in Document 20)

**Supabase Cloud (self-owned project) + Vercel + provider-abstracted AI layer.** Preserves RLS, `auth.uid()`, Deno edge functions, Storage API and Realtime *without rewriting 761 policies and 304 functions*. Estimated migration effort **6–9 engineer-weeks**; a lift-and-shift to Azure/AWS raw Postgres instead costs **20–34 engineer-weeks** because RLS, Auth, Storage, Realtime and 41 Deno functions must each be re-platformed.

## 6. Immediate actions (this week, before any migration)

1. Take a full logical backup (`pg_dump`) and a full Storage mirror — see Document 13, step 0. Backups must exist *before* credits can reach zero; a paused project cannot be exported.
2. Externalise AI calls behind `supabase/functions/_shared/ai-provider.ts` so a provider swap is a one-line env change (Document 8, §5).
3. Capture the Auth user export (`auth.users` incl. `encrypted_password`) — this is the only component with a hard portability cliff if access is lost.
4. Record `SUPABASE_SERVICE_ROLE_KEY` and DB password unavailability as a formal blocker (Document 19, Q1).
