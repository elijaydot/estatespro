# Document 20 — Final Recommendation

## 1. The strategic choice

Migrate the application to a **self-owned Supabase Cloud project** and host the frontend on **Vercel**, while abstracting the AI layer behind a provider-independent shim. This is the only path that preserves the 761 RLS policies, 304 database functions, 41 Deno edge functions, 12 storage buckets, Realtime channels and native TOTP MFA **without rewriting them**.

A lift-and-shift to raw Azure/AWS/GCP is technically possible but **4–5× more expensive in engineering time** (≈300 person-days vs. ≈73) and introduces avoidable risk around re-implementing authorisation, storage signed URLs, realtime and the direct PostgREST data API.

## 2. Why Supabase Cloud is the right target

| Factor | Assessment |
|---|---|
| Schema fidelity | 153 migrations replay unchanged; `pg_cron`, `pgcrypto`, `pg_net`, `uuid-ossp` are all available |
| RLS preservation | 761 policies and `auth.uid()` semantics work exactly as today |
| Functions | 41 Deno functions deploy with `supabase functions deploy`; `config.toml` unchanged |
| Auth | Password hashes and native TOTP factors migrate as data; GoTrue dashboard under customer control |
| Storage | 12 buckets, bucket policies, signed URLs and path conventions are identical |
| Realtime | `messages`, `notifications` publication unchanged |
| Exit option | Supabase is self-hostable (Docker/Helm), so this is not a dead-end; it is a stepping-stone |
| Cost | Lowest run cost and ops burden among realistic targets |
| Compliance | EU region available; customer owns dashboard access and audit logs |

## 3. The one blocker to resolve immediately

**Open Question Q1: obtaining the database dump and service-role key.** Lovable Cloud does not expose these by design. Before any other migration work:

1. Use Lovable's supported data-export path if it provides a full logical dump.
2. If not, escalate with Lovable support for a one-time `pg_dump` and service-role key release.
3. If neither is possible, treat the migration as **blocked at Step 0** and plan only the emergency-restore path from whatever export is available.

Until Q1 is resolved, the business has **no recovery path** from a credit-zero pause.

## 4. The first 30 days (what to do now)

| Week | Actions |
|---|---|
| 0 | Resolve Q1; take the first customer-owned full backup (DB + storage sample); mirror the repo; set up credit-balance alerting at 40/20/10% |
| 1 | Provision the new Supabase org (staging + production), Vercel project, AI provider account; re-obtain Resend and payment-gateway credentials; freeze feature work |
| 2 | Remove `lovable-tagger`; build the AI provider shim; refactor all 9 AI functions; parameterise URLs; add security headers + CSP; upgrade CI with gitleaks and service-role scan |
| 3 | Replay migrations to staging; run the RLS/GRANT and SECURITY DEFINER audits; begin storage tooling |
| 4 | Load anonymised data; restore `auth` schema; configure Auth settings; deploy functions; run the full staging test battery |

## 5. The AI change is the easiest win

All nine AI functions call the same endpoint with the same OpenAI-compatible shape. Introducing `supabase/functions/_shared/ai-provider.ts` makes the provider a configuration change rather than a migration. Start with `AI_PROVIDER=lovable` (zero behaviour change), then flip to `gemini` or `openai` during staging. This de-risks the AI dependency within the first two weeks.

## 6. What to avoid

- **Do not attempt to leave Supabase primitives without a strong reason.** Rewriting RLS, Auth, Storage and the data API is not a migration; it is a rebuild.
- **Do not delete the Lovable project at cutover.** Keep it read-only for 30 days minimum.
- **Do not schedule cutover until the staging test battery is 100% green and a pre-cutover backup has been test-restored.**
- **Do not place any secret in a `VITE_*` variable or in git.**

## 7. Success criteria

1. DNS repointed; the app serves from the new environment with no functional regression.
2. All 5 personas can authenticate; role resolution, MFA, trusted-device and impersonation flows work.
3. Cross-tenant RLS isolation tests pass (`tests/week4/cross-tenant-rls.integration.test.ts`).
4. Payment round-trip (live, refunded) succeeds and reconciles to the cent.
5. Webhook delivery, dead-letter and replay work end-to-end.
6. Storage object counts and checksums match source.
7. AI features run on the new provider with stable output shapes.
8. No `*.lovable.app` literals remain in the active code paths.
9. Customer-owned backups are automated and restore-tested monthly.
10. P1 security remediations from Document 11 are closed within 30 days of cutover.

## 8. Final verdict

**Proceed with Option A: self-owned Supabase Cloud + Vercel + provider-abstracted AI.**

Estimated effort: **6–9 weeks, ≈73 person-days, ≈€44k** at a €600/day blended rate.

Critical path: **resolve Q1 this week.** Everything else is engineering; Q1 is access, and without it the migration cannot begin.
