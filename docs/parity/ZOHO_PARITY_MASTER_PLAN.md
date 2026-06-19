# Zoho-Parity Master Plan (FishGate)

## Objective
Build FishGate from strong PM/CRM foundation to enterprise-grade CRM parity benchmarked against Zoho-level capabilities.

## Program Principles
1. Parity by capability outcomes, not UI mimicry.
2. Measurable quality gates per phase.
3. Ship vertical slices (feature + telemetry + tests + runbook).
4. No feature marked complete without observability and operational ownership.

## Parity Rubric (Target State)
- Feature Breadth: 85%+ of critical CRM workflows implemented.
- Platform Ecosystem: API and event integrations support core external system sync.
- Enterprise Readiness: role model, identity, audit, and tenancy controls verified.
- Security/Compliance: auditable controls and evidence packages in place.
- Reliability/Scale: defined SLOs, tested failure recovery, and release gates.
- Product Polish: reduced task friction and high adoption in critical journeys.

## Delivery Phases

### Phase 0: Program Setup (1 week)
- Define domain ownership and RACI.
- Convert parity themes into backlog epics and acceptance criteria.
- Lock quality gates in CI (lint/build/tests/security scan).
- Create scorecard and weekly parity review cadence.

Exit Criteria:
- Scorecard baseline published.
- Owners assigned for all epics.
- CI quality policy agreed and documented.

### Phase 1: Reliability + Foundation (2-3 weeks)
- Complete typed data/lint debt eradication baseline.
- Expand integration tests for payment, booking, invite, and failure-injection matrix.
- Add SLI dashboards + alerts for edge/payment pathways.
- Add incident runbooks and on-call triage flow.

Exit Criteria:
- SLO dashboard live and alerting active.
- Critical integration test matrix passing.
- Incident runbooks reviewed by owners.

### Phase 2: Feature Breadth (4-6 weeks)
- Workflow automation engine (triggers/actions/conditions).
- Approval flows and stage blueprinting.
- Territory and assignment rules.
- Deep reporting pack (pipeline velocity, conversion cohorts, aging, forecast confidence).

Exit Criteria:
- At least 3 production automations active.
- Approval + blueprint flow used in live lead lifecycle.
- Forecast report consumed in weekly ops review.

### Phase 3: Ecosystem + Integrations (3-5 weeks)
- Public API hardening and versioning policy.
- Webhooks/event bus for CRM domain events.
- 2-way integrations (email/calendar first, telephony/accounting next).
- Integration observability (delivery, retries, dead-letter handling).

Exit Criteria:
- Stable v1 API contract and changelog process.
- Webhook retries and signature validation in production.
- At least 2 bi-directional integrations live.

### Phase 4: Enterprise Readiness + Compliance (4-8 weeks)
- SSO/SAML and SCIM provisioning lifecycle.
- Fine-grained RBAC + policy enforcement + audit trail queryability.
- Data retention controls, legal hold support, backup/restore drills.
- SOC2/ISO/GDPR control mapping and evidence collection automation.

Exit Criteria:
- SSO + SCIM validated in staging and one pilot tenant.
- Restore drill RTO/RPO documented and met.
- Compliance evidence checklist >90% complete.

### Phase 5: Product Polish + Go-to-Market Hardening (2-4 weeks)
- Onboarding and admin setup assistant.
- UX depth for high-frequency tasks (lead ops, payment ops, tenant ops).
- Documentation, support playbooks, and release readiness checks.

Exit Criteria:
- Time-to-first-value reduced by agreed benchmark.
- Support runbook and admin docs complete.
- Release gate checklist all green.

## Weekly Governance
- Monday: parity scorecard review + risk log updates.
- Wednesday: architecture and integration decisions.
- Friday: production-readiness checkpoint and demo.

## Risk Register (Initial)
1. Scope sprawl without strict acceptance criteria.
2. Integration complexity causing brittle sync flows.
3. Compliance work deferred too late in lifecycle.
4. Performance regression under increased workflow/event load.

## Success Metrics
1. CRM conversion lift and lead-cycle-time reduction.
2. Payment and booking failure rates below SLO thresholds.
3. Support ticket volume reduction for top 10 workflows.
4. Uptime/SLO attainment and MTTR improvement.
