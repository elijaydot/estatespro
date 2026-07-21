import { supabase } from '@/integrations/supabase/client';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEventInput {
  source: string;
  eventType: string;
  severity?: AuditSeverity;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown>;
  correlationId?: string | null;
  actorUserId?: string | null;
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function createCorrelationId(prefix: string) {
  return `${prefix}:${Date.now()}:${randomId()}`;
}

export async function emitAuditEvent(input: AuditEventInput) {
  const {
    source,
    eventType,
    severity = 'info',
    entityType = null,
    entityId = null,
    details = {},
    correlationId = null,
    actorUserId,
  } = input;

  const { data: authData } = await supabase.auth.getUser();
  const resolvedActor = actorUserId ?? authData.user?.id ?? null;

  const { error } = await supabase
    .from('audit_events')
    .insert({
      source,
      event_type: eventType,
      severity,
      actor_user_id: resolvedActor,
      entity_type: entityType,
      entity_id: entityId,
      details,
      correlation_id: correlationId,
    });

  if (error) {
    console.error('Failed to emit audit event', {
      source,
      eventType,
      entityType,
      entityId,
      message: error.message,
    });
  }
}