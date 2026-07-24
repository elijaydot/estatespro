# Week 4 Remediation Scope Summary

Date: 2026-07-24
Branch: feat/saas

## Objective
This remediation closed critical marketplace and CRM reliability, governance, and operability gaps across:
- Data correctness and dashboard integrity
- Reviewer and moderation separation-of-duties
- Secure document handling and storage policy hardening
- CRM automation usability and execution depth
- Automation resilience with scheduled retries
- Lead prioritization via explainable scoring
- Public marketplace UX depth (map, gallery, pagination, saved context)

## Scope Delivered

### 1) Data Correctness and Operational Metrics
- Replaced hardcoded managed listing inquiry counts with real aggregated counts from SQL helper output.
- Replaced hardcoded currency assumptions in CRM surfaces with settings-aware formatting.
- Replaced stubbed "Deals Closing This Month" in CRM overview with live computation from open deals and expected close dates.
- Ensured lead stage editor values align with database-valid lead stage enum values.

### 2) Reviewer and Moderation Governance (SoD)
- Added delegated marketplace reviewer capability via platform operator role support.
- Expanded reviewer checks beyond super admin-only paths.
- Hardened moderation accountability:
  - Added opened_by, resolved_by, resolved_at usage patterns.
  - Enforced reviewer-only transition control for in-review/resolved/dismissed states.
  - Enforced submitter-cannot-decide-own-case and resolution reason requirements.
- Added reviewer-scoped UI gating to avoid avoidable RLS/trigger violations from client interactions.

### 3) Document Upload and Storage Hardening
- Replaced raw storage-path text entry with upload flows using shared uploader components.
- Added private storage buckets and company-scoped object policies.
- Added first-path-segment company UUID enforcement in storage object access policies.
- Removed migration dependency on uncertain helper function array signatures for policy checks; moved to robust EXISTS checks.

### 4) CRM Usability and Assignment Quality
- Added a shared assignee picker component and replaced raw owner/assignee UUID text interactions across CRM modules.
- Improved ownership selection consistency for accounts, deals, calls, meetings, projects, tasks, and automation action recipients.

### 5) Automation Builder and Action Vocabulary
- Replaced JSON-only rule authoring with structured condition/action builders.
- Added advanced JSON mode as optional power-user path.
- Added read-only rule preview RPC for sample payload evaluation without action execution or run creation.
- Expanded action vocabulary in automation execution:
  - send_notification
  - send_message
  - update_lead_stage
  - reassign_lead
- Preserved failure isolation semantics: one action failure increments error count without aborting sibling actions.

### 6) Automation Reliability (Scheduled Retry)
- Added system replay path for failed/pending replayable runs without requiring an authenticated user session.
- Added batch retry worker with SKIP LOCKED queue semantics.
- Added cron-backed schedule function (5-minute cadence) with safe no-fail behavior when pg_cron is unavailable.

### 7) Lead Scoring Engine
- Added explainable server-side lead scoring function with bounded output 0..100.
- Scoring factors include source quality, stage momentum, contact completeness, engagement depth, recency, response time, budget-fit, and priority signal.
- Added trigger-driven recompute on:
  - lead activity writes
  - lead contact writes
  - relevant lead field updates
- Added backfill update so existing leads receive computed scores.
- Surfaced score as a sortable signal in Leads and as summary/prioritized list in Overview.

### 8) Public Marketplace Depth
- Added optional geo columns (latitude/longitude) with validation constraints and helper exposure.
- Added map panel experience in public marketplace page.
- Added media carousel/thumbnail navigation for listing detail.
- Added real pagination controls using page/page_size state.
- Added saved searches and favorites persistence in browser storage.
- Hardened migration compatibility for function return-shape changes by dropping existing signatures before recreation.

## Migrations Added in This Remediation
- supabase/migrations/20260723190000_marketplace_section1_inquiry_counts_and_moderation_accountability.sql
- supabase/migrations/20260724110000_section2_documents_storage_buckets.sql
- supabase/migrations/20260724113000_crm_preview_automation_rule_rpc.sql
- supabase/migrations/20260724124500_storage_policy_company_path_guard.sql
- supabase/migrations/20260724125500_marketplace_reviewer_role_and_moderation_sod.sql
- supabase/migrations/20260724134500_crm_automation_action_vocabulary_expansion.sql
- supabase/migrations/20260724143000_crm_automation_scheduled_retry_worker.sql
- supabase/migrations/20260724150000_crm_lead_scoring_engine_and_triggers.sql
- supabase/migrations/20260724153000_marketplace_public_geo_columns_and_function_expansion.sql

## Test Coverage by Functionality

| Functionality | Primary Tests |
|---|---|
| Managed listing inquiry count correctness | tests/week3/marketplace-managed-listings.test.ts |
| Reviewer role + moderation SoD + storage path hardening | tests/week3/marketplace-reviewer-sod-and-storage-hardening.test.ts |
| Automation builder serializer/deserializer correctness | tests/week3/crm-automation-builder.test.ts |
| Automation action vocabulary expansion migration | tests/week3/crm-automation-action-vocabulary.test.ts |
| Scheduled automation retry worker migration | tests/week3/crm-automation-scheduled-retry.test.ts |
| Lead scoring engine + trigger/backfill migration | tests/week3/crm-lead-scoring-engine.test.ts |
| Marketplace geo function expansion + drop/recreate compatibility guards | tests/week3/marketplace-public-geo-expansion.test.ts |
| CRM workflow baseline protections (regression) | tests/week2/marketplace-crm-workflow.test.ts |
| Marketplace CRM reporting baseline (regression) | tests/week2/marketplace-crm-reports.test.ts |
| Governance/release gate regression | tests/week2/wave2-governance-release-gates.test.ts |
| Reviewer decision integration regression | tests/week2/reviewer-decisions.integration.test.ts |

## Final Validation Status
- Lint: pass (existing known warning remains in src/components/marketplace-crm/CrmWorkspace.tsx)
- Tests: pass (31 files, 100 tests)
- Build: pass

## Notes
- The remediation was completed as additive, migration-driven changes with RLS-aware behavior.
- Existing policy and trigger semantics were preserved while extending capabilities.
- Safety constraints were enforced where function return-shape changes required explicit signature drops before recreation.
