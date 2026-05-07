
# FishGate Migration Blueprint: Lovable Cloud to External Supabase + Vercel

---

## 1. Current-State Inventory

### 1.1 Database

| Component | Count | Details |
|---|---|---|
| Tables | 25+ | profiles, properties, units, tenants, leases, invoices, payments, maintenance_requests, messages, notifications, bookings, broadcasts, companies, company_members, company_settings, pm_invites, tenant_invites, tenant_exits, exit_inspection_items, recurring_bills, reports, lease_templates, lease_attachments, landlord_payment_settings, default_inspection_checklist, app_settings, audit_events, security_audit_events, security_recovery_codes, user_roles, property_manager_assignments |
| Migrations | 47 files (~5,000 lines SQL) | Ordered from `20260113001918` to `20260503205756` |
| RLS Policies | 60+ | Per-table, using SECURITY DEFINER helper functions |
| DB Functions | 22 | `handle_new_user`, `process_payment`, `validate_invite_token`, `has_role`, `get_user_role`, `is_approved_pm`, `get_company_property_ids`, etc. |
| Triggers | `handle_new_user` (on auth.users), `notify_payment_created`, `notify_on_new_message`, `validate_booking_dates`, `generate_invoice_number`, `generate_receipt_number`, `enforce_tenant_maintenance_request_ownership`, `validate_tenant_lease_update`, `update_updated_at_column` |
| Custom Types | `app_role` enum (`admin`, `moderator`, `user` -- mapped to `tenant`, `property_manager`, `landlord`) |
| Realtime | `messages`, `notifications` tables published to `supabase_realtime` (bookings removed for PII) |

### 1.2 Edge Functions (24 total)

**AI Functions (9)** -- all use `LOVABLE_API_KEY` + `ai.gateway.lovable.dev`:
- `ai-chat`, `ai-generate-description`, `ai-suggest-reply`, `ai-tenant-chatbot`, `ai-maintenance-triage`, `ai-financial-insights`, `ai-document-intelligence`, `ai-smart-search`, `ai-predictive-analytics`

**Email Functions (7)** -- all use `RESEND_API_KEY`:
- `send-lease-email`, `send-tenant-invite`, `send-maintenance-notification`, `send-payment-confirmation`, `send-exit-summary`, `send-broadcast`, `shortlet-booking-email`, `check-lease-renewals`

**Business Logic Functions (8)**:
- `accept-tenant-invite`, `generate-invoice-pdf`, `generate-lease-pdf`, `guest-booking`, `invite-token`, `payment-checkout`, `verify-payment`

All functions have `verify_jwt = false` in config (manual auth validation in code).

### 1.3 Storage Buckets (7)

| Bucket | Public |
|---|---|
| property-images | Yes |
| company-logos | Yes |
| avatars | Yes |
| lease-documents | No |
| signatures | No |
| lease-attachments | No |
| maintenance-photos | No |

### 1.4 Secrets

| Secret | Purpose |
|---|---|
| RESEND_API_KEY | Email sending |
| LOVABLE_API_KEY | Lovable AI Gateway (NOT portable) |
| SUPABASE_SERVICE_ROLE_KEY | Auto-managed |
| SUPABASE_ANON_KEY | Auto-managed |
| SUPABASE_URL | Auto-managed |
| SUPABASE_DB_URL | Auto-managed |
| SUPABASE_JWKS | Auto-managed |

### 1.5 Auth Configuration
- Email/password with auto-confirm enabled
- `handle_new_user` trigger on `auth.users` for profile + role creation
- Tenant invite flow with token validation
- PM invite flow with company membership
- Password HIBP check (likely enabled)

### 1.6 Frontend Env Vars
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## 2. What Can Be Exported vs. Must Be Recreated

### Automatically Exportable
- All 47 migration SQL files (already in your GitHub repo under `supabase/migrations/`)
- All 24 edge function source files (in `supabase/functions/`)
- `supabase/config.toml` (needs project_id update)
- All frontend code (already in GitHub)
- Storage bucket definitions (recreate via CLI)
- RLS policies (embedded in migrations)

### Must Be Recreated Manually
- **Auth users and sessions** -- password hashes are NOT exportable from Lovable Cloud
- **Storage objects** (actual files in buckets) -- must be downloaded and re-uploaded
- **Secrets** -- must be re-entered in new Supabase project
- **LOVABLE_API_KEY** -- NOT portable; requires replacement with direct AI provider API keys
- **Realtime publication config** -- must be re-run (in migrations)
- **Auth email templates** -- must be reconfigured in new dashboard
- **Auth providers** (Google OAuth redirect URLs) -- must be reconfigured
- **MFA settings** -- configure in new Supabase dashboard (now you have full access)

---

## 3. Data Migration Plan

### 3.1 Pre-Migration Validation

```text
Step 1: Export current data counts
  - SELECT count(*) FROM each table
  - Record totals as baseline

Step 2: Verify migration SQL completeness
  - Run all 47 migrations against a fresh local Supabase
  - supabase db reset (local) to validate

Step 3: Identify data dependencies
  - auth.users -> profiles -> tenants -> leases -> invoices -> payments
  - companies -> company_members -> property_manager_assignments
```

### 3.2 Schema Migration

1. Create new Supabase project at supabase.com
2. Install Supabase CLI locally
3. Update `supabase/config.toml` with new project_id
4. Link CLI: `supabase link --project-ref <new-ref>`
5. Push all migrations: `supabase db push`
6. Verify schema parity with `supabase db diff`

### 3.3 Data Migration

```text
Phase 1: Export from Lovable Cloud
  - Use Lovable Cloud UI table export (CSV) for each table
  - OR use psql if DB access is enabled:
    psql -c "COPY (SELECT * FROM properties) TO STDOUT CSV HEADER" > properties.csv
  - Export in dependency order (companies first, then properties, units, tenants, etc.)

Phase 2: Import to new Supabase
  - Temporarily disable RLS on all tables
  - Import via psql COPY or Supabase dashboard CSV import
  - Re-enable RLS after import
  - Run data integrity queries (foreign key consistency, count verification)
```

### 3.4 Storage Migration

```text
For each bucket:
  1. List all objects via Supabase JS client
  2. Download each file
  3. Create matching bucket in new project (same public/private setting)
  4. Upload files preserving folder structure
  5. Verify file counts match

Script approach: Write a Node.js migration script using @supabase/supabase-js
connecting to both old (via service role key if available) and new projects.
```

### 3.5 Rollback Strategy

- Keep Lovable Cloud project active for 30 days post-migration
- DNS/frontend can be pointed back to old backend in minutes
- Do NOT delete data from source until verification period ends

### 3.6 Expected Downtime

**Maintenance window approach recommended**: 2-4 hour window
- Data export/import: 1-2 hours (depending on data volume)
- Storage migration: 30-60 min
- DNS/env var switch: 15 min
- Smoke testing: 30 min

---

## 4. Auth Migration

### 4.1 Password Hash Export

**Password hashes CANNOT be exported from Lovable Cloud.** There is no dashboard access to `auth.users` internals, and `pg_dump` of the `auth` schema is not available.

### 4.2 Recommended Auth Transition

```text
Option A: Forced Password Reset (Recommended)
  1. Create all user accounts in new Supabase with placeholder passwords
  2. On first login attempt, show "Please reset your password" flow
  3. Use supabase.auth.resetPasswordForEmail() to send reset links
  4. Track migration status per user in a migration_status column

Option B: Magic Link Transition
  1. For first-time login post-migration, use magic link auth
  2. After clicking link, prompt user to set a new password
  3. Smoother UX but requires email deliverability
```

### 4.3 Session Cutover

- All existing sessions (JWTs) become invalid when switching projects
- Users must re-authenticate against the new Supabase instance
- Schedule cutover during low-usage hours

### 4.4 User Communication Template

```text
Subject: FishGate System Upgrade - Action Required

Dear [Landlord/PM/Tenant],

We're upgrading FishGate's infrastructure for better security and performance.

What this means for you:
- You will need to reset your password on your next login
- All your data (properties, leases, payments, messages) is preserved
- This is a one-time action

Steps:
1. Visit [new URL]
2. Click "Forgot Password"
3. Check your email for reset link
4. Set your new password
5. Log in as usual

If you have questions, contact [support email].

Timeline: [Date] at [Time] - expect ~2 hours of downtime.
```

---

## 5. Security and Compliance Cutover

### 5.1 New Supabase Dashboard Configuration

| Setting | Action |
|---|---|
| MFA | Enable TOTP in Auth > Settings (you now have dashboard access) |
| Email templates | Recreate confirmation, reset, invite templates |
| Rate limiting | Configure in Auth > Rate Limits |
| Password policy | Enable HIBP check, set minimum length |
| JWT secret | Auto-generated; update JWKS if using custom verification |
| CORS | Configure allowed origins for your Vercel domain |
| API keys | New anon key + service role key generated automatically |

### 5.2 RLS Parity Verification

```sql
-- Run on new project to verify all policies exist
SELECT schemaname, tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Compare output with same query on old project.

### 5.3 Go-Live Security Checklist

- [ ] All 60+ RLS policies applied and verified
- [ ] SECURITY DEFINER functions created with correct `search_path`
- [ ] MFA enabled for admin/landlord accounts
- [ ] HIBP password check enabled
- [ ] Email templates configured
- [ ] Service role key stored securely (never in frontend)
- [ ] CORS origins restricted to production domain
- [ ] Rate limiting configured
- [ ] Realtime RLS policies on `messages` table verified
- [ ] Storage bucket policies recreated
- [ ] Automated backups enabled (Supabase Pro plan)
- [ ] Point-in-time recovery enabled if on Pro plan

---

## 6. AI Functionality Continuity

### 6.1 Current AI Architecture

All 9 AI functions call `https://ai.gateway.lovable.dev/v1/chat/completions` using `LOVABLE_API_KEY`. This is an OpenAI-compatible proxy provided by Lovable.

### 6.2 After Migration: Can You Still Use Lovable AI Gateway?

**No.** The `LOVABLE_API_KEY` is tied to the Lovable project and Cloud infrastructure. Once you leave Cloud, this key will not work from external Supabase edge functions.

### 6.3 Replacement Architecture

| AI Function | Model Used | Replacement |
|---|---|---|
| ai-chat | google/gemini-3-flash-preview | Google AI API or OpenAI API |
| ai-generate-description | google/gemini-3-flash-preview | Same |
| ai-suggest-reply | google/gemini-3-flash-preview | Same |
| ai-tenant-chatbot | google/gemini-3-flash-preview | Same |
| ai-maintenance-triage | google/gemini-3-flash-preview | Same |
| ai-financial-insights | google/gemini-3-flash-preview | Same |
| ai-document-intelligence | google/gemini-3-flash-preview | Same |
| ai-smart-search | google/gemini-3-flash-preview | Same |
| ai-predictive-analytics | google/gemini-3-flash-preview | Same |

**Migration path:**

1. **Option A: Google AI directly** -- Get a Google AI API key, replace the gateway URL with `https://generativelanguage.googleapis.com/v1beta/` and adapt request format (or use OpenAI-compatible endpoint via Vertex AI).

2. **Option B: OpenAI directly** -- Replace with `https://api.openai.com/v1/chat/completions`, swap model names to `gpt-4o` or similar, use your own `OPENAI_API_KEY`.

3. **Option C: OpenRouter/LiteLLM proxy** -- Use a multi-model proxy like OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) with an OpenAI-compatible interface. Minimal code changes (just URL and API key).

**Code changes required per function:**
- Replace `Deno.env.get("LOVABLE_API_KEY")` with `Deno.env.get("GOOGLE_AI_KEY")` (or equivalent)
- Replace gateway URL
- Update model name string if switching providers
- The request/response format is OpenAI-compatible, so the JSON structure stays the same for Options B and C

**Cost impact:**
- Lovable AI: usage-based, bundled with Cloud subscription
- Google Gemini API: ~$0.075/1M input tokens for Flash models
- OpenAI GPT-4o-mini: ~$0.15/1M input tokens
- Estimate: $5-50/month depending on usage volume

---

## 7. Deployment Cutover Plan

### 7.1 Pre-Cutover (Days Before)

```text
Day -7: 
  - Create new Supabase project
  - Run all migrations
  - Deploy all edge functions via supabase functions deploy
  - Configure auth settings, email templates, MFA
  - Set up all secrets (RESEND_API_KEY, new AI provider key)
  - Create storage buckets

Day -3:
  - Dry-run data migration to staging
  - Run integration tests against new backend
  - Verify edge function behavior
  - Test auth flows (signup, login, password reset, tenant invite)

Day -1:
  - Send user communications
  - Prepare Vercel env var updates (do not apply yet)
  - Final data count snapshot from production
```

### 7.2 Cutover Day Runbook

```text
T-0:00  OWNER: Lead Dev
  - Enable maintenance page on Vercel
  - Take final data export from Lovable Cloud

T-0:30  OWNER: Lead Dev
  - Import data to new Supabase (disable RLS first)
  - Migrate storage objects
  - Re-enable RLS

T-1:30  OWNER: Lead Dev
  - Verify data counts match
  - Run foreign key integrity checks

T-2:00  OWNER: Lead Dev  
  - Update Vercel environment variables:
    VITE_SUPABASE_URL = https://<new-ref>.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY = <new-anon-key>
    VITE_SUPABASE_PROJECT_ID = <new-ref>
  - Trigger Vercel redeploy

T-2:15  OWNER: QA
  - Smoke test: login, create property, send message, process payment
  - Verify AI functions respond
  - Verify email sending works
  - Verify storage uploads work

T-2:45  OWNER: Lead Dev
  - Update OAuth redirect URLs (Google) to new Supabase project
  - Update any webhook URLs

T-3:00  OWNER: Lead Dev
  - Remove maintenance page
  - Monitor error logs for 2 hours

ROLLBACK TRIGGER: If critical functionality fails, revert Vercel env vars 
to old values and redeploy. Old Lovable Cloud data is unchanged.
```

### 7.3 DNS/Callback Updates

- Google OAuth: Update authorized redirect URIs to `https://<new-ref>.supabase.co/auth/v1/callback`
- Vercel: Update env vars and redeploy
- Any webhooks pointing to `zuwpvevqijwkkucmpkkr.supabase.co` must point to new project
- `PUBLISHED_APP_URL` references in edge functions: update to your Vercel domain

---

## 8. Cost and Operations Comparison

| | Lovable Cloud | Hybrid | Full External |
|---|---|---|---|
| **Supabase hosting** | Included | Included (external) | ~$25/mo Pro |
| **Edge functions** | Included | External Supabase | Included in Pro |
| **AI features** | Included (usage-based) | Need own API keys | $5-50/mo |
| **Email (Resend)** | Your key already | Same | Same |
| **Storage** | Included | External | Included in Pro |
| **Monitoring** | Lovable UI | Mixed | Supabase dashboard + custom |
| **Backups** | Managed | Managed | Supabase Pro (daily) |
| **MFA config** | Not available | Dashboard access | Full dashboard access |
| **Compliance controls** | Limited | Full | Full |
| **On-call/incidents** | Lovable support | You | You |
| **Total monthly** | ~$20-50 | ~$30-80 | ~$30-100 |
| **Migration effort** | 0 | Medium | High (40-80 hours) |

**Hidden costs of full external:**
- Monitoring setup (Sentry, Datadog, etc.)
- On-call rotation for database issues
- Manual backup verification
- Security audit responsibility
- Edge function debugging without Lovable tooling

---

## 9. Risk Register

| Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|
| Password hashes lost, users locked out | High | Certain | Forced password reset flow + clear comms | Dev Lead |
| RLS policy mismatch causes data leak | Critical | Low | Side-by-side policy comparison query | Dev Lead |
| AI functions fail without LOVABLE_API_KEY | High | Certain | Replace with direct API provider before cutover | Dev Lead |
| Storage files missed during migration | Medium | Medium | Automated script with count verification | Dev Lead |
| Edge functions behave differently | Medium | Low | Integration test suite against staging | QA |
| Users confused by auth changes | Medium | High | Pre-migration email + in-app banner | Product |
| Realtime subscriptions break | Medium | Low | Verify publication config post-migration | Dev Lead |
| Google OAuth redirect mismatch | High | Medium | Update OAuth config before going live | Dev Lead |
| Data imported with wrong ownership | Critical | Low | Verify user_id mappings after import | Dev Lead |
| Resend email domain verification | Low | Low | Already using your own RESEND_API_KEY | Dev Lead |

---

## 10. Parity Checklist

| Component | Lovable Cloud | New Supabase | Status |
|---|---|---|---|
| 25+ tables with schema | Yes | Migrate via SQL | [ ] |
| 60+ RLS policies | Yes | Migrate via SQL | [ ] |
| 22 DB functions | Yes | Migrate via SQL | [ ] |
| 9 triggers | Yes | Migrate via SQL | [ ] |
| `app_role` enum | Yes | Migrate via SQL | [ ] |
| 24 edge functions | Yes | Deploy via CLI | [ ] |
| 7 storage buckets | Yes | Create via CLI/dashboard | [ ] |
| Storage objects (files) | Yes | Script migration | [ ] |
| Realtime on messages/notifications | Yes | Verify publication | [ ] |
| Auth users | Yes | Recreate (no password hashes) | [ ] |
| Auth email templates | Yes | Recreate in dashboard | [ ] |
| MFA | Not available | Configure in dashboard | [ ] |
| Google OAuth | Check current state | Configure in dashboard | [ ] |
| RESEND_API_KEY | Set | Re-enter in new project | [ ] |
| AI API key | LOVABLE_API_KEY | Replace with provider key | [ ] |
| Automated backups | Managed | Pro plan feature | [ ] |

---

## 11. Go/No-Go Checklist

- [ ] All migrations applied successfully to new project
- [ ] Data counts match between old and new
- [ ] All 24 edge functions deployed and responding
- [ ] RLS policy count matches (run comparison query)
- [ ] Auth signup/login/reset flows tested
- [ ] Tenant invite flow tested end-to-end
- [ ] AI functions responding with new API key
- [ ] Email sending verified (Resend)
- [ ] Storage upload/download verified for all 7 buckets
- [ ] Realtime messages working
- [ ] Vercel env vars ready but not yet applied
- [ ] User communication sent
- [ ] Rollback plan documented and rehearsed
- [ ] Monitoring/alerting set up on new project

---

## 12. Known Limitations and Non-Exportable Components

1. **Password hashes** -- Cannot be exported from Lovable Cloud. All users must reset passwords.
2. **LOVABLE_API_KEY** -- Tied to Lovable platform. Cannot be used outside Lovable Cloud. All 9 AI functions must be updated to use a direct provider.
3. **Auth session tokens** -- All active sessions are invalidated on migration. Users must re-login.
4. **Lovable Cloud UI** -- Database management, user management, and secrets management through Lovable's interface will no longer be available. Use Supabase dashboard instead.
5. **Automatic edge function deployment** -- Currently auto-deployed by Lovable on code push. Must set up CI/CD (GitHub Actions) for `supabase functions deploy`.
6. **Auto-generated types** -- `src/integrations/supabase/types.ts` is auto-generated by Lovable. Must run `supabase gen types typescript` manually or in CI.
7. **Auto-managed .env** -- Currently auto-populated. Must manage manually or via Vercel env vars.
8. **Lovable preview URLs** -- `id-preview--*.lovable.app` and `estatespro.lovable.app` will no longer update. Your Vercel deployment becomes the only frontend.

---

## 13. Open Questions for You

1. **Data volume**: How many rows are in your largest tables? This affects migration time estimates.
2. **Active users**: How many registered users exist? This determines the scale of the password reset campaign.
3. **Google OAuth**: Is Google sign-in currently active for any user type? If so, you need to transfer OAuth client credentials.
4. **AI provider preference**: Do you prefer Google Gemini (direct), OpenAI, or a proxy like OpenRouter for your AI replacement?
5. **Supabase plan**: Will you use Supabase Free, Pro ($25/mo), or Team? This affects backup/PITR availability.
6. **Custom domain**: Will you keep `estatespro.lovable.app` or use a custom domain on Vercel?
7. **CI/CD**: Do you have GitHub Actions set up for your Vercel deployment? Edge functions will need a deployment pipeline.
8. **Monitoring**: Do you have existing monitoring (Sentry, LogRocket, etc.) or need recommendations?
9. **Timeline**: What is your target migration date? This affects the communication plan.
10. **Staging environment**: Do you have a separate Supabase project for staging/testing the migration first?
