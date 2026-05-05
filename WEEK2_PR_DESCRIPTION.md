# Week 2 Delivery: Integration, Payment Idempotency, and Observability

## Summary
This PR delivers Week 2 priorities across quality, payments, and operations readiness:
1. Core workflow integration tests.
2. Payment verification idempotency checks.
3. Monitoring, alerting, and audit event coverage.

## What Changed

### 1) Test Infrastructure + Week 2 Suites
- Added Vitest configuration and scripts.
- Added integration-style workflow tests for checkout and verify paths.
- Added payment idempotency unit/integration checks.

Files:
- package.json
- vitest.config.ts
- tests/week2/core-workflows.integration.test.ts
- tests/week2/payment-idempotency.test.ts

### 2) Payment Idempotency Hardening
- Added database unique index to prevent duplicate invoice/reference payment entries.
- Added migration cleanup for historical duplicate invoice/reference rows.

Files:
- supabase/migrations/20260505103000_week2_observability_and_payment_idempotency.sql

### 3) Monitoring and Audit Coverage
- Added shared observability helper for audit event emission and correlation IDs.
- Added payment checkout audit events:
  - payment.checkout.initiated
  - payment.checkout.invalid_signature
  - payment.checkout.rate_limited
  - payment.checkout.failed
- Added payment verify audit events:
  - payment.verify.initiated
  - payment.verify.invalid_signature
  - payment.verify.rate_limited
  - payment.verify.idempotent_duplicate
  - payment.verify.failed
- Added correlationId propagation in checkout and verify responses.

Files:
- supabase/functions/_shared/observability.ts
- supabase/functions/payment-checkout/index.ts
- supabase/functions/verify-payment/index.ts

### 4) Quality Gate + Execution Docs
- Added Week 2 CI workflow for build and Week 2 tests.
- Added Week 2 test checklist and staging runbook.

Files:
- .github/workflows/week2-quality.yml
- WEEK2_TEST_CHECKLIST.md
- WEEK2_STAGING_RUNBOOK.md

## Validation Evidence
- Week 2 tests: pass
  - npm run test:week2
- Build: pass
  - npm run build

## Migration and Deploy Notes
1. Apply migration in staging before running smoke checks:
   - supabase/migrations/20260505103000_week2_observability_and_payment_idempotency.sql
2. Ensure payment functions are deployed:
   - payment-checkout
   - verify-payment

## Risk and Rollback
- Main behavior changes are additive (audit events, correlation metadata) and should be low risk.
- Idempotency unique index can surface existing duplicate data issues; migration includes duplicate cleanup before index creation.
- Rollback path:
  1. Revert function changes.
  2. Drop unique index if emergency rollback required.
  3. Keep audit table (safe additive object) or archive rows as needed.

## Reviewer Focus Areas
1. Idempotency behavior under repeated verify requests.
2. Audit event schema and event naming consistency.
3. Correlation ID propagation in API responses and audit rows.
4. Migration safety on production-sized payment data.
