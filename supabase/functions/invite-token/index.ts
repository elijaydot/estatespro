import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
  validateRequestSignature,
} from "../_shared/security.ts";

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "invite-token",
    limit: 40,
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
    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const operation = body?.operation as string | undefined;

    if (operation === "validate_tenant") {
      const token = (body?.token as string | undefined)?.trim();
      if (!token) return jsonResponse(req, { error: "token is required" }, 400);

      const { data, error } = await supabase
        .from("tenant_invites")
        .select("id, tenant_id, email, expires_at, used_at, created_at, tenants:tenant_id(id, name, email, phone, property_id, unit_id)")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .is("used_at", null)
        .maybeSingle();

      if (error) return jsonResponse(req, { error: error.message }, 500);
      if (!data) return jsonResponse(req, { success: true, invite: null });

      return jsonResponse(req, {
        success: true,
        invite: {
          ...data,
          token,
        },
      });
    }

    if (operation === "validate_pm") {
      const token = (body?.token as string | undefined)?.trim();
      if (!token) return jsonResponse(req, { error: "token is required" }, 400);

      const { data, error } = await supabase
        .from("pm_invites")
        .select("id, company_id, email, expires_at, used_at, companies:company_id(name)")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .is("used_at", null)
        .maybeSingle();

      if (error) return jsonResponse(req, { error: error.message }, 500);
      if (!data) return jsonResponse(req, { success: true, invite: null });

      return jsonResponse(req, {
        success: true,
        invite: {
          id: data.id,
          company_id: data.company_id,
          email: data.email,
          expires_at: data.expires_at,
          company_name: data.companies?.name || null,
        },
      });
    }

    if (operation === "consume_pm") {
      const requireInviteSignature = Deno.env.get("REQUIRE_INVITE_SIGNATURE") === "true";
      const validSignature = await validateRequestSignature(req, rawBody, {
        required: requireInviteSignature,
      });

      if (!validSignature) {
        return jsonResponse(req, { error: "Invalid request signature" }, 401);
      }

      const token = (body?.token as string | undefined)?.trim();
      const email = (body?.email as string | undefined)?.trim().toLowerCase();
      if (!token || !email) return jsonResponse(req, { error: "token and email are required" }, 400);

      const { data: invite, error: inviteError } = await supabase
        .from("pm_invites")
        .select("id, email, expires_at, used_at")
        .eq("token", token)
        .maybeSingle();

      if (inviteError) return jsonResponse(req, { error: inviteError.message }, 500);
      if (!invite) return jsonResponse(req, { error: "Invalid invite token" }, 404);
      if (invite.used_at) return jsonResponse(req, { success: true, alreadyUsed: true });
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        return jsonResponse(req, { error: "Invite token has expired" }, 400);
      }
      if ((invite.email || "").toLowerCase() !== email) {
        return jsonResponse(req, { error: "Invite email does not match" }, 403);
      }

      const { error: updateError } = await supabase
        .from("pm_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id)
        .is("used_at", null);

      if (updateError) return jsonResponse(req, { error: updateError.message }, 500);

      return jsonResponse(req, { success: true, consumed: true });
    }

    return jsonResponse(req, { error: "Unsupported operation" }, 400);
  } catch (error: unknown) {
    console.error("invite-token error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
