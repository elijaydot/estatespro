import { createClient } from "../_shared/supabase-client-types.ts";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "send-exit-summary",
    limit: 20,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { exitId } = await req.json();
    if (!exitId) {
      return new Response(JSON.stringify({ error: "Exit ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch exit details with related data
    const { data: exitData, error: exitError } = await supabase
      .from("tenant_exits")
      .select("*, tenants:tenant_id(id, name, email, phone, move_in_date, monthly_rent, security_deposit)")
      .eq("id", exitId)
      .single();

    if (exitError || !exitData) {
      return new Response(JSON.stringify({ error: "Exit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: only the owning landlord or an approved PM for the property can send the summary.
    if (exitData.user_id !== user.id) {
      const { data: isPmApproved, error: pmCheckError } = await supabase
        .rpc("is_approved_pm", { _user_id: user.id, _property_id: exitData.property_id });

      if (pmCheckError || !isPmApproved) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const tenant = exitData.tenants;
    if (!tenant?.email) {
      return new Response(JSON.stringify({ error: "Tenant email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch unit and property info
    const [unitRes, propRes] = await Promise.all([
      supabase.from("units").select("unit_number").eq("id", exitData.unit_id).single(),
      supabase.from("properties").select("name, address").eq("id", exitData.property_id).single(),
    ]);

    const unit = unitRes.data;
    const property = propRes.data;

    // Fetch payment history for this tenant
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, method, created_at, status")
      .eq("tenant_id", tenant.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const totalPayments = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Fetch invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("amount, status, description, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    // Fetch maintenance requests
    const { data: maintenance } = await supabase
      .from("maintenance_requests")
      .select("title, status, created_at, completed_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    // Fetch recurring bills
    const { data: recurringBills } = await supabase
      .from("recurring_bills")
      .select("name, amount, frequency, bill_type")
      .or(`tenant_id.eq.${tenant.id},and(tenant_id.is.null,property_id.eq.${exitData.property_id})`);

    // Fetch inspection items
    const { data: inspectionItems } = await supabase
      .from("exit_inspection_items")
      .select("item_name, item_category, condition, damage_cost, notes")
      .eq("exit_id", exitId);

    // Get landlord/PM email for CC
    const { data: initiator } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("user_id", exitData.initiated_by)
      .single();

    // Build email HTML
    const moveInDate = tenant.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const exitDate = exitData.exit_date ? new Date(exitData.exit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

    const damagedItems = inspectionItems?.filter(i => i.condition === 'damaged') || [];
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#1e3a5f;color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="margin:0;font-size:24px;">Thank You, ${tenant.name}!</h1>
      <p style="margin:8px 0 0;opacity:0.9;">We appreciate your time as our valued tenant</p>
    </div>
    
    <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px;">
      <h2 style="color:#1e3a5f;font-size:18px;margin-top:0;">Tenancy Summary</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#666;">Property</td><td style="padding:8px 0;font-weight:600;">${property?.name || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Unit</td><td style="padding:8px 0;font-weight:600;">${unit?.unit_number || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Address</td><td style="padding:8px 0;font-weight:600;">${property?.address || 'N/A'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Move-in Date</td><td style="padding:8px 0;font-weight:600;">${moveInDate}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Exit Date</td><td style="padding:8px 0;font-weight:600;">${exitDate}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Monthly Rent</td><td style="padding:8px 0;font-weight:600;">${tenant.monthly_rent?.toLocaleString() || '0'}</td></tr>
      </table>
      
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">
      
      <h2 style="color:#1e3a5f;font-size:18px;">Financial Summary</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#666;">Total Payments Made</td><td style="padding:8px 0;font-weight:600;color:#22c55e;">${totalPayments.toLocaleString()} (${payments?.length || 0} payments)</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Total Invoices</td><td style="padding:8px 0;font-weight:600;">${invoices?.length || 0}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Security Deposit</td><td style="padding:8px 0;font-weight:600;">${exitData.deposit_amount?.toLocaleString()}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Deductions</td><td style="padding:8px 0;font-weight:600;color:#ef4444;">${exitData.deduction_amount?.toLocaleString()}</td></tr>
        <tr style="background:#f0fdf4;"><td style="padding:12px 8px;font-weight:600;">Deposit Refund</td><td style="padding:12px 8px;font-weight:700;color:#22c55e;font-size:18px;">${exitData.refund_amount?.toLocaleString()}</td></tr>
      </table>
      ${exitData.deduction_reason ? `<p style="color:#666;font-size:14px;"><strong>Deduction Reason:</strong> ${exitData.deduction_reason}</p>` : ''}
      
      ${recurringBills && recurringBills.length > 0 ? `
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">
      <h2 style="color:#1e3a5f;font-size:18px;">Recurring Bills</h2>
      <ul style="padding-left:20px;color:#666;">
        ${recurringBills.map(b => `<li style="margin:4px 0;">${b.name} - ${Number(b.amount).toLocaleString()} (${b.frequency})</li>`).join('')}
      </ul>` : ''}
      
      ${maintenance && maintenance.length > 0 ? `
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">
      <h2 style="color:#1e3a5f;font-size:18px;">Maintenance Requests (${maintenance.length})</h2>
      <ul style="padding-left:20px;color:#666;">
        ${maintenance.map(m => `<li style="margin:4px 0;">${m.title} - <em>${m.status}</em></li>`).join('')}
      </ul>` : ''}
      
      ${damagedItems.length > 0 ? `
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">
      <h2 style="color:#1e3a5f;font-size:18px;">Inspection Notes</h2>
      <ul style="padding-left:20px;color:#666;">
        ${damagedItems.map(i => `<li style="margin:4px 0;">${i.item_name}: ${i.notes || 'Damaged'} ${i.damage_cost > 0 ? `(Cost: ${i.damage_cost.toLocaleString()})` : ''}</li>`).join('')}
      </ul>` : ''}
      
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">
      
      <div style="background:#f8fafc;border-radius:8px;padding:24px;text-align:center;">
        <h2 style="color:#1e3a5f;margin-top:0;">Best Wishes!</h2>
        <p style="color:#666;line-height:1.6;">
          We sincerely thank you for being part of our community at ${property?.name || 'our property'}. 
          It was a pleasure having you as a tenant, and we wish you all the best in your future endeavors.
          Should you ever need a reference or wish to return, our doors are always open.
        </p>
        <p style="color:#1e3a5f;font-weight:600;margin-bottom:0;">- The Management Team</p>
      </div>
    </div>
    
    <p style="text-align:center;color:#999;font-size:12px;margin-top:16px;">
      This is an automated email from FishGate. Please do not reply directly to this email.
    </p>
  </div>
</body>
</html>`;

    // Build recipient list
    const toEmails = [{ email: tenant.email, name: tenant.name }];
    const ccEmails = initiator?.email ? [{ email: initiator.email, name: initiator.name || 'Property Manager' }] : [];

    if (RESEND_API_KEY) {
      const emailPayload: {
        from: string;
        to: string[];
        subject: string;
        html: string;
        cc?: string[];
      } = {
        from: "FishGate <noreply@resend.dev>",
        to: toEmails.map(e => e.email),
        subject: `Thank You & Tenancy Summary - ${property?.name || 'Your Property'}`,
        html: emailHtml,
      };
      if (ccEmails.length > 0) {
        emailPayload.cc = ccEmails.map(e => e.email);
      }

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error("Resend error:", errText);
      } else {
        await emailRes.json();
      }
    }

    // Mark email as sent
    await supabase
      .from("tenant_exits")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", exitId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

