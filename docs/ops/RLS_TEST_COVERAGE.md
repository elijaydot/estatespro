# RLS Test Coverage

This inventory is derived from every `ENABLE ROW LEVEL SECURITY` statement in
`supabase/migrations/`. There are 99 unique RLS-enabled tables as of 2026-07-30.

The live integration harness creates two authenticated company owners, seeds
Company A through a service-role client, and attacks exact Company A row IDs as
Company B. Each covered table asserts invisible SELECT/UPDATE/DELETE results and
a PostgreSQL `42501` rejection for an INSERT carrying Company A foreign keys.

Run locally with a Supabase stack and its credentials:

```powershell
$env:SUPABASE_TEST_URL = 'http://127.0.0.1:54321'
$env:SUPABASE_TEST_ANON_KEY = '<local anon key>'
$env:SUPABASE_TEST_SERVICE_ROLE_KEY = '<local service role key>'
$env:RLS_TEST_REQUIRED = 'true'
npm run test:rls
```

CI starts Supabase and requires execution through `.github/workflows/rls-isolation.yml`.
Without credentials the test file skips by design; `RLS_TEST_REQUIRED=true` turns
missing credentials into a hard failure.

## Covered (7)

- `invoices`
- `lease_attachments`
- `leases`
- `maintenance_requests`
- `messages`
- `payments`
- `tenants`

## Outstanding (92)

- Core: `app_settings`, `audit_events`, `bookings`, `broadcasts`, `companies`,
  `company_members`, `company_settings`, `default_inspection_checklist`,
  `exit_inspection_items`, `lease_inventory_items`, `lease_inventory_snapshots`,
  `lease_templates`, `message_attachments`, `message_drafts`, `message_presence`,
  `notifications`, `pm_invites`, `profiles`, `properties`,
  `property_manager_assignments`, `realtime.messages`, `recurring_bills`, `reports`,
  `scheduled_messages`, `security_audit_events`, `security_recovery_codes`,
  `tenant_exits`, `tenant_invites`, `units`, `user_mfa`, `user_roles`.
- Marketplace/CRM: `abuse_signals`, `crm_accounts`, `crm_automation_rules`,
  `crm_automation_runs`, `crm_calls`, `crm_campaigns`, `crm_deals`,
  `crm_deal_handoffs`, `crm_deal_stage_history`, `crm_documents`,
  `crm_followup_automation_log`, `crm_meetings`, `crm_projects`, `crm_trust_flags`,
  `crm_visits`, `lead_activities`, `lead_contacts`, `lead_stage_history`,
  `lead_tasks`, `leads`, `listing_media`, `listing_publish_history`,
  `listing_search_index`, `marketplace_inquiries`, `marketplace_listings`,
  `moderation_actions`, `moderation_cases`, `publisher_verifications`,
  `risk_decisions`, `verification_documents`.
- SaaS/control plane: `entitlement_decisions`, `governance_alerts`,
  `platform_analytics_snapshots`, `platform_audit_events`,
  `platform_drift_checks`, `platform_entitlement_overrides`,
  `platform_impersonation_sessions`, `platform_operator_roles`,
  `platform_principal_suspensions`, `platform_risk_queue_triage_actions`,
  `platform_sessions`, `saas_addon_entitlements`, `saas_addon_prices`,
  `saas_addon_quota_overrides`, `saas_addons`,
  `saas_company_addon_subscriptions`, `saas_company_plan_subscriptions`,
  `saas_entitlement_keys`, `saas_plan_entitlements`, `saas_plan_prices`,
  `saas_plan_quotas`, `saas_plans`, `saas_products`, `saas_quota_dimensions`,
  `saas_subscription_change_log`, `saas_subscription_events`,
  `saas_subscription_invoices`, `saas_subscription_payment_attempts`,
  `saas_usage_counters`, `saas_usage_events`, `usage_snapshots`.

Add coverage by seeding one service-role row and adding one `ProtectedFixture`
entry with valid hostile update and insert payloads. The shared parametrized test
then supplies all four negative assertions.