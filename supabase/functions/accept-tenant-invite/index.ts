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
    
    // Use service client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, tenantUserId }: AcceptInviteRequest = await req.json();

    if (!token || !tenantUserId) {
      return new Response(
        JSON.stringify({ error: "Missing token or tenantUserId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Validate token
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

    // 2. Mark as used
    const { error: updateInviteError } = await supabase
      .from("tenant_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (updateInviteError) throw updateInviteError;

    // 3. Link tenant
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
