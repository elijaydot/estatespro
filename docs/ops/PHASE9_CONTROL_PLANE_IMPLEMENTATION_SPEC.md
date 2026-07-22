# Phase 9 Control Plane Implementation Spec

## Completion Snapshot (2026-07-22)
- Sprint 1 and Sprint 2 MVP scope implemented in `src/pages/SuperAdminControlPlane.tsx` and supporting hooks/utilities.
- Control plane filters support UUID + friendly search with searchable dropdowns for company/user/correlation.
- CSV/JSON exports implemented across tabs, including analytics/ops rows.
- Week3 regression suite expanded and green across state, filters, exports, correlation, analytics, and views.

## Objective
Implement the approved Phase 8 IA as a production-ready dashboard with robust query performance, policy-safe data access, and operational workflows.

## Sprint Plan
### Sprint 1 (MVP Foundations)
1. Query contracts
- Add typed query adapters for all primary dashboard panels.
- Add normalized filter payload shape shared across tabs.

2. Control plane UI shell
- Global filter bar with synchronized tab behavior.
- URL state persistence for filters and active tab.

3. Core data panels
- Alerts panel
- Events panel
- Entitlement decisions panel
- Usage snapshots panel

4. Operator governance
- Operator role assignment and revoke workflows.
- Display policy-intent warnings where writes are restricted.

### Sprint 2 (MVP Completion)
1. Company 360 and User 360 pages.
2. Correlation timeline drill-down view.
3. Export actions for CSV and JSON.
4. Synthetic event action panel for non-production test environments.
5. Phase 9 regression tests and release gates.

## Enterprise Hardening (Sprints 3-6)
1. Anomaly scoring and risk bucketing.
2. Retention jobs and archive pipelines.
3. Tamper evidence checks and signed export manifests.
4. Incident workflow integrations and runbook deep links.

## Technical Deliverables
- Hooks:
  - src/hooks/useControlPlane.ts expansion with filter-first API
- Pages:
  - src/pages/SuperAdminControlPlane.tsx split into screen modules
- Components:
  - src/components/control-plane/*
- Tests:
  - tests/week3/control-plane-filters.test.ts
  - tests/week3/control-plane-operator-roles.test.ts
  - tests/week3/control-plane-correlation.test.ts

## Non-functional Requirements
- Table and list queries must remain responsive at 10k+ rows with filters.
- All user-facing writes must emit governance events.
- Errors must present actionable operator messages.

## Exit Criteria
1. Lint/build/tests green.
2. Super admin workflows complete with drill-down and export.
3. Operator roles validated against RLS expectations.
4. Runbook updated with test matrix and rollback notes.
