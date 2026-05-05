# Week 2 Validation Checklist (FishGate)

## Goal
Validate core workflow integration, payment verification idempotency, and monitoring/audit coverage before merge.

## Prerequisites
1. Run `npm ci`.
2. Run `npm run build`.
3. Run `npm run test:week2`.
4. Apply latest Supabase migrations in staging, including:
   - `20260505103000_week2_observability_and_payment_idempotency.sql`
5. Use `WEEK2_STAGING_RUNBOOK.md` for exact API and SQL validation steps.

## 1. Core Workflow Integration Tests
1. Automated suite:
   - `npm run test:week2`
   - Expected: pass for `tests/week2/core-workflows.integration.test.ts`.
2. Guest booking flow (manual):
   - Create shortlet booking and trigger checkout (`payment-checkout`).
   - Verify payment (`verify-payment`).
   - Expected: booking and invoice move to paid/partial correctly.
3. Tenant invoice flow (manual):
   - Start checkout for tenant invoice.
   - Verify payment.
   - Expected: invoice paid_amount/status update correctly.

## 2. Payment Verification and Idempotency Checks
1. Duplicate verify protection:
   - Call `verify-payment` twice with same `invoiceId` + `reference`.
   - Expected: second response returns `alreadyProcessed: true` and no duplicate payment row.
2. Database uniqueness guard:
   - Attempt to insert duplicate `(invoice_id, reference)` payment directly.
   - Expected: unique index violation.
3. Amount clamp behavior:
   - Verify with provider amount > invoice remaining balance.
   - Expected: recorded amount does not exceed remaining balance.

## 3. Monitoring, Alerting, and Audit Coverage
1. Audit events emitted:
   - Execute successful and failure paths in `payment-checkout` and `verify-payment`.
   - Expected: records in `public.audit_events` with `event_type`, `source`, `severity`, and `created_at`.
2. Correlation ID propagation:
   - Include optional `correlationId` in request body.
   - Expected: same ID appears in API response and audit event rows.
3. Idempotency observability:
   - Trigger duplicate verify call.
   - Expected: `payment.verify.idempotent_duplicate` event captured.
4. Alerting thresholds (ops):
   - Warning alert when `payment.verify.rate_limited` spikes.
   - Error alert when `payment.checkout.failed` or `payment.verify.failed` exceeds baseline.

## Release Gate
1. Block release if integration tests fail.
2. Block release if duplicate verification creates extra payment rows.
3. Block release if `audit_events` table receives no events for exercised flows.
4. Document environment, commit hash, and test evidence in release notes.
