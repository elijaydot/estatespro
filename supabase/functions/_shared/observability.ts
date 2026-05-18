import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
