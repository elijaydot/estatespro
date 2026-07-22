# Phase 8 Super Admin Dashboard IA Blueprint

## Objective
Define the production information architecture for the Super Admin Control Plane dashboards on top of the Phase 7 governance data model.

## Primary Screens
1. Global Overview
- KPIs: open alerts, blocked events, high-risk events, active incidents, operator actions.
- Trend cards: events/day, denied access/day, plan-limit incidents/day.
- Global filters and quick drill actions.

2. Company 360
- Company profile and subscription context.
- Company event timeline and correlated incidents.
- Recent entitlement denials and usage pressure indicators.

3. User 360
- Actor event timeline by user id.
- Risk signals by IP/device/user-agent.
- Elevated actions and operator touchpoints.

4. Billing and Entitlements
- Entitlement decision trends.
- Denied vs allowed by module/action.
- Usage snapshot pressure by quota dimension.

5. Security and Risk
- High-risk event stream.
- Blocked and denied event diagnostics.
- Suspicious session and impersonation review.

6. Incident Timeline
- Correlation-id first view.
- Cross-module event chain in chronological order.
- Linked alerts and response notes.

## Global Filter Bar
- date range
- company id
- user id
- module
- action
- severity
- outcome
- correlation id
- operator role
- product/plan code

## Drill-down Journey
1. KPI click opens filtered event stream.
2. Event click opens entity timeline.
3. Timeline row opens raw payload and metadata.
4. Correlation panel shows linked events and alerts.
5. Operator can copy runbook context or export evidence.

## Empty-state UX Rules
- Always show what data source is empty.
- Provide one action: seed synthetic event or clear filters.
- Explain required role if data is policy-restricted.

## Export and Auditability
- CSV export for table views.
- JSON export for raw event payloads.
- Include generated_at, active filters, and operator user id in exports.

## Access and Modes
- super_admin: full access.
- operator roles: policy-constrained read surfaces.
- platform override mode: available to super_admin to bypass plan-gated app navigation.

## Phase 8 Ready Checklist
- agreed screen map
- approved filter schema
- drill-down flow validated
- empty-state behavior approved
- export schema approved
