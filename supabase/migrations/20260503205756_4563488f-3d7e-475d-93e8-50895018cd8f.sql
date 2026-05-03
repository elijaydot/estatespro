
-- Revoke anon execute on SECURITY DEFINER functions that don't need public access.
-- Keep validate_invite_token and validate_pm_invite_token accessible to anon (signup flows).
-- Keep get_payment_settings_for_property accessible to anon (guest booking flow).

DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname NOT IN (
        'validate_invite_token',
        'validate_pm_invite_token',
        'get_payment_settings_for_property'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', fn.proname, fn.args);
  END LOOP;
END $$;
