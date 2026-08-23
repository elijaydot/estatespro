# Document 19 — Open Questions and Assumptions

## Open Questions

| ID | Question | Why it matters | Action / owner | Due |
|---|---|---|---|---|
| **Q1** | How do we obtain a full database dump (`pg_dump`) and the service-role key? Lovable Cloud does not expose the DB password or `SUPABASE_SERVICE_ROLE_KEY` to the customer. | Without this, no data, auth users, or storage objects can be exported. This is the single migration blocker. | **RESOLVED IN PRINCIPLE — see §Q1 resolution path below.** Use the `exit-export` edge function (service-role stays server-side) + Cloud → Advanced settings → Export data. Residual gap: `auth.users` password hashes, which only a DB-level dump yields. | **Before any other migration work** |
| Q2 | What is the exact live list of `cron.job` schedules and `pg_extension` versions? | The DDL shows 5+ jobs; the live instance may have more created via console or later migrations. | Run `docs/exit/scripts/live-introspection.sql` against the live DB as soon as access is restored. | T-30 |
| Q3 | What is the total row count, storage object count, and storage byte size? | Drives transfer time, cost, and backup sizing. | Use the introspection script + Storage API list loop. | T-30 |
| Q4 | Are there any social OAuth providers configured in Auth settings (Google, etc.)? | None are visible in code; if configured, identities and callback URLs must be migrated. | Screenshot/copy live Auth providers and redirect allowlist. | T-21 |
| Q5 | Are there any per-company payment-gateway credentials stored in the database? | Document 18 flags this; migration action differs for platform-level vs company-level keys. | Inspect `payment_settings`, `company_settings`, and any `*_credentials` JSON columns. | T-21 |
| Q6 | What is the current PITR retention setting and backup schedule on the Lovable-managed project? | Determines whether a customer-owned backup is the only recovery path. | Confirm in dashboard / with support. | T-21 |
| Q7 | Is there a custom domain already registered and pointing at the Lovable app? | `docs/exit` assumes none; if one exists, DNS cutover plan changes. | Verify DNS records and registrar access. | T-30 |
| Q8 | What are the actual monthly call volumes and token counts for the 9 AI features? | Document 8 estimates are unvalidated; budget and provider sizing depend on real numbers. | Query `saas_usage_events` for `ai.*` reasons; also check AI gateway logs if accessible. | T-21 |
| Q9 | Which `SECURITY DEFINER` functions are currently executable by `anon`, and is that still correct after the last security remediation? | Document 11 DB-1. A wrong grant is a privilege-escalation path. | Run the introspection query §5 and reconcile with the public-signup/booking whitelist. | T-21 |
| Q10 | Are there any uncommitted database objects or policies applied via the Supabase dashboard that are not in `supabase/migrations/`? | `migra` drift check depends on this. | Run `migra` as soon as a target scratch instance exists. | T-21 |
| Q11 | What is the legal/regulatory jurisdiction for tenant and KYC data? Rwanda-primary plus EU-hosted infrastructure suggests Rwandan law + GDPR may both apply. | Drives DPIA, processor agreements, and data-residency choices. | Confirm with legal/compliance. | T-14 |
| Q12 | Is there an existing staging/test environment or test dataset? | If not, anonymised data must be generated before staging rehearsals. | Inventory non-production projects and seed data. | T-21 |

## Assumptions made in this package

1. **Target = self-owned Supabase Cloud + Vercel + direct AI provider.** If the sponsor chooses Azure/AWS/GCP/self-host, effort estimates and code-change percentages change materially.
2. **All 153 migrations are authoritative and ordered.** Any live drift is captured and signed off before cutover.
3. **The application code is frozen during migration.** Feature work in flight will extend the timeline.
4. **Password-hash preservation is required.** If a forced reset is acceptable, Options A/B/C/E become cheaper.
5. **The Lovable-managed project remains accessible long enough to complete the migration.** The emergency path assumes a recent backup exists.
6. **Third-party providers (Resend, Flutterwave, Paystack, MoMo) will re-issue or re-approve credentials for the new domain.** Lead times can be weeks.
7. **Partner-API customers can tolerate a domain change and a webhook signing-secret rotation.** Dual-secret overlap is planned to minimise impact.
8. **No custom binary assets >100 KB are tracked in the repo.** The CDN-asset skill found no candidates.
9. **Realtime publication on `messages` and `notifications` is intentional and sufficient.** `bookings` was deliberately removed.
10. **The `lovable-tagger` dev plugin is not required at runtime.** It will be removed during de-coupling.
11. **No additional cloud services (e.g., AWS SES, Twilio, Segment, Datadog) are in use beyond those found in code.** If more are discovered, add them to the dependency matrix.

## Decisions pending sponsor sign-off

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Target platform | A Supabase Cloud · B Azure · C AWS · D self-hosted Supabase | **A** |
| D2 | Auth strategy | A Supabase external · B Auth0 · C Clerk · D Entra · E Firebase | **A** (preserves hashes + MFA) |
| D3 | Storage target | A Supabase Storage · B Azure Blob · C S3 · D R2 | **A** |
| D4 | AI provider | A Gemini direct · B OpenAI · C Azure OpenAI · D Anthropic | **A Gemini direct** (least regression) |
| D5 | Forced password reset acceptable? | Yes / No | **No** — preserves UX |
| D6 | Keep old project alive for 30 days? | Yes / No | **Yes** — rollback safety |
