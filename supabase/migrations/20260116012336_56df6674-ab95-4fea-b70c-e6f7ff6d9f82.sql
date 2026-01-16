-- Security Fix 1: Prevent users from modifying their own role
-- Drop and recreate the UPDATE policy with role protection
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent role modification: new role must equal existing role
  role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- Security Fix 2: Add input validation to process_payment function
-- Drop and recreate with proper validation
DROP FUNCTION IF EXISTS public.process_payment(
  p_amount numeric,
  p_invoice_id uuid,
  p_method text,
  p_momo_phone text,
  p_momo_transaction_id text,
  p_notes text,
  p_reference text,
  p_tenant_id uuid
);

CREATE OR REPLACE FUNCTION public.process_payment(
  p_amount numeric,
  p_invoice_id uuid,
  p_method text,
  p_momo_phone text DEFAULT NULL,
  p_momo_transaction_id text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_invoice RECORD;
  v_new_paid_amount NUMERIC;
  v_new_status TEXT;
  v_actual_tenant_id UUID;
  v_receipt_number TEXT;
BEGIN
  -- Security: Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Input validation: Payment amount must be positive
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be a positive number';
  END IF;

  -- Input validation: Reasonable maximum amount (100 million)
  IF p_amount > 100000000 THEN
    RAISE EXCEPTION 'Payment amount exceeds maximum allowed value';
  END IF;

  -- Input validation: Invoice ID is required
  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'Invoice ID is required';
  END IF;

  -- Input validation: Payment method is required
  IF p_method IS NULL OR p_method = '' THEN
    RAISE EXCEPTION 'Payment method is required';
  END IF;

  -- Input validation: Payment method must be valid
  IF p_method NOT IN ('bank_transfer', 'cash', 'mtn_momo', 'credit_card', 'cheque') THEN
    RAISE EXCEPTION 'Invalid payment method. Must be one of: bank_transfer, cash, mtn_momo, credit_card, cheque';
  END IF;

  -- Input validation: MoMo phone required for MoMo payments
  IF p_method = 'mtn_momo' AND (p_momo_phone IS NULL OR p_momo_phone = '') THEN
    RAISE EXCEPTION 'Mobile money phone number is required for MoMo payments';
  END IF;

  -- Fetch and lock the invoice
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND user_id = auth.uid()  -- Security: Only owner can process
  FOR UPDATE;

  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'Invoice not found or you do not have permission to process payments for this invoice';
  END IF;

  -- Validate invoice status
  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot process payment for a cancelled invoice';
  END IF;

  -- Get tenant_id from invoice if not provided
  v_actual_tenant_id := COALESCE(p_tenant_id, v_invoice.tenant_id);

  -- Calculate new paid amount
  v_new_paid_amount := v_invoice.paid_amount + p_amount;

  -- Prevent excessive overpayment (max 10% over invoice amount)
  IF v_new_paid_amount > v_invoice.amount * 1.1 THEN
    RAISE EXCEPTION 'Payment would exceed invoice amount by more than 10%%. Current balance: %, Attempted payment: %', 
      (v_invoice.amount - v_invoice.paid_amount), p_amount;
  END IF;

  -- Check for duplicate MoMo transaction
  IF p_momo_transaction_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.payments 
      WHERE momo_transaction_id = p_momo_transaction_id
        AND status = 'completed'
    ) THEN
      RAISE EXCEPTION 'Duplicate transaction: This MoMo transaction ID has already been processed';
    END IF;
  END IF;

  -- Determine new invoice status
  IF v_new_paid_amount >= v_invoice.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Generate receipt number
  v_receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

  -- Insert payment
  INSERT INTO public.payments (
    amount,
    invoice_id,
    method,
    momo_phone,
    momo_transaction_id,
    notes,
    reference,
    tenant_id,
    user_id,
    status,
    receipt_number
  ) VALUES (
    p_amount,
    p_invoice_id,
    p_method,
    p_momo_phone,
    p_momo_transaction_id,
    p_notes,
    p_reference,
    v_actual_tenant_id,
    auth.uid(),
    'completed',
    v_receipt_number
  ) RETURNING id INTO v_payment_id;

  -- Update invoice
  UPDATE public.invoices
  SET 
    paid_amount = v_new_paid_amount,
    status = v_new_status,
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;