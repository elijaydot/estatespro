
-- Remove bookings from realtime publication to prevent guest PII broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
  END IF;
END $$;
