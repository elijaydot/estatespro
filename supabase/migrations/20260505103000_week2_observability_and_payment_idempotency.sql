-- Week 2: observability and payment idempotency hardening

-- 1) Add audit events table for monitoring and forensic traces from edge functions.
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NULL,
  entity_id TEXT NULL,
  correlation_id TEXT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- No authenticated client policies are added here on purpose.
-- Writes are performed by service-role edge functions only.

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
  ON public.audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_event_type
  ON public.audit_events (event_type);

CREATE INDEX IF NOT EXISTS idx_audit_events_source
  ON public.audit_events (source);

CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id
  ON public.audit_events (correlation_id)
  WHERE correlation_id IS NOT NULL;

-- 2) Enforce payment verification idempotency at DB level.
-- Remove duplicate provider references on the same invoice before creating unique index.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY invoice_id, reference
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.payments
  WHERE invoice_id IS NOT NULL
    AND reference IS NOT NULL
)
DELETE FROM public.payments p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_invoice_reference_unique
  ON public.payments (invoice_id, reference)
  WHERE invoice_id IS NOT NULL
    AND reference IS NOT NULL;
