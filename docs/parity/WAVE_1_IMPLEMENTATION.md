# Wave 1 Implementation (Next 2 Weeks)

## Goal
Convert parity planning into immediate, testable operational upgrades with minimal product risk.

## Workstreams

### 1) Reliability Matrix Expansion
- Extend integration tests:
  - payment retries + timeout handling
  - partial payment reconciliation
  - guest booking cancel/pay race conditions
  - invite acceptance lifecycle edge cases

Deliverables:
- New test cases under tests/week2 or tests/week3.
- CI includes these tests in blocking gate.

### 2) Observability & SLO Baseline
- Add function-level SLI instrumentation and dashboards.
- Define and codify SLO thresholds for payment/booking critical path.
- Add alert routing and owner mapping.

Deliverables:
- SLO dashboard and alert definitions.
- Runbook links included in alert metadata.

### 3) Platform Contract Baseline
- Enumerate and document existing API and edge function contracts.
- Add request/response schema snapshots for critical endpoints.
- Define backward-compatibility policy.

Deliverables:
- Contract inventory doc.
- Versioning policy draft and migration guidelines.
- Initial inventory created: docs/parity/API_CONTRACT_INVENTORY.md

## Done Definition (Wave 1)
1. Lint/build/tests green.
2. New reliability tests merged and passing.
3. SLO dashboard + alerting verified in staging.
4. Contract inventory reviewed and approved.

## Current Execution Snapshot (2026-06-18)

Completed:
- Payment checkout and verification contract parsing normalized via shared module.
- Unified payment error envelope established (`errorCode`, `correlationId`, `success`).
- Reliability-focused tests added for contract smoke, idempotency, retries/timeouts, partial reconciliation, and cancel/pay race invariant.
- Timed audit telemetry added for payment request duration and gateway interaction duration.

Remaining:
- Edge-handler integration tests (mocked Supabase + gateway network behavior).
- Staging SLO validation and alert routing dry-run.
- Wave 1 acceptance review against done definition with evidence links.
