# FishGate Remaining Scope (Whole App)

## Current Status Snapshot
- Week 1 delivery: foundational hardening, route-role enforcement, mobile UX pass on key screens, and security CORS/rate-limit rollout.
- Week 2 delivery: integration test harness, payment idempotency hardening, and observability/audit event plumbing.
- Build: passing.
- Week 2 tests: passing.

## What Is Still Left (Critical to World-Class)

### 1) Dependency and Runtime Security Hardening
1. Resolve npm audit findings (currently moderate/high items).
2. Upgrade vulnerable toolchain packages (vite/rollup/postcss and transitive deps).
3. Re-run security scan and document residual accepted risk.

### 2) Type Safety and Lint Debt Burn-down
1. Large explicit-any footprint remains across hooks/pages.
2. Complete typed data models for relation-heavy Supabase responses.
3. Move from targeted lint pass to full clean lint gate for app and edge function TS.

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
