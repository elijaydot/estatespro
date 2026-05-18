# Week 2 Handoff Checklist

## Pre-Push
1. Confirm branch includes Week 2 files and migration.
2. Run:
   - npm run test:week2
   - npm run build

## PR Creation
1. Use WEEK2_PR_DESCRIPTION.md as PR body.
2. Tag reviewers for backend/payment and DevOps/DB migration.
3. Link Week 2 docs in PR:
   - WEEK2_TEST_CHECKLIST.md
   - WEEK2_STAGING_RUNBOOK.md

## Staging Validation
1. Apply migration:
   - supabase/migrations/20260505103000_week2_observability_and_payment_idempotency.sql
2. Run runbook:
   - WEEK2_STAGING_RUNBOOK.md
3. Capture evidence:
   - verify-payment duplicate call showing alreadyProcessed=true
   - audit_events query output with payment checkout/verify events
   - no duplicate invoice/reference rows in payments

## Release Prep
1. Use WEEK2_RELEASE_NOTES.md as release notes base.
2. Attach tested commit hash and environment.
3. Confirm Week 2 quality workflow is green.
