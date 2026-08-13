# FishGate Public API Webhooks

## Runtime

Apply `20260812150000_fishgate_public_api_webhook_outbox.sql`, deploy `dispatch-webhooks`, and set a strong `WEBHOOK_WORKER_SECRET`. Invoke the worker every minute with `POST /functions/v1/dispatch-webhooks` and the `x-webhook-worker-secret` header.

Endpoint rows are company-scoped. `secret_ref` is the name of a Supabase Edge Function secret containing that endpoint's HMAC key. Do not store the signing key in the database.

```sql
insert into public.webhook_endpoints
  (company_id, event_type, target_url, secret_ref, is_active, max_attempts, timeout_ms)
values
  ('<company-id>', 'lease.signed', 'https://partner.example/webhooks/fishgate', 'PARTNER_WEBHOOK_SECRET', true, 5, 5000);
```

## Delivery Contract

Supported events are `lease.signed`, `payment.received`, `lead.converted`, and `listing.published`. The worker signs `${timestamp}.${rawBody}` with HMAC-SHA256 and sends `x-webhook-signature`, `x-webhook-timestamp`, `x-webhook-event`, and `x-webhook-version`.

Receivers must verify the raw body before JSON parsing, reject stale timestamps, and deduplicate by `event_id`. Any 2xx response succeeds. Network failures, 408, 429, and 5xx responses retry with exponential backoff; terminal or exhausted failures enter `webhook_dead_letters`.

## Operations

Monitor pending age in `webhook_events`, failures in `webhook_delivery_attempts`, and unresolved rows in `webhook_dead_letters`. A `processing` event older than five minutes is reclaimable automatically. Use `replay_webhook_dead_letter` only after the receiver or secret has been corrected.

Never configure a global endpoint for these four events. The dispatcher requires `webhook_endpoints.company_id = webhook_events.company_id`, preventing cross-company delivery.