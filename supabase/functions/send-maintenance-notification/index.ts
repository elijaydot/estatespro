import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  newStatus: string;
  oldStatus?: string;
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'submitted': return 'Submitted';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'submitted': return '#f59e0b';
    case 'in_progress': return '#3b82f6';
    case 'completed': return '#22c55e';
    case 'cancelled': return '#6b7280';
    default: return '#6b7280';
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { requestId, newStatus, oldStatus }: NotificationRequest = await req.json();

    // Validate input
    if (!requestId || !newStatus) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the maintenance request with tenant and property details
    const { data: request, error: fetchError } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        tenants:tenant_id(id, name, email, tenant_user_id),
        properties:property_id(id, name),
        units:unit_id(id, unit_number)
      `)
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error("Error fetching maintenance request:", fetchError);
      return new Response(
        JSON.stringify({ error: "Maintenance request not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenant = request.tenants;
    const property = request.properties;
    const unit = request.units;

    // Create in-app notification for tenant if they have an account
    if (tenant?.tenant_user_id) {
      await supabase.from("notifications").insert({
        user_id: tenant.tenant_user_id,
        title: `Maintenance Request ${getStatusLabel(newStatus)}`,
        message: `Your maintenance request "${request.title}" has been updated to ${getStatusLabel(newStatus)}.`,
        type: newStatus === 'completed' ? 'success' : 'info',
        link: '/tenant/maintenance',
      });
    }

    // Create in-app notification for the property manager
    await supabase.from("notifications").insert({
      user_id: request.user_id,
      title: `Maintenance Status Updated`,
      message: `Request "${request.title}" changed to ${getStatusLabel(newStatus)}.`,
      type: 'info',
      link: '/maintenance',
    });

    // Send email to tenant if they have an email
    if (tenant?.email) {
      const statusLabel = getStatusLabel(newStatus);
      const statusColor = getStatusColor(newStatus);
      const propertyName = property?.name || 'Your Property';
      const unitNumber = unit?.unit_number || '';

      await resend.emails.send({
        from: "Property Management <onboarding@resend.dev>",
        to: [tenant.email],
        subject: `Maintenance Request ${statusLabel} - ${request.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a1a1a;">Maintenance Request Update</h1>
            <p>Hello ${tenant.name || 'Tenant'},</p>
            <p>Your maintenance request has been updated:</p>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">${request.title}</h3>
              <p style="color: #6b7280; margin: 8px 0;"><strong>Property:</strong> ${propertyName}${unitNumber ? ` - Unit ${unitNumber}` : ''}</p>
              <p style="color: #6b7280; margin: 8px 0;"><strong>Description:</strong> ${request.description}</p>
              <p style="margin: 16px 0 8px;">
                <span style="background-color: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px;">
                  ${statusLabel}
                </span>
              </p>
            </div>
            
            ${newStatus === 'in_progress' ? `
              <p>We're actively working on this issue. You'll receive another update when it's completed.</p>
            ` : ''}
            
            ${newStatus === 'completed' ? `
              <p style="color: #22c55e; font-weight: bold;">✓ This maintenance request has been completed.</p>
              <p>If you have any further issues, please submit a new maintenance request through your tenant portal.</p>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">Property Management System</p>
          </div>
        `,
      });

      console.log("Email sent to tenant:", tenant.email);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-maintenance-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
