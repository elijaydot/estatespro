# Document 16 — Risk Register

Score = Likelihood (1–5) × Impact (1–5). ≥15 red, 8–14 amber, ≤7 green.

| ID | Risk | Cat | L | I | Score | Mitigation | Owner | Trigger / early warning |
|---|---|---|---|---|---|---|---|---|
| R01 | **No customer-owned backup exists today**; a credit-zero pause makes data unrecoverable and un-exportable | Continuity | 3 | 5 | **15** | Execute Document 13 Step 0 this week; nightly automated backups + monthly restore tests | Sponsor | Credit balance below 40% |
| R02 | **Service-role key and DB password are inaccessible on Lovable Cloud**, blocking `pg_dump` and storage mirroring | Blocker | 4 | 5 | **20** | Use the supported Cloud data-export path; escalate with Lovable support; do not schedule cutover until resolved | Platform | Q1 unresolved at T-30 |
| R03 | Cross-tenant data leak caused by an RLS gap on the target (761 policies, 130 tables) | Security | 2 | 5 | 10 | Automated coverage audit (C3), `test:rls` in CI, cutover gate 4.12 | Security | Any table without RLS or without a policy |
| R04 | Schema drift: live database contains objects not present in the 153 migrations | Data | 3 | 4 | 12 | `migra` diff at C2; capture drift as a new migration; block on unsigned differences | DB lead | Non-empty `drift.sql` |
| R05 | Payment data loss or double-charge during cutover | Financial | 2 | 5 | 10 | Write freeze, idempotency records, post-cutover reconciliation vs gateway dashboards for 7 days | Finance + Platform | Any mismatch in daily reconciliation |
| R06 | Users locked out because MFA factors or password hashes did not migrate | UX | 2 | 4 | 8 | Choose Option D (Supabase externalised) which preserves both; otherwise run a 3-touch comms campaign | Auth lead | Failed-login spike post-cutover |
| R07 | Storage transfer incomplete or slow; documents 404 after cutover | Data | 3 | 4 | 12 | Manifest-driven reconcile loop, bulk copy at T-1, delta at T-0, dual-read fallback for 2 weeks | Platform | Non-empty `failures.jsonl` |
| R08 | Partner API consumers break on domain and webhook-secret change | Integration | 3 | 3 | 9 | 7-day advance notice, dual-secret overlap window, keep old host resolving for 30 days | Product | Partner support tickets |
| R09 | AI output shape regression after provider switch breaks JSON/tool-call parsers | Functional | 3 | 3 | 9 | Golden fixtures, 48 h shadow run, existing fallback defaults retained | AI owner | Parse-failure rate rises |
| R10 | Extension unavailability (`pg_net`, `pg_cron`) on a non-Supabase target | Technical | 3 | 4 | 12 | Validate extensions before target selection; move DB-initiated HTTP to external schedulers | Architect | Target evaluation |
| R11 | Cutover overruns the maintenance window | Delivery | 3 | 3 | 9 | Two timed rehearsals; hard abort gate at 4.12; storage bulk done at T-1 | Migration lead | Rehearsal exceeds 3 h |
| R12 | Scope creep — feature work continues during migration | Delivery | 4 | 3 | 12 | Feature freeze (A7) with branch protection | Eng lead | Non-migration PRs on `main` |
| R13 | Key-person dependency: single engineer holds the platform context (153 migrations, 41 functions) | Org | 3 | 4 | 12 | Pair on every workstream; this document set as handover; recorded walkthroughs | Sponsor | Single-author commit history |
| R14 | Third-party credential re-issue delays (payment gateway KYC/compliance re-approval on a new domain) | Integration | 3 | 4 | 12 | Start A5 at Week 0; gateways can take weeks to approve a new callback domain | Integrations | No sandbox transaction by T-14 |
| R15 | Secrets leak during migration (values handled manually, dumps contain password hashes) | Security | 2 | 5 | 10 | Encrypted transport and storage; restricted bucket for the `auth` dump; rotate everything at cutover; gitleaks in CI | Security | Any secret in git history |
| R16 | Cost overrun on the new platform versus expectation | Financial | 3 | 2 | 6 | Budget alerts, AI spend caps, right-sized compute, monthly review | Finance | Spend >120% of forecast |
| R17 | Regulatory exposure moving KYC/tenant PII between processors without DPIA or processor agreements | Compliance | 3 | 4 | 12 | Legal review before data movement; DPIA; processor agreements with each new vendor | Legal | Data movement scheduled without sign-off |
| R18 | Rollback after DNS repoint causes split-brain writes across two live databases | Data | 2 | 5 | 10 | Rollback only permitted before 4.13; after that, forward-fix; source stays read-only | Migration lead | Any write observed on the source post-cutover |
| R19 | Undiscovered pg_cron jobs or triggers fail silently on the target | Operational | 3 | 3 | 9 | Live `cron.job` snapshot (currently MANUAL REVIEW REQUIRED); heartbeat monitoring on every job | DevOps | Missed heartbeat |
| R20 | Test suite gives false confidence (many tests assert source text, not live behaviour) | Quality | 3 | 3 | 9 | Add live integration tests against staging; rely on the smoke checklist and RLS integration tests for the gate | QA | Green tests with failing smoke |
| R21 | Lovable credits are exhausted mid-migration, pausing the source before cutover | Continuity | 2 | 5 | 10 | Maintain a 30-day credit floor; backups current at all times; emergency path in Document 13 | Sponsor | Balance below 20% |
| R22 | Email deliverability drops after moving the sending domain (SPF/DKIM/DMARC) | Operational | 3 | 3 | 9 | Warm the new domain, verify DNS records at T-14, monitor bounce rates | Integrations | Bounce rate rises post-cutover |

## Top 5 by score

1. **R02 (20)** — inaccessible DB credentials. *Nothing else can be scheduled until this is resolved.*
2. **R01 (15)** — no customer-owned backup.
3. **R04, R07, R10, R12, R13, R14, R17 (12)** — drift, storage transfer, extensions, scope, key person, credential lead times, compliance.
4. **R03, R05, R15, R18, R21 (10)** — security and data-integrity risks concentrated at the cutover.
5. **R08, R09, R11, R19, R20, R22 (9)** — integration and quality risks, all manageable with the rehearsal plan.

## Review cadence

Weekly during migration (migration lead chairs), with R01/R02 reported to the sponsor until closed. Any new risk scoring ≥12 requires a documented mitigation before the next gate.
