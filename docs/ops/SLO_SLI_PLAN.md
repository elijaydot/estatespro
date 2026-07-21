# SLO/SLI Implementation Plan

## Service Areas
1. Payments (checkout, verify, confirmation)
2. Booking lifecycle (guest actions, invoice linkage)
3. CRM workflow actions (lead updates, tasking, conversions)
4. Notifications and messaging delivery

## Initial SLIs
- Request success rate by function and endpoint.
- p95/p99 latency by critical endpoint.
- Duplicate-payment prevention effectiveness.
- Webhook/integration delivery success and retry exhaustion rate.

## Initial SLOs (Draft)
1. Payment checkout success: >= 99.5% daily.
2. Payment verification success: >= 99.7% daily.
3. Payment checkout p95 latency: < 800ms.
4. Payment verification p95 latency: < 900ms.
5. Guest booking action success: >= 99.0% daily.
6. Duplicate payment incidents: 0 accepted duplicates per week.

## Alerting Policy
- Page on severe SLO burn > 5% in 1h window.
- Ticket on slow-burn SLO deviation over 24h.
- Include correlation IDs in every alert payload.

## Required Artifacts
1. Dashboard JSON or reproducible dashboard config.
2. Alert routes and severity matrix.
	- Canonical config: `docs/ops/ALERT_ROUTING_MATRIX.json`.
3. Incident runbooks mapped to each SLO.
4. Weekly SLO report and action tracker.

## Staging Validation Checklist
1. Capture 24h checkout success-rate sample from staging.
2. Capture 24h verify success-rate sample from staging.
3. Capture checkout/verify p95 latency traces.
4. Trigger alert dry-run and verify routing + runbook links.
5. Attach evidence links into docs/parity/CRM_PARITY_SCORECARD.md.
