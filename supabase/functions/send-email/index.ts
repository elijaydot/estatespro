import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handleCorsPreflight } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured in environment secrets.");
      return new Response(
        JSON.stringify({ error: "Email service not configured (RESEND_API_KEY missing in Supabase secrets)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    const {
      to,
      subject,
      content,
      html,
      cc,
      bcc,
      replyTo,
      fromName,
      attachments,
    } = payload;

    if (!to || (!content && !html) || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, and content are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format recipient list
    const toRecipients = Array.isArray(to) ? to : [to];
    const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
    const bccRecipients = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;
    const replyToList = replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined;

    // Sender resolution: uses RESEND_FROM_EMAIL if configured, otherwise falls back to company branding / default verified domain
    const senderEnv = Deno.env.get("RESEND_FROM_EMAIL");
    const defaultSender = `${fromName || "FishGate"} <notifications@fishgatepro.com>`;
    const fromAddress = senderEnv || defaultSender;

    // Convert raw content to HTML if html string not provided
    const emailHtml =
      html ||
      `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #2563eb;">
          <h2 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 700;">${fromName || "FishGate Property Management"}</h2>
        </div>
        <div style="font-size: 14px; white-space: pre-wrap; color: #334155; margin-bottom: 28px;">
          ${content}
        </div>
        <div style="padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          Sent via FishGate Resident Communication Engine • Valid for official property records
        </div>
      </div>
    `;

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: toRecipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      reply_to: replyToList,
      subject,
      html: emailHtml,
      attachments: attachments && Array.isArray(attachments) ? attachments : undefined,
    });

    if (emailResponse.error) {
      console.error("Resend delivery error:", emailResponse.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: emailResponse.error.message || "Failed to deliver email through provider",
          details: emailResponse.error,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email successfully dispatched to customer",
        id: emailResponse.data?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Unexpected error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
