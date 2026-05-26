import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import { resolveCompanyBranding } from "../_shared/company-branding.ts";

interface GeneratePdfRequest {
  leaseId: string;
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
  console.log("generate-lease-pdf function called");
  const corsHeaders = buildCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "generate-lease-pdf",
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;
    const { leaseId, companyId }: GeneratePdfRequest = await req.json();
    
    if (!leaseId || typeof leaseId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: leaseId is required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leaseId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: leaseId must be a valid UUID' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone, tenant_user_id),
        properties:property_id(id, name, address, city, state, zip_code, user_id),
        units:unit_id(id, unit_number, bedrooms, bathrooms, sqft)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return new Response(
        JSON.stringify({ error: 'Lease not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isLandlord = lease.user_id === userId;
    const isTenant = lease.tenants?.tenant_user_id === userId;
    if (!isLandlord && !isTenant) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have access to this lease' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch lease styling settings from the lease owner
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('lease_font, lease_primary_color, lease_secondary_color, lease_header_color, currency_symbol')
      .eq('user_id', lease.user_id)
      .single();

    const branding = await resolveCompanyBranding({
      supabase,
      userId: lease.user_id,
      companyId: companyId || null,
      leaseId,
      propertyId: lease.property_id || null,
    });
    console.log("brand.resolve", {
      function: "generate-lease-pdf",
      source: branding.source,
      requestedCompanyId: companyId || null,
      resolvedCompanyId: branding.companyId,
      leaseId,
      propertyId: lease.property_id || null,
    });

    const font = appSettings?.lease_font || 'Georgia';
    const primaryColor = appSettings?.lease_primary_color || '#1e3a5f';
    const secondaryColor = appSettings?.lease_secondary_color || '#2563eb';
    const headerBg = appSettings?.lease_header_color || '#f0f7ff';
    const currencySymbol = appSettings?.currency_symbol || '$';
    const companyName = branding.companyName;
    const companyLogo = branding.logoUrl || '';

    const tenant = lease.tenants;
    const property = lease.properties;
    const unit = lease.units;
    const safeCompanyName = escapeHtml(companyName);
    const safeCompanyLogo = safeImageUrl(companyLogo);
    const safeLeaseNumber = escapeHtml(lease.lease_number);
    const safeStatus = escapeHtml(String(lease.status || "").replace("_", " "));
    const safePropertyName = escapeHtml(property?.name || 'N/A');
    const safeUnitNumber = escapeHtml(unit?.unit_number || 'N/A');
    const safeAddress = escapeHtml(`${property?.address || ''}, ${property?.city || ''}, ${property?.state || ''} ${property?.zip_code || ''}`);
    const safeUnitDetails = escapeHtml(`${unit?.bedrooms || 0} Bed, ${unit?.bathrooms || 0} Bath, ${unit?.sqft || 0} sqft`);
    const safeTenantName = escapeHtml(tenant?.name || 'N/A');
    const safeTenantEmail = escapeHtml(tenant?.email || 'N/A');
    const safeTenantPhone = escapeHtml(tenant?.phone || 'N/A');
    const safeTerms = escapeHtml(lease.terms || 'Standard lease terms apply.');
    const safeSpecialConditions = escapeHtml(lease.special_conditions || '');
    const safeLandlordSignatureUrl = safeImageUrl(lease.landlord_signature_url);
    const safeTenantSignatureUrl = safeImageUrl(lease.tenant_signature_url);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: '${font}', serif; 
            font-size: 12pt; 
            line-height: 1.6; 
            color: #333; 
            padding: 40px 50px;
            max-width: 850px;
            margin: 0 auto;
          }
          .header { 
            text-align: center; 
            margin-bottom: 35px; 
            padding: 25px 20px;
            background: ${headerBg};
            border-radius: 8px;
            border-bottom: 4px solid ${secondaryColor};
          }
          .company-logo {
            max-height: 60px;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 11pt;
            color: ${primaryColor};
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          .header h1 { 
            font-size: 22pt; 
            color: ${primaryColor};
            margin-bottom: 5px;
            letter-spacing: 2px;
          }
          .header p { 
            font-size: 12pt; 
            color: ${secondaryColor};
            font-weight: 500;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 16px;
            background: ${lease.status === 'active' ? '#10b981' : secondaryColor};
            color: white;
            border-radius: 20px;
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 8px;
          }
          .section { 
            margin-bottom: 25px; 
          }
          .section-title { 
            font-size: 13pt; 
            font-weight: bold; 
            color: ${primaryColor};
            margin-bottom: 12px; 
            text-transform: uppercase; 
            letter-spacing: 1px;
            border-bottom: 2px solid ${secondaryColor}; 
            padding-bottom: 6px;
          }
          .info-grid { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 15px; 
          }
          .info-item { 
            flex: 1 1 45%; 
            padding: 10px 12px;
            background: #fafafa;
            border-radius: 6px;
            border-left: 3px solid ${secondaryColor};
          }
          .info-label { 
            font-weight: bold; 
            color: ${primaryColor};
            font-size: 9pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value { 
            font-size: 11pt; 
            color: #333;
            margin-top: 2px;
          }
          .terms { 
            background: #f8f9fa; 
            padding: 20px; 
            border: 1px solid #e2e8f0;
            border-left: 4px solid ${secondaryColor};
            border-radius: 4px;
            margin: 15px 0; 
            white-space: pre-wrap;
            font-size: 11pt;
          }
          .financial-highlight {
            background: ${headerBg};
            padding: 15px;
            border-radius: 8px;
            border: 1px solid ${secondaryColor}20;
            display: flex;
            justify-content: space-around;
            text-align: center;
            margin: 15px 0;
          }
          .financial-item {
            padding: 0 15px;
          }
          .financial-item .amount {
            font-size: 18pt;
            font-weight: bold;
            color: ${primaryColor};
          }
          .financial-item .label {
            font-size: 9pt;
            color: #666;
            text-transform: uppercase;
          }
          .signature-section { 
            margin-top: 40px; 
            page-break-inside: avoid; 
          }
          .signature-box { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 25px; 
          }
          .signature-item { 
            width: 45%; 
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fafafa;
          }
          .signature-line { 
            border-bottom: 2px solid ${primaryColor}; 
            height: 50px; 
            margin-bottom: 8px; 
          }
          .signature-image {
            max-height: 50px;
            margin-bottom: 8px;
          }
          .signature-label { 
            font-size: 9pt; 
            color: #666;
            text-transform: uppercase;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 15px; 
            border-top: 2px solid ${secondaryColor}; 
            font-size: 9pt; 
            color: #888; 
            text-align: center; 
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, ${secondaryColor}, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${safeCompanyLogo ? `<img src="${safeCompanyLogo}" alt="Company Logo" class="company-logo" />` : ''}
          <div class="company-name">${safeCompanyName}</div>
          <h1>RESIDENTIAL LEASE AGREEMENT</h1>
          <p>Lease Number: ${safeLeaseNumber}</p>
          <span class="status-badge">${safeStatus}</span>
        </div>

        <div class="section">
          <div class="section-title">Property Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Property Name</div>
              <div class="info-value">${safePropertyName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Unit Number</div>
              <div class="info-value">${safeUnitNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Address</div>
              <div class="info-value">${safeAddress}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Unit Details</div>
              <div class="info-value">${safeUnitDetails}</div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section">
          <div class="section-title">Tenant Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Tenant Name</div>
              <div class="info-value">${safeTenantName}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${safeTenantEmail}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phone</div>
              <div class="info-value">${safeTenantPhone}</div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section">
          <div class="section-title">Lease Terms</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Start Date</div>
              <div class="info-value">${new Date(lease.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">End Date</div>
              <div class="info-value">${new Date(lease.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div class="financial-highlight">
            <div class="financial-item">
              <div class="amount">${currencySymbol} ${lease.monthly_rent.toLocaleString()}</div>
              <div class="label">Monthly Rent</div>
            </div>
            <div class="financial-item">
              <div class="amount">${currencySymbol} ${lease.security_deposit.toLocaleString()}</div>
              <div class="label">Security Deposit</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Terms and Conditions</div>
          <div class="terms">${safeTerms}</div>
          ${lease.special_conditions ? `
            <div class="section-title" style="margin-top: 20px;">Special Conditions</div>
            <div class="terms">${safeSpecialConditions}</div>
          ` : ''}
        </div>

        <div class="signature-section">
          <div class="section-title">Signatures</div>
          <div class="signature-box">
            <div class="signature-item">
              ${safeLandlordSignatureUrl ? `
                <img src="${safeLandlordSignatureUrl}" alt="Landlord Signature" class="signature-image" />
              ` : '<div class="signature-line"></div>'}
              <div class="signature-label">Landlord Signature</div>
              <div class="signature-label">Date: ${lease.landlord_signed_at ? new Date(lease.landlord_signed_at).toLocaleDateString() : '____________'}</div>
            </div>
            <div class="signature-item">
              ${safeTenantSignatureUrl ? `
                <img src="${safeTenantSignatureUrl}" alt="Tenant Signature" class="signature-image" />
              ` : '<div class="signature-line"></div>'}
              <div class="signature-label">Tenant Signature</div>
              <div class="signature-label">Date: ${lease.tenant_signed_at ? new Date(lease.tenant_signed_at).toLocaleDateString() : '____________'}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>${safeCompanyName} • This lease agreement was generated electronically on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
          <p>Document ID: ${escapeHtml(lease.id)}</p>
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
  } catch (error: any) {
    console.error("Error in generate-lease-pdf:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
