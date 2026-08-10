# SaaS Renewals Scheduler Runbook

## Purpose

Queue and process due standalone-company and Owner Billing Group renewals, initialize gateway checkout, and notify the billing owner.

## Function

- Edge Function: `run-subscription-renewals`
- Method: `POST`
- Recommended cadence: hourly
- Auth header: `x-saas-renewals-cron-secret`

## Required Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SAAS_RENEWALS_CRON_SECRET`
- `PAYSTACK_SECRET_KEY` or `FLUTTERWAVE_SECRET_KEY`
- `SAAS_BILLING_FALLBACK_EMAIL` (optional)

The scheduler and Edge Function must use the same high-entropy value for `SAAS_RENEWALS_CRON_SECRET`.

## Invocation

```bash
curl -X POST \
  "$SUPABASE_URL/functions/v1/run-subscription-renewals" \
  -H "Content-Type: application/json" \
  -H "x-saas-renewals-cron-secret: $SAAS_RENEWALS_CRON_SECRET" \
  -d '{"limit":100,"gateway":"paystack","paymentMethod":"link","callbackUrl":"https://app.estatespro.com/account/billing"}'
```

The function is idempotent for already-created renewal invoices and payment attempts. Keep the existing database cron as a fallback for company lifecycle processing, but use this Edge Function schedule for gateway checkout and Owner Billing Groups.

## Verification

Confirm the response reports both scopes:

- `companyRenewalAttemptsPrepared`
- `ownerGroupRenewalAttemptsPrepared`
- `renewalCheckoutsInitialized`
- `renewalCheckoutInitFailures`

Review `audit_events` for `saas.renewals.run.completed` or failure events.