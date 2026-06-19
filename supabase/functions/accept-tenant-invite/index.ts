import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";

interface AcceptInviteRequest {
  token: string;
  tenantUserId: string;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "accept-tenant-invite",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const tokenJwt = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(tokenJwt);

    if (authError || !user) {
      console.error("JWT verification failed:", authError);
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    // Use service client to bypass RLS for DB writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, tenantUserId }: AcceptInviteRequest = await req.json();

    if (!token || !tenantUserId) {
      return jsonResponse(req, { error: "Missing token or tenantUserId" }, 400);
    }

    // 2. Verify tenantUserId matches authenticated user
    if (user.id !== tenantUserId) {
      return jsonResponse(req, { error: "User ID mismatch" }, 403);
    }

    // 3. Validate token
    const { data: invite, error: inviteError } = await supabase
      .from("tenant_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      console.error("Invite lookup error:", inviteError);
      return jsonResponse(req, { error: "Invalid invite token" }, 404);
    }

    if (invite.used_at) {
      return jsonResponse(req, { error: "Invite already used" }, 400);
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return jsonResponse(req, { error: "This invite link has expired. Please request a new one." }, 410);
    }

    // 4. Verify authenticated user's email matches the invite email
    if (user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
      console.error("Email mismatch: user=", user.email, "invite=", invite.email);
      return jsonResponse(req, { error: "This invite was sent to a different email address" }, 403);
    }

    // 5. Mark as used
    const { error: updateInviteError } = await supabase
      .from("tenant_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (updateInviteError) throw updateInviteError;

    // 6. Link tenant
    const { error: updateTenantError } = await supabase
      .from("tenants")
      .update({ tenant_user_id: tenantUserId })
      .eq("id", invite.tenant_id);

    if (updateTenantError) throw updateTenantError;

    return jsonResponse(req, { success: true });

  } catch (error: unknown) {
    console.error("Error in accept-tenant-invite:", error);
    return jsonResponse(req, { error: "An unexpected error occurred" }, 500);
  }
};

serve(handler);
