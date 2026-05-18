-- MFA per-user state
CREATE TABLE IF NOT EXISTS public.user_mfa (
  user_id UUID PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  secret_ciphertext TEXT,           -- base64 AES-GCM ciphertext of base32 secret
  secret_iv TEXT,                   -- base64 IV
  enrolled_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

-- Users can read their own MFA row (but secret column is never sent to client by app code; we expose via RPC)
CREATE POLICY "Users view own mfa row"
  ON public.user_mfa FOR SELECT
  USING (auth.uid() = user_id);

-- No client-side insert/update/delete — only edge functions (service role) manage this table.
-- (No INSERT/UPDATE/DELETE policies = denied by default for anon/authenticated.)

CREATE TRIGGER update_user_mfa_updated_at
BEFORE UPDATE ON public.user_mfa
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Safe status function — does not expose secret
CREATE OR REPLACE FUNCTION public.get_mfa_status()
RETURNS TABLE(enabled BOOLEAN, enrolled_at TIMESTAMPTZ, last_verified_at TIMESTAMPTZ, recovery_codes_remaining INT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(m.enabled, false) AS enabled,
    m.enrolled_at,
    m.last_verified_at,
    COALESCE((
      SELECT COUNT(*)::int FROM public.security_recovery_codes r
      WHERE r.user_id = auth.uid() AND r.used_at IS NULL
    ), 0) AS recovery_codes_remaining
  FROM public.user_mfa m
  WHERE m.user_id = auth.uid()
  UNION ALL
  SELECT false, NULL, NULL, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.user_mfa WHERE user_id = auth.uid())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_mfa_status() TO authenticated;