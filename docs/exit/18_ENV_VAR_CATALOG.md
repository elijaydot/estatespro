# Document 18 — Environment Variable & Secret Catalog

## 1. Frontend build-time variables (`.env`, Vite — bundled into the client, therefore PUBLIC)

| Variable | Current value class | Purpose | Action at migration |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Data API / Auth / Storage endpoint | Replace with the new project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon JWT (public by design) | Client auth to PostgREST; security rests on RLS | Replace with the new anon key |
| `VITE_SUPABASE_PROJECT_ID` | project ref | Used to construct function URLs | Replace |
| `SUPABASE_URL` | duplicate of the above (non-`VITE_`, unused by the client) | legacy | Remove or keep for tooling only |
| `SUPABASE_PUBLISHABLE_KEY` | duplicate | legacy | Remove |

Rule: **never** add a non-publishable value to a `VITE_*` variable — it ships to every browser.

## 2. Backend runtime secrets (edge functions)

| # | Secret | Class | Issuer | Consumers | Migration action |
|---|---|---|---|---|---|
| 1 | `SUPABASE_URL` | Auto-injected | Platform | Nearly all 41 functions | Auto on Supabase target; **manual on Workers/Azure/AWS** |
| 2 | `SUPABASE_ANON_KEY` | Auto-injected, public | Platform | User-context clients in functions | Same |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | **Critical — full RLS bypass** | Platform | Service-role clients (PDFs, invites, MFA, workers, partner API) | New project issues a new value; server-only; never logged |
| 4 | `SUPABASE_DB_URL` | **Critical** | Platform | Direct DB access | New connection string; store in the secret manager only |
| 5 | `SUPABASE_JWKS` | Platform | Platform | JWT verification | Re-provisioned |
| 6 | `SUPABASE_PUBLISHABLE_KEYS` | Platform | Platform | Key rotation support | Re-provisioned |
| 7 | `SUPABASE_SECRET_KEYS` | **Critical** | Platform | Key rotation support | Re-provisioned |
| 8 | `LOVABLE_API_KEY` | AI spend | Lovable | 9 AI functions | **Retire.** Replaced by `AI_PROVIDER` + provider key |
| 9 | `RESEND_API_KEY` | High | Resend | 12 email functions | Rotate; re-verify the sending domain |
| 10 | `PARTNER_WEBHOOK_SECRET` | High, **shared with partners** | Self-issued | `verify-payment`, `dispatch-webhooks` | Dual-secret overlap window, then rotate |
| 11 | `WEBHOOK_WORKER_SECRET` | Medium | Self-issued | `dispatch-webhooks` invocation guard | Regenerate (32+ random chars) |

## 3. Backend configuration variables

| Variable | Type | Purpose | Production value | Notes |
|---|---|---|---|---|
| `APP_URL` | URL | Base app URL for links | New production URL | Must not fall back to a `*.lovable.app` literal |
| `PUBLIC_APP_URL` | URL | Public URL used in invite/lease/booking emails | New production URL | Historically prioritised over editor/dev URLs — keep that precedence |
| `ALLOWED_ORIGINS` | CSV | CORS allowlist in `_shared/security.ts` | New app origins only (prod + staging separately) | Never `*` |
| `REQUIRE_GUEST_SIGNED_REQUESTS` | bool | Enforce signatures on public guest-booking submissions | **`true`** | Fail closed (Document 11 S-1) |
| `REQUIRE_INVITE_SIGNATURE` | bool | Enforce signed invite tokens | **`true`** | Fail closed |
| `REQUIRE_SAAS_CHECKOUT_SIGNATURE` | bool | Enforce signed SaaS checkout requests | **`true`** | Fail closed |
| `ALLOW_SAAS_PAYMENT_TEST_MODE` | bool | Permit `test_mode` on payment verification | **`false`/unset** | Must be hard-disabled in production |
| `SAAS_RENEWALS_CRON_SECRET` | secret | Guards `run-subscription-renewals` | random 32+ | Constant-time comparison |
| `SAAS_BILLING_FALLBACK_EMAIL` | email | Fallback recipient for billing notices | ops address | — |

## 4. Payment gateway credentials

Referenced through the payment functions and `_shared/payment-contract.ts`; per-gateway keys are read from the secret store and/or `payment_settings` configuration.

| Gateway | Needed values | Migration action |
|---|---|---|
| Flutterwave | public key, secret key, encryption key, webhook hash | Re-issue for the new domain; update callback + webhook URLs in the dashboard |
| Paystack | public key, secret key, webhook signature secret | Same |
| MTN MoMo | subscription key, API user, API key, target environment | Same; MoMo re-approval can be slow — start at Week 0 |

**MANUAL REVIEW REQUIRED**: confirm which of these live in the secret store versus the `usePaymentSettings`/company-settings tables, since per-company gateway credentials stored in the database migrate with the data, whereas platform-level keys must be re-set as secrets.

## 5. New variables to introduce during migration

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `lovable` \| `gemini` \| `openai` \| `azure` \| `anthropic` |
| `AI_MODEL` | Target model id |
| `AI_FALLBACK_PROVIDER` | Automatic failover on 5xx |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_DEPLOYMENT` / `ANTHROPIC_API_KEY` | Provider credential (whichever is selected) |
| `SENTRY_DSN` (frontend + functions) | Error tracking |
| `DEPLOY_ENV` | `development` \| `staging` \| `production`; drives fail-closed assertions |
| `RATE_LIMIT_BACKEND` + `REDIS_URL` | Distributed rate limiting (replaces in-memory) |
| `BACKUP_BUCKET_URL` + credentials | Automated backups |

## 6. Per-environment matrix

| Variable | dev | staging | production |
|---|---|---|---|
| `VITE_SUPABASE_URL` | local `supabase start` | staging project | production project |
| `ALLOWED_ORIGINS` | `http://localhost:8080` | `https://staging.<domain>` | `https://<domain>` |
| Payment keys | sandbox | sandbox | **live** |
| `ALLOW_SAAS_PAYMENT_TEST_MODE` | true | true | **false** |
| `REQUIRE_*_SIGNATURE` | false (dev only) | **true** | **true** |
| `AI_PROVIDER` | chosen provider, low cap | chosen provider | chosen provider |
| `RESEND_API_KEY` | test domain | test domain | verified production domain |
| `SENTRY_DSN` | unset | staging DSN | production DSN |

## 7. Handling rules

1. Secret **values are not exportable** from the Lovable secret store — only names are known. Every value must be re-obtained from its issuer or regenerated. Plan for this in Week 0 (Document 14, A5).
2. Rotate 100% of secrets at cutover; treat any value that existed on the old platform as burned.
3. Never place a secret in `VITE_*`, in git, or in an edge-function log line.
4. Store the catalog (names, owners, issuers, rotation dates — **no values**) in the team password manager.
5. Add automated checks in CI: gitleaks; `grep -r "service_role" dist/` must return nothing; assert the fail-closed toggles for `DEPLOY_ENV=production`.
