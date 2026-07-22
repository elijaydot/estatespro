# SaaS Phase 6 UI Readiness Checklist

## Goal
Validate that entitlement gating, quota checks, usage metering, and upgrade prompts are working in the UI.

## Prerequisites
- Phase 1 to Phase 6.2 migrations applied.
- At least one landlord user with one company.
- App runs locally with Supabase environment configured.

## 1) Run the app
1. Install dependencies:
   - npm install
2. Start dev server:
   - npm run dev
3. Sign in as landlord or property manager with approved membership.

## 2) Confirm baseline SaaS wiring in DB
Run these checks in Supabase SQL editor.

### Check active plan for company
```sql
select s.company_id, s.status, p.code as plan_code
from public.saas_company_plan_subscriptions s
join public.saas_plans p on p.id = s.plan_id
where s.company_id = '<COMPANY_ID>'
  and s.status in ('active', 'trialing', 'grace_period')
order by s.created_at desc;
```

### Check route-critical entitlements
```sql
select ek.key, pe.bool_value
from public.saas_plan_entitlements pe
join public.saas_entitlement_keys ek on ek.id = pe.entitlement_key_id
where pe.plan_id = '<PLAN_ID>'
  and ek.key in (
    'marketplace.listings.manage',
    'marketplace.moderation.view',
    'crm.leads.manage',
    'crm.deals.manage',
    'crm.calls_meetings.manage',
    'crm.automation.manage',
    'ai.assistant.enabled'
  )
order by ek.key;
```

## 3) UI entitlement tests
1. Open sidebar and verify locked modules show Upgrade badge when entitlement is false.
2. Click locked item:
   - expected: redirect to Settings billing tab.
3. Navigate directly to locked route URL:
   - expected: locked page with upgrade CTA.
4. Enable entitlement in DB, refresh UI:
   - expected: module opens normally.

## 3.1) Billing and plan-change action tests
1. Open Settings -> Billing & Plans.
2. Verify the page shows:
   - current subscriptions
   - feature access badges
   - plan catalog with prices per currency
3. Choose a different plan in the same product line:
   - expected: plan change succeeds and toast confirms proration estimate.
4. Choose a plan where no active subscription exists for that product:
   - expected: subscription starts and appears in current subscriptions.
5. Re-open a previously locked module:
   - expected: unlocked access if new plan grants required entitlement.

## 4) Quota and usage tests
### Force low limits for test plan
```sql
update public.saas_plan_quotas q
set hard_limit = 1, soft_limit = 1
from public.saas_quota_dimensions d
where q.quota_dimension_id = d.id
  and q.plan_id = '<PLAN_ID>'
  and d.code in ('properties_managed', 'units_managed', 'active_tenants');
```

### Reset counters for clean test cycle
```sql
delete from public.saas_usage_counters
where company_id = '<COMPANY_ID>';
```

### UI flows
1. Create first property:
   - expected: success.
2. Create second property:
   - expected: blocked with upgrade/limit message.
3. Create first unit under a property:
   - expected: success.
4. Create second unit:
   - expected: blocked.
5. Create first active tenant:
   - expected: success.
6. Create second active tenant:
   - expected: blocked.

### Verify metering events
```sql
select created_at, quota_dimension_id, delta, resulting_used, allowed, reason
from public.saas_usage_events
where company_id = '<COMPANY_ID>'
order by created_at desc
limit 30;
```

## 5) Dashboard tests
1. Open dashboard.
2. Validate Plan Usage Snapshot cards render with progress bars.
3. Validate AI section:
   - ai.assistant.enabled = false -> locked upsell card appears.
   - ai.assistant.enabled = true -> AI widgets render.

## 6) Regression gates
1. npm run lint
   - expected: no errors; existing warning in CRM workspace may remain.
2. npm run build
   - expected: successful production build.

## Ready-for-UI criteria
- Protected routes block correctly when entitlements are off.
- Sidebar upgrade prompts appear for locked modules.
- Quota limits block create actions at hard limit.
- Usage events and counters update after successful inserts.
- Dashboard usage snapshot and AI gating reflect entitlement state.
