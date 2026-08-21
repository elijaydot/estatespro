# Document 13 — Runbook: Complete Lovable Exit

Target architecture assumed: **self-owned Supabase Cloud project + Vercel + Gemini/OpenAI direct** (Document 20). Steps marked **[BLOCKER]** cannot proceed without resolving Open Question Q1.

Notation: `T-n` = days before cutover. Every step has an owner, a verification, and a rollback.

---

## Step 0 — Standing safety net (do this week, regardless of timeline)

| # | Action | Verify |
|---|---|---|
| 0.1 | **[BLOCKER]** Obtain a database connection string / service-role access, or run Lovable's supported data export (Cloud → Advanced settings → Export data) | A `.dump` file exists in customer-owned storage |
| 0.2 | Take the first full logical backup and storage mirror | Row counts recorded; SHA-256 recorded |
| 0.3 | Enable credit-balance alerting at 40/20/10% | Test alert received |
| 0.4 | Mirror the git repository to a customer-owned remote | Clone from mirror builds successfully |
| 0.5 | Record secret **names and owners** (values are unrecoverable) in a password manager | Document 18 signed off |

Until 0.1–0.2 are complete the business has **no recovery path** from a credit-zero pause.

---

## Phase 1 — Preparation (T-30 → T-21)

| # | Action | Owner | Verify |
|---|---|---|---|
| 1.1 | Create the destination Supabase organisation and two projects (`staging`, `production`), same region (`eu-west-1`) | Platform | Projects reachable; own dashboard access confirmed |
| 1.2 | Create the Vercel project, link the GitHub repo, configure environments | Platform | Preview deploy builds |
| 1.3 | Register the production domain and pre-create DNS records with a **low TTL (300s)** at least 48 h before cutover | Platform | `dig` shows TTL 300 |
| 1.4 | Provision target AI provider account + key with a spend cap | Platform | Test completion returns 200 |
| 1.5 | Re-obtain third-party keys for the new environment: Resend (verify the new sending domain: SPF, DKIM, DMARC), Flutterwave, Paystack, MoMo (test + live) | Integrations | Test transaction and test email succeed |
| 1.6 | Generate new self-issued secrets: `WEBHOOK_WORKER_SECRET`, `SAAS_RENEWALS_CRON_SECRET`, and a **second** `PARTNER_WEBHOOK_SECRET` for the dual-secret window | Security | Stored in the target secret store |
| 1.7 | Notify partner-API customers of the domain change and the webhook signing-secret rotation window | Comms | Acknowledgements logged |
| 1.8 | Freeze non-essential feature work; only migration changes merge to `main` | Eng lead | Branch protection updated |

Rollback: none required (additive only).

---

## Phase 2 — Code de-coupling (T-21 → T-14)

| # | Action | Verify |
|---|---|---|
| 2.1 | Remove `lovable-tagger` from `vite.config.ts` and `devDependencies` | `npm run build` green |
| 2.2 | Add the AI provider shim: `_shared/prompts.ts` + `_shared/ai-provider.ts`; refactor all 9 AI functions; deploy with `AI_PROVIDER=lovable` (zero behaviour change) | `tests/week4/ai-edge-functions.test.ts` passes; all 9 return 200 |
| 2.3 | Parameterise every hardcoded URL (`PUBLIC_APP_URL`, `APP_URL`, `ALLOWED_ORIGINS`) — remove any hardcoded `*.lovable.app` fallbacks | `grep -r "lovable.app" src supabase` returns only comments/docs |
| 2.4 | Add security headers + CSP to `vercel.json` | Header check passes on preview |
| 2.5 | Add a `scripts/backup.sh` and wire the nightly backup job | Backup artifact produced |
| 2.6 | Add CI: lint, typecheck, vitest, `check:contracts`, `check:audit`, gitleaks, bundle-size, `grep service_role dist/` | Pipeline green on a PR |

Rollback: revert the PRs; nothing environmental has changed.

---

## Phase 3 — Staging rehearsal (T-14 → T-7)

| # | Action | Verify |
|---|---|---|
| 3.1 | `supabase db push` all 153 migrations into the staging project | 130 tables, 304 functions, 131 triggers, 761 policies present |
| 3.2 | Diff replayed schema vs live source schema (`migra`) | `drift.sql` empty, or every difference signed off and captured as a new migration |
| 3.3 | Restore an anonymised data subset | Row counts match the subset plan |
| 3.4 | Create the 12 storage buckets with matching visibility and apply bucket policies | Bucket list matches Document 7 |
| 3.5 | Copy a sample of storage objects, preserving keys | Checksums match |
| 3.6 | Set all secrets in staging (test-mode payment keys) | `supabase secrets list` matches Document 18 |
| 3.7 | Deploy all 41 functions | All return 200/expected status on a health probe |
| 3.8 | Recreate cron jobs, **disabled** | `cron.job` rows exist, `active = false` |
| 3.9 | Enable Realtime on `messages`, `notifications` only | Publication verified; `bookings` absent |
| 3.10 | Configure Auth: password policy, leaked-password protection, JWT expiry, redirect allowlist (`/`, `/reset-password`, `/tenant/login`, `/bookings/guest-action`), SMTP + email templates | Reset email received and link works |
| 3.11 | Deploy the SPA to `staging.<domain>` pointed at staging Supabase | App loads, login works |
| 3.12 | Execute the full test battery: `npm run test`, `test:rls`, `WEEK1_SMOKE_TEST_CHECKLIST.md`, payment sandbox round-trip, webhook delivery + DLQ + replay, partner API key/rate-limit/idempotency, tenant invite → portal, lease PDF, guest booking, marketplace public routes, all 9 AI features | Every item green; failures triaged and fixed before Phase 4 |
| 3.13 | Flip staging to `AI_PROVIDER=gemini` (or chosen provider); 48 h shadow comparison on structured outputs | Output shapes stable; no schema breakage |

Rollback: staging only; no production impact. **Do not proceed to Phase 4 until 3.12 is fully green.**

---

## Phase 4 — Production migration (T-1 → T-0)

**T-1 (day before)**

| # | Action | Verify |
|---|---|---|
| 4.1 | Final pre-cutover full backup: DB (schema + data + `auth`) and complete storage mirror | Checksums recorded; test-restore into scratch succeeds |
| 4.2 | Provision production schema in the destination project (migrations only, no data) | Parity checks pass |
| 4.3 | Bulk-copy storage objects (the long pole) — run to completion, leaving only a delta | `failures.jsonl` empty |
| 4.4 | Set production secrets (live payment keys, production AI key, both webhook secrets) | Secret list verified |
| 4.5 | Deploy all 41 functions to production (not yet receiving traffic) | Health probes green |
| 4.6 | Deploy the SPA build to the new host, still on a preview hostname | Loads against production Supabase |
| 4.7 | Customer notice: maintenance window announced | Sent |

**T-0 (cutover window — target 2–4 h)**

| # | Time | Action | Verify / rollback |
|---|---|---|---|
| 4.8 | T+0:00 | Enable maintenance mode on the Lovable app; stop all cron jobs on the source | No new writes observed in `audit_events` |
| 4.9 | T+0:10 | Final delta dump of `public` + `auth` data | Dump completes |
| 4.10 | T+0:30 | Restore delta into production target; run `setval()` on all sequences | Row-count parity, checksum parity (Document 5 §7) |
| 4.11 | T+1:15 | Final storage delta sync | Object-count parity per bucket |
| 4.12 | T+1:30 | Validation gate: RLS isolation tests, financial reconciliation, 5-persona login test, payment round-trip in live mode with a 1-unit transaction (then refunded) | **Any failure = abort, DNS never moved, source unfrozen** |
| 4.13 | T+2:15 | Repoint DNS to the new host; update `ALLOWED_ORIGINS`, `PUBLIC_APP_URL`, `APP_URL`; redeploy functions | New domain serves the app |
| 4.14 | T+2:30 | Update payment-gateway callback/webhook URLs and Resend domain to the new host | Gateway dashboards updated; test callback received |
| 4.15 | T+2:45 | Enable cron jobs on the target | Each job logs one successful run |
| 4.16 | T+3:00 | Disable maintenance mode; announce completion | Synthetics green |
| 4.17 | T+3:15 | Monitor: error rate, payment success rate, login success rate, webhook delivery, AI error codes | 60 min clean before standing down |

Rollback decision point is 4.12. After 4.13, rollback means repointing DNS and replaying the target's delta writes back to the source — costly, so the gate must be strict.

---

## Phase 5 — Post-cutover (T+1 → T+30)

| # | Action |
|---|---|
| 5.1 | Keep the Lovable project alive and **read-only** for 30 days (do not delete) |
| 5.2 | Daily reconciliation of payments, invoices and webhook deliveries for 7 days |
| 5.3 | Retire `LOVABLE_API_KEY`; complete the `PARTNER_WEBHOOK_SECRET` dual-secret window and drop the old secret |
| 5.4 | Land P1 security remediations (Document 11 §8) |
| 5.5 | First monthly restore test on the new platform |
| 5.6 | Remove Lovable-specific references from docs and README |
| 5.7 | Decommission: export final logs, take an archival backup, then close the Lovable project |
| 5.8 | Post-migration review: effort vs estimate, incidents, lessons |

---

## Emergency path (credits at zero / project already paused)

1. Do **not** attempt schema work — a paused project serves nothing.
2. Restore the most recent customer-owned backup (Step 0.2) into a fresh Supabase project.
3. `supabase db push` the 153 migrations if the backup is schema-light; otherwise restore in full.
4. Deploy the 41 functions with re-obtained secrets.
5. Point DNS at an emergency-deployed SPA on Vercel.
6. Accept the data gap between the last backup and the pause; reconcile payments from the gateway dashboards and webhook redelivery.
7. Expected time to service with a current backup: **6–12 h**. Without one: **weeks, with permanent data loss.**
