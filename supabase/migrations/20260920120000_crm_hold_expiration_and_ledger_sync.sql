-- ==============================================================================
-- Migration: CRM Unit Hold Expiration, Deposit-to-Ledger Sync & Multi-Currency Engine
-- Target: Supabase / PostgreSQL (FishGate Property OS - Rwanda & East Africa Spine)
-- ==============================================================================

-- 1. Add expiration timestamp and currency support to crm_unit_bookings
ALTER TABLE IF EXISTS crm_unit_bookings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '48 hours'),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF',
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS payment_id UUID;

-- 2. Index for efficient expired hold cleanup
CREATE INDEX IF NOT EXISTS idx_crm_unit_bookings_expired_holds
  ON crm_unit_bookings (status, expires_at)
  WHERE status IN ('Pending', 'Reserved');

-- 3. Stored function: Release Expired Unit Holds back to Available inventory
CREATE OR REPLACE FUNCTION crm_release_expired_unit_holds()
RETURNS TABLE (
  released_booking_id UUID,
  released_unit_id UUID,
  lead_id UUID,
  unit_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT 
      b.id AS booking_id,
      b.unit_id,
      b.lead_id,
      b.company_id,
      u.unit_number,
      u.property_id
    FROM crm_unit_bookings b
    JOIN units u ON u.id = b.unit_id
    WHERE b.status IN ('Pending', 'Reserved')
      AND b.expires_at < now()
    FOR UPDATE OF b, u
  LOOP
    -- 1. Mark booking as expired
    UPDATE crm_unit_bookings
    SET status = 'Expired',
        updated_at = now()
    WHERE id = v_rec.booking_id;

    -- 2. Release unit status back to Vacant / Available
    UPDATE units
    SET status = 'Vacant',
        updated_at = now()
    WHERE id = v_rec.unit_id;

    -- 3. Log lead activity that hold expired
    INSERT INTO lead_activities (
      lead_id,
      activity_type,
      payload,
      created_at
    ) VALUES (
      v_rec.lead_id,
      'hold_expired',
      jsonb_build_object(
        'unit_id', v_rec.unit_id,
        'unit_number', v_rec.unit_number,
        'reason', '48-hour reservation window elapsed without confirmed payment'
      ),
      now()
    );

    -- 4. Create in-app notification for company teammates
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      read,
      created_at
    )
    SELECT
      l.assigned_to,
      'Unit Hold Expired',
      'Hold on Unit ' || v_rec.unit_number || ' has expired and returned to active inventory.',
      'warning',
      false,
      now()
    FROM leads l
    WHERE l.id = v_rec.lead_id
      AND l.assigned_to IS NOT NULL;

    -- Return row to output table
    released_booking_id := v_rec.booking_id;
    released_unit_id := v_rec.unit_id;
    lead_id := v_rec.lead_id;
    unit_number := v_rec.unit_number;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- 4. RPC wrapper for client-triggered hold expiration sweep
CREATE OR REPLACE FUNCTION crm_sweep_expired_holds()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released_count INT := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN SELECT * FROM crm_release_expired_unit_holds() LOOP
    v_released_count := v_released_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'released_count', v_released_count,
    'timestamp', now()
  );
END;
$$;

-- 5. Updated Atomic Unit Booking with Ledger Synchronization (Invoices & Payments)
CREATE OR REPLACE FUNCTION book_unit_atomic(
  p_unit_id UUID,
  p_lead_id UUID,
  p_company_id UUID,
  p_booking_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'bank_transfer',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit RECORD;
  v_lead RECORD;
  v_booking_id UUID;
  v_invoice_id UUID;
  v_payment_id UUID;
  v_inv_number TEXT;
  v_currency TEXT := 'RWF';
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Pessimistic lock on the target unit
  SELECT id, property_id, unit_number, status, rent_amount, deposit_amount
  INTO v_unit
  FROM units
  WHERE id = p_unit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unit not found', 'code', 'UNIT_NOT_FOUND');
  END IF;

  IF v_unit.status NOT IN ('Vacant', 'Available', 'vacant', 'available') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unit is not available for booking (Current status: ' || v_unit.status || ')', 
      'code', 'UNIT_UNAVAILABLE'
    );
  END IF;

  -- 2. Verify lead exists
  SELECT id, company_id, contact_name, contact_email, contact_phone
  INTO v_lead
  FROM leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found', 'code', 'LEAD_NOT_FOUND');
  END IF;

  -- Calculate expiration: 48h for unconfirmed, null for full payment
  IF p_booking_amount > 0 THEN
    v_expires_at := NULL; -- Confirmed deposit, no expiration
  ELSE
    v_expires_at := now() + INTERVAL '48 hours'; -- Stale hold protection
  END IF;

  -- 3. Insert reservation in crm_unit_bookings
  INSERT INTO crm_unit_bookings (
    unit_id,
    lead_id,
    company_id,
    booking_amount,
    currency,
    payment_method,
    status,
    notes,
    expires_at,
    created_at
  ) VALUES (
    p_unit_id,
    p_lead_id,
    COALESCE(p_company_id, v_lead.company_id),
    p_booking_amount,
    v_currency,
    p_payment_method,
    CASE WHEN p_booking_amount > 0 THEN 'Confirmed' ELSE 'Reserved' END,
    p_notes,
    v_expires_at,
    now()
  )
  RETURNING id INTO v_booking_id;

  -- 4. Update unit status to Reserved/Sold
  UPDATE units
  SET status = CASE WHEN p_booking_amount > 0 THEN 'Sold' ELSE 'Reserved' END,
      updated_at = now()
  WHERE id = p_unit_id;

  -- 5. Automatically Synchronize to Accounting Ledger if deposit collected
  IF p_booking_amount > 0 AND v_unit.property_id IS NOT NULL THEN
    v_inv_number := 'INV-DEP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(v_booking_id::text, '-', ''), 1, 6));

    -- Generate Invoice in invoices table
    INSERT INTO invoices (
      company_id,
      property_id,
      unit_id,
      invoice_number,
      amount,
      balance,
      due_date,
      paid_date,
      status,
      type,
      notes,
      created_at
    ) VALUES (
      COALESCE(p_company_id, v_lead.company_id),
      v_unit.property_id,
      p_unit_id,
      v_inv_number,
      p_booking_amount,
      0,
      CURRENT_DATE,
      CURRENT_DATE,
      'paid',
      'security_deposit',
      'CRM Reservation Deposit for Unit ' || v_unit.unit_number || ' - ' || COALESCE(v_lead.contact_name, 'Prospect'),
      now()
    )
    RETURNING id INTO v_invoice_id;

    -- Generate Payment entry in payments table
    INSERT INTO payments (
      company_id,
      invoice_id,
      amount,
      payment_method,
      payment_date,
      notes,
      created_at
    ) VALUES (
      COALESCE(p_company_id, v_lead.company_id),
      v_invoice_id,
      p_booking_amount,
      p_payment_method,
      CURRENT_DATE,
      'Deposit payment via ' || p_payment_method || ' for CRM Booking #' || v_booking_id,
      now()
    )
    RETURNING id INTO v_payment_id;

    -- Link invoice and payment back to booking
    UPDATE crm_unit_bookings
    SET invoice_id = v_invoice_id,
        payment_id = v_payment_id
    WHERE id = v_booking_id;
  END IF;

  -- 6. Advance lead stage to 'booked' and attach interested_unit_id
  UPDATE leads
  SET stage = 'booked',
      interested_unit_id = p_unit_id,
      last_activity_at = now(),
      updated_at = now()
  WHERE id = p_lead_id;

  -- 7. Audit log
  INSERT INTO lead_activities (
    lead_id,
    activity_type,
    payload,
    created_at
  ) VALUES (
    p_lead_id,
    'unit_booked_atomic',
    jsonb_build_object(
      'booking_id', v_booking_id,
      'unit_id', p_unit_id,
      'unit_number', v_unit.unit_number,
      'booking_amount', p_booking_amount,
      'currency', v_currency,
      'invoice_id', v_invoice_id,
      'payment_id', v_payment_id,
      'expires_at', v_expires_at,
      'notes', p_notes
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'unit_id', p_unit_id,
    'unit_number', v_unit.unit_number,
    'amount', p_booking_amount,
    'currency', v_currency,
    'invoice_id', v_invoice_id,
    'payment_id', v_payment_id,
    'expires_at', v_expires_at,
    'stage', 'booked'
  );
END;
$$;
