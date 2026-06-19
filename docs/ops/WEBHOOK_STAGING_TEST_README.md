# Webhook Staging Test README

## Purpose
This guide lets you validate webhook delivery for `payment.verified` without needing live production payment rollout.

## Preconditions
1. Migration applied:
   - `supabase/migrations/20260618230000_add_webhook_delivery_tables.sql`
2. Edge runtime has webhook secret set (example):
   - Key: `WEBHOOK_SECRET_STAGING`
   - Value: any strong random string
3. Verify-payment runtime is deployed with webhook dispatch logic:
   - `supabase/functions/verify-payment/index.ts`

## Tables Introduced
1. `public.webhook_endpoints`
2. `public.webhook_delivery_attempts`
3. `public.webhook_dead_letters`

## Step 1: Confirm Tables Exist
Run in SQL editor:

```sql
select
  to_regclass('public.webhook_endpoints') as webhook_endpoints,
  to_regclass('public.webhook_delivery_attempts') as webhook_delivery_attempts,
  to_regclass('public.webhook_dead_letters') as webhook_dead_letters;
```

Expected: all three return non-null relation names.

## Step 2: Seed a Safe Inactive Endpoint
Use a temporary capture endpoint (for example webhook.site) first.

```sql
insert into public.webhook_endpoints
(company_id, event_type, target_url, secret_ref, is_active, max_attempts, timeout_ms)
values
(null, 'payment.verified', 'https://webhook.site/your-id', 'WEBHOOK_SECRET_STAGING', false, 5, 5000)
returning id, event_type, target_url, secret_ref, is_active, max_attempts, timeout_ms;
```

Notes:
1. Keep `company_id` as `null` for global test scope.
2. Keep `is_active=false` until receiver and secret are verified.

## Step 3: Validate Endpoint Row
```sql
select id, company_id, event_type, target_url, secret_ref, is_active, max_attempts, timeout_ms, created_at
from public.webhook_endpoints
where event_type = 'payment.verified'
order by created_at desc;
```

## Step 4: Activate Endpoint When Ready
```sql
update public.webhook_endpoints
set is_active = true
where event_type = 'payment.verified'
  and target_url = 'https://webhook.site/your-id';
```

## Step 5: Trigger Verify-Payment Success Path
Run a successful payment verification flow (guest booking or tenant invoice path) that reaches:
- `payment.verify.completed`
- webhook dispatch branch in `verify-payment`

## Step 6: Validate Delivery Attempt Records
```sql
select id, endpoint_id, event_type, event_id, correlation_id, attempt, status_code, success, error_message, duration_ms, next_retry_at, delivered_at, created_at
from public.webhook_delivery_attempts
order by created_at desc
limit 20;
```

Expected:
1. At least one row for `payment.verified`.
2. `attempt=1`.
3. `success=true` and `delivered_at` populated for successful delivery.
4. If transient failure (5xx/429/408/network), `success=false` and `next_retry_at` set.

## Step 7: Validate Dead-Letter Behavior
```sql
select id, endpoint_id, event_type, event_id, correlation_id, final_status_code, failure_reason, total_attempts, created_at, resolved_at
from public.webhook_dead_letters
order by created_at desc
limit 20;
```

Expected:
1. Row appears only for terminal failures (non-retryable path in current runtime logic).
2. `failure_reason` and `final_status_code` help triage.

## Step 8: Signature Verification (Receiver Side)
Current sender headers:
1. `x-webhook-signature`
2. `x-webhook-timestamp`
3. `x-webhook-event`
4. `x-webhook-version`

Signature is HMAC-SHA256 over:
- `${timestamp}.${rawBody}`

Use same secret value referenced by `secret_ref` env key.

## Step 9: Replay Procedure (Manual for Now)
1. Find dead-letter row in `webhook_dead_letters`.
2. Queue replay attempt using SQL helper `public.replay_webhook_dead_letter`.
3. Observe a new row in `webhook_delivery_attempts` with `manual_replay_requested`.
4. If needed, run manual re-post and append operator notes.

Queue replay example:

```sql
select public.replay_webhook_dead_letter(
   '<dead-letter-row-id>'::uuid,
   'staging-operator',
   'Receiver fixed; queueing replay.'
);
```

Example resolution update:

```sql
update public.webhook_dead_letters
set resolved_at = now(),
    resolution_notes = 'Replayed manually after receiver fix; confirmed 200 response.'
where id = 'dead-letter-row-id';
```

## Step 10: Cleanup (Optional)
If this was only a temporary test endpoint:

```sql
delete from public.webhook_endpoints
where event_type = 'payment.verified'
  and target_url = 'https://webhook.site/your-id';
```

## Troubleshooting
1. No attempts written:
   - verify endpoint `is_active=true`
   - ensure verify-payment reached successful branch
   - ensure migration was applied in target DB
2. Dead letters with "Missing webhook secret":
   - `secret_ref` value does not exist in runtime env
3. Signature mismatch on receiver:
   - verify raw body is used
   - verify timestamp and secret are exact
4. Repeated retries not yet visible:
   - runtime writes attempt record and retry metadata; replay queueing helper exists, while full async retry worker can be added as follow-up.

## Related Files
1. `supabase/functions/verify-payment/index.ts`
2. `supabase/functions/_shared/webhook-delivery.ts`
3. `supabase/functions/_shared/webhook-events.ts`
4. `supabase/migrations/20260618230000_add_webhook_delivery_tables.sql`
5. `supabase/migrations/20260619001000_add_webhook_dead_letter_replay_function.sql`
5. `docs/parity/API_CONTRACT_INVENTORY.md`
6. `docs/parity/API_VERSIONING_POLICY.md`
