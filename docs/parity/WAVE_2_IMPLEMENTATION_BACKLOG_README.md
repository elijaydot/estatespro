# Wave 2 Implementation Backlog (Marketplace + CRM)

## 1) Purpose
Wave 2 converts the Marketplace CRM foundation into a production-ready operating system for lead conversion, trust operations, and downstream property management handoff.

This backlog defines the complete implementation scope needed to close functional gaps across:
- Public Marketplace
- Verification
- Moderation
- Marketplace CRM modules
- Cross-system conversion into core property management

## 2) Product Model and Boundaries
Wave 2 follows a four-surface architecture. Each surface remains valid and non-redundant.

1. Public Marketplace (external user surface)
- Public users browse listings and submit intent.
- Main objective: demand generation and inquiry capture.

2. Verification (trust qualification surface)
- Publisher and document trust checks.
- Main objective: identity and legitimacy assurance before/while listing is live.

3. Moderation (policy and abuse surface)
- Content and behavior enforcement workflows.
- Main objective: keep marketplace safe and policy compliant.

4. Marketplace CRM (internal operations surface)
- Lead-to-deal execution engine for teams.
- Main objective: conversion, revenue tracking, and service delivery coordination.

Wave 2 rule:
- CRM does not replace Marketplace, Verification, or Moderation.
- CRM orchestrates post-inquiry execution and conversion.

## 3) Current State Summary
Implemented foundation:
- Core CRM schema and RLS baseline for accounts, deals, meetings, calls, campaigns, documents, visits, projects.
- Basic CRM menus and route wiring.
- Reviewer queue, reviewer decisions, SLA indicators, and audit listing.
- Initial reviewer integration tests and helper unit tests.

Remaining gap:
- Deep business workflows, automation, analytics, data quality, and property-management handoff logic are not complete.

## 4) Wave 2 Objectives
1. Make each CRM menu operationally complete for daily team execution.
2. Formalize handoff from marketplace lead pipeline into property operations.
3. Preserve trust surfaces (verification/moderation) while integrating with CRM actions.
4. Introduce production-grade quality bars for reliability, observability, and governance.

## 5) End-to-End Real-World Flow (Target)
1. Public user browses listing in Public Marketplace.
2. User submits inquiry.
3. Inquiry becomes a lead in CRM.
4. Team qualifies lead and links lead to contact/account context.
5. Team executes calls, meetings, visits, and follow-up tasks.
6. Team advances deal pipeline to outcome.
7. On closed won, system initiates property management handoff:
- Lease workflow creation
- Tenant record creation/update
- Unit/property occupancy transition preparation
8. Post-conversion lifecycle moves into core property management:
- Invoices, payments, maintenance, renewals, and exits

## 6) Wave 2 Workstreams

### Workstream A: CRM Functional Depth by Menu

#### A1. Accounts
Must implement:
- Account profile completeness rules.
- Account ownership reassignment.
- Account-level timeline (calls, meetings, visits, tasks, documents).
- Duplicate detection and merge workflow.

Logic:
- Account confidence score = weighted profile completeness + interaction recency.
- Duplicate candidates triggered by fuzzy match on name + phone + website domain.

Acceptance:
- User can merge duplicate accounts with audit trail.
- Account timeline is queryable and filterable by activity type/date.

#### A2. Contacts
Must implement:
- Contact role tagging (decision maker, agent, occupant, guarantor, legal).
- Preferred communication channels and consent state.
- Contact dedupe and merge.
- Contact engagement score.

Logic:
- Consent state gates outbound campaign eligibility.
- Channel preference influences task/campaign default action.

Acceptance:
- Campaign send list excludes non-consented contacts by default.
- Contact merge retains source lineage in audit notes.

#### A3. Deals
Must implement:
- Stage transition rules and mandatory fields by stage.
- Win/loss reason taxonomy.
- Revenue forecasting views and weighted pipeline.
- Deal SLA aging and stagnation alerts.

Logic:
- Weighted amount = amount * probability.
- Stage move blocked when mandatory artifacts are missing.

Acceptance:
- Invalid stage transitions are blocked with explicit reason.
- Forecast dashboard supports by-owner and by-company views.

#### A4. Meetings and Calls
Must implement:
- Call outcome templates and follow-up generation.
- Meeting action items with owner and due date.
- Reminders/escalations for missed follow-ups.

Logic:
- Certain call outcomes auto-create task templates.
- Meeting completion requires note or disposition before close.

Acceptance:
- Call and meeting dispositions update deal/lead last activity atomically.

#### A5. Campaigns
Must implement:
- Segmented audience builder.
- Campaign attribution to lead/deal outcomes.
- Channel-level KPI cards and cohort analytics.

Logic:
- Attribution model v1: first-touch + last-touch dual reporting.
- ROI = attributable revenue - campaign spend.

Acceptance:
- Campaign detail page shows attributable leads, deals, and conversion rate.

#### A6. Documents
Must implement:
- Document categories and lifecycle states.
- Version history and replacement policy.
- Expiry metadata and proactive reminders.

Logic:
- State machine: draft -> submitted -> approved/rejected -> archived.
- Rejection requires reason code and optional reviewer notes.

Acceptance:
- Document versions remain immutable once superseded.

#### A7. Visits
Must implement:
- Robust mobile check-in/check-out flow.
- Geolocation sanity bounds and proof enforcement.
- Visit outcome templates and next-step automation.

Logic:
- Check-in allowed only when status is planned/in_progress.
- Check-out on completed requires proof_path and outcome.

Acceptance:
- Visit completion without required proof is blocked.

#### A8. Projects and Tasks
Must implement:
- Project milestones, dependencies, and progress rollup.
- Task priority, SLA timers, and escalation routing.
- Workload and overdue dashboards.

Logic:
- Project progress computed from weighted milestone completion.
- Overdue tasks trigger escalation to manager after configured threshold.

Acceptance:
- Team can filter workloads by owner, due date, and status.

### Workstream B: Automation Engine v1
Must implement:
- Trigger-condition-action automation for CRM events.
- Retry and failure handling with audit trail.

Event examples:
- Lead created
- Deal stage changed
- Document approved/rejected
- Visit completed

Actions examples:
- Create follow-up task
- Notify assignee
- Move deal stage suggestion
- Trigger lease-prep checklist

Acceptance:
- Every automation execution logs trigger payload, condition result, action status, and correlation id.

### Workstream C: Marketplace, Verification, and Moderation Continuity
Must implement:
- Explicit menu and role boundaries in UI.
- Cross-links from verification/moderation outcomes into CRM entities.
- Shared audit trace identifiers across all three surfaces.

Logic:
- Verification rejection can flag related leads/deals as trust-review required.
- Moderation escalation can temporarily restrict campaign or listing operations.

Acceptance:
- Reviewer action can be traced from queue event to impacted CRM entity.

### Workstream D: Public Marketplace Integration
Must implement:
- Public listing funnel analytics tied to CRM outcomes.
- Listing-to-lead conversion reporting by location/type/price band.
- Quality scoring that combines listing engagement and trust status.

Logic:
- Public impressions/clicks/inquiries linked to CRM lead_id where possible.

Acceptance:
- Team can identify top converting listing cohorts and trust friction points.

### Workstream E: Property Management Handoff
Must implement:
- Closed-won handoff protocol into property operations.
- Tenant/unit/lease draft creation workflows.
- Handoff checklist and completion states.

Logic:
- Closed-won requires handoff package validation (contact, unit/listing, financial summary).
- Handoff failure keeps deal in closed-won-pending-handoff substate.

Acceptance:
- End-to-end handoff run writes audit event chain for compliance.

### Workstream F: Data Quality, Governance, and Security
Must implement:
- Data integrity checks and dedupe jobs.
- Audit event normalization for key state transitions.
- Role matrix tests for CRM and reviewer paths.

Logic:
- Manager and landlord permissions differ for delete operations.
- Sensitive action events include actor, entity, before/after metadata.

Acceptance:
- Role misuse scenarios fail in automated policy tests.

### Workstream G: Reporting and Operational Intelligence
Must implement:
- Pipeline aging and bottleneck reports.
- Conversion funnel by source and campaign.
- Team performance and SLA compliance reports.

Logic:
- Reports include date-scope controls and company/owner filters.
- Key metrics computed with consistent definitions shared in docs.

Acceptance:
- Report queries meet agreed baseline latency profile on staging-sized data.

### Workstream H: Reliability, Testing, and Release Controls
Must implement:
- Integration tests for end-to-end lead-to-handoff paths.
- Policy and permission tests for verification/moderation/CRM intersections.
- Smoke tests for core menu flows in CI.

Acceptance:
- Release blocked on failing high-priority test suites.
- Staging runbook executed with evidence links before production release.

## 7) Technical Backlog by Layer

### Frontend
- Replace list-only CRM screens with full create/read/update state workflows.
- Add robust empty/loading/error states for each CRM module.
- Add activity timeline widgets and entity relation side panels.

### Backend / Data
- Add missing relational constraints and helper functions for handoff logic.
- Add event outbox or reliable queue pattern for automation actions.
- Add materialized views or optimized query paths for heavy reports.

### Integrations
- Optional channel integrations (email/SMS/WhatsApp) with consent checks.
- Calendar integration for meetings.
- File storage metadata lifecycle hooks for document versioning.

### Observability
- Add SLA metrics for deal aging, task overdue rates, and reviewer throughput.
- Add alerting thresholds and runbook links for operational incidents.

## 8) Wave 2 Milestones

### Milestone 1: CRM Core Behavior Complete
Scope:
- Accounts, Contacts, Deals, Calls, Meetings, Tasks foundational behavior complete.
Exit criteria:
- Stage rules and follow-up automation operational.

### Milestone 2: Trust and Marketplace Coupling
Scope:
- Verification/moderation impacts visible inside CRM.
- Public marketplace funnel tied to CRM outcomes.
Exit criteria:
- Cross-surface traceability verified.

### Milestone 3: Handoff to Property Operations
Scope:
- Closed-won conversion into tenant/lease workflows.
Exit criteria:
- Handoff checklist and audit chain complete in staging.

### Milestone 4: Reporting and Release Hardening
Scope:
- Reporting pack, SLA dashboards, release gates, runbooks.
Exit criteria:
- Deployment-ready with evidence-based signoff.

## 9) Done Definition for Wave 2
1. All CRM menus have actionable workflows beyond simple list/create stubs.
2. Marketplace, Verification, Moderation, and CRM integration is traceable and role-safe.
3. Closed-won to property-management handoff is operational and tested.
4. Report pack and SLA monitoring are live in staging.
5. CI includes functional, integration, and policy tests as release blockers.
6. Staging runbook and release checklist completed with evidence.

## 10) Priority Order (Execution Sequence)
1. Deals + contacts + tasks behavior depth.
2. Calls/meetings/visits execution reliability.
3. Automation engine v1.
4. Trust-to-CRM coupling.
5. Marketplace funnel analytics.
6. Closed-won property-management handoff.
7. Reporting and operational hardening.

## 11) Risks and Mitigations
1. Risk: CRM breadth outruns quality.
- Mitigation: milestone gates and release blockers for core paths.

2. Risk: Trust workflows become detached from revenue workflows.
- Mitigation: mandatory cross-surface trace ids and linked entity references.

3. Risk: Conversion handoff creates inconsistent property records.
- Mitigation: handoff validation and transactional workflow boundaries.

4. Risk: Reporting queries degrade performance.
- Mitigation: indexed reporting paths and staged load testing.

## 12) Implementation Readiness Checklist
1. Confirm Wave 2 scope lock and owner map per workstream.
2. Break each workstream into ticket-level tasks with estimates.
3. Define schema migration batches per milestone.
4. Define test matrix and CI gating order.
5. Define staging evidence template for each exit criterion.

## 13) Immediate Next Step
Start Milestone 1 implementation by executing Workstream A1-A4 ticket set first, while scaffolding Workstream B automation primitives in parallel.
