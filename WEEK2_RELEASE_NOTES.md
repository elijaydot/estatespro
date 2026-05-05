# FishGate Week 2 Release Notes

## Release Scope
Week 2 focuses on payment reliability, workflow test coverage, and observability.

## Included

### Quality and Testing
- Added Week 2 automated test suite coverage for:
  - Core checkout and verify workflow paths.
  - Payment verification idempotency scenarios.
- Added Week 2 CI quality workflow.

### Payments Reliability
- Enforced payment idempotency at the database layer with a unique invoice/reference index.
- Added migration-time duplicate cleanup to prevent index creation failures.

### Monitoring and Auditability
- Added audit event logging for critical payment flows.
- Added correlation IDs to checkout and verify responses for traceability.
- Added event coverage for success, duplicate, invalid-signature, rate-limit, and failure cases.

## Operational Notes
1. Required migration:
   - supabase/migrations/20260505103000_week2_observability_and_payment_idempotency.sql
2. Required functions in deployment:
   - payment-checkout
   - verify-payment
3. Validation docs:
   - WEEK2_TEST_CHECKLIST.md
   - WEEK2_STAGING_RUNBOOK.md

## Expected Outcomes
- Duplicate verify requests no longer create duplicate payments.
- Faster incident triage with correlation IDs and structured audit events.
- Stronger confidence in payment flows through repeatable Week 2 tests.

## Known Non-Blocking Items
- Frontend bundle size warnings remain and are unchanged in this release.
- Browserslist data warning remains; update can be scheduled as maintenance.
