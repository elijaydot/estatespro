# Document 14 — Step-by-Step Migration Execution Plan

Nine workstreams, sequenced across a 9-week plan (recommended target). Each task carries: ID, description, owner role, dependency, exit criterion.

## Workstream A — Governance & prerequisites (Week 0–1)

| ID | Task | Owner | Depends | Exit criterion |
|---|---|---|---|---|
| A1 | Approve target architecture (Document 20) | Sponsor | — | Signed decision record |
| A2 | Resolve credentials blocker Q1 (DB access / export path) | Sponsor + Platform | A1 | Dump obtained |
| A3 | Stand up backup automation on the source | DevOps | A2 | Nightly artifact + restore test |
| A4 | Provision destination org, projects, Vercel, DNS, AI account | Platform | A1 | All reachable |
| A5 | Re-obtain third-party credentials (Resend, 3 payment gateways) | Integrations | A4 | Test transaction + test email pass |
| A6 | Partner and customer comms plan | Comms | A1 | Schedule approved |
| A7 | Freeze feature work | Eng lead | A1 | Branch protection in place |

## Workstream B — Code de-coupling (Week 1–2)

| ID | Task | Exit criterion |
|---|---|---|
| B1 | Remove `lovable-tagger`; clean `vite.config.ts` | Build green |
| B2 | Extract 9 AI prompts to `_shared/prompts.ts` | Prompts centralised, tests pass |
| B3 | Implement `_shared/ai-provider.ts` (5 adapters, normalised tool output, preserved 402/429 semantics) | Unit tests per adapter |
| B4 | Refactor 9 AI functions onto the shim | `tests/week4/ai-edge-functions.test.ts` green |
| B5 | Parameterise all URLs/origins | No `lovable.app` literals in `src/`, `supabase/functions/` |
| B6 | Fail-closed security toggles (Document 11 S-1/S-2) | Contract tests assert prod behaviour |
| B7 | Security headers + CSP in `vercel.json` | Header scan clean |
| B8 | CI pipeline (lint, typecheck, tests, contracts, audit, gitleaks, bundle, service-role scan) | Pipeline green on PR |

## Workstream C — Database (Week 2–5)

| ID | Task | Exit criterion |
|---|---|---|
| C1 | Replay 153 migrations into staging | 130 tables / 304 fns / 131 triggers / 761 policies |
| C2 | Schema drift diff vs live source | `drift.sql` empty or signed off + captured as a new migration |
| C3 | RLS + GRANT coverage audit on all tables (Document 11 D-1) | Zero uncovered tables |
| C4 | SECURITY DEFINER / `anon` EXECUTE audit (DB-1) | Every entry justified |
| C5 | Data-load tooling + FK-ordered restore scripts | Full restore into staging succeeds |
| C6 | Validation harness (row counts, checksums, sequences, orphans, financial sums) | Automated report generated |
| C7 | Recreate cron jobs (disabled) | `cron.job` parity |
| C8 | Realtime publication parity (`messages`, `notifications` only) | Verified |
| C9 | Production dry-run restore, timed | Restore duration measured for the cutover plan |

## Workstream D — Authentication (Week 3–4)

| ID | Task | Exit criterion |
|---|---|---|
| D1 | Dump and restore `auth.users`, `auth.identities`, `auth.mfa_factors` | User count parity; password login works for a test user |
| D2 | Re-create Auth settings (policy, expiry, leaked-password protection, redirect allowlist) | Checklist signed |
| D3 | SMTP + email templates on the target | Reset, invite, confirmation emails received and correctly branded |
| D4 | 5-persona auth test matrix (landlord, PM, tenant, guest, operator) | All pass incl. role resolution and company scoping |
| D5 | MFA verification: enrol, challenge, recovery code, trusted device, step-up, impersonation timebox | All pass |

## Workstream E — Storage (Week 3–6)

| ID | Task | Exit criterion |
|---|---|---|
| E1 | Create 12 buckets with matching visibility, size and MIME limits | Config parity |
| E2 | Apply bucket RLS policies | Cross-tenant access denied on all 9 private buckets |
| E3 | Build the enumerate/transfer/reconcile tooling | Manifest + failure loop working |
| E4 | Bulk copy (production) | Object-count and checksum parity |
| E5 | Delta sync procedure rehearsed and timed | Delta duration measured |
| E6 | Signed-URL behaviour verified (TTL, expiry, denial) | Pass |

## Workstream F — Edge functions (Week 4–6)

| ID | Task | Exit criterion |
|---|---|---|
| F1 | Deploy all 41 to staging | Health probes green |
| F2 | Secret parity per Document 18 | `secrets list` matches |
| F3 | Payment round-trip (sandbox), incl. idempotent replay | `alreadyProcessed: true` on replay |
| F4 | Webhook lifecycle: deliver → fail → retry → dead letter → replay | Per `docs/ops/WEBHOOK_STAGING_TEST_README.md` |
| F5 | Partner API: key issue → call → 429 → idempotency | `tests/week4/fishgate-api-*.test.ts` green |
| F6 | Invite, PDF, email and booking flows | All green |
| F7 | Six scheduled workers execute on schedule | One successful run each |
| F8 | CORS and `idempotency-key` preflight | Allowed origin passes, others blocked |

## Workstream G — AI (Week 5–6)

| ID | Task | Exit criterion |
|---|---|---|
| G1 | Provider key + spend cap | Test call 200 |
| G2 | Golden-output fixtures (3 per function) | Shape assertions pass |
| G3 | 48 h shadow comparison on structured functions | No shape regressions |
| G4 | Flip `AI_PROVIDER`; monitor error rate, p95 latency, cost | 7-day clean run |

## Workstream H — Cutover (Week 7)

Executes Document 13 Phase 4 verbatim. Exit criterion: validation gate 4.12 green, DNS moved, 60 min clean monitoring.

## Workstream I — Stabilisation & decommission (Week 8–9)

| ID | Task | Exit criterion |
|---|---|---|
| I1 | Daily payment/webhook reconciliation for 7 days | Zero unexplained deltas |
| I2 | P1 security remediations (Document 11 §8) | Items closed |
| I3 | Observability live: Sentry, synthetics, alerts | Alerts firing in test |
| I4 | First restore test on the new platform | Documented |
| I5 | Retire `LOVABLE_API_KEY`; close the webhook secret rotation window | Old secrets revoked |
| I6 | Archive and close the Lovable project (after T+30) | Final backup stored |
| I7 | Post-migration review | Report published |

## Gantt (weeks)

```text
W0  W1  W2  W3  W4  W5  W6  W7  W8  W9
A===A
    B===B===B
        C===C===C===C
            D===D
            E===E===E===E
                F===F===F
                    G===G
                            H
                                I===I
```

## Go / No-Go criteria for cutover

1. Staging test battery 100% green (C6, D4, D5, E6, F3–F8, G3)
2. Pre-cutover backup taken **and test-restored**
3. Rollback rehearsed and timed
4. Third-party credentials live-verified
5. Partner customers notified ≥7 days prior
6. On-call roster staffed for the window and 48 h after
7. Sponsor sign-off recorded
