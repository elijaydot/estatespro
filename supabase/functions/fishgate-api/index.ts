import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { apiError, apiSuccess, isUuid, parseApiListQuery } from "../_shared/api-contract.ts";
import { authenticateApiRequest, authorizeApiAccess, hashApiKey, type ApiAuthClient, type ApiAuthSuccess, type ApiScope, type ApiTier } from "../_shared/api-auth.ts";
import { buildCorsHeaders, handleCorsPreflight } from "../_shared/security.ts";
import { createCorrelationId } from "../_shared/observability.ts";

type RouteDefinition = { rpc: string; items: boolean; sorts?: string[]; createRpc?: string; updateRpc?: string; scope?: ApiScope; tier?: ApiTier; single?: boolean; argument?: "listing" | "lease" };
const routes: Record<string, RouteDefinition> = {
  properties: { rpc: "api_get_properties", items: true, sorts: ["created_at", "-created_at", "name", "-name"], createRpc: "api_create_property", updateRpc: "api_update_property" },
  units: { rpc: "api_get_units", items: true, createRpc: "api_create_unit", updateRpc: "api_update_unit" },
  leases: { rpc: "api_get_leases", items: true, createRpc: "api_create_lease", updateRpc: "api_update_lease" },
  tenants: { rpc: "api_get_tenants", items: true, sorts: ["created_at", "-created_at", "name", "-name"], createRpc: "api_create_tenant", updateRpc: "api_update_tenant" },
  payments: { rpc: "api_get_payments", items: false },
  invoices: { rpc: "api_get_invoices", items: false },
  "maintenance-requests": { rpc: "api_get_maintenance_requests", items: false, createRpc: "api_create_maintenance_request" },
  vendors: { rpc: "api_get_vendors", items: false, scope: "pm:read", tier: "full" },
  "property-manager-assignments": { rpc: "api_get_property_manager_assignments", items: false, scope: "pm:read", tier: "full" },
  "marketplace/listings": { rpc: "api_get_marketplace_listings", items: true, scope: "marketplace:read", createRpc: "api_create_marketplace_listing", updateRpc: "api_update_marketplace_listing" },
  "marketplace/inquiries": { rpc: "api_get_marketplace_inquiries", items: false, scope: "marketplace:read", tier: "full", createRpc: "api_create_marketplace_inquiry" },
  "marketplace/verification-status": { rpc: "api_get_marketplace_verification_status", items: true, scope: "marketplace:read", tier: "full", single: true, argument: "listing" },
  "crm/leads": { rpc: "api_get_crm_leads", items: true, scope: "crm:read", createRpc: "api_create_crm_lead", updateRpc: "api_update_crm_lead" },
  "crm/deals": { rpc: "api_get_crm_deals", items: true, scope: "crm:read", tier: "full", createRpc: "api_create_crm_deal", updateRpc: "api_update_crm_deal" },
  "crm/accounts": { rpc: "api_get_crm_accounts", items: false, scope: "crm:read", tier: "full" },
  "crm/activity": { rpc: "api_get_crm_activity", items: false, scope: "crm:read", tier: "full" },
  "crm/documents": { rpc: "api_get_crm_documents", items: false, scope: "crm:read", tier: "full" },
  "crm/automation-log": { rpc: "api_get_crm_automation_log", items: false, scope: "crm:read", tier: "full" },
  "crm/trust-flags": { rpc: "api_get_crm_trust_flags", items: false, scope: "crm:read", tier: "full" },
  company: { rpc: "api_get_company", items: false, scope: "pm:read", single: true },
  subscription: { rpc: "api_get_subscription", items: false, scope: "pm:read", tier: "full", single: true },
  "leases/inventory": { rpc: "api_get_lease_inventory", items: true, scope: "pm:read", tier: "full", single: true, argument: "lease" },
};

function resolveRoute(parts: string[]) {
  if (parts[0] !== "v1") return { key: "", id: null };
  if (parts[1] === "leases" && parts[2] && parts[3] === "inventory" && parts.length === 4) return { key: "leases/inventory", id: parts[2] };
  if ((parts[1] === "marketplace" || parts[1] === "crm") && parts[2]) return { key: `${parts[1]}/${parts[2]}`, id: parts[3] ?? null };
  return { key: parts[1] ?? "", id: parts[2] ?? null };
}

function writeScope(scope: ApiScope | undefined): ApiScope {
  if (scope === "marketplace:read") return "marketplace:write";
  if (scope === "crm:read") return "crm:write";
  return "pm:write";
}

function response(req: Request, body: unknown, status: number, requestId: string, auth?: ApiAuthSuccess) {
  const headers: Record<string, string> = {
    ...buildCorsHeaders(req, "GET, POST, PATCH, OPTIONS"),
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };
  if (auth) {
    headers["X-RateLimit-Remaining"] = String(auth.rateLimit.remaining);
    headers["X-RateLimit-Reset"] = auth.rateLimit.resetAt;
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req, "GET, POST, PATCH, OPTIONS");
  const startedAt = Date.now();
  const requestId = createCorrelationId();
  const url = new URL(req.url);
  const versionIndex = url.pathname.indexOf("/v1/");
  const routePath = versionIndex >= 0 ? url.pathname.slice(versionIndex) : url.pathname;
  const parts = routePath.split("/").filter(Boolean);
  const resolved = resolveRoute(parts);
  const resource = resolved.key;
  const resourceId = resolved.id;
  const definition = routes[resource];

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return response(req, apiError(requestId, "internal_error", "The API is not configured."), 500, requestId);
  const client = createClient(supabaseUrl, serviceKey);
  const authentication = await authenticateApiRequest(req, client as unknown as ApiAuthClient);
  if (!authentication.ok) {
    const headers = authentication.retryAfterSeconds ? { "Retry-After": String(authentication.retryAfterSeconds) } : undefined;
    const result = response(req, apiError(requestId, authentication.code, authentication.message), authentication.status, requestId);
    if (headers) Object.entries(headers).forEach(([key, value]) => result.headers.set(key, value));
    return result;
  }

  let status = 500;
  let errorCode: string | null = null;
  try {
    if (!definition || parts[0] !== "v1") {
      status = 404; errorCode = "not_found";
      return response(req, apiError(requestId, errorCode, "The API endpoint was not found."), status, requestId, authentication);
    }
    if (resourceId && (!definition.items || !isUuid(resourceId))) {
      status = definition.items ? 400 : 404; errorCode = definition.items ? "validation_failed" : "not_found";
      return response(req, apiError(requestId, errorCode, definition.items ? "The resource ID must be a UUID." : "The API endpoint was not found.", definition.items ? "id" : undefined), status, requestId, authentication);
    }
    const isWrite = req.method === "POST" || req.method === "PATCH";
    const accessFailure = authorizeApiAccess(authentication, isWrite ? writeScope(definition.scope) : (definition.scope ?? "pm:read"), isWrite ? "full" : (definition.tier ?? "limited"));
    if (accessFailure) {
      status = accessFailure.status; errorCode = accessFailure.code;
      return response(req, apiError(requestId, accessFailure.code, accessFailure.message), status, requestId, authentication);
    }
    if (isWrite) {
      const rpc = req.method === "POST" && !resourceId ? definition.createRpc
        : req.method === "PATCH" && resourceId ? definition.updateRpc : undefined;
      if (!rpc) {
        status = 405; errorCode = "method_not_allowed";
        return response(req, apiError(requestId, errorCode, "This endpoint does not support that method."), status, requestId, authentication);
      }
      const idempotencyKey = req.headers.get("idempotency-key")?.trim() ?? "";
      if (idempotencyKey.length < 8 || idempotencyKey.length > 255) {
        status = 400; errorCode = "idempotency_key_required";
        return response(req, apiError(requestId, errorCode, "Idempotency-Key must contain 8 to 255 characters.", "Idempotency-Key"), status, requestId, authentication);
      }
      let payload: Record<string, unknown>;
      try {
        payload = await req.json();
      } catch {
        status = 400; errorCode = "invalid_json";
        return response(req, apiError(requestId, errorCode, "The request body must be a JSON object."), status, requestId, authentication);
      }
      if (!payload || Array.isArray(payload) || typeof payload !== "object") {
        status = 400; errorCode = "invalid_json";
        return response(req, apiError(requestId, errorCode, "The request body must be a JSON object."), status, requestId, authentication);
      }
      const fingerprint = await hashApiKey(`${req.method}:${routePath}:${JSON.stringify(payload)}`);
      const { data: idempotency, error: idempotencyError } = await client.rpc("api_begin_idempotency", {
        p_api_key_id: authentication.key.id, p_idempotency_key: idempotencyKey, p_request_fingerprint: fingerprint,
      });
      if (idempotencyError) throw idempotencyError;
      const state = idempotency as { state: string; response_status?: number; response_body?: unknown };
      if (state.state === "replay") {
        status = state.response_status ?? 200;
        return response(req, state.response_body, status, requestId, authentication);
      }
      if (state.state === "conflict" || state.state === "in_progress") {
        status = 409; errorCode = state.state === "conflict" ? "idempotency_conflict" : "idempotency_in_progress";
        return response(req, apiError(requestId, errorCode, state.state === "conflict" ? "This Idempotency-Key was used with a different request." : "A request with this Idempotency-Key is still processing."), status, requestId, authentication);
      }

      const rpcPayload = { ...payload, _idempotency_key: idempotencyKey, _source_ip: clientIp(req) };
      const { data, error } = await client.rpc(rpc, {
        p_api_key_id: authentication.key.id, ...(resourceId ? { p_id: resourceId } : {}), p_payload: rpcPayload,
      });
      if (error) {
        const message = error.message ?? "";
        if (message.includes("API_RESOURCE_NOT_FOUND") || message.includes("API_PARENT_NOT_FOUND")) {
          status = 404; errorCode = "not_found";
        } else if (message.includes("SAAS_QUOTA_EXCEEDED")) {
          status = 409; errorCode = "quota_exceeded";
        } else if (message.includes("LISTING_NOT_AVAILABLE")) {
          status = 409; errorCode = "resource_not_available";
        } else if (message.includes("duplicate key")) {
          status = 409; errorCode = "conflict";
        } else if (message.includes("API_VALIDATION_FAILED") || message.includes("invalid input syntax") || message.includes("violates check constraint")) {
          status = 400; errorCode = "validation_failed";
        } else throw error;
        const failedBody = apiError(requestId, errorCode, status === 404 ? "The resource or related parent was not found." : status === 400 ? "The request body contains invalid values." : errorCode === "quota_exceeded" ? "The company has reached its plan quota." : errorCode === "resource_not_available" ? "The requested resource is not available for this operation." : "A resource with these unique values already exists.");
        await client.rpc("api_complete_idempotency", { p_api_key_id: authentication.key.id, p_idempotency_key: idempotencyKey, p_response_status: status, p_response_body: failedBody });
        return response(req, failedBody, status, requestId, authentication);
      }
      status = req.method === "POST" ? 201 : 200;
      const successBody = apiSuccess(data, requestId);
      await client.rpc("api_complete_idempotency", { p_api_key_id: authentication.key.id, p_idempotency_key: idempotencyKey, p_response_status: status, p_response_body: successBody });
      return response(req, successBody, status, requestId, authentication);
    }

    if (req.method !== "GET") {
      status = 405; errorCode = "method_not_allowed";
      return response(req, apiError(requestId, errorCode, "This endpoint does not support that method."), status, requestId, authentication);
    }
    if (definition.single) {
      const rpcArguments: Record<string, unknown> = { p_api_key_id: authentication.key.id };
      if (definition.argument === "listing") rpcArguments.p_listing_id = resourceId;
      if (definition.argument === "lease") rpcArguments.p_lease_id = resourceId;
      const { data, error } = await client.rpc(definition.rpc, rpcArguments);
      if (error) {
        if (error.message?.includes("API_RESOURCE_NOT_FOUND")) {
          status = 404; errorCode = "not_found";
          return response(req, apiError(requestId, errorCode, "The resource was not found."), status, requestId, authentication);
        }
        throw error;
      }
      status = 200;
      return response(req, apiSuccess(data, requestId), status, requestId, authentication);
    }
    const query = parseApiListQuery(url, definition.sorts);
    if (!query.ok) {
      status = 400; errorCode = "validation_failed";
      return response(req, apiError(requestId, errorCode, query.message, query.field), status, requestId, authentication);
    }

    const { data, error } = await client.rpc(definition.rpc, {
      p_api_key_id: authentication.key.id,
      p_id: resourceId,
      p_page: resourceId ? 1 : query.value.page,
      p_per_page: resourceId ? 1 : query.value.perPage,
      p_status: query.value.status,
      p_sort: query.value.sort,
    });
    if (error) throw error;
    const payload = data as { rows: unknown[]; page: number; per_page: number; total: number; has_more: boolean };
    if (resourceId && payload.rows.length === 0) {
      status = 404; errorCode = "not_found";
      return response(req, apiError(requestId, errorCode, "The resource was not found."), status, requestId, authentication);
    }
    status = 200;
    return response(req, apiSuccess(resourceId ? payload.rows[0] : payload.rows, requestId, resourceId ? undefined : {
      page: payload.page, per_page: payload.per_page, total: payload.total, has_more: payload.has_more,
    }), status, requestId, authentication);
  } catch (error) {
    console.error("fishgate-api request failed", requestId, error);
    status = 500; errorCode = "internal_error";
    return response(req, apiError(requestId, errorCode, "The request could not be completed."), status, requestId, authentication);
  } finally {
    const { error } = await client.rpc("api_record_request", {
      p_api_key_id: authentication.key.id, p_request_id: requestId, p_method: req.method,
      p_route: routePath, p_status_code: status, p_duration_ms: Date.now() - startedAt,
      p_ip_address: clientIp(req), p_user_agent: req.headers.get("user-agent"), p_error_code: errorCode,
    });
    if (error) console.warn("api request telemetry failed", requestId, error.message);
  }
});