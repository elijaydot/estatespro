import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import { resolveCompanyBranding } from "../_shared/company-branding.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface InviteRequest {
  tenantId: string;
  email: string;
  landlordName: string;
  propertyName: string;
  origin?: string;
  companyId?: string;
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
    keyPrefix: "send-tenant-invite",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
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
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const userId = user.id;

    const { tenantId, email, landlordName, propertyName, origin, companyId }: InviteRequest = await req.json();
    console.log("Received invite request for:", email, "Origin:", origin);

    // Validate input
    if (!tenantId || !email) {
      return jsonResponse(req, { error: "Missing required fields" }, 400);
    }

    // Check if tenant already has a linked account (is already active)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("tenant_user_id, name, user_id, property_id")
      .eq("id", tenantId)
      .single();

    if (tenantError) {
      console.error("Error fetching tenant:", tenantError);
      return jsonResponse(req, { error: "Tenant not found" }, 404);
    }

    if (tenant.tenant_user_id) {
      return jsonResponse(req, { error: "This tenant already has an active portal account and cannot be invited again." }, 400);
    }

    const isTenantOwner = tenant.user_id === userId;
    let isApprovedPm = false;
    if (!isTenantOwner && tenant.property_id) {
      const { data: pmAllowed } = await supabaseAdmin.rpc("is_approved_pm", {
        _user_id: userId,
        _property_id: tenant.property_id,
      });
      isApprovedPm = !!pmAllowed;
    }

    if (!isTenantOwner && !isApprovedPm) {
      return jsonResponse(req, { error: "Forbidden: You do not have access to this tenant" }, 403);
    }

    const branding = await resolveCompanyBranding({
      supabase: supabaseAdmin,
      userId,
      companyId: companyId || null,
      propertyId: tenant.property_id || null,
    });

    const companyName = branding.companyName || landlordName || "Property Management";
    const companyLogo = branding.logoUrl || null;

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
    const requestOrigin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    let refererOrigin;
    if (referer) {
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        // ignore invalid urls
      }
    }

    // Published app URL - use this as the default for production invites
    const PUBLISHED_APP_URL = "https://fishgate.lovable.app";
    
    // Determine App URL
    let appUrl: string = origin || "";
    
    const isValidAppUrl = (url: string | null | undefined): boolean => 
      !!url && 
      !url.includes("lovable.dev") && 
      !url.includes("localhost") &&
      url.startsWith("https://");

    if (!isValidAppUrl(appUrl)) {
      if (requestOrigin && isValidAppUrl(requestOrigin)) {
        appUrl = requestOrigin;
      } else if (refererOrigin && isValidAppUrl(refererOrigin)) {
        appUrl = refererOrigin;
      } else {
        appUrl = Deno.env.get("APP_URL") || PUBLISHED_APP_URL;
      }
    }
    
    appUrl = appUrl.replace(/\/$/, "");
    console.log("Final App URL:", appUrl);

    const inviteLink = `${appUrl}/tenant/signup?invite=${token}`;

    // Build email HTML with optional logo
    const logoHtml = companyLogo 
      ? `<img src="${companyLogo}" alt="${companyName}" style="max-height: 60px; max-width: 200px; margin-bottom: 20px;" />`
      : "";

    // Send email
    const emailResponse = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [email],
      subject: `You're invited to access your tenant portal`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoHtml}
          <h1 style="color: #1a1a1a;">Welcome to Your Tenant Portal</h1>
          <p>Hello${tenant.name ? ` ${tenant.name.split(' ')[0]}` : ''},</p>
          <p><strong>${companyName}</strong> has invited you to access the tenant portal for <strong>${propertyName || 'your property'}</strong>.</p>
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
          <p style="color: #999; font-size: 12px;">${companyName}</p>
        </div>
      `,
    });

    // Check if email actually sent
    if (emailResponse.error) {
      console.error("Resend email error:", emailResponse.error);
      
      if (emailResponse.error.message?.includes("verify a domain")) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            inviteId: invite.id,
            inviteLink,
            emailSent: false,
            warning: "Email could not be sent. Please verify a domain at resend.com to send emails. Use 'Copy Invite Link' to share manually."
          }),
          { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          inviteId: invite.id,
          inviteLink,
          emailSent: false,
          warning: `Email failed: ${emailResponse.error.message}. Use the invite link to share manually.`
        }),
        { status: 200, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return jsonResponse(req, { success: true, inviteId: invite.id, emailSent: true });
  } catch (error: any) {
    console.error("Error in send-tenant-invite:", error);
    return jsonResponse(req, { error: error.message }, 500);
  }
};

serve(handler);

