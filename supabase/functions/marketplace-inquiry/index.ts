import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import { createCorrelationId, emitAuditEvent } from "../_shared/observability.ts";

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || "unknown";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "marketplace-inquiry",
    limit: 80,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    await emitAuditEvent({
      event_type: "marketplace.inquiry.rate_limited",
      source: "marketplace-inquiry",
      severity: "warning",
      details: { method: req.method },
    });
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(req, { error: "Missing server configuration" }, 500);
    }

    const correlationId = createCorrelationId();
    const idempotencyKey = (req.headers.get("Idempotency-Key") || "").trim();
    if (!idempotencyKey) return jsonResponse(req, { error: "Idempotency-Key header is required" }, 400);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};

    const listingId = (body?.listing_id || "").trim();
    const fullName = (body?.full_name || "").trim();
    const phone = (body?.phone_e164 || "").trim();
    const email = (body?.email || "").trim() || null;
    const message = (body?.message || "").trim() || null;
    const moveInDate = (body?.move_in_date || "").trim() || null;
    const budgetMin = body?.budget_min ?? null;
    const budgetMax = body?.budget_max ?? null;
    const consentMarketing = Boolean(body?.consent_marketing ?? false);

    if (!listingId) return jsonResponse(req, { error: "listing_id is required" }, 400);
    if (!fullName) return jsonResponse(req, { error: "full_name is required" }, 400);
    if (!phone) return jsonResponse(req, { error: "phone_e164 is required" }, 400);

    await emitAuditEvent({
      event_type: "marketplace.inquiry.received",
      source: "marketplace-inquiry",
      severity: "info",
      correlation_id: correlationId,
      details: { listing_id: listingId },
    });

    const { data, error } = await supabase
      .rpc("create_marketplace_inquiry", {
        p_listing_id: listingId,
        p_idempotency_key: idempotencyKey,
        p_full_name: fullName,
        p_phone_e164: phone,
        p_email: email,
        p_message: message,
        p_move_in_date: moveInDate,
        p_budget_min: budgetMin,
        p_budget_max: budgetMax,
        p_consent_marketing: consentMarketing,
        p_source_ip: getClientIp(req),
      })
      .single();

    if (error) {
      const msg = error.message || "Failed to create inquiry";

      if (msg.includes("LISTING_NOT_AVAILABLE")) {
        return jsonResponse(req, { error: "Listing not available" }, 404);
      }

      if (msg.includes("IDEMPOTENCY_KEY_REQUIRED")) {
        return jsonResponse(req, { error: "Idempotency key is required" }, 400);
      }

      await emitAuditEvent({
        event_type: "marketplace.inquiry.error",
        source: "marketplace-inquiry",
        severity: "error",
        correlation_id: correlationId,
        details: { message: msg, listing_id: listingId },
      });

      return jsonResponse(req, { error: "Unable to process inquiry" }, 500);
    }

    const statusCode = data?.reused ? 200 : 201;

    await emitAuditEvent({
      event_type: data?.reused ? "marketplace.inquiry.idempotent_replay" : "marketplace.inquiry.created",
      source: "marketplace-inquiry",
      severity: "info",
      correlation_id: correlationId,
      entity_type: "lead",
      entity_id: data?.lead_id ?? null,
      details: {
        inquiry_id: data?.inquiry_id,
        listing_id: listingId,
      },
    });

    return jsonResponse(req, {
      data: {
        inquiry_id: data?.inquiry_id,
        lead_id: data?.lead_id,
        reused: Boolean(data?.reused),
      },
      error: null,
      meta: { correlationId },
    }, statusCode);
  } catch (error: any) {
    console.error("marketplace-inquiry error", error);
    return jsonResponse(req, { error: error?.message || "Internal server error" }, 500);
  }
});
