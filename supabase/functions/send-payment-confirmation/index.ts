import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendPaymentConfirmationRequest {
  paymentId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-payment-confirmation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth verification failed:", userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { paymentId }: SendPaymentConfirmationRequest = await req.json();
    
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'paymentId is required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Processing payment confirmation for:", paymentId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get payment with related data
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone),
        invoices:invoice_id(id, invoice_number, description, amount, due_date, guest_name, guest_email)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify ownership
    if (payment.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get company settings
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', payment.user_id)
      .maybeSingle();

    // Get property owner's profile
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('user_id', payment.user_id)
      .single();

    const tenant = payment.tenants;
    const invoice = payment.invoices;
    const recipientName = tenant?.name || payment.payer_name || invoice?.guest_name || 'Guest';
    const recipientEmail = tenant?.email || payment.payer_email || invoice?.guest_email || null;
    const companyName = companySettings?.company_name || 'Property Management';
    const logoHtml = companySettings?.logo_url 
      ? `<img src="${companySettings.logo_url}" alt="${companyName}" style="max-height: 60px; margin-bottom: 20px;" />`
      : '';

    const paymentDate = new Date(payment.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .success-icon { width: 60px; height: 60px; background: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
          .success-icon svg { width: 30px; height: 30px; }
          h1 { color: #1a1a1a; margin-bottom: 10px; }
          .details { background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #666; }
          .detail-value { font-weight: 600; color: #1a1a1a; }
          .amount-section { text-align: center; padding: 20px; background: #10b98110; border-radius: 12px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #10b981; }
          .receipt-number { font-size: 12px; color: #666; margin-top: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${logoHtml}
            <div class="success-icon">
              <svg fill="white" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <h1>Payment Confirmed!</h1>
                <p style="color: #666;">Your payment has been successfully received.</p>
          </div>

          <div class="amount-section">
            <div class="amount">$${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="receipt-number">Receipt #${payment.receipt_number || payment.id.slice(0, 8).toUpperCase()}</div>
          </div>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Payment Date</span>
              <span class="detail-value">${paymentDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Invoice</span>
              <span class="detail-value">${invoice?.invoice_number || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description</span>
              <span class="detail-value">${invoice?.description || 'Payment'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment Method</span>
              <span class="detail-value" style="text-transform: capitalize;">${payment.method.replace('_', ' ')}</span>
            </div>
            ${payment.reference ? `
            <div class="detail-row">
              <span class="detail-label">Reference</span>
              <span class="detail-value">${payment.reference}</span>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>${companyName}<br>${companySettings?.company_email || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailsSent = [];
    const fromEmail = companySettings?.company_email 
      ? `${companyName} <${companySettings.company_email}>`
      : `${companyName} <noreply@resend.dev>`;

    // Send to tenant
    if (recipientEmail) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: [recipientEmail],
          subject: `Payment Confirmation - ${invoice?.invoice_number || 'Receipt'}`,
          html: emailHtml.replace('Your payment has been successfully received.', `Hello ${recipientName}, your payment has been successfully received.`),
        });
        emailsSent.push(recipientEmail);
        console.log("Email sent to payer:", recipientEmail);
      } catch (e) {
        console.error("Failed to send email to payer:", e);
      }
    }

    // Send to property owner
    if (ownerProfile?.email) {
      const ownerEmailHtml = emailHtml.replace(
        'Your payment has been successfully received.',
        `Payment received from ${recipientName}.`
      );
      try {
        await resend.emails.send({
          from: fromEmail,
          to: [ownerProfile.email],
          subject: `Payment Received - ${recipientName} - ${invoice?.invoice_number}`,
          html: ownerEmailHtml,
        });
        emailsSent.push(ownerProfile.email);
        console.log("Email sent to owner:", ownerProfile.email);
      } catch (e) {
        console.error("Failed to send email to owner:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-payment-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
