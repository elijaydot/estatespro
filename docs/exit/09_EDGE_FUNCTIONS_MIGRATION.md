# Document 9 — Edge Functions Migration Guide

## 1. Complete function inventory (41)

Runtime: Supabase Edge Runtime (Deno). Config: `supabase/config.toml`. Convention: `verify_jwt = false` at platform level with **in-code JWT validation** (`auth.getClaims(token)` / `auth.getUser(token)`), except `evaluate-operational-alerts` (`verify_jwt = true`).

Shared modules (`supabase/functions/_shared/`): `security.ts` (CORS allowlist from `ALLOWED_ORIGINS`, preflight handler, in-memory sliding-window rate limiter, `idempotency-key` in allowed headers), `saas-quota.ts` (`enforceAiCreditQuota`, usage metering), `payment-contract.ts` (gateway request/response contracts).

| # | Function | Trigger | Key inputs | Key outputs | Secrets used | External deps |
|---|---|---|---|---|---|---|
| 1 | `ai-chat` | client invoke | messages | text | `LOVABLE_API_KEY`, `SUPABASE_*` | AI Gateway |
| 2 | `ai-tenant-chatbot` | client invoke (tenant) | question, context | text | same | AI Gateway |
| 3 | `ai-smart-search` | client invoke | query | markdown | same | AI Gateway |
| 4 | `ai-suggest-reply` | client invoke | messages, tenantName | `{suggestions[]}` | same | AI Gateway |
| 5 | `ai-maintenance-triage` | client invoke | title, description, category | triage object | same | AI Gateway |
| 6 | `ai-generate-description` | client invoke | type, data | description text | same | AI Gateway |
| 7 | `ai-financial-insights` | client invoke | period, company | JSON insights | same | AI Gateway |
| 8 | `ai-predictive-analytics` | client invoke | horizon, company | JSON forecast | same | AI Gateway |
| 9 | `ai-document-intelligence` | client invoke | document ref/text | JSON extraction | same | AI Gateway |
| 10 | `payment-checkout` | client invoke | source, paymentMethod, amount, currency, gateway, callbackUrl, correlationId | `{success, checkoutUrl, reference, gateway, invoiceId, correlationId}` | gateway keys, `SUPABASE_*` | Flutterwave / Paystack / MoMo |
| 11 | `verify-payment` | client invoke + gateway callback | gateway, reference, bookingToken\|invoiceId, correlationId, test_mode | `{success, verified, source, paymentId, alreadyProcessed, amount}`; emits `payment.verified` webhook `v1.0` | gateway keys, `PARTNER_WEBHOOK_SECRET` | payment gateways |
| 12 | `send-payment-confirmation` | post-payment | payment id | email sent | `RESEND_API_KEY` | Resend |
| 13 | `saas-subscription-checkout` | client invoke | plan/addon selection | checkout URL | gateway keys, `REQUIRE_SAAS_CHECKOUT_SIGNATURE`, `ALLOW_SAAS_PAYMENT_TEST_MODE` | gateways |
| 14 | `saas-verify-subscription-payment` | callback | reference | subscription activated | gateway keys | gateways |
| 15 | `run-subscription-renewals` | cron/HTTP + secret | none | renewals processed | `SAAS_RENEWALS_CRON_SECRET`, `SAAS_BILLING_FALLBACK_EMAIL`, `RESEND_API_KEY` | gateways, Resend |
| 16 | `check-trial-expirations` | cron | none | trials flagged | `SUPABASE_SERVICE_ROLE_KEY` | — |
| 17 | `send-trial-expiry-notice` | invoked by #16 | company/user | email | `RESEND_API_KEY` | Resend |
| 18 | `check-lease-renewals` | cron (60-day window) | none | renewal notices | `RESEND_API_KEY` | Resend |
| 19 | `generate-lease-pdf` | client invoke | lease id | PDF → `lease-documents` | `SUPABASE_SERVICE_ROLE_KEY` | Storage |
| 20 | `generate-invoice-pdf` | client invoke | invoice id | PDF → storage / stream | service role | Storage |
| 21 | `send-lease-email` | client invoke | lease id, recipient | email + PDF link | `RESEND_API_KEY`, `PUBLIC_APP_URL` | Resend |
| 22 | `send-tenant-invite` | client invoke | tenant, email | invite email + token | `RESEND_API_KEY`, `PUBLIC_APP_URL`, `REQUIRE_INVITE_SIGNATURE` | Resend |
| 23 | `accept-tenant-invite` | public (token) | invite token, password | tenant account linked | service role | — |
| 24 | `invite-token` | public (token) | token | validation result | service role | — |
| 25 | `send-maintenance-notification` | trigger/client | request id | email/notification | `RESEND_API_KEY` | Resend |
| 26 | `send-exit-summary` | client invoke | exit id | summary email | `RESEND_API_KEY` | Resend |
| 27 | `send-broadcast` | client invoke | audience scope, message | fanout notifications/emails | `RESEND_API_KEY` | Resend |
| 28 | `process-scheduled-messages` | cron | none | scheduled messages dispatched | service role | — |
| 29 | `guest-booking` | **public, unauthenticated** | property, dates, guest details | booking created (conflict-checked) | `REQUIRE_GUEST_SIGNED_REQUESTS` | — |
| 30 | `shortlet-booking-email` | invoked/token | booking id, action token | guest emails, payment link | `RESEND_API_KEY`, `PUBLIC_APP_URL` | Resend |
| 31 | `marketplace-public` | **public** | filters, slug | listings JSON | anon key | — |
| 32 | `marketplace-inquiry` | **public** + `idempotency-key` | listing, contact, message | inquiry created | anon/service | — |
| 33 | `evaluate-operational-alerts` | cron (`verify_jwt = true`) | company (nullable) | alerts raised | service role | — |
| 34 | `dispatch-webhooks` | cron/HTTP + secret | none | delivery attempts, dead letters | `WEBHOOK_WORKER_SECRET`, `PARTNER_WEBHOOK_SECRET` | customer endpoints |
| 35 | `api-keys` | authenticated | create/revoke/list | API key material (hashed at rest) | service role | — |
| 36 | `fishgate-api` | **public partner API** (API key auth) | REST paths per `public/openapi.json` | JSON | service role | — |
| 37 | `mfa-setup` | authenticated | none | TOTP secret + QR payload | service role | — |
| 38 | `mfa-enable` | authenticated | code | MFA enabled + recovery codes | service role | — |
| 39 | `mfa-verify` | authenticated | code / recovery code | verification result | service role | — |
| 40 | `mfa-disable` | authenticated (step-up) | code | MFA disabled | service role | — |
| 41 | `mfa-regenerate-codes` | authenticated (step-up) | code | new recovery codes | service role | — |

Environment variables consumed across all functions: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `APP_URL`, `PUBLIC_APP_URL`, `ALLOWED_ORIGINS`, `WEBHOOK_WORKER_SECRET`, `PARTNER_WEBHOOK_SECRET` (referenced via secret store), `SAAS_RENEWALS_CRON_SECRET`, `SAAS_BILLING_FALLBACK_EMAIL`, `ALLOW_SAAS_PAYMENT_TEST_MODE`, `REQUIRE_GUEST_SIGNED_REQUESTS`, `REQUIRE_INVITE_SIGNATURE`, `REQUIRE_SAAS_CHECKOUT_SIGNATURE`. Full catalog: Document 18.

## 2. Runtime characteristics to preserve

1. **Deno + Web-standard APIs**: `Deno.serve`/`serve` from `deno.land/std@0.168.0`, global `fetch`, `crypto.subtle` (HMAC signing for webhooks/invite signatures), `Request`/`Response`.
2. **Imports**: `https://esm.sh/@supabase/supabase-js@2` and `npm:@supabase/supabase-js@2/cors`.
3. **In-memory rate limiting** — per-isolate, therefore approximate. On any platform with more isolates this weakens further; migration is the right moment to move it to Redis/Upstash or a `api_rate_limit_windows`-backed DB limiter (the table already exists).
4. **CORS allowlist** driven by `ALLOWED_ORIGINS` — must be updated to the new domain at cutover.
5. **Cold-start sensitivity**: payment callbacks and the partner API are latency-visible.

## 3. Target options

### Option A — Supabase Edge Functions on the self-owned project *(recommended)*
- **Source mapping**: 1:1, files unchanged, `supabase/config.toml` unchanged.
- **Deployment**: `supabase functions deploy <name> --project-ref <new-ref>` (or all, in CI).
- **Env mapping**: `supabase secrets set` per Document 18; `SUPABASE_*` are auto-injected.
- **Effort**: **1–2 days for all 41.**
- **Caveat**: same vendor class; mitigated by owning the project.

### Option B — Deno Deploy
- Near-identical runtime; requires an entry router (`main.ts` dispatching by path) or one project per function.
- Supabase client works unchanged; secrets via Deno Deploy env.
- Effort: 1–2 weeks. Good "keep Deno, leave Supabase functions" middle path.

### Option C — Cloudflare Workers
- **Runtime**: V8 isolates, not Deno. `Deno.env.get(x)` → `env.X`; `serve(handler)` → `export default { fetch }`; `deno.land`/`esm.sh` imports → npm + bundler (Wrangler/esbuild).
- Per-function mechanical change ≈ 20–40 lines; 41 functions ≈ **3–4 weeks** including tests.
- **Wins**: best cold start, global edge, Durable Objects give a *correct* distributed rate limiter, native R2/Queues (Queues would materially improve `dispatch-webhooks`).
- **Watch**: CPU-time limits on PDF generation (`generate-lease-pdf`, `generate-invoice-pdf`) — may need to move those two to a Node service.

### Option D — Azure Functions
- **Runtime**: Node 20 (TypeScript). Rewrite `serve` → `app.http(...)`; `Deno.env` → `process.env`; esm.sh → npm.
- Timer triggers replace pg_cron for the 6 worker functions — a genuine improvement in observability.
- Effort: **4–6 weeks** for 41 functions incl. tests and pipelines.
- **Wins**: App Insights, VNet integration, Key Vault, managed identity, Durable Functions for the webhook retry state machine.

### Option E — AWS Lambda (+ API Gateway / Function URLs)
- Same rewrite class as D. EventBridge Scheduler for cron, SQS for webhook dispatch/DLQ (maps beautifully onto `webhook_dead_letters`), Secrets Manager for env.
- Effort: 4–6 weeks.

### Option F — Single Node.js API server (Fastify/Nest on containers)
- Consolidates all 41 into one deployable; simplest local dev and debugging; no cold starts.
- Effort: 5–7 weeks; adds always-on hosting cost and scaling responsibility.
- Attractive if the team is Node-centric and wants one runtime rather than 41 functions.

### Comparison

| | A Supabase | B Deno Deploy | C Workers | D Azure Fn | E Lambda | F Node server |
|---|---|---|---|---|---|---|
| Code rewrite | **None** | Minimal | Medium | High | High | High |
| Effort (41 fns) | **1–2 d** | 1–2 wk | 3–4 wk | 4–6 wk | 4–6 wk | 5–7 wk |
| Cron story | pg_cron | Cron triggers | Cron triggers | Timer trigger | EventBridge | node-cron/K8s CronJob |
| Queue/DLQ for webhooks | DB tables (current) | DB tables | Queues | Storage Queues | **SQS+DLQ** | BullMQ |
| Observability | Basic logs | Basic | Good | **Excellent** | Excellent | Own stack |
| Cold start | Good | Good | **Best** | Medium | Medium | None |

## 4. Deployment configuration (per option)

- **A**: GitHub Action → `supabase functions deploy --project-ref $REF` on merge to `main`; secrets via `supabase secrets set --env-file`.
- **C**: `wrangler.toml` per function or one Worker with a router; `wrangler deploy`; secrets via `wrangler secret put`.
- **D**: `host.json` + `function.json`/v4 programming model; Bicep/Terraform for the Function App; app settings sourced from Key Vault references.
- **E**: SAM/CDK template; Function URLs for public endpoints (`guest-booking`, `marketplace-public`, `marketplace-inquiry`, `fishgate-api`), API Gateway with WAF in front of the partner API.

## 5. Environment variable mapping

| Current (Deno) | Workers | Azure Functions | Lambda |
|---|---|---|---|
| `Deno.env.get("X")` | `env.X` (binding) | `process.env.X` (App Setting / Key Vault ref) | `process.env.X` (Secrets Manager) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | manual bindings — **no longer auto-injected** | manual | manual |
| `LOVABLE_API_KEY` | replaced by `AI_PROVIDER` + provider key (Document 8) | same | same |

Non-obvious trap: outside Supabase, `SUPABASE_*` are no longer auto-provided. Every function that constructs a Supabase client must have all three values explicitly configured, and the service-role value must be scoped to server-only secret stores.

## 6. Migration validation

- [ ] All 41 deploy successfully to the target
- [ ] `npm run check:contracts` and `tests/week2/payment-*.test.ts` pass
- [ ] `payment-checkout` → gateway sandbox → `verify-payment` round-trip, incl. idempotent replay (`alreadyProcessed: true`)
- [ ] Webhook: event → `dispatch-webhooks` → signed delivery → forced failure → `webhook_delivery_attempts` retry → `webhook_dead_letters` → manual replay (`docs/ops/WEBHOOK_STAGING_TEST_README.md`)
- [ ] Partner API: key issue → authorised call → rate-limit 429 → idempotency replay (`tests/week4/fishgate-api-*.test.ts`)
- [ ] Tenant invite → accept → portal login
- [ ] Lease PDF and invoice PDF generation under the target's CPU/time limits
- [ ] All six scheduled workers fire on schedule in the target scheduler
- [ ] CORS: allowed origin passes, disallowed origin blocked, `idempotency-key` accepted on preflight
