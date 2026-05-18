import { supabase } from '@/integrations/supabase/client';

type SecurityMetadata = Record<string, unknown>;

const db = supabase as any;

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const chunkA = Math.random().toString(36).slice(2, 6).toUpperCase();
    const chunkB = Math.random().toString(36).slice(2, 6).toUpperCase();
    codes.push(`${chunkA}-${chunkB}`);
  }

  return codes;
}

export async function saveRecoveryCodes(codes: string[]): Promise<number> {
  const { data, error } = await db.rpc('set_recovery_codes', {
    p_codes: codes,
  });

  if (error) {
    throw error;
  }

  return Number(data || 0);
}

export async function consumeRecoveryCode(code: string): Promise<boolean> {
  const { data, error } = await db.rpc('consume_recovery_code', {
    p_code: code,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function logSecurityEvent(eventType: string, metadata: SecurityMetadata = {}) {
  const payload = {
    p_event_type: eventType,
    p_metadata: {
      ...metadata,
      path: typeof window !== 'undefined' ? window.location.pathname : null,
      ts: new Date().toISOString(),
    },
    p_ip_address: null,
    p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };

  const { error } = await db.rpc('log_security_event', payload);
  if (error) {
    console.error('Failed to log security event:', error);
  }
}
