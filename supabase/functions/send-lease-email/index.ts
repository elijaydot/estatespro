import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "../_shared/supabase-client-types.ts";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface LeaseEmailRequest {
  leaseId: string;
  type: 'signing_request' | 'signed_notification' | 'expiring_reminder';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-lease-email function called");
  const corsHeaders = buildCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "send-lease-email",
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded" }),
      { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create authenticated client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth verification failed:", userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;
    console.log("Authenticated user:", userId);

    // Parse and validate request body
    const { leaseId, type }: LeaseEmailRequest = await req.json();
    
    if (!leaseId || typeof leaseId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: leaseId is required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leaseId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: leaseId must be a valid UUID' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email type
    const validTypes = ['signing_request', 'signed_notification', 'expiring_reminder'];
    if (!type || !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: type must be one of signing_request, signed_notification, expiring_reminder' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing email for lease:", leaseId, "type:", type);

    // Use service role for data access after authorization check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch lease with related data
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone, tenant_user_id),
        properties:property_id(id, name, address, city),
        units:unit_id(id, unit_number)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      console.error("Error fetching lease:", leaseError);
      return new Response(
        JSON.stringify({ error: 'Lease not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Authorization check: Only landlord (owner) can send emails
    if (lease.user_id !== userId) {
      console.error("Forbidden: User is not the lease owner");
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only the property owner can send lease emails' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authorization passed: landlord");

    const tenant = lease.tenants;
    const property = lease.properties;
    const unit = lease.units;

    if (!tenant?.email) {
      return new Response(
        JSON.stringify({ error: 'Tenant email not found' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get project URL from environment
    const projectUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '') || '';
    const appUrl = `https://${projectUrl.split('//')[1]?.split('.')[0] || 'app'}.lovable.app`;
    const signingUrl = `${appUrl}/portal/lease/sign/${leaseId}`;

    let subject: string;
    let htmlContent: string;

    switch (type) {
      case 'signing_request':
        subject = `Action Required: Sign Your Lease for ${unit?.unit_number} at ${property?.name}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; }
              .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .label { color: #6b7280; }
              .value { font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🏠 Lease Ready for Signature</h1>
              </div>
              <div class="content">
                <p>Hello ${tenant.name},</p>
                <p>Your lease agreement for <strong>${unit?.unit_number}</strong> at <strong>${property?.name}</strong> is ready for your signature.</p>
                
                <div class="details">
                  <div class="detail-row">
                    <span class="label">Property</span>
                    <span class="value">${property?.name}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Unit</span>
                    <span class="value">${unit?.unit_number}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Monthly Rent</span>
                    <span class="value">$${lease.monthly_rent.toLocaleString()}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Lease Start</span>
                    <span class="value">${new Date(lease.start_date).toLocaleDateString()}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Lease End</span>
                    <span class="value">${new Date(lease.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <p>Please review and sign the lease at your earliest convenience.</p>
                
                <center>
                  <a href="${signingUrl}" class="button">Review & Sign Lease</a>
                </center>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  If you have any questions, please contact your property manager.
                </p>
              </div>
              <div class="footer">
                <p style="margin: 0;">This is an automated message from your property management system.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'signed_notification':
        subject = `Lease Signed: ${unit?.unit_number} at ${property?.name}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; }
              .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1 style="margin: 0;">Lease Successfully Signed</h1>
              </div>
              <div class="content">
                <p>Hello ${tenant.name},</p>
                <p>Great news! Your lease for <strong>${unit?.unit_number}</strong> at <strong>${property?.name}</strong> has been fully executed.</p>
                <p>Both parties have signed the lease agreement. You can now access your signed lease document from your tenant portal.</p>
                <p>Your lease is active from <strong>${new Date(lease.start_date).toLocaleDateString()}</strong> to <strong>${new Date(lease.end_date).toLocaleDateString()}</strong>.</p>
                <p>Welcome to your new home!</p>
              </div>
              <div class="footer">
                <p style="margin: 0;">This is an automated message from your property management system.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'expiring_reminder':
        subject = `Lease Expiring Soon: ${unit?.unit_number} at ${property?.name}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; }
              .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
              .warning-icon { font-size: 48px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="warning-icon">⚠️</div>
                <h1 style="margin: 0;">Lease Expiring Soon</h1>
              </div>
              <div class="content">
                <p>Hello ${tenant.name},</p>
                <p>This is a reminder that your lease for <strong>${unit?.unit_number}</strong> at <strong>${property?.name}</strong> will expire on <strong>${new Date(lease.end_date).toLocaleDateString()}</strong>.</p>
                <p>Please contact your property manager to discuss renewal options.</p>
              </div>
              <div class="footer">
                <p style="margin: 0;">This is an automated message from your property management system.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    console.log("Sending email to:", tenant.email);

    const emailResponse = await resend.emails.send({
      from: "Property Management <onboarding@resend.dev>",
      to: [tenant.email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Create notification record
    await supabase.from('notifications').insert({
      user_id: lease.user_id,
      title: `Email Sent: ${type.replace('_', ' ')}`,
      message: `Email notification sent to ${tenant.name} (${tenant.email})`,
      type: 'info',
      link: `/leases`,
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-lease-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
