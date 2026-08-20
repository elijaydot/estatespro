# Document 6 — Authentication Migration Guide

## 1. Current authentication inventory

| Item | Current implementation |
|---|---|
| Provider | Supabase Auth (GoTrue) on the Lovable-managed project |
| Methods | Email + password (landlord/PM/tenant), password reset via emailed link, tenant invite-token signup |
| Social providers | None configured in code — MANUAL REVIEW REQUIRED against live Auth settings |
| Anonymous sign-ups | Disabled by policy |
| Session storage | `localStorage`, `persistSession: true`, `autoRefreshToken: true` (`src/integrations/supabase/client.ts`); ~10-minute refresh cadence |
| MFA | **Two layers.** (a) Supabase native TOTP factors (`auth.mfa_factors`, friendly name `FishGate Authenticator`, enrolled via `AuthContext.enrollMfaTotp`); (b) app-level `public.user_mfa` + `public.security_recovery_codes` + edge functions `mfa-setup`, `mfa-enable`, `mfa-verify`, `mfa-disable`, `mfa-regenerate-codes`, plus `get_mfa_status()` RPC |
| MFA UX | `/mfa-challenge` route, `MfaGate` in `src/App.tsx`, `MfaReminderBanner`, "Remember this device" 30-day trusted-device token (`src/lib/trustedDevice.ts`), downloadable backup codes, `useStepUpGuard` for sensitive actions |
| Roles | `public.user_roles` (enum-backed, separate table), read via SECURITY DEFINER `has_role`-style functions; `useUserRole`, `usePortalAccess` hooks |
| Role tiers | Landlord, Property Manager, Tenant (+ separate `platform_operator_roles` for super admins/reviewers) |
| Claims consumed | `sub` (→ `auth.uid()`), `role`, `email`; edge functions use `auth.getClaims(token)` |
| Access policies | 761 RLS policies keyed on `auth.uid()`, company membership, and tenant identity |
| Provisioning | `on_auth_user_created` trigger → `profiles` + default role; approval-based enrolment (`PendingApproval` page); tenant invites via `validate_invite_token` RPC and `accept-tenant-invite` function |
| Impersonation | `platform_impersonation_sessions`, time-boxed, expired by a per-minute cron job, fully audited |
| Audit | `security_audit_events` (MFA enable/disable, failed logins) surfaced in Settings → Security → Activity |

**The single hardest migration constraint:** `auth.uid()` appears throughout 761 policies and 304 functions. Any IdP change must still produce a Postgres session claim that resolves to the same UUID per user.

## 2. Option A — Azure Entra ID (External ID / B2C)

- **User migration**: Microsoft Graph bulk create, or Entra External ID's user-flow migration. **Password hashes cannot be imported** — bcrypt hashes from GoTrue are not accepted.
- **Password migration**: ❌ Not possible. Requires either (i) forced reset email to every user, or (ii) a "just-in-time" shim: keep GoTrue running read-only, validate the old password once on first login, then set it in Entra. The shim adds ~2 weeks of work.
- **Sessions**: not migratable; all users are logged out at cutover.
- **MFA**: Entra has first-class MFA (TOTP, push, FIDO2). Native Supabase factors do not transfer; the app-level `user_mfa`/recovery-code tables can be retired in favour of Entra Conditional Access. Users re-enrol.
- **Roles**: keep `public.user_roles` as the authoritative store (do **not** move roles into token app-roles alone); map Entra `oid` → existing user UUID in a `profiles.external_id` column, and set `request.jwt.claims` at the DB session level so `auth.uid()` keeps working.
- **Effort**: 5–7 weeks. **Best fit only if the organisation is already Entra-standardised.**

## 3. Option B — Auth0

- **User migration**: bulk import (`users-import` job) **supports bcrypt hashes** — GoTrue stores bcrypt, so passwords carry over. This is the key advantage.
- **Passwords**: ✅ preserved (verify hash prefix `$2a`/`$2b` and cost factor before import).
- **Sessions**: not migratable.
- **MFA**: Auth0 Guardian TOTP; re-enrolment required; recovery codes regenerate.
- **Roles**: Auth0 RBAC can mirror `user_roles`, but keep the DB table authoritative; inject `sub` as the existing UUID via `user_id` preservation on import, then a Postgres JWT verifier (custom `auth.uid()` shim) keeps RLS intact.
- **Effort**: 4–6 weeks. **Best non-Supabase option** because of hash import.

## 4. Option C — Clerk

- **User migration**: Clerk supports importing bcrypt hashes (`password_hasher: bcrypt`). ✅
- **Sessions**: not migratable. Clerk uses its own session cookies/JWT templates.
- **MFA**: TOTP + backup codes built in; re-enrolment required.
- **Roles**: via public/private metadata, but again keep `user_roles` authoritative and use a JWT template to emit `sub` = existing UUID so RLS is untouched.
- **Strength**: fastest React DX, prebuilt components — would replace `AuthContext`, `Login`, `Signup`, `ForgotPassword`, `ResetPassword`, `MfaChallenge`, tenant-portal auth pages (~10 files).
- **Weakness**: per-MAU pricing scales with tenants + guests; multi-persona/multi-portal modelling needs care.
- **Effort**: 4–6 weeks.

## 5. Option D — Supabase Auth, externalised *(recommended)*

- **User migration**: `pg_dump -n auth` from source → restore into the target Supabase project. `auth.users`, `auth.identities`, `auth.mfa_factors`, `auth.sessions` all move as rows.
- **Passwords**: ✅ **fully preserved** (same GoTrue, same hashes).
- **Sessions**: refresh tokens can be carried; recommend invalidating anyway at cutover for hygiene (one forced re-login).
- **MFA**: ✅ **native factors migrate as data** — this is the only option where users do not re-enrol TOTP. App-level `user_mfa` + recovery codes migrate with the `public` schema.
- **Roles**: zero change — `user_roles`, `has_role`, all 761 policies work as-is.
- **JWT secret**: must be reissued on the target; all existing tokens invalidate (acceptable).
- **Effort**: **3–5 days**, versus 4–7 weeks for A/B/C.
- **Dependency**: requires the `auth` schema dump — blocked on credentials Q1.

## 6. Option E — Firebase Auth

- **User migration**: `firebase auth:import` supports bcrypt with explicit params. ✅ (hash preserved)
- **Sessions**: not migratable.
- **MFA**: TOTP/SMS available; re-enrolment required.
- **Roles**: custom claims; DB roles remain authoritative.
- **Weakness**: worst fit — Firebase JWTs are RS256 with Google-issued `sub` strings, not UUIDs, so every `auth.uid()` reference needs an indirection table; also pulls the stack toward GCP with no other GCP components in play.
- **Effort**: 6–8 weeks. **Not recommended.**

## 7. Comparison

| | A Entra | B Auth0 | C Clerk | D Supabase (external) | E Firebase |
|---|---|---|---|---|---|
| Password hashes preserved | ❌ | ✅ | ✅ | ✅ | ✅ |
| Native TOTP factors preserved | ❌ | ❌ | ❌ | **✅** | ❌ |
| `auth.uid()` / 761 RLS policies unchanged | ❌ | ⚠️ shim | ⚠️ shim | **✅** | ❌ |
| Frontend rewrite | Large | Medium | Medium | **None** | Large |
| Edge-function auth rewrite (41 fns) | Yes | Yes | Yes | **No** | Yes |
| Effort | 5–7 wk | 4–6 wk | 4–6 wk | **3–5 d** | 6–8 wk |
| Run cost at 5k MAU | Low–Med | Med | Med–High | Low | Low |

## 8. Cross-cutting requirements for any option

1. **Dashboard settings to re-create** (not in repo — MANUAL REVIEW REQUIRED): JWT expiry, refresh-token rotation, password minimum/complexity, leaked-password protection (currently enabled per security memory), rate limits, redirect URL allowlist (must include the new domain, `/tenant/login`, `/reset-password`, `/bookings/guest-action`), SMTP sender and email templates.
2. **Redirect URL hygiene**: OAuth/reset `redirect_uri` must be a same-origin public URL (`window.location.origin`), never a protected route — existing project convention; preserve it.
3. **Tenant-portal specifics**: tenants authenticate at `/tenant/login`; the invite flow uses `validate_invite_token` (SECURITY DEFINER, bypasses RLS) and 7-day manual links. Test invite → signup → portal access end-to-end on the target before cutover.
4. **Comms plan**: if passwords or MFA cannot be preserved (Options A/B/C/E), a 3-touch email campaign (T-7, T-0, T+2) plus in-app banner is mandatory; expect 15–30% support contact rate from tenants.
5. **Post-migration validation**: sign in as one user of each of the 5 personas; verify role resolution, company scoping, MFA challenge, trusted-device skip, and impersonation timebox.
