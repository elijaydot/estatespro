# World-Class Control Plane Execution Plan (Items 1-13)

Date: 2026-07-26
Owner: Platform / Super Admin Workstream
Branch: feat/saas

## Goal
Close all open and partial gaps from items 1-13 with production-grade capabilities, role boundaries, auditability, and scale-safe pagination.

## Current Closure Snapshot

1) Company directory/management: PARTIAL
2) User directory/management: PARTIAL
3) Property/unit portfolio visibility: NOT DONE
4) Admin subscription/plan management: PARTIAL
5) Add-on management: NOT DONE
6) Manual entitlement override: NOT DONE
7) Billing/revenue control-plane view: PARTIAL
8) billing_operator role capability: PARTIAL (label only)
9) Impersonation: NOT DONE
10) abuse_signals/risk_decisions operationalized: NOT DONE
11) Suspend/kill-switch for company/user: NOT DONE
12) Real server-side pagination: NOT DONE
13) Business/adoption metrics: PARTIAL

## Delivery Program

### Phase A - Control Room Foundations (1, 2, 3, 12)
1. Add paginated company directory RPC + UI tab.
2. Add paginated user directory RPC + UI tab.
3. Add company profile panel with:
   - company core metadata
   - property count
   - unit count
   - tenant count
4. Replace fixed top-N data pulls with server-side paginated queries.

Acceptance criteria:
- Super admin can search any company/user globally by UUID/name/email.
- Lists support next/previous pages and display total count.
- Company profile shows portfolio size with source-of-truth counts.

### Phase B - Billing & Monetization Operations (4, 5, 7, 8, 13)
1. Add admin subscription console:
   - view current plan by company
   - change plan, trial extension, cancel/reactivate
2. Add add-on management panel:
   - enable/disable add-ons per company
   - effective entitlement preview
3. Add billing operator guardrails:
   - enforce billing_operator role for billing write actions
4. Add revenue dashboard metrics:
   - MRR, ARR, plan mix, failed collections, dunning funnel
5. Add business adoption analytics:
   - total companies, active companies, tier distribution
   - feature adoption by plan tier
   - quota pressure cohorts

Acceptance criteria:
- Billing operator can perform billing operations without super admin rights.
- Per-company billing timeline and invoice/attempt history visible to admin.
- Revenue and adoption widgets pull from backend aggregate queries, not client-only reductions.

### Phase C - Safety, Risk, and Support Operations (6, 9, 10, 11)
1. Manual entitlement override system:
   - grant/revoke per entitlement key
   - reason required
   - expiry optional
   - full audit trail
2. Impersonation control-room flows:
   - issue time-boxed impersonation session
   - reason mandatory
   - banner and immutable audit events
   - one-click stop impersonation
3. Operationalize abuse/risk signals:
   - risk queue UI
   - review decisions and status transitions
4. Kill-switches:
   - company suspend/resume
   - user suspend/resume
   - forced session revocation

Acceptance criteria:
- Every privileged action emits correlated immutable audit events.
- Support can safely impersonate under policy constraints.
- Abuse/risk work queue supports triage and disposition.

### Phase D - Hardening & Readiness
1. Expanded test matrix:
   - unit tests for mapping/helpers
   - integration tests for RPC behavior
   - role authorization tests
2. Load checks for pagination endpoints.
3. Runbook and rollback notes for each feature family.

Acceptance criteria:
- CI green across test/lint/build.
- No uncontrolled privilege paths.
- Operational docs complete for on-call and support.

## Implementation Standards
1. All control-plane writes must be RPC-backed and role-gated.
2. Every mutate operation must include correlation IDs and audit events.
3. Every admin list must support server-side pagination with deterministic sorting.
4. Every high-risk action must require structured reason metadata.
5. Every UI action state must include loading/success/error and retry affordances.

## Immediate Next Coding Sequence
1. Implement Phase A RPCs + hooks + UI tabs.
2. Wire pagination state and controls into Control Plane.
3. Add Phase A automated tests.
4. Move to Phase B billing/admin management surfaces.
