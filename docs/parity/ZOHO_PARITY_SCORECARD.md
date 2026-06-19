# Zoho-Parity Scorecard (Baseline)

## Scoring Model
- 0 = not started
- 1 = partial / fragile
- 2 = production-capable
- 3 = enterprise-ready

Target program average: >= 2.5 with no critical category < 2.0.

## Category Scorecard

| Category | Current | Target | Owner | Evidence |
|---|---:|---:|---|---|
| Feature Breadth | 1.4 | 2.7 | Product + Eng | workflow/approval/forecast demos |
| Platform Ecosystem | 1.2 | 2.6 | Platform Eng | API docs, webhook reliability report |
| Enterprise Readiness | 1.1 | 2.5 | Platform + Security | SSO/RBAC audit logs, tenancy tests |
| Security/Compliance | 1.0 | 2.5 | Security | control mapping + evidence pack |
| Reliability/Scale | 1.6 | 2.7 | SRE/Backend | SLO dashboard + load/failure tests |
| Product Polish | 1.8 | 2.6 | Product + Frontend | usability benchmark + support metrics |

## Must-Hit Gates
1. CI quality gate: lint/build/tests/security scan pass.
2. SLO gate: payment and booking success SLOs met for 2 consecutive weeks.
3. Compliance gate: control evidence freshness under 30 days.
4. Release gate: runbook + rollback + comms checklist complete.

## Review Cadence
- Update every Friday after demo.
- Promote score only with attached evidence links.
- Track deltas week-over-week and flag any regression >0.2.

## Latest Progress Delta (2026-06-19)
- Reliability/Scale evidence improved with payment contract hardening, retry/timeout simulation tests, and timed gateway/request audit telemetry.
- Platform Ecosystem readiness improved with explicit payment request/response contract normalization and error code envelope standardization.
- Local release gates passed for current branch snapshot:
	- `npm run build`
	- `npm run test:week2`
	- `npm run check:contracts`

Next evidence required before score uplift:
- Staging SLO report for payment checkout/verify success and latency thresholds.
- Staging webhook delivery and dead-letter replay validation report.

## Staging SLO Threshold Set (Candidate)
1. Payment checkout success rate: >= 99.5% (rolling 24h).
2. Payment verify success rate: >= 99.7% (rolling 24h).
3. Payment checkout p95 latency: < 800ms (rolling 24h).
4. Payment verify p95 latency: < 900ms (rolling 24h).
5. Duplicate-payment accepted incidents: 0 per week.

## Evidence Links (To Fill During Staging Run)
- Checkout SLO dashboard: TBD
- Verify SLO dashboard: TBD
- Alert route validation run: TBD
- Incident dry-run report: TBD
