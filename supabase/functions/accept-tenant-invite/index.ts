import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  token: string;
  tenantUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenJwt = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(tokenJwt);

    if (authError || !user) {
      console.error("JWT verification failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service client to bypass RLS for DB writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, tenantUserId }: AcceptInviteRequest = await req.json();

    if (!token || !tenantUserId) {
      return new Response(
        JSON.stringify({ error: "Missing token or tenantUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify tenantUserId matches authenticated user
    if (user.id !== tenantUserId) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Validate token
    const { data: invite, error: inviteError } = await supabase
      .from("tenant_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      console.error("Invite lookup error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invalid invite token" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invite.used_at) {
      return new Response(
        JSON.stringify({ error: "Invite already used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invite link has expired. Please request a new one." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verify authenticated user's email matches the invite email
    if (user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
      console.error("Email mismatch: user=", user.email, "invite=", invite.email);
      return new Response(
        JSON.stringify({ error: "This invite was sent to a different email address" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in accept-tenant-invite:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
