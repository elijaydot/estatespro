import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
import { generateApiKey, type ApiScope, type ApiTier } from "../_shared/api-auth.ts";
import { buildCorsHeaders, handleCorsPreflight } from "../_shared/security.ts";
import { createCorrelationId, emitAuditEvent } from "../_shared/observability.ts";

const allowedScopes = new Set<ApiScope>([
  "pm:read", "pm:write", "marketplace:read", "marketplace:write", "crm:read", "crm:write",
]);

function respond(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req, "GET, POST, DELETE, OPTIONS"), "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req, "GET, POST, DELETE, OPTIONS");

  const requestId = createCorrelationId();
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("authorization") ?? "";
  if (!url || !anonKey || !serviceKey || !authorization) {
    return respond(req, { data: null, error: { code: "unauthorized", message: "Authentication is required." }, meta: { request_id: requestId } }, 401);
  }

  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const serviceClient = createClient(url, serviceKey);
  const { data: { user } } = await authClient.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (!user) return respond(req, { data: null, error: { code: "unauthorized", message: "The session is invalid." }, meta: { request_id: requestId } }, 401);

  const { data: isSuperAdmin, error: roleError } = await serviceClient.rpc("is_platform_super_admin", { _user_id: user.id });
  if (roleError || !isSuperAdmin) {
    return respond(req, { data: null, error: { code: "forbidden", message: "Platform super-admin access is required." }, meta: { request_id: requestId } }, 403);
  }

  const pathId = new URL(req.url).pathname.split("/").filter(Boolean).at(-1);
  try {
    if (req.method === "GET") {
      const companyId = new URL(req.url).searchParams.get("company_id");
      if (!companyId) return respond(req, { data: null, error: { code: "validation_failed", message: "company_id is required.", field: "company_id" }, meta: { request_id: requestId } }, 400);

      const [{ data: keys, error: keysError }, { data: events, error: eventsError }] = await Promise.all([
        serviceClient.from("api_keys").select("id,company_id,name,key_prefix,scopes,tier,rate_limit_per_min,created_at,last_used_at,revoked_at").eq("company_id", companyId).order("created_at", { ascending: false }),
        serviceClient.from("api_request_events").select("id,api_key_id,request_id,method,route,status_code,duration_ms,error_code,created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(10),
      ]);
      if (keysError || eventsError) throw keysError ?? eventsError;
      return respond(req, { data: { keys: keys ?? [], recent_requests: events ?? [] }, error: null, meta: { request_id: requestId } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const companyId = String(body.company_id ?? "");
      const name = String(body.name ?? "").trim();
      const tier = String(body.tier ?? "") as ApiTier;
      const scopes = Array.isArray(body.scopes) ? body.scopes.map(String) as ApiScope[] : [];
      const rateLimit = Number(body.rate_limit_per_min ?? 60);
      if (!companyId || !name || !["limited", "full"].includes(tier) || scopes.length === 0 || scopes.some((scope) => !allowedScopes.has(scope))) {
        return respond(req, { data: null, error: { code: "validation_failed", message: "company_id, name, tier, and valid scopes are required." }, meta: { request_id: requestId } }, 400);
      }
      if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 10000) {
        return respond(req, { data: null, error: { code: "validation_failed", message: "rate_limit_per_min must be between 1 and 10000.", field: "rate_limit_per_min" }, meta: { request_id: requestId } }, 400);
      }
      if (tier === "limited" && scopes.some((scope) => scope.endsWith(":write"))) {
        return respond(req, { data: null, error: { code: "validation_failed", message: "Limited keys cannot receive write scopes.", field: "scopes" }, meta: { request_id: requestId } }, 400);
      }

      const { data: accessLevel, error: entitlementError } = await serviceClient.rpc("api_get_access_level", { p_company_id: companyId });
      if (entitlementError) throw entitlementError;
      if (accessLevel === "none" || (tier === "full" && accessLevel !== "full")) {
        return respond(req, { data: null, error: { code: "upgrade_required", message: `The company is entitled to ${accessLevel ?? "no"} API access.` }, meta: { request_id: requestId } }, 403);
      }

      const generated = await generateApiKey("live");
      const { data: inserted, error } = await serviceClient.from("api_keys").insert({
        company_id: companyId, name, key_hash: generated.hash, key_prefix: generated.prefix,
        scopes, tier, rate_limit_per_min: rateLimit, created_by: user.id,
      }).select("id,company_id,name,key_prefix,scopes,tier,rate_limit_per_min,created_at,last_used_at,revoked_at").single();
      if (error) throw error;
      await emitAuditEvent({ event_type: "api.key.created", source: "api-keys", actor_user_id: user.id, entity_type: "api_key", entity_id: inserted.id, correlation_id: requestId, details: { company_id: companyId, tier, scopes } });
      return respond(req, { data: { ...inserted, key: generated.plaintext }, error: null, meta: { request_id: requestId } }, 201);
    }

    if (req.method === "DELETE" && pathId && pathId !== "api-keys") {
      const { data: revoked, error } = await serviceClient.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", pathId).is("revoked_at", null).select("id,company_id").maybeSingle();
      if (error) throw error;
      if (!revoked) return respond(req, { data: null, error: { code: "not_found", message: "The active API key was not found." }, meta: { request_id: requestId } }, 404);
      await emitAuditEvent({ event_type: "api.key.revoked", source: "api-keys", actor_user_id: user.id, entity_type: "api_key", entity_id: revoked.id, correlation_id: requestId, details: { company_id: revoked.company_id } });
      return new Response(null, { status: 204, headers: buildCorsHeaders(req, "GET, POST, DELETE, OPTIONS") });
    }

    return respond(req, { data: null, error: { code: "method_not_allowed", message: "Method not allowed." }, meta: { request_id: requestId } }, 405);
  } catch (error) {
    console.error("api-keys failed", error);
    return respond(req, { data: null, error: { code: "internal_error", message: "The key operation could not be completed." }, meta: { request_id: requestId } }, 500);
  }
});