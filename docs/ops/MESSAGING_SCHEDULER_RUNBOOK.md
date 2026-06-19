# Messaging Scheduler Runbook

## Purpose

Automatically dispatch due records from `public.scheduled_messages` into `public.messages`.

## Function

- Edge function: `process-scheduled-messages`
- Method: `POST`
- Auth model: `x-messages-cron-secret` header (if `MESSAGES_CRON_SECRET` is set)

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MESSAGES_CRON_SECRET` (recommended)

## Manual Invocation

```bash
curl -X POST \
  "$SUPABASE_URL/functions/v1/process-scheduled-messages" \
  -H "Content-Type: application/json" \
  -H "x-messages-cron-secret: $MESSAGES_CRON_SECRET" \
  -d '{"batchSize":50}'
```

## Expected Response

```json
{
  "success": true,
  "processed": 10,
  "sent": 10,
  "failed": 0
}
```

## Scheduling Recommendation

Run every 1-5 minutes using your scheduler of choice (GitHub Actions, cron job, or a Supabase-compatible scheduler) and call this function.

## Failure Handling

Failed rows are marked:

- `status = "failed"`
- `metadata.failureAt`
- `metadata.failureReason`

You can re-queue by updating:

- `status = "scheduled"`
- `scheduled_for = now() + interval '1 minute'`

## SQL Example: Requeue Failures

```sql
update public.scheduled_messages
set status = 'scheduled',
    scheduled_for = now() + interval '1 minute',
    metadata = coalesce(metadata, '{}'::jsonb) - 'failureAt' - 'failureReason'
where status = 'failed';
```
