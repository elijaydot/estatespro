# Document 5 — Database Migration Guide

## 1. Current database facts

| Attribute | Value |
|---|---|
| Provider | Lovable-managed Supabase (AWS `eu-west-1`, pooler `aws-1-eu-west-1.pooler.supabase.com:6543`) |
| Engine | PostgreSQL (Supabase distribution, PG 15+) |
| Project ref | `zuwpvevqijwkkucmpkkr` |
| Schemas in use | `public` (application), `auth`, `storage`, `realtime`, `supabase_functions`, `vault`, `cron`, `extensions` |
| Public tables | **130** (full list in Document 2 §4 / Document 17) |
| Functions | **304** distinct `public.*` definitions across migrations (many SECURITY DEFINER) |
| Triggers | **131** |
| RLS policies | **761** `CREATE POLICY` statements |
| Views / materialized views | MANUAL REVIEW REQUIRED (live introspection failed; analytics snapshot tables are used in preference to matviews in `20260722213000_phase10_analytics_snapshots_and_drift_checks.sql`) |
| Indexes / constraints | Defined inline in migrations; exact live set MANUAL REVIEW REQUIRED |
| Extensions | `pgcrypto`, `pg_cron`, `pg_net`, `uuid-ossp` (verify live list) |
| Realtime publication | `messages`, `notifications` |
| Row counts / size | MANUAL REVIEW REQUIRED |

### 1.1 Authorisation model (must be preserved verbatim)
- Roles are stored in `public.user_roles` (never on profiles), read through SECURITY DEFINER helpers (`has_role`-style) to avoid RLS recursion.
- RLS strategy is **PERMISSIVE (OR-composed)**; company scoping goes through `company_members` / `property_manager_assignments`.
- Identifier convention: landlords and PMs key off `auth.uid()`; tenants key off `tenants.id`.
- Platform operators are separate (`platform_operator_roles`), with time-boxed impersonation sessions.

Any target that does not evaluate Postgres RLS against a JWT-derived `auth.uid()` requires **re-implementing all 761 policies in application code** — the dominant cost driver in Options B/C/D below.

## 2. Schema documentation strategy

1. `pg_dump --schema-only --no-owner --no-privileges -f schema.sql` (authoritative, includes live drift).
2. Replay `supabase/migrations/*` into an empty Postgres → `schema_replayed.sql`.
3. `migra postgresql://replayed postgresql://live > drift.sql` — **drift.sql must be empty or explicitly signed off**. Any content indicates console-applied changes that are not in the repo.
4. Publish `schema.sql` + `drift.sql` + a generated data dictionary (`\d+` per table) as Appendix A.

## 3. ERD specification

Produce with `schemacrawler` or `pg_dump | sql2dbml`, partitioned into 9 subject-area diagrams (a single 130-table ERD is unreadable):

| Diagram | Root entities |
|---|---|
| ERD-1 Identity & tenancy | `profiles`, `user_roles`, `companies`, `company_members`, `property_manager_assignments`, `user_mfa`, `security_recovery_codes` |
| ERD-2 Portfolio | `properties`, `units`, `listing_media`, `company_settings` |
| ERD-3 Leasing | `tenants`, `leases`, `lease_templates`, `lease_attachments`, `lease_inventory_snapshots/_items`, `tenant_invites`, `tenant_exits`, `exit_inspection_items`, `default_inspection_checklist` |
| ERD-4 Financials | `invoices`, `payments`, `recurring_bills`, `vendor_payments`, `vendors`, `vendor_documents` |
| ERD-5 Operations | `maintenance_requests`, `bookings`, `operational_alerts`, `alert_thresholds`, `reports` |
| ERD-6 Communication | `messages`, `message_attachments`, `message_drafts`, `message_presence`, `scheduled_messages`, `broadcasts`, `notifications` |
| ERD-7 Marketplace & trust | `marketplace_listings`, `listing_publish_history`, `listing_search_index`, `marketplace_inquiries`, `publisher_verifications(+_audit)`, `verification_documents`, `moderation_cases/_actions`, `risk_decisions`, `abuse_signals`, `marketplace_trust_config` |
| ERD-8 CRM | `leads` + `lead_*` (4), `crm_*` (15) |
| ERD-9 SaaS billing & control plane | `saas_*` (30), `owner_billing_group*` (2), `entitlement_decisions`, `usage_snapshots`, `platform_*` (13), `governance_alerts`, `api_*` (4), `webhook_*` (4), `audit_events`, `platform_audit_events`, `security_audit_events` |

Every diagram must annotate: RLS policy count per table, whether the table is Realtime-published, and its retention class (Document 12 §4).

## 4. Migration script generation plan

```text
step 1  target provisioning        → empty Postgres 15, extensions enabled
step 2  roles                      → anon, authenticated, service_role, authenticator (Supabase-compatible),
                                     or target-equivalent roles if leaving Supabase
step 3  schema                     → psql -f schema.sql   (or supabase db push with the 153 migrations)
step 4  grants                     → verify GRANT block exists per public table (project convention)
step 5  auth schema + data         → restore auth.users / identities BEFORE public data (FK + RLS references)
step 6  public data                → pg_restore --data-only --disable-triggers, ordered by FK depth
step 7  storage schema + objects   → storage.buckets/objects rows, then binary mirror (Document 7)
step 8  sequences                  → SELECT setval() for every serial/identity column
step 9  extensions state           → recreate cron.job entries (kept DISABLED until cutover)
step 10 publication                → ALTER PUBLICATION supabase_realtime ADD TABLE messages, notifications
step 11 validation                 → Document 5 §7
```

Automation: keep `supabase db push` as the primary path (the 153 migrations are idempotent-ordered), and use `pg_restore` only for data. Do **not** hand-edit migration files during migration — drift is tracked in `drift.sql` and applied as a new, dated migration.

## 5. Backup procedures

| Backup | Tool | Frequency | Retention | Location |
|---|---|---|---|---|
| Logical full | `pg_dump -Fc` | Daily 02:00 UTC | 30 days | Customer-owned object storage, versioned + encrypted |
| Logical schema-only | `pg_dump --schema-only` | On every deploy | 90 days | Same, alongside the release tag |
| PITR / WAL | Provider-native (Supabase Pro PITR, Azure/AWS automated backups) | Continuous | 7–35 days | Provider |
| Auth subset (`auth.*`) | `pg_dump -n auth` | Daily | 30 days, **encrypted, restricted access** | Separate bucket with stricter IAM |
| Storage mirror | `scripts/export-all.sh` | Weekly full + daily incremental | 30 days | Second region |
| Pre-cutover freeze backup | All of the above | Once, at T-0 | 1 year | Immutable/WORM bucket |

Every backup run must record: start/end time, byte size, row counts per table, and SHA-256. A backup with no restore test in the last 30 days is treated as no backup.

## 6. Rollback procedures

| Scenario | Rollback |
|---|---|
| Cutover fails during T-0 window | DNS stays on Lovable (never repointed until validation passes); no data loss because source is still authoritative and in read-only freeze |
| Fails after DNS repoint, < RPO | Repoint DNS back, replay writes captured on the target via `audit_events` + `api_request_events` deltas, then re-attempt |
| Fails after DNS repoint, > RPO | Declare incident; restore target from the pre-cutover freeze backup, reconcile manually from `payments`, `saas_subscription_payment_attempts`, `webhook_delivery_attempts` |
| Bad migration on target post-cutover | Forward-fix only, via a new dated migration; restore from PITR only for data-destructive incidents |

Hard rule: **the source project must not be deleted for 30 days after cutover.**

## 7. Data validation strategy

1. **Row parity** — per-table `count(*)` source vs target; zero tolerance.
2. **Checksum parity** — `md5(string_agg(t::text, '|' order by id))` for the 25 highest-value tables (`payments`, `invoices`, `leases`, `tenants`, `saas_company_plan_subscriptions`, `saas_subscription_invoices`, `marketplace_listings`, `user_roles`, `audit_events`, …).
3. **Referential integrity** — `SET CONSTRAINTS ALL IMMEDIATE`; run an orphan-FK sweep.
4. **Sequence parity** — no sequence below `max(id)`.
5. **RLS behavioural parity** — run `tests/week4/cross-tenant-rls.integration.test.ts` and `npm run test:rls` against the target; cross-tenant reads must return zero rows.
6. **Function parity** — 304 functions present, each `prosecdef` flag and `search_path` matching source.
7. **Policy parity** — `select count(*) from pg_policies where schemaname='public'` source vs target.
8. **Financial reconciliation** — sum of `payments.amount` and `saas_subscription_invoices.total` per company must match to the cent.
9. **Application smoke** — `WEEK1_SMOKE_TEST_CHECKLIST.md` executed against the target.

## 8. Target platform options

Assumptions for costing: ~50 GB data, moderate OLTP, 2 environments (prod + staging), EU region, list prices as of 2026 — **all figures indicative, MANUAL REVIEW REQUIRED against current provider pricing and actual usage.**

### Option A — Supabase Cloud (self-owned project) *(recommended)*
- **Cost**: Pro ~$25/mo/project + compute add-on ($10–$110/mo typical) + storage/egress. Two envs ≈ **$70–250/mo**.
- **Operational complexity**: **Lowest.** Zero code changes to RLS, Auth, Storage, Realtime, Deno functions. `supabase db push` replays the 153 migrations directly.
- **Security**: RLS preserved; PITR on Pro; SOC 2; own dashboard access, own service-role key and DB password (resolves blocker Q1 permanently).
- **Scaling**: vertical compute add-ons, read replicas, connection pooler included.
- **Caveat**: still a managed vendor — but one with a documented self-host escape hatch and no credit-based service pausing.

### Option B — Azure Database for PostgreSQL Flexible Server
- **Cost**: GP D2ds_v5 (2 vCPU/8 GB) ≈ $130–170/mo + 50 GB storage ≈ $6 + backups; HA doubles compute. Two envs ≈ **$200–400/mo**.
- **Complexity**: **High.** No GoTrue, no Storage API, no Realtime, no Deno runtime, no PostgREST. Requires: an IdP (Document 6), Azure Blob for storage (Document 7), SignalR/Web PubSub for realtime, Azure Functions for the 41 edge functions (Document 9), **and a bespoke API tier or PostgREST self-host to keep the direct-from-browser data path**.
- **Security**: Entra ID DB auth, Private Link, CMK encryption — strong. But JWT→`auth.uid()` must be re-created (`SET LOCAL request.jwt.claims`) or 761 policies rewritten.
- **Scaling**: excellent; read replicas, autogrow, burstable→GP tiers.
- **Extensions**: `pg_cron` supported (allowlist); **`pg_net` is not** — HTTP-from-DB patterns must move to an external scheduler.

### Option C — AWS RDS / Aurora PostgreSQL
- **Cost**: `db.t4g.medium` Multi-AZ ≈ $120–200/mo; Aurora Serverless v2 from ~$45/mo at low ACUs, scaling higher. Two envs ≈ **$180–450/mo**.
- **Complexity**: **High** — same rebuild list as Option B (Cognito/Auth0 + S3 + AppSync/API Gateway + Lambda).
- **Security**: IAM auth, KMS, VPC isolation, Secrets Manager rotation — strongest enterprise story.
- **Scaling**: best-in-class (Aurora storage autoscaling, read replicas, global database).
- **Extensions**: `pg_cron` supported on RDS/Aurora; **`pg_net` not available** (use `aws_lambda`/EventBridge instead).

### Option D — Self-hosted PostgreSQL (VM/Kubernetes, optionally full self-hosted Supabase)
- **Cost**: 2× 4 vCPU/16 GB VMs + storage + backup target ≈ **$120–300/mo infra**, but **+0.3–0.5 FTE ongoing** for patching, HA, backup verification, on-call.
- **Complexity**: **Highest operationally**, *lowest* code-wise **if you self-host the full Supabase stack** (Docker Compose / Helm: Postgres + GoTrue + PostgREST + Storage + Realtime + Kong + Edge Runtime) — in that variant the application code is unchanged, same as Option A.
- **Security**: fully under your control and fully your responsibility (patching, TLS, secret rotation, backup encryption).
- **Scaling**: manual; needs Patroni/pgBouncer, monitoring, tested failover.

### Decision matrix

| Criterion (weight) | A Supabase Cloud | B Azure | C AWS | D Self-host |
|---|---|---|---|---|
| Migration effort (30%) | 9 | 3 | 3 | 6 |
| Code change required (20%) | 10 | 2 | 2 | 8 |
| Run cost (15%) | 8 | 6 | 6 | 7 |
| Ops burden (15%) | 9 | 6 | 6 | 3 |
| Enterprise/compliance fit (10%) | 7 | 9 | 9 | 6 |
| Vendor independence (10%) | 6 | 8 | 8 | 10 |
| **Weighted score** | **8.6** | **4.7** | **4.7** | **6.4** |

Recommendation: **Option A now**, with Option D (self-hosted Supabase) documented as the standing escape hatch — the same schema and code run on both.
