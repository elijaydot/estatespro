-- Security Fix 1: Make payments immutable after creation (remove UPDATE policy)
-- This prevents users from manipulating payment status/amounts after creation
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;

-- Add a restrictive policy that only allows notes updates (if needed for admin comments)
CREATE POLICY "Users can update payment notes only" 
ON public.payments FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  amount = (SELECT amount FROM public.payments p WHERE p.id = payments.id) AND
  status = (SELECT status FROM public.payments p WHERE p.id = payments.id) AND
  invoice_id = (SELECT invoice_id FROM public.payments p WHERE p.id = payments.id) AND
  tenant_id = (SELECT tenant_id FROM public.payments p WHERE p.id = payments.id) AND
  method = (SELECT method FROM public.payments p WHERE p.id = payments.id)
);

-- Security Fix 2: Add explicit DELETE policy for profiles (prevent deletion for audit compliance)
CREATE POLICY "Prevent profile deletion"
ON public.profiles FOR DELETE
USING (false);

-- Security Fix 3: Update handle_new_user function with role validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Only allow tenant or property_manager for self-signup (security fix)
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'property_manager');
  
  IF user_role NOT IN ('tenant', 'property_manager') THEN
    user_role := 'property_manager'; -- Force to safe default
  END IF;
  
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    user_role
  );
  
  INSERT INTO public.app_settings (user_id, currency_code, currency_symbol, default_country)
  VALUES (NEW.id, 'RWF', 'RWF', 'Rwanda');
  
  RETURN NEW;
END;
$$;

-- Security Fix 4: Create atomic server-side payment processing function
CREATE OR REPLACE FUNCTION public.process_payment(
  p_invoice_id UUID,
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_momo_phone TEXT DEFAULT NULL,
  p_momo_transaction_id TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_invoice RECORD;
  v_new_paid_amount NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Verify ownership and get invoice data with row lock
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id 
    AND user_id = auth.uid()
    AND tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found or not authorized';
  END IF;
  
  -- Calculate new amounts atomically
  v_new_paid_amount := v_invoice.paid_amount + p_amount;
  
  -- Determine status
  IF v_new_paid_amount >= v_invoice.amount THEN
    v_new_status := 'paid';
  ELSIF v_new_paid_amount > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := v_invoice.status;
  END IF;
  
  -- Insert payment record with status always 'completed'
  INSERT INTO public.payments (
    user_id, invoice_id, tenant_id, amount, method,
    momo_phone, momo_transaction_id, reference, status, notes
  ) VALUES (
    auth.uid(), p_invoice_id, p_tenant_id, p_amount, p_method,
    p_momo_phone, p_momo_transaction_id, p_reference, 'completed', p_notes
  ) RETURNING id INTO v_payment_id;
  
  -- Update invoice in same transaction
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_payment TO authenticated;