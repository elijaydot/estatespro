# Week 2 Staging Runbook (FishGate)

## Goal
Execute staging validation for:
1. Core workflow integration.
2. Payment verification idempotency.
3. Monitoring/audit event coverage.

## Preconditions
1. Deploy latest branch to staging.
2. Apply migration:
   - `supabase/migrations/20260505103000_week2_observability_and_payment_idempotency.sql`
3. Ensure edge functions are deployed:
   - `payment-checkout`
   - `verify-payment`
4. Set environment variables in Supabase project:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Gateway secret vars (`PAYSTACK_SECRET_KEY` or `FLUTTERWAVE_SECRET_KEY`)

## Quick Local Validation
1. `npm run test:week2`
2. `npm run build`

## API Test Setup
Export these variables first (PowerShell):

```powershell
$SUPABASE_URL = "https://<project-ref>.supabase.co"
$SUPABASE_ANON_KEY = "<anon-key>"
$USER_JWT = "<staging-user-access-token>"
```

## A. Checkout Flow Smoke
Call `payment-checkout` for a tenant invoice.

```powershell
$checkoutBody = @{
  source = "tenant_invoice"
  invoiceId = "<invoice-id>"
  gateway = "paystack"
  paymentMethod = "card"
  correlationId = "wk2-checkout-001"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "$SUPABASE_URL/functions/v1/payment-checkout" `
  -Headers @{
    "Authorization" = "Bearer $USER_JWT"
    "apikey" = $SUPABASE_ANON_KEY
    "Content-Type" = "application/json"
  } `
  -Body $checkoutBody
```

Expected:
1. `success = true`
2. `reference` present
3. `checkoutUrl` present
4. `correlationId` echoed in response

## B. Verify Payment (Happy Path)
Use reference from checkout response.

```powershell
$verifyBody = @{
  gateway = "paystack"
  reference = "<reference-from-checkout>"
  invoiceId = "<invoice-id>"
  correlationId = "wk2-verify-001"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "$SUPABASE_URL/functions/v1/verify-payment" `
  -Headers @{
    "Authorization" = "Bearer $USER_JWT"
    "apikey" = $SUPABASE_ANON_KEY
    "Content-Type" = "application/json"
  } `
  -Body $verifyBody
```

Expected:
1. `success = true`
2. `verified = true`
3. `alreadyProcessed = false` on first call
4. `correlationId` echoed in response

## C. Verify Idempotency (Duplicate Call)
Repeat the exact same verify payload.

Expected:
1. `success = true`
2. `alreadyProcessed = true`
3. No extra payment row created

## SQL Verification Queries
Run in Supabase SQL Editor.

### 1) Audit events are being recorded
```sql
SELECT
  created_at,
  event_type,
  source,
  severity,
  correlation_id,
  details
FROM public.audit_events
WHERE source IN ('payment-checkout', 'verify-payment')
ORDER BY created_at DESC
LIMIT 50;
```

### 2) Correlation ID linkage check
```sql
SELECT
  correlation_id,
  COUNT(*) AS event_count,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM public.audit_events
WHERE correlation_id IN ('wk2-checkout-001', 'wk2-verify-001')
GROUP BY correlation_id
ORDER BY last_seen DESC;
```

### 3) Idempotency duplicate event exists
```sql
SELECT
  created_at,
  event_type,
  correlation_id,
  details
FROM public.audit_events
WHERE event_type = 'payment.verify.idempotent_duplicate'
ORDER BY created_at DESC
LIMIT 20;
```

### 4) No duplicate payment references per invoice
```sql
SELECT
  invoice_id,
  reference,
  COUNT(*) AS c
FROM public.payments
WHERE reference IS NOT NULL
GROUP BY invoice_id, reference
HAVING COUNT(*) > 1;
```

Expected: zero rows.

## Suggested Alert Rules (Ops)
1. Warning alert: `payment.verify.rate_limited` > baseline over 5 minutes.
2. Error alert: `payment.checkout.failed` > 0 in 10 minutes.
3. Error alert: `payment.verify.failed` > 0 in 10 minutes.

## Exit Criteria
1. Week 2 tests pass locally (`test:week2`, `build`).
2. Checkout + verify pass in staging.
3. Duplicate verify returns `alreadyProcessed = true`.
4. Audit events are written and queryable.
5. Duplicate `(invoice_id, reference)` query returns zero rows.
