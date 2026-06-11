# FishGate Marketplace and CRM Implementation Blueprint

## Purpose

This document is the dedicated implementation blueprint for adding a verified public marketplace and lead CRM into FishGate without breaking core operations reliability.

Core principle:

FishGate is not a generic classifieds site.
FishGate is a verified supply and lead-to-lease conversion system integrated with landlord operations.

## Scope

This blueprint covers:

1. Infrastructure and URL strategy.
2. Service architecture and data flow.
3. API boundaries.
4. Database schema.
5. Moderation and fraud controls.
6. Reliability and security release gates.
7. A day-by-day 14-day owner board with exact deliverables by Backend, Frontend, QA, and Ops.

## Infrastructure and URL Strategy

### Domains

1. app.fishgate.com
- Authenticated landlord and manager workspace.

2. fishgate.com
- Public discovery and listing pages.

3. homes.fishgate.com (optional future)
- Dedicated marketplace surface if scale requires isolation.

### URL Structure

Search pages:
- /rent
- /rent/lagos
- /rent/lagos/lekki

Listing detail:
- /rent/lagos/lekki/2-bed-apartment-ikate-abc123

Company profile:
- /companies/prime-properties-ltd

Agent profile:
- /pros/john-doe-xyz

### Segmentation and Security

1. Public APIs
- Anonymous traffic, CDN cache, rate limits, bot protection.

2. CRM APIs
- Authenticated, RBAC, company-level isolation.

3. Moderation and risk APIs
- Internal service access only, full audit trail.

## Service Architecture

### Components

1. Public Marketplace Frontend
- Search, filters, listing pages, inquiry form.

2. FishGate App Surfaces
- Listing management, CRM board, moderation queue.

3. Backend Services
- Listing service.
- Lead and CRM service.
- Moderation and risk service.
- Search indexing worker.
- Event and analytics pipeline.

4. Data and Processing
- PostgreSQL source of truth.
- Outbox pattern for reliable async events.
- Worker queues and dead-letter handling.

### End-to-End Flow

Vacant unit -> publish -> listing live -> inquiry -> lead created -> CRM pipeline -> viewing -> offer -> lease created.

## API Boundaries

### Public Marketplace API

- GET /v1/public/listings
- GET /v1/public/listings/{id}
- GET /v1/public/companies/{slug}
- POST /v1/public/inquiries

Constraints:
- Public endpoints are rate-limited and cached.
- Inquiry create requires idempotency key.

### Listing Management API

- POST /v1/listings
- PATCH /v1/listings/{id}
- POST /v1/listings/{id}/publish
- POST /v1/listings/{id}/pause
- POST /v1/listings/{id}/archive

### CRM API

- GET /v1/crm/leads
- PATCH /v1/crm/leads/{id}
- POST /v1/crm/leads/{id}/activities
- POST /v1/crm/leads/{id}/tasks
- POST /v1/crm/leads/{id}/assign
- POST /v1/crm/leads/{id}/convert

### Moderation and Risk API

- POST /v1/moderation/cases
- PATCH /v1/moderation/cases/{id}
- POST /v1/risk/evaluate-listing
- POST /v1/risk/evaluate-inquiry

## Database Schema

### Listings

- marketplace_listings
- listing_media
- listing_publish_history
- listing_search_index

### CRM

- leads
- lead_contacts
- lead_activities
- lead_tasks
- lead_notes
- lead_stage_history

### Verification

- publisher_verifications
- verification_documents
- listing_verification_checks

### Moderation and Risk

- moderation_cases
- moderation_actions
- risk_decisions
- abuse_signals
- blocks

### Audit and SLO

- audit_events
- slo_metrics_hourly

## Moderation and Fraud Rules

### Pre-publish hard blocks

- Unverified publisher attempts to publish.
- Duplicate active listing for same unit or address hash.
- Blacklisted phone or email pattern.
- Extreme price anomaly without policy-approved reason.

### Soft moderation queue

- First three listings from a new publisher.
- Image duplication signal.
- Geo mismatch between metadata and coordinates.

### Post-publish monitoring

- Inquiry burst anomaly.
- High complaint rate.
- Frequent edit-republish rank manipulation pattern.

### Inquiry protection

- OTP for high-risk paths.
- Device and IP velocity controls.
- Disposable email checks.

## CRM Model

### Stages

1. New
2. Attempted Contact
3. Contacted
4. Qualified
5. Viewing Scheduled
6. Offer Made
7. Lease In Progress
8. Converted
9. Lost

### Scoring factors

- Intent score.
- Budget fit score.
- Trust score.
- Engagement score.
- Unit fit score.

### Core CRM features

- Auto and manual assignment.
- Follow-up task automation.
- Activity timeline.
- Notes and stage history.
- Lead-to-tenant conversion guardrails.

## Reliability and Security Guardrails

Non-negotiable:

1. No regressions in payments, lease workflows, booking, and invites.
2. Security and dependency audit blockers triaged before launch.
3. Feature flags and city allowlists for all marketplace entry points.
4. Rollback-tested migration and deployment process.

## Day-by-Day Owner Board (14 Days)

This board is mapped to the current remaining scope priorities.

### Day 1: Scope lock and technical design freeze

Backend:
- Finalize API contracts and schema DDL draft.
- Define idempotency key strategy for inquiries.

Frontend:
- Finalize IA for public search and listing details.
- Finalize CRM board stage UX wireframes.

QA:
- Build test plan matrix for marketplace and regression-critical flows.

Ops:
- Define environment flags and rollout toggles by city and company.
- Confirm log fields and alert channels.

Exit deliverable:
- Signed design and test plan baseline.

### Day 2: Database foundation and migration safety

Backend:
- Implement core schema migrations for listings, CRM, moderation.
- Add migration rollback notes and backfill checkpoint table.

Frontend:
- Scaffold pages and route shells for public marketplace paths.

QA:
- Validate migration up/down in staging snapshot.

Ops:
- Add migration runbook draft and rollback checklist.

Exit deliverable:
- Migrations pass in staging with rollback rehearsal.

### Day 3: Public listing read APIs

Backend:
- Implement GET public listings and listing detail APIs.
- Add CDN cache headers and rate-limit middleware.

Frontend:
- Integrate public listing list page with API.

QA:
- API contract tests and negative tests for malformed filters.

Ops:
- Set up dashboard panels for public API error rate and latency.

Exit deliverable:
- Public read API usable end to end in staging.

### Day 4: Inquiry to lead ingestion path

Backend:
- Implement POST inquiry endpoint with idempotency.
- Create lead record and lead contact record atomically.

Frontend:
- Wire inquiry form with validation and spam-protection UX.

QA:
- Duplicate submit tests and retry tests.

Ops:
- Alert on inquiry failure, idempotency conflict spikes.

Exit deliverable:
- Inquiry to lead creation stable under retry scenarios.

### Day 5: CRM board v1 and assignment

Backend:
- Implement lead list, update, assign, and stage transition endpoints.
- Enforce stage transition validation rules.

Frontend:
- Build CRM board with stage columns and lead detail drawer.

QA:
- Validate role-based access and company isolation.

Ops:
- Add audit trail checks for lead updates and assignments.

Exit deliverable:
- CRM v1 functional for internal users.

### Day 6: Reliability and regression hard gate

Backend:
- Run and fix regressions for payments, booking, invites, lease flows.

Frontend:
- Fix cross-flow navigation issues introduced by new routes.

QA:
- Execute week2 regression suite and marketplace smoke suite.

Ops:
- Verify alert routing for critical workflow failures.

Exit deliverable:
- No critical regressions in core business flows.

### Day 7: Week 1 release candidate and review

Backend:
- Stabilization fixes and API response envelope consistency.

Frontend:
- UI polish for CRM board and inquiry UX.

QA:
- Week 1 signoff report with known issues list.

Ops:
- Incident runbook v1 for inquiry and CRM failures.

Exit deliverable:
- Week 1 RC approved for continued build.

### Day 8: Moderation case pipeline

Backend:
- Implement moderation case create and update APIs.
- Auto-create case for soft-block signals.

Frontend:
- Build moderation queue table and case detail panel.

QA:
- Validate case lifecycle and permissions.

Ops:
- Queue backlog and SLA breach alerting.

Exit deliverable:
- Moderation operations path live in staging.

### Day 9: Verification workflow

Backend:
- Implement publisher verification state machine.
- Enforce verification pre-publish hard block.

Frontend:
- Verification status and publish gating UI.

QA:
- Verify unverified publish denial and verified publish success.

Ops:
- Monitoring for verification queue latency.

Exit deliverable:
- Verified-only publish policy enforced.

### Day 10: Public SEO pages and search UX

Backend:
- Add location filter optimizations and index tuning.

Frontend:
- Implement /rent, /rent/{city}, /rent/{city}/{area} pages.
- Implement canonical metadata and listing structured data.

QA:
- Validate SEO route rendering and mobile responsiveness.

Ops:
- CDN cache behavior verification and purge controls.

Exit deliverable:
- SEO-ready location pages functional.

### Day 11: CRM automation and SLA timers

Backend:
- Add reminder task automation and escalation rules.
- Add cold lead detection scheduler.

Frontend:
- Surface SLA timers and overdue task indicators.

QA:
- Time-based automation tests and timezone validation.

Ops:
- Cron and worker health checks with alerts.

Exit deliverable:
- CRM automation baseline working reliably.

### Day 12: Risk scoring and abuse protections

Backend:
- Implement risk evaluation endpoints and score persistence.
- Add IP and device velocity policies.

Frontend:
- Add risk badges and warning indicators in moderation UI.

QA:
- Abuse simulation and false-positive sampling.

Ops:
- Add risk decision monitoring and anomaly reports.

Exit deliverable:
- Abuse controls active with visible moderation context.

### Day 13: Pre-launch hardening and runbooks

Backend:
- Final query optimization and endpoint timeout tuning.
- Finalize audit event coverage.

Frontend:
- Final mobile accessibility pass for marketplace and CRM screens.

QA:
- Full end-to-end test pass and production-readiness checklist.

Ops:
- Final on-call runbook and escalation ownership table.

Exit deliverable:
- Launch readiness packet complete.

### Day 14: Controlled go-live

Backend:
- Deploy with flags off, run post-deploy checks, enable for pilot set.

Frontend:
- Verify production UI integrity and analytics instrumentation.

QA:
- Live smoke tests and monitored lead conversion walkthrough.

Ops:
- Activate alerts, dashboards, and support handoff.

Exit deliverable:
- Geo-limited, verified-only marketplace launch completed.

## Day 14 Go or No-Go Checklist

Go only if all are true:

1. Core reliability regressions are zero for critical flows.
2. Inquiry-to-lead success rate meets target.
3. Moderation backlog is within staffed SLA.
4. Fraud signals are manageable without severe false positives.
5. Support and on-call readiness is live.

## Gradual Rollout After Launch

1. Phase 0: Internal and pilot only.
2. Phase 1: Single city, verified publishers only.
3. Phase 2: Add cities one at a time by KPI gate.
4. Phase 3: Ranking and conversion optimization.
5. Phase 4: Monetization controls.
6. Phase 5: External syndication if stability remains strong.

## Success Metrics

1. Listing publish adoption among active landlords.
2. Inquiry to qualified lead conversion.
3. Qualified lead to lease conversion.
4. Median vacancy fill time.
5. Fraud incident rate per 1000 listings.
6. Median first-response time.
7. p95 public page and inquiry API latency.
