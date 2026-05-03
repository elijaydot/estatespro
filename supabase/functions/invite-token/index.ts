import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing server configuration" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const operation = body?.operation as string | undefined;

    if (operation === "validate_tenant") {
      const token = (body?.token as string | undefined)?.trim();
      if (!token) return jsonResponse({ error: "token is required" }, 400);

      const { data, error } = await supabase
        .from("tenant_invites")
        .select("id, tenant_id, email, expires_at, used_at, created_at, tenants:tenant_id(id, name, email, phone, property_id, unit_id)")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .is("used_at", null)
        .maybeSingle();

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!data) return jsonResponse({ success: true, invite: null });

      return jsonResponse({
        success: true,
        invite: {
          ...data,
          token,
        },
      });
    }

    if (operation === "validate_pm") {
      const token = (body?.token as string | undefined)?.trim();
      if (!token) return jsonResponse({ error: "token is required" }, 400);

      const { data, error } = await supabase
        .from("pm_invites")
        .select("id, company_id, email, expires_at, used_at, companies:company_id(name)")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .is("used_at", null)
        .maybeSingle();

      if (error) return jsonResponse({ error: error.message }, 500);
      if (!data) return jsonResponse({ success: true, invite: null });

      return jsonResponse({
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
      const token = (body?.token as string | undefined)?.trim();
      const email = (body?.email as string | undefined)?.trim().toLowerCase();
      if (!token || !email) return jsonResponse({ error: "token and email are required" }, 400);

      const { data: invite, error: inviteError } = await supabase
        .from("pm_invites")
        .select("id, email, expires_at, used_at")
        .eq("token", token)
        .maybeSingle();

      if (inviteError) return jsonResponse({ error: inviteError.message }, 500);
      if (!invite) return jsonResponse({ error: "Invalid invite token" }, 404);
      if (invite.used_at) return jsonResponse({ success: true, alreadyUsed: true });
      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        return jsonResponse({ error: "Invite token has expired" }, 400);
      }
      if ((invite.email || "").toLowerCase() !== email) {
        return jsonResponse({ error: "Invite email does not match" }, 403);
      }

      const { error: updateError } = await supabase
        .from("pm_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id)
        .is("used_at", null);

      if (updateError) return jsonResponse({ error: updateError.message }, 500);

      return jsonResponse({ success: true, consumed: true });
    }

    return jsonResponse({ error: "Unsupported operation" }, 400);
  } catch (error: any) {
    console.error("invite-token error:", error);
    return jsonResponse({ error: error?.message || "Internal server error" }, 500);
  }
});
