# Lovable Cloud Deployment Runbook (Marketplace Day 2)

## Why this runbook exists

You are running via Lovable cloud and cannot manage local Supabase CLI directly.
This runbook gives the exact flow to apply database changes and deploy edge functions from Lovable.

## Deployment Inputs (from this branch)

Apply these SQL files in order:

1. [supabase/migrations/20260526143000_marketplace_crm_foundation.sql](supabase/migrations/20260526143000_marketplace_crm_foundation.sql)
2. [supabase/migrations/20260526160000_marketplace_public_and_inquiry_helpers.sql](supabase/migrations/20260526160000_marketplace_public_and_inquiry_helpers.sql)

Deploy these edge functions:

1. [supabase/functions/marketplace-public/index.ts](supabase/functions/marketplace-public/index.ts)
2. [supabase/functions/marketplace-inquiry/index.ts](supabase/functions/marketplace-inquiry/index.ts)

Shared imports used by those functions:

1. [supabase/functions/_shared/security.ts](supabase/functions/_shared/security.ts)
2. [supabase/functions/_shared/observability.ts](supabase/functions/_shared/observability.ts)

## Step A: Apply SQL in Lovable cloud

1. Open Lovable project SQL editor.
2. Run file 1 first:
- [supabase/migrations/20260526143000_marketplace_crm_foundation.sql](supabase/migrations/20260526143000_marketplace_crm_foundation.sql)
3. Confirm success.
4. Run file 2 second:
- [supabase/migrations/20260526160000_marketplace_public_and_inquiry_helpers.sql](supabase/migrations/20260526160000_marketplace_public_and_inquiry_helpers.sql)
5. Confirm success.

Expected outcome:
- New tables for listings/leads/inquiries/moderation exist.
- New helper RPC functions exist:
- public.get_public_marketplace_listings
- public.get_public_marketplace_listing_detail
- public.create_marketplace_inquiry

## Step B: Deploy edge functions in Lovable cloud

1. Create or update function marketplace-public with source from:
- [supabase/functions/marketplace-public/index.ts](supabase/functions/marketplace-public/index.ts)
2. Create or update function marketplace-inquiry with source from:
- [supabase/functions/marketplace-inquiry/index.ts](supabase/functions/marketplace-inquiry/index.ts)
3. Ensure shared files exist and are up to date:
- [supabase/functions/_shared/security.ts](supabase/functions/_shared/security.ts)
- [supabase/functions/_shared/observability.ts](supabase/functions/_shared/observability.ts)
4. Set verify_jwt=false for both functions in Lovable function settings.

## Step C: Cloud smoke tests

Use Lovable cloud function URLs.

### 1) Public list

GET marketplace-public?mode=list&page=1&page_size=5

Expected:
- 200 response
- JSON with data array and meta

### 2) Public detail

GET marketplace-public?mode=detail&id_or_slug=<live-listing-id-or-slug>

Expected:
- 200 response for live listing
- 404 for missing/non-live listing

### 3) Inquiry creation

POST marketplace-inquiry with headers:
- Content-Type: application/json
- Idempotency-Key: demo-key-001

Body example:
{
  "listing_id": "<live-listing-uuid>",
  "full_name": "Test Prospect",
  "phone_e164": "+2348000000000",
  "email": "test@example.com",
  "message": "Interested in this unit",
  "budget_min": 1500000,
  "budget_max": 3000000,
  "consent_marketing": false
}

Expected:
- First request: 201 with inquiry_id and lead_id
- Same request + same key: 200 with reused=true

## What to send back to me

After you run cloud steps, send:

1. SQL execution result for each file (success or exact error text).
2. Deployment status for each function.
3. Response payloads for the 3 smoke tests.

Once you send that, I will immediately move us into Day 3 integration and wire frontend hooks/pages to these new endpoints.
