# FishGate Remaining Scope (Whole App)

## Current Status Snapshot
- Week 1 delivery: foundational hardening, route-role enforcement, mobile UX pass on key screens, and security CORS/rate-limit rollout.
- Week 2 delivery: integration test harness, payment idempotency hardening, and observability/audit event plumbing.
- Control Plane Phases A-C: implemented through server-paginated safety operations and deep Company/User 360 reads.
- Production build: passing as of 2026-08-12.
- Week 4 tests: 253 passing across 51 files as of 2026-08-12.
- Dependency audit: passing with 0 low, 0 moderate, 0 high, and 0 critical findings as of 2026-08-12.
- Full lint: passing with 0 errors and 0 warnings as of 2026-08-12.

## What Is Still Left (Critical to World-Class)

### 1) Dependency and Runtime Security Hardening
1. Completed the compatible React Router and PostCSS security upgrades.
2. Completed non-forced transitive dependency remediation.
3. Keep `npm run check:audit` in the release gate and review new findings as dependencies change.

### 2) Type Safety and Lint Debt Burn-down
1. Removed the 34 explicit-any errors from billing, catalog, owner-group, and upgrade surfaces.
2. Added typed local models for relation-heavy Supabase responses that are not yet in generated schema types.
3. Full app and edge function lint now passes with zero errors and warnings.

### 3) Core Workflow Reliability
1. Expand integration tests from happy-path/idempotency into full matrix:
   - payment retries and partial payments
   - guest booking cancellation race conditions
   - tenant invite and acceptance lifecycle
2. Add failure injection tests for provider/network timeouts.

### 4) Monitoring and Incident Readiness
1. Wire alerts to emitted audit events and edge failures in real monitoring stack.
2. Add runbooks for payment and booking incident classes.
3. Add dashboard for key SLOs:
   - payment success rate
   - verify duplicate rate
   - error rate by edge function

### 5) Mobile UX to World-Class Standard
1. Mobile menu is solid baseline but not yet world-class.
2. Improve IA and speed:
   - prioritize top tasks
   - quick actions
   - section grouping
   - reduced scroll depth
3. Add mobile usability and accessibility pass:
   - focus order
   - larger touch targets
   - stronger active state and context cues

### 6) Product Completeness and Ops
1. Strengthen reports and analytics depth.
2. Finalize billing/settlement edge cases and reconciliation reports.
3. Add production readiness checks:
   - backup/restore drill
   - migration rollback test
   - deployment checklist automation

## Suggested Sequencing
1. Week 3: reliability + test expansion + dependency security upgrades.
2. Week 4: polish + mobile nav refinement + full release hardening and go-live gate.

## CRM Parity Program Docs
1. Master plan: docs/parity/CRM_PARITY_MASTER_PLAN.md
2. Scorecard baseline: docs/parity/CRM_PARITY_SCORECARD.md
3. Wave 1 execution: docs/parity/WAVE_1_IMPLEMENTATION.md
4. SLO/SLI operations plan: docs/ops/SLO_SLI_PLAN.md
