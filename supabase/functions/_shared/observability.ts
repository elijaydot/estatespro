import { createClient } from "./supabase-client-types.ts";

export type AuditSeverity = "info" | "warning" | "error";

export interface AuditEventInput {
  event_type: string;
  source: string;
  severity?: AuditSeverity;
  actor_user_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  correlation_id?: string | null;
  details?: Record<string, unknown> | null;
}

export interface TimedAuditContext {
  eventBase: string;
  source: string;
  correlationId?: string | null;
  actorUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}

export function createCorrelationId() {
  return crypto.randomUUID();
}

export async function emitAuditEvent(event: AuditEventInput) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn("audit_event skipped: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase.from("audit_events").insert({
      event_type: event.event_type,
      source: event.source,
      severity: event.severity ?? "info",
      actor_user_id: event.actor_user_id ?? null,
      entity_type: event.entity_type ?? null,
      entity_id: event.entity_id ?? null,
      correlation_id: event.correlation_id ?? null,
      details: event.details ?? {},
    });

    if (error) {
      console.warn("audit_event insert failed", error.message);
    }
  } catch (error) {
    console.warn("audit_event emit failed", error);
  }
}

function getErrorMessage(error: unknown, fallback = "Internal server error") {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function withTimedAudit<T>(context: TimedAuditContext, task: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await task();
    await emitAuditEvent({
      event_type: `${context.eventBase}.completed`,
      source: context.source,
      severity: "info",
      actor_user_id: context.actorUserId ?? null,
      entity_type: context.entityType ?? null,
      entity_id: context.entityId ?? null,
      correlation_id: context.correlationId ?? null,
      details: {
        ...(context.details ?? {}),
        duration_ms: Date.now() - startedAt,
      },
    });
    return result;
  } catch (error) {
    await emitAuditEvent({
      event_type: `${context.eventBase}.failed`,
      source: context.source,
      severity: "error",
      actor_user_id: context.actorUserId ?? null,
      entity_type: context.entityType ?? null,
      entity_id: context.entityId ?? null,
      correlation_id: context.correlationId ?? null,
      details: {
        ...(context.details ?? {}),
        duration_ms: Date.now() - startedAt,
        message: getErrorMessage(error),
      },
    });
    throw error;
  }
}
