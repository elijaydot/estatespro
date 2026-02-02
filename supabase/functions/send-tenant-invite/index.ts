import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  tenantId: string;
  email: string;
  landlordName: string;
  propertyName: string;
  origin?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Admin client (DB writes)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the JWT (signing-keys compatible)
    const tokenJwt = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(tokenJwt);
    if (authError || !user) {
      console.error("JWT verification failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const { tenantId, email, landlordName, propertyName, origin }: InviteRequest = await req.json();

    // Validate input
    if (!tenantId || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate invite token
    const token = crypto.randomUUID() + "-" + Date.now().toString(36);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite in database
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("tenant_invites")
      .insert({
        tenant_id: tenantId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        user_id: userId,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invite:", inviteError);
      throw new Error("Failed to create invite");
    }

    // Get the app URL from environment or use default
    const appUrl = origin || Deno.env.get("APP_URL") || "https://lovable.dev";
    const inviteLink = `${appUrl}/tenant/signup?invite=${token}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Property Management <onboarding@resend.dev>",
      to: [email],
      subject: `You're invited to access your tenant portal`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Welcome to Your Tenant Portal</h1>
          <p>Hello,</p>
          <p>${landlordName || 'Your property manager'} has invited you to access the tenant portal for <strong>${propertyName || 'your property'}</strong>.</p>
          <p>With the tenant portal, you can:</p>
          <ul>
            <li>View and sign your lease agreement</li>
            <li>Submit maintenance requests</li>
            <li>Make rent payments</li>
            <li>Communicate with your property manager</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Set Up Your Account
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This link will expire in 7 days.</p>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">Property Management System</p>
        </div>
      `,
    });

    // Check if email actually sent (Resend returns error in response, not as throw)
    if (emailResponse.error) {
      console.error("Resend email error:", emailResponse.error);
      
      // If it's a domain verification error, still return success but with a warning
      if (emailResponse.error.message?.includes("verify a domain")) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            inviteId: invite.id,
            inviteLink,
            emailSent: false,
            warning: "Email could not be sent. Please verify a domain at resend.com to send emails. Use 'Copy Invite Link' to share manually."
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // For other errors, still return success with invite link
      return new Response(
        JSON.stringify({ 
          success: true, 
          inviteId: invite.id,
          inviteLink,
          emailSent: false,
          warning: `Email failed: ${emailResponse.error.message}. Use the invite link to share manually.`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, inviteId: invite.id, emailSent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-tenant-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
