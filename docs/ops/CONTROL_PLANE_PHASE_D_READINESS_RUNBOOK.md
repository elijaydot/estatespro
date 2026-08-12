# Control Plane Phase D Readiness Runbook

## Scope

Validate Control Plane migrations through `20260811260000`, operator authorization, bounded pagination, deep Company/User 360 reads, and rollback readiness in staging.

## Preconditions

1. Apply migrations through `20260811260000_platform_company_user_360_deep_reads.sql`.
2. Prepare one user for each role: super admin, support operator, billing operator, security auditor, and an authenticated user without a platform role.
3. Select populated company and user UUIDs that are safe for staging reads.
4. Record the deployment timestamp and migration batch identifier.

## Automated Gates

Run from the repository root:

```powershell
npm run check:audit
npm run lint
npm run test:week4
npm run build
```

Run `supabase/verification/control_plane_phase_d_checks.sql` in the staging SQL editor. Replace placeholder UUIDs before evaluating query plans.

## Authorization Matrix

Call each RPC through the Supabase REST client with the corresponding user's JWT. A permitted call must return a bounded JSON page; a denied call must return `INSUFFICIENT_PLATFORM_OPERATOR_ROLE`.

| RPC | Super admin | Support | Billing | Security | No role |
| --- | --- | --- | --- | --- | --- |
| `platform_get_entitlement_overrides_page` | Allow | Allow | Allow | Deny | Deny |
| `platform_get_active_suspensions_page` | Allow | Allow | Deny | Allow | Deny |
| `platform_get_impersonation_sessions_page` | Allow | Allow | Deny | Allow | Deny |
| `platform_get_current_operator_impersonation_session` | Allow | Allow | Deny | Deny | Deny |
| `platform_get_company_360_members_page` | Allow | Allow | Allow | Allow | Deny |
| `platform_get_user_360_companies_page` | Allow | Allow | Allow | Allow | Deny |

## Pagination And Load Checks

For each paged RPC:

1. Request page sizes `5`, `20`, `100`, and `500`; verify `500` is clamped to `100`.
2. Request pages `1`, `2`, and the final page; verify no duplicate IDs across adjacent pages.
3. Repeat the same request five times; verify deterministic row ordering.
4. Compare `total_count` with a direct SQL count using the same filters.
5. Capture p50 and p95 latency for 100 requests against populated staging data.
6. Review the supplied `EXPLAIN (ANALYZE, BUFFERS)` plans. Investigate large sequential scans or materialization spills.

Target: p95 below 500 ms for bounded reads under representative staging load.

## Deployment Smoke Verification

### Backend Smoke

1. Run `supabase/verification/control_plane_phase_d_checks.sql` in staging.
2. Confirm all required RPC and index checks complete without exceptions.
3. Confirm routine grants list only the expected `authenticated` and `service_role` access.
4. Call both deep-read RPCs with populated staging UUIDs and page size `5`:
	- `platform_get_company_360_members_page`
	- `platform_get_user_360_companies_page`
5. Verify each response contains `rows`, `page`, `page_size`, and `total_count`.
6. Call one RPC as an authenticated user without a platform role and verify `INSUFFICIENT_PLATFORM_OPERATOR_ROLE`.

### UI Smoke

1. Open Company Directory and select a company.
2. Open Company 360 and verify portfolio, billing, status, and memberships.
3. Page through memberships and confirm the exact total remains stable.
4. Open User Directory and select a user.
5. Open User 360 and verify application role, platform roles, suspension, and company access.
6. Start and stop a support session; verify the banner appears and clears without depending on the history page.
7. Exercise safety-list search, filters, page size, and next/previous navigation.

Record pass/fail, operator, timestamp, selected company/user IDs, p95 latency, and evidence link before release signoff.

## Rollback

The migrations are additive. If the application must be rolled back, deploy the previous frontend first; legacy reads remain available.

To remove only the latest deep-read API after frontend rollback:

```sql
REVOKE ALL ON FUNCTION public.platform_get_company_360_members_page(uuid,text,text,integer,integer) FROM authenticated, service_role;
REVOKE ALL ON FUNCTION public.platform_get_user_360_companies_page(uuid,text,text,integer,integer) FROM authenticated, service_role;
DROP FUNCTION IF EXISTS public.platform_get_company_360_members_page(uuid,text,text,integer,integer);
DROP FUNCTION IF EXISTS public.platform_get_user_360_companies_page(uuid,text,text,integer,integer);
DROP INDEX IF EXISTS public.idx_platform_company_members_user_status_created;
```

Do not drop safety-operation tables or historical records. Prefer revoking execute access while investigating an authorization incident.

## Exit Criteria

1. Automated gates pass or every exception has an owner and written acceptance.
2. Authorization matrix passes for every role.
3. Pagination totals and ordering are correct.
4. Query plans and latency meet the target.
5. Company/User 360 and support-session smoke tests pass.
6. Rollback owner and deployment decision are recorded.