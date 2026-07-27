# Week 3 Control Plane: Staging UAT and Release Readiness

Date: 2026-07-27
Branch: feat/saas
Scope: Finish practical execution for remaining control-plane rollout work items 1 and 3 after completing item 2 test hardening.

## Item 2 Status (Completed)

Implemented and validated deterministic revocation-history pagination/filter behavior coverage.

Changes:
- Added behavior helper: src/lib/controlPlaneRevocationHistory.ts
- Wired Safety revocation table controls to helper logic: src/pages/SuperAdminControlPlane.tsx
- Added regression tests: tests/week3/control-plane-revocation-history-pagination.test.ts

Validation:
- npm run test -- tests/week3/control-plane-revocation-history-pagination.test.ts tests/week3/control-plane-state.test.ts tests/week3/control-plane-safety-timeline.test.ts tests/week3/control-plane-exports.test.ts tests/week3/control-plane-analytics.test.ts
- npm run build
- npm run lint

## Item 1: Staging UAT Pass (Role Boundaries + High-Risk Actions)

Use this matrix in staging with real role-segregated users.

### Test Accounts

- Super Admin test user
- Billing Operator test user
- Support Operator test user
- Security Auditor test user
- Non-privileged PM test user

### A. Access and Role Gating

1. Sign in as Non-privileged PM.
- Try loading Super Admin Control Plane.
- Expected: access denied or redirected from privileged routes.

2. Sign in as Billing Operator.
- Open Monetization tab.
- Expected: can view billing context and perform billing actions only.
- Expected: cannot perform safety-only actions (suspension, impersonation start/stop, risk triage) unless role includes that capability.

3. Sign in as Support Operator.
- Open Safety tab.
- Expected: can perform support/safety actions allowed by policy.
- Expected: cannot perform privileged billing plan mutation unless explicitly permitted.

4. Sign in as Security Auditor.
- Open Safety tab.
- Expected: read + allowed audit/triage actions per policy.
- Expected: blocked from billing mutations.

5. Sign in as Super Admin.
- Validate all tabs and actions available.

### B. Safety Action Workflows

1. Triage Risk Queue.
- Perform Ack, Resolve, Escalate, False Positive actions.
- Expected: success toast, triage history row appears, timeline updates.

2. Revoke Active Sessions.
- Revoke for one user principal and one company principal.
- Expected: revocation history row appears with counts and reason.
- Expected: timeline includes revocation event with matching data.

3. Principal Suspension.
- Suspend then unsuspend a user.
- Suspend then unsuspend a company.
- Expected: active suspension table updates after each action.

4. Impersonation Session.
- Start session with reason.
- Stop session.
- Expected: session appears/disappears in active list and audit traces exist.

### C. Revocation History Pagination and Filters

1. In Safety tab, set principal filter to All.
- Page through at least 3 pages.
- Expected: Prev/Next disabled at correct boundaries.

2. Switch principal filter All -> User -> Company.
- Expected: current page resets to 1 each time.
- Expected: row set updates to matching principal type.

3. Apply time range and correlation filter.
- Expected: revocation table and safety timeline remain consistent with current filters.

### D. Evidence to Capture

- Screenshots of each role behavior and blocked action.
- CSV export sample for Safety and Monetization tabs.
- Audit event IDs/correlation IDs for high-risk actions.
- Any failed expectation with exact timestamp and user role.

## Item 3: Release Readiness Pass

## Pre-Release Checklist

1. Migration state
- Confirm 20260727013000 migration is applied in staging and production rollout plan includes it.

2. Build and lint
- npm run build
- npm run lint
- Acceptable baseline: existing single warning in src/components/marketplace-crm/CrmWorkspace.tsx

3. Tests
- Run week3 control-plane focused tests:
  - tests/week3/control-plane-revocation-history-pagination.test.ts
  - tests/week3/control-plane-state.test.ts
  - tests/week3/control-plane-safety-timeline.test.ts
  - tests/week3/control-plane-exports.test.ts
  - tests/week3/control-plane-analytics.test.ts

## Performance Spot Checks (Staging DB)

Run after representative action load.

1. Verify revocation feed index exists:

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'platform_audit_events'
  AND indexname = 'idx_platform_audit_events_revocation_feed';

2. Plan check for revocation history RPC query predicate:

EXPLAIN (ANALYZE, BUFFERS)
SELECT e.id
FROM public.platform_audit_events e
WHERE (e.event_type = 'session.revocation.applied' OR e.action = 'revoke_active_platform_sessions')
ORDER BY e.created_at DESC
LIMIT 50;

3. Optional function call timing sample (if pg_stat_statements enabled):

SELECT
  query,
  calls,
  mean_exec_time,
  rows
FROM pg_stat_statements
WHERE query ILIKE '%platform_get_session_revocation_history_page%'
ORDER BY calls DESC
LIMIT 5;

Targets:
- Index-backed plan chosen for revocation feed predicate.
- Stable latency for first-page and middle-page calls under staging load.

## Go/No-Go Criteria

Go when all are true:
- UAT matrix has no severity-1 or severity-2 failures.
- Role boundaries are enforced exactly as expected.
- Revocation history pagination/filter behavior passes manually and in automated tests.
- Build/lint/tests are green with only known baseline warning.
- No significant query regression observed in revocation feed checks.

No-Go if any are true:
- Unauthorized role can mutate privileged resources.
- Safety actions fail to emit expected timeline/history updates.
- Revocation history paging or filter resets behave inconsistently.
- Significant performance degradation in revocation feed access path.
