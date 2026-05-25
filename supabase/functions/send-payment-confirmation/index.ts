import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import { resolveCompanyBranding } from "../_shared/company-branding.ts";

interface SendPaymentConfirmationRequest {
  paymentId: string;
  companyId?: string;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-payment-confirmation function called");
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "send-payment-confirmation",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return jsonResponse(req, { error: 'Email service not configured' }, 500);
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(req, { error: 'Unauthorized' }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth verification failed:", userError);
      return jsonResponse(req, { error: 'Unauthorized' }, 401);
    }

    const { paymentId, companyId }: SendPaymentConfirmationRequest = await req.json();
    
    if (!paymentId) {
      return jsonResponse(req, { error: 'paymentId is required' }, 400);
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
      return jsonResponse(req, { error: 'Payment not found' }, 404);
    }

    // Verify ownership
    if (payment.user_id !== user.id) {
      return jsonResponse(req, { error: 'Forbidden' }, 403);
    }

    const branding = await resolveCompanyBranding({
      supabase,
      userId: payment.user_id,
      companyId: companyId || null,
      paymentId,
      invoiceId: payment.invoice_id || null,
      bookingId: payment.booking_id || null,
    });

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
    const companyName = branding.companyName;
    const logoHtml = branding.logoUrl 
      ? `<img src="${branding.logoUrl}" alt="${companyName}" style="max-height: 60px; margin-bottom: 20px;" />`
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
            <p>${companyName}<br>${branding.companyEmail || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailsSent = [];
    const fromEmail = branding.companyEmail 
      ? `${companyName} <${branding.companyEmail}>`
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

    return jsonResponse(req, { success: true, emailsSent });
  } catch (error: any) {
    console.error("Error in send-payment-confirmation:", error);
    return jsonResponse(req, { error: error.message }, 500);
  }
};

serve(handler);
