import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import {
  createCorrelationId,
  emitAuditEvent,
} from "../_shared/observability.ts";

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "run-subscription-renewals",
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(req, { error: "Missing server configuration" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Authorization header required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const payload = (await req.json().catch(() => ({}))) as { limit?: number; correlationId?: string };
    const limit = Math.max(1, Math.min(500, Number(payload.limit || 100)));
    const correlationId = payload.correlationId || createCorrelationId();

    const { data, error } = await supabase.rpc("saas_process_subscription_renewals", {
      p_limit: limit,
      p_correlation_id: correlationId,
    });

    if (error) {
      await emitAuditEvent({
        source: "run-subscription-renewals",
        event_type: "saas.renewals.run.failed",
        severity: "error",
        actor_user_id: authData.user.id,
        correlation_id: correlationId,
        details: { limit, message: error.message },
      });

      return jsonResponse(req, { error: error.message || "Renewal processing failed", correlationId }, 500);
    }

    await emitAuditEvent({
      source: "run-subscription-renewals",
      event_type: "saas.renewals.run.completed",
      severity: "info",
      actor_user_id: authData.user.id,
      correlation_id: correlationId,
      details: { limit, result: data },
    });

    return jsonResponse(req, {
      success: true,
      result: data,
      correlationId,
    });
  } catch (error) {
    console.error("run-subscription-renewals error", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
