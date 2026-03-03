import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GeneratePdfRequest {
  leaseId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("generate-lease-pdf function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const { leaseId }: GeneratePdfRequest = await req.json();
    
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

    console.log("Generating PDF for lease:", leaseId);

    // Use service role for data access after authorization check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First verify the user has access to this lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        tenants:tenant_id(id, name, email, phone, tenant_user_id),
        properties:property_id(id, name, address, city, state, zip_code),
        units:unit_id(id, unit_number, bedrooms, bathrooms, sqft)
      `)
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      console.error("Lease not found:", leaseError);
      return new Response(
        JSON.stringify({ error: 'Lease not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Authorization check: User must be the landlord OR the tenant
    const isLandlord = lease.user_id === userId;
    const isTenant = lease.tenants?.tenant_user_id === userId;

    if (!isLandlord && !isTenant) {
      console.error("Forbidden: User does not have access to this lease");
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have access to this lease' }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authorization passed:", isLandlord ? "landlord" : "tenant");

    const tenant = lease.tenants;
    const property = lease.properties;
    const unit = lease.units;

    // Generate HTML for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 12pt; 
            line-height: 1.6; 
            color: #000; 
            padding: 50px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px; 
            padding-bottom: 20px; 
            border-bottom: 2px solid #000; 
          }
          .header h1 { 
            font-size: 24pt; 
            margin-bottom: 5px; 
          }
          .header p { 
            font-size: 14pt; 
            color: #333; 
          }
          .section { 
            margin-bottom: 30px; 
          }
          .section-title { 
            font-size: 14pt; 
            font-weight: bold; 
            margin-bottom: 15px; 
            text-transform: uppercase; 
            border-bottom: 1px solid #ccc; 
            padding-bottom: 5px; 
          }
          .info-grid { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 20px; 
          }
          .info-item { 
            flex: 1 1 45%; 
          }
          .info-label { 
            font-weight: bold; 
            color: #555; 
          }
          .info-value { 
            font-size: 11pt; 
          }
          .terms { 
            background: #f9f9f9; 
            padding: 20px; 
            border: 1px solid #ddd; 
            margin: 20px 0; 
            white-space: pre-wrap;
            font-size: 11pt;
          }
          .signature-section { 
            margin-top: 50px; 
            page-break-inside: avoid; 
          }
          .signature-box { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 30px; 
          }
          .signature-item { 
            width: 45%; 
          }
          .signature-line { 
            border-bottom: 1px solid #000; 
            height: 60px; 
            margin-bottom: 10px; 
          }
          .signature-image {
            max-height: 50px;
            margin-bottom: 10px;
          }
          .signature-label { 
            font-size: 10pt; 
            color: #555; 
          }
          .date-line { 
            border-bottom: 1px solid #000; 
            width: 150px; 
            margin-top: 20px; 
          }
          .footer { 
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 1px solid #ccc; 
            font-size: 10pt; 
            color: #666; 
            text-align: center; 
          }
          .status-badge {
            display: inline-block;
            padding: 5px 15px;
            background: ${lease.status === 'active' ? '#10b981' : '#f59e0b'};
            color: white;
            border-radius: 20px;
            font-size: 10pt;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RESIDENTIAL LEASE AGREEMENT</h1>
          <p>Lease Number: ${lease.lease_number}</p>
          <span class="status-badge">${lease.status.replace('_', ' ')}</span>
        </div>

        <div class="section">
          <div class="section-title">Property Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Property Name</div>
              <div class="info-value">${property?.name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Unit Number</div>
              <div class="info-value">${unit?.unit_number || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Address</div>
              <div class="info-value">${property?.address || ''}, ${property?.city || ''}, ${property?.state || ''} ${property?.zip_code || ''}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Unit Details</div>
              <div class="info-value">${unit?.bedrooms || 0} Bed, ${unit?.bathrooms || 0} Bath, ${unit?.sqft || 0} sqft</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Tenant Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Tenant Name</div>
              <div class="info-value">${tenant?.name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${tenant?.email || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phone</div>
              <div class="info-value">${tenant?.phone || 'N/A'}</div>
            </div>
          </div>
        </div>

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
            <div class="info-item">
              <div class="info-label">Monthly Rent</div>
              <div class="info-value">$${lease.monthly_rent.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Security Deposit</div>
              <div class="info-value">$${lease.security_deposit.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Terms and Conditions</div>
          <div class="terms">${lease.terms || 'Standard lease terms apply.'}</div>
          ${lease.special_conditions ? `
            <div class="section-title" style="margin-top: 20px;">Special Conditions</div>
            <div class="terms">${lease.special_conditions}</div>
          ` : ''}
        </div>

        <div class="signature-section">
          <div class="section-title">Signatures</div>
          <div class="signature-box">
            <div class="signature-item">
              ${lease.landlord_signature_url ? `
                <img src="${lease.landlord_signature_url}" alt="Landlord Signature" class="signature-image" />
              ` : '<div class="signature-line"></div>'}
              <div class="signature-label">Landlord Signature</div>
              <div class="signature-label">Date: ${lease.landlord_signed_at ? new Date(lease.landlord_signed_at).toLocaleDateString() : '____________'}</div>
            </div>
            <div class="signature-item">
              ${lease.tenant_signature_url ? `
                <img src="${lease.tenant_signature_url}" alt="Tenant Signature" class="signature-image" />
              ` : '<div class="signature-line"></div>'}
              <div class="signature-label">Tenant Signature</div>
              <div class="signature-label">Date: ${lease.tenant_signed_at ? new Date(lease.tenant_signed_at).toLocaleDateString() : '____________'}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This lease agreement was generated electronically on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
          <p>Document ID: ${lease.id}</p>
        </div>
      </body>
      </html>
    `;

    // Return HTML that can be printed/saved as PDF by the browser
    return new Response(htmlContent, {
      status: 200,
      headers: { 
        "Content-Type": "text/html",
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
