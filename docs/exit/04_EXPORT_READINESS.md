# Document 4 — Export Readiness Assessment

Legend: ✅ fully exportable · ⚠️ partially exportable · ❌ not exportable (must be rebuilt or re-obtained)

## 1. Component-by-component assessment

| Component | Export? | Method | Format | Limitations | Manual steps |
|---|---|---|---|---|---|
| Frontend source | ✅ | GitHub sync / repo clone | Git repo | `lovable-tagger` dev plugin must be dropped | Remove tagger from `vite.config.ts`; set new env vars |
| `supabase/migrations` (153) | ✅ | Already in repo | SQL | Represents intended state; live DB may have drifted via console operations | Diff live schema vs replayed schema (`migra`) |
| Edge function source (41) | ✅ | Already in repo | TypeScript (Deno) | — | Re-deploy to target runtime |
| Table data (130 tables) | ⚠️ | `pg_dump` via pooler connection string, or per-table CSV via Data API | `.sql` / `.csv` | **Requires DB password or service-role key — not available on Lovable Cloud today (blocker Q1)**. Paused project cannot be dumped | Obtain credentials or use Lovable's data-export path; verify row counts |
| DB functions / triggers / policies | ✅ | `pg_dump --schema-only` or replay migrations | SQL | SECURITY DEFINER ownership must be re-established on target | Re-grant, re-own to a dedicated migration role |
| Extensions (`pgcrypto`, `pg_cron`, `pg_net`, `uuid-ossp`) | ⚠️ | Recreate on target | SQL | `pg_cron`/`pg_net` unavailable on some managed Postgres tiers (Azure Flexible Server requires allowlisting; AWS RDS has no `pg_cron` equivalent to Supabase's usage of `pg_net`) | Validate extension availability before target selection |
| pg_cron schedules | ⚠️ | `select * from cron.job` | SQL | Live list unverified — **MANUAL REVIEW REQUIRED** | Re-create jobs post-restore; do not enable until cutover |
| Auth users (`auth.users`) | ⚠️ | `pg_dump -t auth.users` or Admin API `listUsers` | SQL / JSON | Admin API **does not return password hashes**; only a DB dump does. Without hashes every user must reset their password | Decide: dump hashes (preferred) or run a forced password-reset campaign |
| Auth identities / OAuth links | ⚠️ | `auth.identities` dump | SQL | Provider config itself is dashboard-level and not exportable | Re-create providers in target; re-consent may be required |
| Auth MFA factors (`auth.mfa_factors`) | ❌ | — | — | TOTP secrets are not retrievable via API; native factors do not migrate to a different IdP | Users re-enrol MFA post-migration (app-level `user_mfa` table + recovery codes DO export) |
| App-level MFA (`user_mfa`, `security_recovery_codes`) | ✅ | Table dump | SQL | Recovery codes are hashed — fine | none |
| Storage objects (12 buckets) | ⚠️ | Storage API list+download loop (service-role) or S3-compatible mirror | Binary + manifest JSON | Requires service-role key; large media may need multi-day transfer; signed URLs are not transferable | Use `scripts/export-all.sh`; verify checksums and object counts |
| Storage bucket policies | ✅ | In migrations (`bucket_id = '<name>'` RLS) | SQL | Path conventions (`auth.uid()`-prefixed folders) must be preserved exactly | Re-apply after bucket creation |
| Runtime secrets (11) | ❌ | — | — | Values are write-only by design | Re-obtain from source providers (Resend, Flutterwave, Paystack, MoMo); regenerate self-issued ones (`WEBHOOK_WORKER_SECRET`, `PARTNER_WEBHOOK_SECRET`, `SAAS_RENEWALS_CRON_SECRET`) — see Document 18 |
| `SUPABASE_SERVICE_ROLE_KEY`, DB password | ❌ | — | — | Explicitly inaccessible on Lovable Cloud | Escalate as blocker Q1 |
| `LOVABLE_API_KEY` | ❌ (and unnecessary) | — | — | Lovable-issued, useless off-platform | Replace with target AI provider key |
| Realtime publication config | ✅ | Derived from migrations | SQL | — | `ALTER PUBLICATION supabase_realtime ADD TABLE …` for `messages`, `notifications` only |
| Auth email templates / SMTP config | ⚠️ | Dashboard-level | — | Not visible from the repo | **MANUAL REVIEW REQUIRED** — screenshot/copy templates before exit |
| Auth settings (JWT expiry, password policy, leaked-password protection, rate limits) | ⚠️ | Dashboard-level | — | Not in repo | Re-configure manually from Document 6 checklist |
| Custom domain / DNS | ⚠️ | Registrar | — | Published at `estatespro.lovable.app`; no custom domain configured | Register + point DNS at new host during cutover |
| CI workflows (`.github/workflows/*`) | ✅ | Repo | YAML | 3 workflows present (`week1-ci`, `week2-quality`, `rls-isolation`) | Add DB/secret contexts for the new environment |
| Test suite (`tests/week2..4`, ~90 files) | ✅ | Repo | Vitest | Some tests are static-source assertions rather than live-integration | Keep as migration regression gate |
| Docs (`docs/**`, `*.md` runbooks) | ✅ | Repo | Markdown | — | — |
| Analytics history / logs | ❌ | — | — | Lovable/Supabase platform logs are not exportable in bulk | Stand up own logging from day one on the target |

## 2. Export checklist (execution order)

- [ ] **E0** Resolve credentials blocker: obtain DB connection string + service-role key, or Lovable's supported data export.
- [ ] **E1** `pg_dump --schema-only --no-owner --no-privileges` → `schema.sql`; diff against migration replay.
- [ ] **E2** `pg_dump --data-only` per schema (`public`, `auth`, `storage`) → compressed dumps; record row counts per table.
- [ ] **E3** Dump `auth.users`, `auth.identities`, `auth.refresh_tokens`, `auth.mfa_factors` separately, encrypt at rest (contains password hashes).
- [ ] **E4** Mirror all 12 storage buckets with a manifest (`bucket, path, size, etag, content_type, created_at`).
- [ ] **E5** Snapshot `cron.job`, `pg_extension`, `pg_publication_tables`, `pg_roles`, and all `GRANT`s.
- [ ] **E6** Capture Auth dashboard settings + email templates (screenshots + copy).
- [ ] **E7** Inventory secrets by name (Document 18) and open re-issue tickets with each provider.
- [ ] **E8** Export `public/openapi.json` and partner webhook endpoint list (`webhook_endpoints`) for customer comms.
- [ ] **E9** Verify: restore E1+E2 into a scratch Postgres, run `npm run test`, run `tests/week4/cross-tenant-rls.integration.test.ts` against it.
- [ ] **E10** Store all artifacts in a customer-owned bucket with versioning + 90-day retention; record SHA-256 of every file.

## 3. Readiness verdict

| Layer | Readiness |
|---|---|
| Code (frontend, functions, migrations, tests, docs) | **Green — 100% in repo today** |
| Schema | **Green — replayable from 153 migrations** |
| Data | **Amber — blocked on credentials (Q1)** |
| Storage objects | **Amber — blocked on service-role key** |
| Auth users | **Amber — hashes need DB-level dump** |
| Auth MFA factors, secret values, platform logs | **Red — non-exportable by design; plan around them** |
