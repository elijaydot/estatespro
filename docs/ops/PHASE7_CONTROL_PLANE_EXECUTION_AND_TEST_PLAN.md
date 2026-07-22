# Phase 7 Control Plane Execution and Test Plan

## Outcome of Phase 7
Phase 7 delivers the governance domain foundation for super-admin observability and control:
- canonical governance tables
- consistent event envelope and namespaces
- ingestion paths from app and backend emitters
- read APIs for super-admin surfaces

This phase does not require full dashboard UI yet. It establishes trusted data and policy contracts for Phase 8 dashboards.

## Scope
- Schema creation and indexes for:
  - platform_audit_events
  - platform_sessions
  - platform_impersonation_sessions
  - entitlement_decisions
  - usage_snapshots
  - governance_alerts
- RLS and policy matrix for:
  - super_admin
  - security_auditor
  - support_operator
  - billing_operator
- Event envelope contract enforcement:
  - actor
  - impersonation context
  - company scope
  - module
  - action
  - target entity
  - result status
  - IP/device/user-agent
  - correlation_id
  - risk_score
- Ingestion functions for normalized writes from emitters.

## Where changes will happen
- Database migrations:
  - supabase/migrations/20260722112000_phase7_control_plane_foundation.sql
- Backend emitters and helpers:
  - src/lib/auditEvents.ts
  - relevant Supabase functions in supabase/functions/
- Optional typed hook stubs for later Phase 8 reads:
  - src/hooks/useControlPlane.ts

## Deployment runbook
1. Apply migration in sequence after Phase 6 migrations:
   - supabase/migrations/20260722112000_phase7_control_plane_foundation.sql
2. Confirm function grants and table creation completed without errors.
3. Deploy frontend changes that include:
   - route: /super-admin/control-plane
   - page: SuperAdminControlPlane
   - hooks: useControlPlane
   - audit dual-write: emitAuditEvent -> platform_ingest_audit_event

## Pre-test setup
1. Create or identify users for each persona:
   - super_admin
   - security_auditor
   - support_operator
   - billing_operator
2. Ensure super-admin role is set in profiles.
3. Seed platform operator roles for the other personas.

### Seed SQL: platform operator roles
```sql
insert into public.platform_operator_roles (user_id, role)
values
  ('<SECURITY_AUDITOR_USER_ID>'::uuid, 'security_auditor'),
  ('<SUPPORT_OPERATOR_USER_ID>'::uuid, 'support_operator'),
  ('<BILLING_OPERATOR_USER_ID>'::uuid, 'billing_operator')
on conflict (user_id, role) do nothing;
```

## Execution sequence
1. Create Phase 7 migration with table definitions and constraints.
2. Add indexes for timeline queries and correlation lookups.
3. Add RLS + policy matrix for each operator role.
4. Add helper SQL functions to ingest standardized governance events.
5. Update selected emitters to write both operational audit and governance stream.
6. Add query views for Phase 8 dashboard consumption.

## Test strategy

### UI test flow (Super Admin)
1. Ensure test user has `super_admin` profile role.
2. Launch app and sign in as that user.
3. Open route `/super-admin/control-plane`.
4. Verify tabs load with data sections:
   - Alerts
   - Events
   - Entitlements
   - Usage
5. Verify sidebar has `Control Plane -> Super Admin` entry for super_admin users.
6. Verify non-super-admin user is redirected away from `/super-admin/control-plane` to `/dashboard`.

### UI test matrix (pass/fail)
- Super admin access:
  - pass: page loads with no authorization error.
  - fail: redirect or empty data due to policy mismatch.
- Sidebar visibility:
  - pass: Control Plane entry appears only for super_admin.
  - fail: visible for non-super-admin or missing for super_admin.
- Alert/event rendering:
  - pass: seeded event appears in Events and linked alert appears in Alerts.
  - fail: no rows after seed.
- Entitlement/usage tabs:
  - pass: tables load (can be empty) without query errors.
  - fail: query error due to missing permissions or table mismatch.

### Seed data for UI test
Use SQL editor to insert synthetic governance events:
```sql
select public.platform_ingest_audit_event(
  'phase7_test',
  'entitlement.quota.blocked',
  'entitlement',
  'quota_check',
  'blocked',
  'warning',
  auth.uid(),
  null,
  'company',
  'test-company',
  'phase7-test-correlation-1',
  85,
  null,
  'phase7-ui-test',
  '{}'::jsonb,
  '{"note":"phase7 synthetic event"}'::jsonb
);
```

Then verify the new row appears in the Events tab and a linked alert appears in Alerts.

### Seed SQL: entitlement decision sample
```sql
insert into public.entitlement_decisions (
  company_id,
  actor_user_id,
  module,
  action,
  entitlement_key,
  allowed,
  decision_reason,
  correlation_id,
  risk_score,
  metadata
)
values (
  '<COMPANY_ID>'::uuid,
  '<SUPER_ADMIN_USER_ID>'::uuid,
  'entitlement',
  'route_access',
  'crm.leads.manage',
  false,
  'plan_restriction',
  'phase7-test-correlation-2',
  60,
  '{"source":"phase7-doc-test"}'::jsonb
);
```

### Seed SQL: usage snapshot sample
```sql
select public.platform_refresh_usage_snapshot('<COMPANY_ID>'::uuid, 'core_property');
```

### A) Migration tests
Run migration and verify object existence:
```sql
select to_regclass('public.platform_audit_events');
select to_regclass('public.platform_sessions');
select to_regclass('public.platform_impersonation_sessions');
select to_regclass('public.entitlement_decisions');
select to_regclass('public.usage_snapshots');
select to_regclass('public.governance_alerts');
```

### B) Policy tests
Use role-scoped sessions to verify:
- super_admin can read/write governance tables
- security_auditor read-only access
- support_operator access limited to support-approved columns and rows
- billing_operator can read billing-related governance events and entitlement decisions

Practical approach:
- sign into app separately with each role-bound user
- verify tabs reachable vs blocked according to policy intent
- run direct SQL with each role user token if available in your test harness

### C) Contract tests
Validate required envelope fields are present:
```sql
select id
from public.platform_audit_events
where actor_user_id is null
   or event_type is null
   or correlation_id is null;
```
Expected: zero rows for production writes.

### D) Correlation tests
Insert synthetic cross-module events sharing one correlation_id and verify timeline retrieval:
```sql
select event_type, module, action, created_at
from public.platform_audit_events
where correlation_id = '<TEST_CORRELATION_ID>'
order by created_at;
```

### E) Alert trigger tests
Force thresholds for risk_score / blocked entitlement events and verify governance_alerts rows are created.

### F) App/CI gates
- npm run lint
- npm run build
- npm test
- add new tests under tests/week2 or tests/week3 for:
  - policy matrix behavior
  - envelope field validation
  - correlation timeline assembly

## Ready criteria for Phase 7
- Governance tables created and queryable.
- RLS/policies enforce role boundaries correctly.
- Ingestion functions accept valid payloads and reject malformed payloads.
- Correlation and timeline queries produce consistent event chains.
- Alerts fire for configured high-risk conditions.

## Rollback guidance
If Phase 7 rollout causes issues:
1. Revert frontend route exposure for `/super-admin/control-plane`.
2. Disable dual-write calls in `src/lib/auditEvents.ts` (keep legacy `audit_events` write path).
3. Keep schema in place unless absolutely necessary to drop.
4. If rollback migration is required, drop only newly introduced policies/functions first, then tables in dependency order.

## Known limitations (current cut)
- No UI yet for assigning `platform_operator_roles` (SQL-seeded for now).
- No full impersonation-session lifecycle UI yet.
- No long-term retention/archival jobs yet (Phase 8/9 scope).

## Handoff to Phase 8
When Phase 7 passes, Phase 8 can build Super Admin dashboards directly on:
- platform_audit_events
- entitlement_decisions
- usage_snapshots
- governance_alerts
with confidence in data integrity and access control.
