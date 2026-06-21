# Wave Execution Board

## Program Goal
Deliver CRM parity by shipping production-safe capability waves with measurable operational outcomes.

## Wave 1: Reliability + Foundation (In Progress)
Status: 88%

Done:
- Shared payment request contract parser and normalized error envelope deployed in checkout/verify paths.
- Reliability tests added for idempotency, contract smoke checks, retries/timeouts, partial reconciliation, and cancel/pay race invariant.
- Timed audit telemetry introduced for payment request completion and gateway interaction duration.

Left:
- Staging validation report for payment SLO candidate thresholds.
- Final acceptance signoff against Wave 1 done-definition checklist.

## Wave 2: Feature Breadth (In Progress)
Status: 92%

Backlog:
- docs/parity/WAVE_2_IMPLEMENTATION_BACKLOG_README.md
- docs/parity/WAVE2_CRM_STAGING_EVIDENCE.md
- docs/parity/WAVE2_CRM_SIGNOFF.md

Done in current increment:
- Milestone 1-3 core migration applied (stage governance, trust flags, handoff prep, funnel view).
- Deals workflow uses governed stage transition path with closed-won gate checks.
- Tasks and meetings now include status actions for operational execution.
- Calls workflow captures lead linkage and result disposition for follow-up automation triggers.
- Visits workflow now supports check-in and completion lifecycle with proof/outcome capture.
- Reports now expose live pipeline, execution, trust, and handoff analytics (not just static report list).
- CRM reporting helper tests added and passing.
- Automation engine v1 migration added with generic rules and run logs (`crm_automation_rules`, `crm_automation_runs`).
- Automation trigger hooks added for deal stage changes, call logs, meeting completion, and visit completion events.
- End-to-end handoff completion function added (`crm_complete_handoff`) to create tenant + lease draft and finalize handoff.
- Reports hardened with owner/date controls and filter-aware analytics calculations.
- Governance release-gate test suite added for role-matrix and audit trace guarantees.
- Automation admin module added (route/nav/page) with rule creation, activation toggles, and run history filters.
- Contacts workflow upgraded with duplicate detection buckets, merge actions, and inline channel updates.
- Campaigns workflow upgraded with inline lifecycle/status and KPI metric editing controls.
- Projects workflow upgraded with SLA pressure metrics, inline lifecycle edits, and quick status transitions.
- Workflow helper utilities and tests added for duplicate detection and project SLA summary calculations.
- Documents workflow upgraded with governed lifecycle states (draft/review/approve/reject/archive), compliance state, expiry, and review notes controls.
- Automation operations upgraded with manual replay action for failed/pending runs and backend replay RPC with audit trace.
- New governance migration/tests added for document lifecycle constraints and automation replay permissions.
- Ownership reassignment controls added across remaining owner-capable modules (Accounts, Deals, Projects) for create/edit lifecycle depth.
- Latest Wave 2 migration tranche applied in staging (operator confirmed).
- Repo-side quality gate pass captured for candidate `37daac9` (lint/test/build).

Left to close Wave 2:
- Execute staging validation and populate evidence outputs in `docs/parity/WAVE2_CRM_STAGING_EVIDENCE.md`.
- Collect approval matrix signatures in `docs/parity/WAVE2_CRM_SIGNOFF.md`.

Next Build Set:
- Workflow automation v1: event trigger -> condition check -> action dispatch.
- Approval path v1 for listing moderation and invoice exception approvals.
- Reporting pack v1: pipeline aging, payment conversion, exception cohorts.

Quality Bar:
- Every workflow path emits audit trace and retry metadata.
- Every report query has a baseline SLA and sample load profile.

## Wave 3: Ecosystem + Integrations (Scaffold Planned)
Status: 72%

Next Build Set:
- Public API contract versioning policy and changelog gates.
- Webhook delivery core (signature, retries, dead-letter queue model).
- Integration observability bundle (delivery rate, retry latency, dead-letter volume).

Completed Foundation:
- API versioning and compatibility policy published.
- Contract inventory CI guard active for contract-sensitive edge endpoints.
- Shared webhook delivery primitives implemented for signature verification, retry eligibility, and exponential backoff.
- Webhook dead-letter and delivery-attempt persistence schema added.
- Versioned webhook event envelope contract introduced (`v1.0`) with correlation propagation.
- verify-payment now dispatches `payment.verified` webhooks and records delivery attempts/dead-letter outcomes.
- Dead-letter replay helper function added: `public.replay_webhook_dead_letter`.

Remaining for Wave 3 close:
- Apply webhook migrations and replay helper in staging/prod environments.
- Execute webhook staging runbook and attach evidence links.
- Optional: add background retry worker to process queued retry attempts asynchronously.

Quality Bar:
- Breaking contract changes blocked unless semver and migration notes are present.
- Webhook endpoint test matrix includes replay, signature failure, and timeout.

## Wave 4: Enterprise + Compliance (Backlog Prepared)
Status: 5%

Next Build Set:
- RBAC policy matrix and permission verification tests.
- SSO/SAML/SCIM decision record and rollout plan.
- Audit evidence pipeline for operational and security controls.

Quality Bar:
- Evidence freshness policy enforced in CI for mandatory controls.
- Tenant boundary and impersonation tests become release blockers.

## Wave 5: Product Polish + GTM Hardening (Backlog Prepared)
Status: 6%

Next Build Set:
- Guided onboarding for landlord, property manager, and tenant personas.
- High-frequency workflow speedups for payment, booking, and maintenance operations.
- Support and release readiness bundle (runbooks, diagnostics, docs).

Quality Bar:
- Time-to-first-value benchmark reduced by agreed target.
- Top-10 support friction points show measurable reduction.

## Execution Rhythm
- Monday: scope lock and risk update.
- Wednesday: architecture checkpoint and dependency burn-down.
- Friday: evidence-based readiness review and score update.

## Fast-Track UX Sprint (2-Day)
- Execution plan: `docs/parity/UI_UX_2DAY_EXECUTION_PLAN.md`
- Scope is intentionally no-break and UI-layer focused.
