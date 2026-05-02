-- Shortlet booking email + guest action + payment integration

-- 1) Extend bookings for guest action/email workflow
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_action_token text,
  ADD COLUMN IF NOT EXISTS guest_response_status text NOT NULL DEFAULT 'pending'
    CHECK (guest_response_status IN ('pending', 'accepted', 'cancelled')),
  ADD COLUMN IF NOT EXISTS guest_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_email_type text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_guest_action_token_unique
  ON public.bookings (guest_action_token)
  WHERE guest_action_token IS NOT NULL;

-- 2) Allow invoice/payment records for shortlet guests without tenant accounts
ALTER TABLE public.invoices
  ALTER COLUMN tenant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'tenant'
    CHECK (source IN ('tenant', 'shortlet_booking'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_booking_id_unique
  ON public.invoices (booking_id)
  WHERE booking_id IS NOT NULL;

ALTER TABLE public.payments
  ALTER COLUMN tenant_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payer_name text,
  ADD COLUMN IF NOT EXISTS payer_email text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'tenant'
    CHECK (source IN ('tenant', 'shortlet_booking'));

CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON public.payments (booking_id)
  WHERE booking_id IS NOT NULL;

-- 3) Backfill source for historical records
UPDATE public.invoices
SET source = 'tenant'
WHERE source IS NULL;

UPDATE public.payments
SET source = 'tenant'
WHERE source IS NULL;
