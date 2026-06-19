import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';

export interface MfaStatus {
  enabled: boolean;
  enrolled_at: string | null;
  last_verified_at: string | null;
  recovery_codes_remaining: number;
}

export function useMfaStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus({ enabled: false, enrolled_at: null, last_verified_at: null, recovery_codes_remaining: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_mfa_status');
    if (error) {
      console.error('get_mfa_status error', error);
      setStatus({ enabled: false, enrolled_at: null, last_verified_at: null, recovery_codes_remaining: 0 });
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setStatus(row ?? { enabled: false, enrolled_at: null, last_verified_at: null, recovery_codes_remaining: 0 });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, refresh };
}

type FunctionInvokeErrorLike = {
  message?: string;
  context?: {
    body?: {
      text?: () => Promise<string>;
    };
  };
};

async function invokeMfa<T = unknown>(fn: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body: body ?? {} });
  if (error) {
    // Try to surface a meaningful error from the function response
    const functionError = error as FunctionInvokeErrorLike;
    const detail = functionError.context?.body
      ? await functionError.context.body.text?.().catch(() => null)
      : null;
    let msg = error.message || 'Request failed';
    try { if (detail) msg = JSON.parse(detail).error || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const mfaApi = {
  setup: () => invokeMfa<{ secret: string; otpauth_uri: string; issuer: string; account: string }>('mfa-setup'),
  enable: (code: string) => invokeMfa<{ success: true; recovery_codes: string[] }>('mfa-enable', { code }),
  verify: (code: string, recovery = false) => invokeMfa<{ success: true }>('mfa-verify', { code, recovery }),
  disable: (code: string, recovery = false) => invokeMfa<{ success: true }>('mfa-disable', { code, recovery }),
  regenerateCodes: (code: string) => invokeMfa<{ success: true; recovery_codes: string[] }>('mfa-regenerate-codes', { code }),
};

// Session-level "MFA satisfied" marker (cleared on tab close / sign-out)
const MFA_SESSION_KEY = 'fg.mfa.verified';
export function markMfaSessionVerified(userId: string) {
  sessionStorage.setItem(MFA_SESSION_KEY, userId);
}
export function clearMfaSession() {
  sessionStorage.removeItem(MFA_SESSION_KEY);
}
export function isMfaSessionVerified(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return sessionStorage.getItem(MFA_SESSION_KEY) === userId;
}
