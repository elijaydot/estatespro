
-- =============================================
-- 1. BOOKINGS TABLE for Airbnb/short-let properties
-- =============================================
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  nightly_rate NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  cleaning_fee NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  special_requests TEXT,
  num_guests INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Landlords manage bookings for their company properties
CREATE POLICY "Landlords manage company bookings"
ON public.bookings FOR ALL TO authenticated
USING (property_id IN (SELECT get_company_property_ids(auth.uid())))
WITH CHECK (property_id IN (SELECT get_company_property_ids(auth.uid())));

-- PMs manage bookings for assigned properties
CREATE POLICY "PMs manage assigned bookings"
ON public.bookings FOR ALL TO authenticated
USING (is_approved_pm(auth.uid(), property_id))
WITH CHECK (is_approved_pm(auth.uid(), property_id));

-- Users create bookings they own
CREATE POLICY "Users create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Validation trigger to ensure check_out > check_in
CREATE OR REPLACE FUNCTION public.validate_booking_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION 'Check-out date must be after check-in date';
  END IF;
  IF NEW.check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'Check-in date cannot be in the past';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_booking_dates_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_dates();

-- =============================================
-- 2. FIX MESSAGES: Add helper function to resolve tenant name for messaging
-- =============================================
CREATE OR REPLACE FUNCTION public.get_message_participant_name(_participant_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- First check if it's a tenant record ID
  SELECT name FROM public.tenants WHERE id = _participant_id
  UNION ALL
  -- Then check if it's an auth user ID (landlord/PM)
  SELECT name FROM public.profiles WHERE user_id = _participant_id
  LIMIT 1
$$;

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
