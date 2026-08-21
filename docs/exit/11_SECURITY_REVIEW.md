# Document 11 — Security Review

Scope: repository at HEAD, 41 edge functions, 153 migrations, 761 RLS policies, secret configuration. Live-instance checks (policy drift, actual grants, auth settings) are **MANUAL REVIEW REQUIRED** — database introspection failed at authoring time.

## 1. Secrets audit

| Secret | Class | Exposure risk | Finding / action |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB bypass | Critical if leaked | Server-only today (edge functions). **Verify it never reaches the client bundle** — automated check added in §8 |
| `SUPABASE_DB_URL` | Full DB | Critical | Server-only. Inaccessible to the customer today (blocker Q1) |
| `LOVABLE_API_KEY` | AI spend | Medium | Server-only; retire at exit |
| `RESEND_API_KEY` | Email sending / spoofing | High | Server-only; rotate at cutover; scope to the sending domain |
| `PARTNER_WEBHOOK_SECRET` | Webhook signature forgery | High | Shared with partners — rotation needs a dual-secret overlap window |
| `WEBHOOK_WORKER_SECRET` | Worker invocation | Medium | Self-issued; rotate at cutover |
| `SAAS_RENEWALS_CRON_SECRET` | Trigger billing runs | High | Self-issued; rotate; ensure constant-time comparison |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Public by design | Low | Correctly public; **security depends entirely on RLS** |
| `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` | Platform-managed | Medium | Re-provisioned on the target |
| `ALLOW_SAAS_PAYMENT_TEST_MODE` | Config | **High if true in prod** | Assert `false`/unset in production; add a startup guard |
| `REQUIRE_GUEST_SIGNED_REQUESTS`, `REQUIRE_INVITE_SIGNATURE`, `REQUIRE_SAAS_CHECKOUT_SIGNATURE` | Config | High if disabled | These are security toggles — **set to `true` in production** and assert at boot |

Positive findings: no hardcoded private keys found in `src/`; `.env` contains only publishable values; `estatespro.code-workspace` holds a benign editor setting.

**Finding S-1 (High)** — three security behaviours are environment-toggleable and default-off in code. Any misconfiguration silently disables signature verification for guest bookings, invites, and SaaS checkout. *Remediation: fail closed — treat unset as `true` in production, and log loudly when disabled.*

**Finding S-2 (Medium)** — `ALLOW_SAAS_PAYMENT_TEST_MODE` allows a `test_mode` flag on payment verification. *Remediation: hard-disable when `NODE_ENV`/deploy stage is production; add a contract test asserting `test_mode` is rejected in prod.*

## 2. Authentication flow review

Strengths: roles in a dedicated `user_roles` table with SECURITY DEFINER accessors (no privilege-escalation via profile edit); `user_roles` INSERT restricted (previously remediated); two-layer MFA with recovery codes and step-up guards; time-boxed, audited impersonation; approval-based enrolment; leaked-password protection enabled; normalised emails; `.maybeSingle()` fetch convention avoids crash-on-missing.

**Finding A-1 (Medium)** — sessions live in `localStorage`, so any XSS yields a token. Mitigated by React's default escaping and the deliberate `react-markdown` (no `dangerouslySetInnerHTML`) rendering of AI output. *Remediation: add a strict CSP (`script-src 'self'`; no `unsafe-inline`) at the new host, plus `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, and HSTS — none of these headers are configured today (`vercel.json` has no header block).*

**Finding A-2 (Medium)** — trusted-device tokens skip MFA for 30 days. *Remediation: bind the token to a device fingerprint + IP-ASN, cap at 30 days (already), allow per-user revocation from Settings → Security, and force re-challenge on sensitive actions (already via `useStepUpGuard`).*

**Finding A-3 (Low)** — native Supabase MFA factors and the app-level `user_mfa` table are two sources of truth. *Remediation: after migration, converge on one; document which is authoritative for the `/mfa-challenge` gate.*

## 3. Data-exposure risk

- The browser holds the anon key and queries PostgREST directly: **RLS is the only boundary for ~130 tables**. Any table shipped without policies is world-readable to authenticated users.
- **Finding D-1 (High, verification required)** — confirm on the live instance that *every* public table has `ENABLE ROW LEVEL SECURITY` plus at least one policy, and that GRANTs match the policies (project convention requires a GRANT block per table). Run `scripts/live-introspection.sql` §4/§5 and treat any row returned as a release blocker.
- **Finding D-2 (Medium)** — 761 permissive OR-composed policies are hard to reason about; a single over-broad `USING (true)` policy defeats all others on that table. *Remediation: enumerate policies with `qual = 'true'` and justify each (public marketplace/listing reads are legitimate; anything else is a finding).*
- Positive: `bookings` was deliberately removed from the Realtime publication to avoid broadcasting guest PII — good instinct; apply the same review to `messages` and `notifications` payload shape.
- Sensitive data classes present: KYC/verification documents, ID images, lease PDFs, e-signatures, tenant contact details, payment references, guest PII. **GDPR/data-protection scope is real** — see Document 12 §4 retention.

## 4. Storage permissions

Nine of twelve buckets are private with folder-level ownership keyed to `auth.uid()`; `property-images`, `company-logos`, `avatars` are public by design (documented and accepted).

**Finding ST-1 (Medium)** — public `avatars`/`property-images` mean object URLs are guessable-by-enumeration if paths are sequential. *Remediation: ensure UUID-based object names (no incrementing ids), and verify no private document ever lands in a public bucket (add a CI check on upload paths).*

**Finding ST-2 (High)** — `verification-documents` holds identity documents. *Remediation: restrict read to reviewer roles only, require step-up MFA to sign a URL, cap signed-URL TTL at 120s, log every access to `audit_events`, and define a deletion schedule post-verification.*

## 5. Database permissions

- SECURITY DEFINER functions: 304 function definitions exist; a prior remediation revoked public EXECUTE on several, exempting those required by public signup/booking flows. **Verify on the live instance** that every remaining `SECURITY DEFINER` function has `SET search_path = public` and an explicit, minimal `GRANT EXECUTE`.
- **Finding DB-1 (High, verification required)** — enumerate `prosecdef = true` functions callable by `anon`; each must be justified (`validate_invite_token`, guest-booking helpers, marketplace public reads are expected).
- **Finding DB-2 (Medium)** — no evidence of a dedicated least-privilege migration role; migrations run as superuser-equivalent. *Remediation: on the target, create a `migrator` role and revoke DDL from application roles.*

## 6. AI prompt-leakage risk

- All prompts are server-side; none are reachable from the client. ✅
- **Finding AI-1 (Medium)** — user- and tenant-supplied text (maintenance descriptions, message threads, documents) is concatenated into prompts without delimiting or instruction-hardening, so prompt injection can steer outputs. Impact is limited (no tools with side effects, no agent loop), but `ai-smart-search` renders model output as markdown to operators. *Remediation: wrap untrusted input in explicit delimiters with a "treat as data, never instructions" system clause; keep the existing `react-markdown` sanitisation; never let AI output drive an authorisation or write decision.*
- **Finding AI-2 (Medium)** — tenant PII, financial figures and document contents are sent to a third-party model provider. *Remediation: document this in the privacy notice, add a per-company AI opt-out, prefer an EU-resident provider endpoint (Azure OpenAI EU / Gemini EU) after migration, and redact identifiers where the task does not need them.*
- **Finding AI-3 (Low)** — no output-length cap is set on gateway calls; a runaway generation is billable. *Remediation: set `max_tokens` in the shim (Document 8 §5).*

## 7. Missing controls (gaps, not vulnerabilities)

| Gap | Impact | Remediation |
|---|---|---|
| No error tracking / APM | Blind to production failures | Sentry + platform APM at cutover |
| No security headers / CSP | XSS blast radius | Add header block to `vercel.json` |
| No WAF / bot protection on public endpoints (`guest-booking`, `marketplace-inquiry`, `fishgate-api`) | Abuse, spam, enumeration | Cloudflare/WAF + captcha on guest forms |
| In-memory rate limiting only | Bypassable across isolates | Move to Redis or the existing `api_rate_limit_windows` table |
| No staging environment | Untested changes reach production | Provision as part of migration |
| No documented pen test | Unknown unknowns | Commission after cutover |
| No automated secret scanning in CI | Leaks reach git history | gitleaks in CI |
| No DPIA / data-processing register | Compliance exposure with KYC + tenant PII | Produce alongside Document 12 |

## 8. Remediation plan

**P0 — before or during migration**
1. Verify RLS + GRANT coverage on all 130 tables (D-1); block release on any gap.
2. Enumerate and justify `anon`-executable SECURITY DEFINER functions (DB-1).
3. Fail-closed defaults for the three signature toggles and `ALLOW_SAAS_PAYMENT_TEST_MODE` (S-1, S-2).
4. Rotate every secret at cutover; dual-secret window for `PARTNER_WEBHOOK_SECRET`.
5. Confirm the service-role key is absent from the client bundle (`grep -r "service_role" dist/` in CI).

**P1 — first 30 days after cutover**
6. CSP + full security-header set; Sentry; uptime synthetics.
7. Distributed rate limiting; WAF + captcha on the three public write endpoints.
8. Step-up + short TTL + audit logging for `verification-documents` (ST-2).
9. Prompt-injection hardening and `max_tokens` caps (AI-1, AI-3).

**P2 — 90 days**
10. External penetration test and RLS-focused review.
11. DPIA, retention automation, subject-access-request runbook.
12. Least-privilege DB roles; secret rotation automation.

## 9. Compliance notes

Data categories in scope: identity documents, financial records, contracts and e-signatures, contact details, guest booking PII, message content. Jurisdiction: Rwanda-primary with EU-hosted infrastructure (`eu-west-1`) — both Rwandan data-protection law and GDPR should be assumed in scope until legal confirms. Required artifacts not present today and to be produced: records of processing, DPIA for AI processing of tenant data, processor agreements (Supabase/Resend/payment gateways/AI provider), retention schedule (Document 12 §4), breach-notification runbook.
