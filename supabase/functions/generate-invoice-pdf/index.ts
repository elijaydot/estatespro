import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import { resolveCompanyBranding } from "../_shared/company-branding.ts";

interface GenerateInvoicePdfRequest {
  invoiceId: string;
  companyId?: string;
}

function escapeHtml(input: unknown): string {
  const value = String(input ?? "");
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeImageUrl(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return escapeHtml(raw);
    }
  } catch {
    return "";
  }

  return "";
}

const handler = async (req: Request): Promise<Response> => {
  console.log("generate-invoice-pdf function called");
  const corsHeaders = buildCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "generate-invoice-pdf",
    limit: 30,
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

    // Verify user by passing the token directly
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
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
    const { invoiceId, companyId }: GenerateInvoicePdfRequest = await req.json();
    
    if (!invoiceId || typeof invoiceId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: invoiceId is required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Generating PDF for invoice:", invoiceId);

    // Use service role for data access after authorization check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get invoice data with related information
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone, tenant_user_id, property_id, unit_id),
        properties:property_id(id, name, address, city, state, zip_code),
        units:unit_id(id, unit_number)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice not found:", invoiceError);
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Authorization check: User must be the owner OR the tenant
    const isOwner = invoice.user_id === userId;
    const isTenant = invoice.tenants?.tenant_user_id === userId;

    if (!isOwner && !isTenant) {
      console.error("Forbidden: User does not have access to this invoice");
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have access to this invoice' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const branding = await resolveCompanyBranding({
      supabase,
      userId: invoice.user_id,
      companyId: companyId || null,
      invoiceId,
      propertyId: invoice.property_id || null,
    });
    console.log("brand.resolve", {
      function: "generate-invoice-pdf",
      source: branding.source,
      requestedCompanyId: companyId || null,
      resolvedCompanyId: branding.companyId,
      invoiceId,
      propertyId: invoice.property_id || null,
    });

    const tenant = invoice.tenants;
    const property = invoice.properties;
    const unit = invoice.units;
    const safeCompanyName = escapeHtml(branding.companyName);
    const safeCompanyLogo = safeImageUrl(branding.logoUrl || '');
    const safeCompanyAddress = escapeHtml(branding.companyAddress || '');
    const safeCompanyEmail = escapeHtml(branding.companyEmail || '');
    const safeCompanyPhone = escapeHtml(branding.companyPhone || '');
    const safeInvoiceNumber = escapeHtml(invoice.invoice_number);
    const safeInvoiceStatus = escapeHtml(invoice.status.toUpperCase());
    const safeTenantName = escapeHtml(tenant?.name || 'N/A');
    const safeTenantEmail = escapeHtml(tenant?.email || '');
    const safeTenantPhone = escapeHtml(tenant?.phone || '');
    const safePropertyName = escapeHtml(property?.name || 'N/A');
    const safeUnitNumber = escapeHtml(unit?.unit_number || 'N/A');
    const safePropertyAddress = escapeHtml(property?.address || '');
    const safePropertyCityStateZip = escapeHtml(`${property?.city || ''}, ${property?.state || ''} ${property?.zip_code || ''}`);
    const safeDescription = escapeHtml(invoice.description || '');

    const balance = invoice.amount - invoice.paid_amount;
    const isPaid = invoice.status === 'paid';

    // Generate HTML for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            font-size: 12pt; 
            line-height: 1.5; 
            color: #333; 
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            margin-bottom: 40px; 
            padding-bottom: 20px; 
            border-bottom: 2px solid #eee; 
          }
          .company-info {
            flex: 1;
          }
          .company-logo {
            max-height: 60px;
            max-width: 200px;
            margin-bottom: 10px;
          }
          .company-name { 
            font-size: 24pt; 
            font-weight: bold;
            color: #1a1a1a;
          }
          .company-details {
            font-size: 10pt;
            color: #666;
            margin-top: 5px;
          }
          .invoice-title {
            text-align: right;
          }
          .invoice-title h1 {
            font-size: 28pt;
            color: #1a1a1a;
            margin-bottom: 5px;
          }
          .invoice-number {
            font-size: 14pt;
            color: #666;
          }
          .status-badge {
            display: inline-block;
            padding: 5px 15px;
            background: ${isPaid ? '#10b981' : balance > 0 && new Date(invoice.due_date) < new Date() ? '#ef4444' : '#f59e0b'};
            color: white;
            border-radius: 20px;
            font-size: 10pt;
            text-transform: uppercase;
            margin-top: 10px;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .info-box {
            flex: 1;
          }
          .info-box h3 {
            font-size: 10pt;
            text-transform: uppercase;
            color: #999;
            margin-bottom: 5px;
          }
          .info-box p {
            font-size: 11pt;
            margin-bottom: 3px;
          }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .invoice-table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-size: 10pt;
            text-transform: uppercase;
            color: #666;
            border-bottom: 2px solid #eee;
          }
          .invoice-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
          }
          .invoice-table .amount {
            text-align: right;
            font-weight: 600;
          }
          .totals {
            width: 300px;
            margin-left: auto;
            margin-bottom: 30px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .totals-row.total {
            border-top: 2px solid #333;
            border-bottom: none;
            font-weight: bold;
            font-size: 14pt;
          }
          .totals-row.balance {
            background: ${isPaid ? '#10b98110' : '#f59e0b10'};
            padding: 12px;
            border-radius: 8px;
            border: none;
            margin-top: 10px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 10pt;
            color: #999;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${safeCompanyLogo ? `<img src="${safeCompanyLogo}" alt="Company Logo" class="company-logo" />` : ''}
            <div class="company-name">${safeCompanyName}</div>
            <div class="company-details">
              ${safeCompanyAddress}<br>
              ${safeCompanyEmail} | ${safeCompanyPhone}
            </div>
          </div>
          <div class="invoice-title">
            <h1>INVOICE</h1>
            <div class="invoice-number">${safeInvoiceNumber}</div>
            <span class="status-badge">${safeInvoiceStatus}</span>
          </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Bill To</h3>
            <p><strong>${safeTenantName}</strong></p>
            <p>${safeTenantEmail}</p>
            <p>${safeTenantPhone}</p>
          </div>
          <div class="info-box">
            <h3>Property</h3>
            <p><strong>${safePropertyName}</strong></p>
            <p>Unit ${safeUnitNumber}</p>
            <p>${safePropertyAddress}</p>
            <p>${safePropertyCityStateZip}</p>
          </div>
          <div class="info-box" style="text-align: right;">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Date:</strong> ${new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            ${invoice.paid_at ? `<p><strong>Paid Date:</strong> ${new Date(invoice.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${safeDescription}</td>
              <td class="amount">$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="totals-row">
            <span>Amount Paid</span>
            <span>$${invoice.paid_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="totals-row total">
            <span>Total</span>
            <span>$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="totals-row balance">
            <span>Balance Due</span>
            <span style="color: ${isPaid ? '#10b981' : '#f59e0b'}">$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Questions? Contact us at ${safeCompanyEmail || 'your property management team'}</p>
          <p style="margin-top: 10px;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </body>
      </html>
    `;

    return new Response(htmlContent, {
      status: 200,
      headers: { 
        "Content-Type": "text/html",
        "X-Branding-Source": branding.source,
        ...corsHeaders 
      },
    });
  } catch (error: unknown) {
    console.error("Error in generate-invoice-pdf:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
