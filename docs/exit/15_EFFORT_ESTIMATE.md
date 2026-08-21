# Document 15 — Migration Effort Estimate

Basis of estimate: measured artifact counts (130 tables, 304 DB functions, 761 policies, 41 edge functions, 78 pages, 40 hooks, 153 migrations, ~90 test files). Rates assume a senior engineer familiar with Postgres/Supabase/React. Contingency is applied per scenario, not per line.

## 1. Scenario 1 — Supabase Cloud + Vercel *(recommended)*

| Workstream | Person-days | Notes |
|---|---|---|
| A Governance, provisioning, credentials | 5 | Includes re-obtaining 4 provider credentials |
| B Code de-coupling (tagger, AI shim, URLs, headers, CI) | 8 | AI shim ~3 d; CI ~3 d |
| C Database (replay, drift, audits, load tooling, validation) | 12 | RLS/GRANT and SECURITY DEFINER audits are 4 d of this |
| D Authentication (dump/restore, settings, 5-persona matrix, MFA) | 4 | Cheapest path — hashes and TOTP factors move as data |
| E Storage (12 buckets, tooling, bulk + delta, verification) | 6 | Dominated by transfer time, not engineering |
| F Edge functions (deploy 41, secrets, full contract testing) | 8 | Deploy is trivial; testing is the cost |
| G AI provider switch (fixtures, shadow run, flip) | 4 | |
| H Cutover execution + rehearsal | 5 | Two rehearsals + the live window |
| I Stabilisation, reconciliation, decommission | 6 | |
| **Subtotal** | **58 person-days** | |
| Contingency 25% | 15 | |
| **Total** | **≈ 73 person-days ≈ 6–9 calendar weeks** | 2 engineers + 0.2 PM |

Cost at a blended €600/day: **≈ €44,000**. At €400/day: **≈ €29,000**.

## 2. Scenario 2 — Azure (Flexible Server + Functions + Blob + Entra/Auth0)

| Workstream | Person-days |
|---|---|
| Governance + IaC (Bicep, 8 modules) | 15 |
| Database: schema port, extension gaps (`pg_net`), PostgREST replacement or bespoke API tier for ~130 tables | 45 |
| **Rewrite of 761 RLS policies into an application authorisation layer** (or a JWT-claims shim + policy validation) | 40 |
| Authentication (Entra/Auth0, password strategy, shim so `auth.uid()` resolves) | 25 |
| Storage (Blob + SAS broker + `useSignedUrl` rewrite) | 15 |
| Edge functions → Azure Functions (41 × Node rewrite) | 35 |
| Realtime replacement (Web PubSub) | 8 |
| Cron → Timer triggers | 4 |
| AI provider switch | 4 |
| Observability (App Insights, alerts, dashboards) | 8 |
| Test rewrite + full regression | 20 |
| Cutover + stabilisation | 15 |
| **Subtotal** | **234 person-days** |
| Contingency 35% (high unknowns) | 82 |
| **Total** | **≈ 316 person-days ≈ 20–34 calendar weeks** (3–4 engineers) |

Cost at €600/day: **≈ €190,000**.

## 3. Scenario 3 — AWS

Essentially identical to Scenario 2: **≈ 300–330 person-days**, €180,000–200,000. Aurora + Lambda + Cognito/Auth0 + S3 + AppSync/API Gateway. SQS materially improves the webhook subsystem, worth ~5 days saved versus Azure.

## 4. Scenario 4 — Self-hosted Supabase (Docker/Kubernetes)

| Workstream | Person-days |
|---|---|
| Infrastructure (2× VM or K8s, Postgres HA/Patroni, pgBouncer, TLS, backups) | 25 |
| Supabase stack deployment (GoTrue, PostgREST, Storage, Realtime, Kong, Edge Runtime) | 15 |
| Data + auth + storage migration (same as Scenario 1) | 22 |
| Code de-coupling + AI shim | 8 |
| Observability + runbooks + DR rehearsal | 12 |
| Cutover + stabilisation | 10 |
| **Subtotal** | **92** |
| Contingency 30% | 28 |
| **Total** | **≈ 120 person-days ≈ 10–14 weeks**, plus **0.3–0.5 FTE ongoing ops forever** |

## 5. Comparison

| Scenario | Person-days | Calendar | Cost @€600/d | Ongoing ops | Code rewritten |
|---|---|---|---|---|---|
| **1. Supabase Cloud + Vercel** | **73** | **6–9 wk** | **€44k** | ~0.05 FTE | ~2% |
| 2. Azure | 316 | 20–34 wk | €190k | 0.3 FTE | ~60% |
| 3. AWS | 310 | 20–32 wk | €186k | 0.3 FTE | ~60% |
| 4. Self-hosted Supabase | 120 | 10–14 wk | €72k | 0.3–0.5 FTE | ~2% |

## 6. Cost drivers explained

The 4× gap between Scenario 1 and Scenarios 2/3 comes from four irreducible items that only exist when leaving the Supabase primitives:

1. **761 RLS policies** — authorisation currently lives in the database. Off-Supabase, either every policy is re-expressed in an API tier, or a JWT-claims shim must be built and proven safe. Either way it is the largest single item (≈40 days) and the highest-risk (a mistake is a cross-tenant data breach).
2. **PostgREST** — the browser talks to the database directly for ~130 tables. Replacing that with hand-written endpoints is weeks of work with no user-visible benefit.
3. **41 Deno functions → Node** — mechanical but broad, plus test and pipeline rework (≈35 days).
4. **Auth** — password hashes and native MFA factors do not move to a different IdP without user impact (≈25 days plus support load).

## 7. What could make it cheaper or more expensive

Cheaper: fewer environments (not advised); accepting a forced password reset (saves shim work in Scenarios 2/3); skipping the security remediations (not advised).

More expensive: schema drift discovered at C2 (each undocumented live change costs 0.5–2 days); large storage volume extending transfer windows; payment-gateway re-certification requirements; discovery that `pg_net`/`pg_cron` patterns are used more widely than the 5 confirmed jobs (**MANUAL REVIEW REQUIRED** on the live `cron.job` table); regulatory review of the KYC data move.

## 8. Recommended staffing

| Role | Scenario 1 allocation |
|---|---|
| Migration lead / architect | 0.5 FTE × 9 weeks |
| Backend/database engineer | 1.0 FTE × 7 weeks |
| Full-stack engineer (functions, AI shim, CI) | 1.0 FTE × 6 weeks |
| DevOps/SRE | 0.4 FTE × 6 weeks |
| QA | 0.4 FTE × 4 weeks |
| Product/comms | 0.2 FTE × 9 weeks |
