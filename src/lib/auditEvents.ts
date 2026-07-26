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
    } as never);

  if (error) {
    console.error('Failed to emit audit event', {
      source,
      eventType,
      entityType,
      entityId,
      message: error.message,
    });
    return;
  }

  const [moduleName, actionName] = eventType.includes('.')
    ? eventType.split('.', 2)
    : [source, eventType];

  const hasFailureSignal =
    severity === 'error' ||
    severity === 'critical' ||
    eventType.includes('blocked') ||
    eventType.includes('denied') ||
    eventType.includes('failed') ||
    eventType.includes('error');

  const resultStatus = hasFailureSignal ? 'error' : 'success';
  const riskScore = severity === 'critical' ? 95 : severity === 'error' ? 80 : severity === 'warning' ? 55 : 25;

  const { error: controlPlaneError } = await supabase.rpc('platform_ingest_audit_event' as never, {
    p_source: source,
    p_event_type: eventType,
    p_module: moduleName,
    p_action: actionName,
    p_result_status: resultStatus,
    p_severity: severity,
    p_actor_user_id: resolvedActor,
    p_company_id: null,
    p_target_entity_type: entityType,
    p_target_entity_id: entityId,
    p_correlation_id: correlationId || createCorrelationId(source),
    p_risk_score: riskScore,
    p_ip_address: null,
    p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    p_device_info: { client: 'web', source },
    p_metadata: details,
  } as never);

  if (controlPlaneError) {
    console.error('Failed to emit platform control-plane event', {
      source,
      eventType,
      message: controlPlaneError.message,
    });
  }
}