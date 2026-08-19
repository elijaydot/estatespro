# Document 3 — Dependency Inventory & Dependency Matrix

Criticality: **C1** = app dead without it · **C2** = major feature loss · **C3** = degraded · **C4** = cosmetic.
Complexity / Difficulty / Risk: Low · Medium · High.

## 1. Platform dependency matrix

| # | Dependency | Purpose | Criticality | Replacement complexity | Migration difficulty | Risk |
|---|---|---|---|---|---|---|
| 1 | Lovable-managed **Postgres** (`zuwpvevqijwkkucmpkkr`) | All application data: 130 tables, 304 fns, 131 triggers, 761 policies | C1 | Medium (any Postgres 15+ with `pgcrypto`, `pg_cron`, `pg_net`) | Medium — schema replays from migrations; data needs dump/restore | **High** (no DB password / service-role key available today) |
| 2 | **PostgREST Data API** | Browser talks to DB directly; RLS is the authz boundary | C1 | High if leaving Supabase (must hand-write a REST/GraphQL tier for ~130 tables) | High off-Supabase / Low on Supabase | High |
| 3 | **Supabase Auth (GoTrue)** | All 5 personas' sign-in, password reset, native TOTP MFA, JWT issuance consumed by RLS `auth.uid()` | C1 | High off-Supabase (JWT claim shape is baked into 761 policies) | High — password hashes only migrate to a bcrypt-compatible IdP | **High** |
| 4 | **Supabase Storage** | 12 buckets: leases, signatures, ID/verification docs, property images, maintenance photos, message and CRM attachments | C1 | Medium (S3-compatible targets exist) | Medium — object copy + path-policy rewrite + signed-URL code change | Medium |
| 5 | **Supabase Realtime** | Live messaging + notifications (`messages`, `notifications`) | C2 | Medium (Ably/Pusher/socket server, or keep Supabase) | Medium | Medium |
| 6 | **Supabase Edge Runtime (Deno)** | 41 functions: payments, invites, PDFs, email, webhooks, AI, cron workers, partner API | C1 | Medium (Deno Deploy / Cloudflare Workers / Node rewrite) | Medium–High (Node rewrite touches `Deno.env`, `serve`, `npm:`/`esm.sh` imports) | Medium |
| 7 | **pg_cron** in managed DB | 5+ scheduled jobs incl. per-minute impersonation expiry and risk triage | C2 | Low (pg_cron elsewhere, or external scheduler) | Low | Low |
| 8 | **Lovable AI Gateway** `ai.gateway.lovable.dev` | All 9 AI features; sole model `google/gemini-3-flash-preview`; auth via `LOVABLE_API_KEY` | C2 | **Low** (OpenAI-compatible `/v1/chat/completions` shape, incl. tool-calling) | Low — swap base URL, key header, model id | Low |
| 9 | **Lovable hosting / publish pipeline** | Serves `estatespro.lovable.app`, preview URLs, badge, deploy | C1 (delivery) | Low (`vercel.json` already present) | Low | Low |
| 10 | **Lovable Cloud secret store** | Runtime secrets for edge functions (11 configured) | C1 | Low (any platform secret store) | Low — but values must be **re-obtained from source providers**, not exported | Medium |
| 11 | `lovable-tagger` (devDependency, `vite.config.ts`) | Editor component tagging in dev builds only | C4 | Low | Low | Low |
| 12 | Lovable credit balance | Gates build mode, runtime AI, and pauses Cloud services | C1 | n/a — removed by exit | n/a | **High until exit completes** |

## 2. Third-party (non-Lovable) integrations

| Integration | Where | Purpose | Portable? |
|---|---|---|---|
| **Resend** (`RESEND_API_KEY`) | 12 edge functions: `send-tenant-invite`, `send-lease-email`, `send-payment-confirmation`, `send-maintenance-notification`, `send-exit-summary`, `send-trial-expiry-notice`, `send-broadcast`, `shortlet-booking-email`, `check-lease-renewals`, `marketplace-inquiry`, invite/renewal flows | Transactional email | Yes — provider-owned key, unaffected by exit. Domain verification must be re-pointed if the sending domain changes |
| **Flutterwave** | `payment-checkout`, `verify-payment`, `saas-subscription-checkout`, `saas-verify-subscription-payment`, `_shared/payment-contract.ts` | Card/bank checkout + verification | Yes — but **callback/redirect URLs and webhook URLs must be re-registered** at the new domain |
| **Paystack** | same set | Card/bank checkout + verification | Yes — same re-registration caveat |
| **MTN MoMo** | same set | Mobile money (primary in RWF market) | Yes — same caveat |
| **Partner outbound webhooks** | `dispatch-webhooks`, `webhook_endpoints` | Customer-configured HTTP callbacks signed with `PARTNER_WEBHOOK_SECRET` | Yes — consumers see no change if signature secret is preserved |
| **Swagger UI** (`swagger-ui-react`) + `public/openapi.json` | `/api/docs` | Partner API docs | Yes (static) |
| Analytics / APM / error tracking | — | **None found in the codebase** | n/a — see Document 11 §7 (gap) |
| SMS provider | — | **None** — multi-channel SMS/WhatsApp is documented as a future feature only (`FUTURE_FEATURE_MULTI_CHANNEL_MESSAGING.md`) | n/a |

## 3. Frontend package dependencies (runtime)

`@supabase/supabase-js@^2.90` (the only backend-coupled package), `@tanstack/react-query@^5`, `react@18.3`, `react-router-dom@^7.18`, `react-hook-form@^7.61` + `@hookform/resolvers` + `zod@^3.25`, `recharts@^2.15`, `date-fns@^3.6`, `react-markdown@^9` + `remark-gfm` (XSS-hardened rendering of AI output), `qrcode.react` (MFA enrolment QR), `input-otp`, `sonner`, `next-themes`, `swagger-ui-react`, 26 `@radix-ui/*` primitives, `cmdk`, `vaul`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `react-resizable-panels`, `react-day-picker`.

None of these except `@supabase/supabase-js` is affected by a backend migration.

## 4. Backend runtime imports (Deno)

- `https://deno.land/std@0.168.0/http/server.ts` (`serve`) — pinned std; must be replaced if moving to Node.
- `https://esm.sh/@supabase/supabase-js@2` — client inside functions.
- `npm:@supabase/supabase-js@2/cors` in newer functions.
- No other external Deno modules. **Low external surface — good for portability.**

## 5. Dependency graph — what breaks when X fails

| Failure | Immediate blast radius |
|---|---|
| Credits → 0 | Build mode blocked; AI features 402; **Cloud services pause shortly after** → total outage |
| DB paused | Everything, including login (GoTrue stores users in the same Postgres) |
| Auth down | All personas locked out; public marketplace read paths (`marketplace-public`, `guest-booking`, `/rent/*`) survive since they use anon/`verify_jwt=false` |
| Storage down | Lease PDFs, signatures, verification docs, property images, message attachments fail; core CRUD survives |
| Edge functions down | Payments, invites, PDFs, emails, partner API, webhooks, scheduled workers stop; direct PostgREST CRUD survives |
| AI Gateway down | 9 AI features fail; `ai-maintenance-triage` degrades to default priority; others surface error toasts |
| Realtime down | Messaging still works via query refetch; presence and live updates lost |
