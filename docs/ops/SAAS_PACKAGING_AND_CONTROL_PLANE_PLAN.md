# SaaS Packaging and Super Admin Control Plane Plan

## Implementation Status
- Phase 1: Complete (schema foundation migration authored)
- Phase 2: Complete (tier and pricing seed baselines authored)
- Phase 3: Complete (entitlement key and baseline grants authored)
- Phase 4-10: Not started

Last update: 2026-07-21

## Objective
Design and implement a monetization-first SaaS architecture for EstatesPro with:
- monthly subscriptions
- multi-currency launch support
- standalone product lines for Core Property Management, Marketplace, and CRM
- a single AI add-on pack
- an enterprise-grade Super Admin Control Plane for granular cross-tenant governance and observability

## Commercial Decisions (Locked)
- Billing model: monthly subscriptions only at launch
- Currency model: multi-currency at launch
- Quota model: enforce all four dimensions
  - units under management
  - properties count
  - active tenants
  - property manager seats
- Free plan: available and includes all feature categories with constrained limits
- Marketplace: standalone product line
- CRM: standalone product line
- AI: single cross-product add-on pack

## Phased Plan

### Phase 1: Product and Plan Catalog Foundation
Define canonical commercial objects:
- products
- plans
- billing cycles
- currencies
- quotas
- add-ons
- entitlement keys

Product model:
- Core Property Management (primary)
- Marketplace (standalone)
- CRM (standalone)
- AI Add-on Pack (attachable to any product)

### Phase 2: Tier Model and Packaging
Core Property Management tiers:
- Free
- Bronze
- Silver
- Gold
- Platinum

Marketplace tiers:
- Free
- Bronze
- Silver
- Gold
- Platinum

CRM tiers:
- Free
- Bronze
- Silver
- Gold
- Platinum

AI packaging:
- One AI Add-on Pack with included monthly credits and overage policy

### Phase 3: Entitlements and Feature Flag Architecture
- Map capabilities to entitlement keys and grants
- Support mixed subscriptions in one workspace (Core + Marketplace + CRM + AI)
- Conflict resolution: highest grant wins (except explicit compliance/security deny)

### Phase 4: Usage Metering and Quota Enforcement
Meter and enforce:
- units
- properties
- active tenants
- manager seats

Additional metering:
- AI credits
- payment/inquiry/API usage where relevant

Behavior:
- soft-limit warnings
- hard-limit enforcement where required

### Phase 5: Subscription and Billing Lifecycle
Implement lifecycle flows:
- trials
- upgrade/downgrade
- proration policy
- grace period
- dunning
- cancellation
- reactivation

### Phase 6: App Integration and UX Gating
- Server-side entitlement authorization for protected actions/routes
- Client-side feature visibility and upgrade prompts
- Usage dashboards and quota progress indicators

## Super Admin Control Plane (Separate Domain)

### Phase 7: Exact Domain Model (Pre-Implementation Artifact 1)
Create a dedicated governance domain with exact artifacts:
- Tables:
  - platform_audit_events
  - platform_sessions
  - platform_impersonation_sessions
  - entitlement_decisions
  - usage_snapshots
  - governance_alerts
- Event namespaces:
  - auth.*
  - access.*
  - billing.*
  - entitlement.*
  - property.*
  - maintenance.*
  - marketplace.*
  - crm.*
  - ai.*
  - admin.*
- Retention classes:
  - hot: 30-90 days
  - warm: 12 months
  - cold: 7 years (by criticality/compliance class)
- RBAC matrix:
  - super_admin
  - security_auditor
  - support_operator
  - billing_operator

Tracking layers:
- identity/session
- request/API
- business events
- data/admin actions

Required event envelope fields:
- actor
- impersonation context
- company scope
- module
- action
- target entity
- result status
- IP/device/user-agent
- correlation_id
- risk score

### Phase 8: Super Admin Dashboard IA Blueprint (Pre-Implementation Artifact 2)
Define screens:
- Global Overview
- Company 360
- User 360
- Billing and Entitlements
- Security and Risk
- Incident Timeline and Correlation Trace

Define filters:
- company
- role
- user
- module
- action
- severity
- outcome
- date range
- correlation_id
- region/device
- subscription plan

Define drill-down path:
- metric -> event stream -> entity timeline -> raw audit payload -> linked incident/runbook

### Phase 9: Phased Implementation Spec (Pre-Implementation Artifact 3)
MVP in 2 sprints:
- Sprint 1: schema + ingestion contracts + core emitters + super-admin read APIs
- Sprint 2: dashboard MVP + baseline alerting + access controls

Enterprise hardening in 4 sprints:
- Sprint 3: advanced correlation tracing + impersonation governance + anomaly scoring
- Sprint 4: retention pipeline + archival/export + tamper-evidence checks
- Sprint 5: SLO dashboards + runbook automation links + incident workflow integration
- Sprint 6: compliance evidence packs + audit report generation + operational playbooks

### Phase 10: Analytics, Ops Controls, and Rollout
- Track conversion funnel, tier adoption, add-on attach rate, churn, expansion revenue
- Add alerts for entitlement failures, overage calculation drift, webhook sync drift, governance anomalies
- Roll out by cohort behind feature flags, then full release

## Verification Gates
1. Catalog validation: deterministic entitlement resolution across products and add-ons
2. Quota validation: reproducible threshold tests for units/properties/tenants/seats
3. Billing validation: integration coverage for full lifecycle flows
4. Domain model validation: Control Plane schema, namespaces, retention classes, RBAC approved before coding
5. IA validation: dashboard map, filters, drill-down journeys approved before coding
6. Phasing validation: MVP/hardening milestones and handoff criteria approved before coding
7. Security validation: server-side checks block unauthorized feature access independent of client state
8. Observability validation: audit logs and alerts fire for lifecycle and governance events
9. Release validation: lint, tests, and build remain green throughout phases

## Governance Rule
No implementation begins until all three pre-implementation artifacts are approved:
1. Exact Control Plane domain model
2. Super Admin dashboard IA blueprint
3. Phased implementation spec (2 sprint MVP + 4 sprint hardening)

## Implementation References
- README.md
- WHOLE_APP_REMAINING_SCOPE.md
- WEEK4_PLAN.md
- docs/ops/SLO_SLI_PLAN.md
- docs/ops/AUDIT_EVENT_TAXONOMY.md
- src/contexts/ActiveCompanyContext.tsx
- src/contexts/SettingsContext.tsx
- src/hooks/useCompanies.ts
- src/hooks/useDashboardStats.ts
- src/lib/auditEvents.ts
- src/lib/security.ts
- supabase/migrations/20260505103000_week2_observability_and_payment_idempotency.sql
- supabase/migrations/20260507134500_add_security_hardening.sql
- supabase/migrations/20260621042000_wave2_automation_and_handoff_completion.sql
- supabase/migrations/20260621160000_wave2_documents_lifecycle_and_automation_replay.sql
