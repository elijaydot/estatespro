# Week 1 Smoke Test Checklist (FishGate)

## Goal
Validate Week 1 security, role enforcement, and UX polish before deployment.

## Setup
1. Run `npm install`.
2. Run `npm run build` and confirm success.
3. Ensure Supabase environment values are configured for staging:
   - `ALLOWED_ORIGINS`
   - `EDGE_REQUEST_SIGNING_SECRET` (if signature checks are enabled)
   - `REQUIRE_GUEST_SIGNED_REQUESTS` (optional)
   - `REQUIRE_INVITE_SIGNATURE` (optional)

## Auth and Route Guarding
1. Manager login redirect:
   - Login as landlord/property manager.
   - Expected: redirect to manager dashboard.
2. Tenant isolation:
   - Login as tenant.
   - Attempt manager routes (`/dashboard`, `/payments`, `/maintenance`) via URL.
   - Expected: tenant is redirected to `/tenant` flow.
3. Tenant portal access block for non-tenant:
   - Login as manager.
   - Attempt `/tenant` routes.
   - Expected: redirect to manager dashboard.
4. Public route protection:
   - While authenticated, open `/login` and `/signup`.
   - Expected: redirect based on role.

## Password Recovery
1. Forgot password request:
   - Open `/forgot-password` and submit valid account email.
   - Expected: success toast and return to login.
2. Reset password completion:
   - Open reset link from email.
   - Set new password and submit.
   - Expected: success toast, signed out, and can login with new password.

## Payments UX (Desktop + Mobile)
1. Search and empty state:
   - Enter unmatched query.
   - Expected: clear "No payments found" state.
2. Mobile list behavior:
   - At small viewport, verify payments render as cards.
   - Expected: receipt, status, method, amount, and actions are visible.
3. Receipt actions:
   - Download receipt from row/card.
   - Expected: CSV file generated.
4. Send receipt action:
   - Trigger send receipt.
   - Expected: success or actionable error toast.

## Maintenance UX (Desktop + Mobile)
1. Search and empty state:
   - Enter unmatched query.
   - Expected: clear "No maintenance requests found" state.
2. Mobile list behavior:
   - At small viewport, verify request cards show title, status, priority, and date.
3. Status transition quick action:
   - Mark a request completed or reopen from mobile quick action.
   - Expected: row/card updates and notification flow triggers.
4. Edit flow:
   - Open edit dialog, modify fields, save.
   - Expected: updates persist and UI refreshes.

## Edge Security (High-Risk Functions)
1. CORS allowlist:
   - Call hardened endpoints from disallowed origin.
   - Expected: preflight or request denied.
2. Rate limiting:
   - Burst requests to:
     - `payment-checkout`
     - `verify-payment`
     - `invite-token`
     - `ai-chat`
       - `ai-suggest-reply`
       - `ai-smart-search`
       - `ai-financial-insights`
       - `ai-predictive-analytics`
       - `ai-document-intelligence`
       - `ai-maintenance-triage`
       - `ai-generate-description`
       - `ai-tenant-chatbot`
      - `guest-booking`
      - `accept-tenant-invite`
      - `send-tenant-invite`
      - `send-lease-email`
      - `shortlet-booking-email`
      - `send-exit-summary`
      - `check-lease-renewals`
      - `generate-invoice-pdf`
      - `generate-lease-pdf`
       - `send-payment-confirmation`
       - `send-maintenance-notification`
   - Expected: endpoint returns `429` once threshold is exceeded.
3. Signature validation (when enabled):
   - Send unsigned request where signature is required.
   - Expected: `401 Invalid request signature`.

## Build and Lint Gate
1. Build:
   - Run `npm run build`.
   - Expected: pass.
2. Targeted lint for touched files:
   - Run targeted `eslint` on modified files.
   - Expected: no new lint errors introduced by Week 1 changes.

## Dashboard UX Fallback
1. Stats load failure behavior:
   - Simulate stats fetch failure (network off or backend unavailable).
   - Expected: dashboard fallback card appears with reload and reports actions.
2. Mobile readability:
   - Verify KPI and financial cards stack cleanly on narrow screens.
   - Expected: no clipped content or horizontal overflow.

## Release Decision
1. Block release if any auth guard, payment verification, or maintenance status update flow fails.
2. Log all non-blocking issues with owner and ETA.
3. Capture tested commit hash and environment in release notes.
