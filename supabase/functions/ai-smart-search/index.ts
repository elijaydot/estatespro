import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import { enforceAiCreditQuota } from "../_shared/saas-quota.ts";

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "ai-smart-search",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const payload = await req.json();
    const { query, action } = payload;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabaseClient.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (claimsError || !userId) throw new Error("Unauthorized");

    const quotaResult = await enforceAiCreditQuota({
      supabase: supabaseClient,
      userId,
      req,
      requestBody: typeof payload === "object" && payload ? payload as Record<string, unknown> : null,
      requestedDelta: 1,
      reason: "ai.smart_search.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const propertiesRes = await supabaseClient
      .from("properties")
      .select("id, name, address, city, type, total_units, occupied_units")
      .eq("company_id", quotaResult.companyId)
      .limit(100);
    const propertyIds = (propertiesRes.data || []).map((property) => property.id);

    const [tenantsRes, invoicesRes, maintenanceRes, leasesRes] = propertyIds.length > 0
      ? await Promise.all([
        supabaseClient.from("tenants").select("id, name, email, phone, status, monthly_rent, balance, property_id, unit_id").in("property_id", propertyIds).limit(200),
        supabaseClient.from("invoices").select("id, invoice_number, amount, due_date, status, paid_amount, tenant_id, property_id, booking_id, source, guest_name, guest_email, description").in("property_id", propertyIds).limit(500),
        supabaseClient.from("maintenance_requests").select("id, title, description, priority, status, created_at, property_id, unit_id, tenant_id").in("property_id", propertyIds).limit(200),
        supabaseClient.from("leases").select("id, lease_number, start_date, end_date, monthly_rent, status, tenant_id, property_id, unit_id, renewal_status").in("property_id", propertyIds).limit(200),
      ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
    const invoiceIds = (invoicesRes.data || []).map((invoice) => invoice.id);
    const paymentsRes = invoiceIds.length > 0
      ? await supabaseClient.from("payments").select("id, amount, method, status, created_at, tenant_id, booking_id, source, payer_name, payer_email, invoice_id").in("invoice_id", invoiceIds).limit(500)
      : { data: [] };

    const dataContext = `
Properties (${propertiesRes.data?.length || 0}):
  ${(propertiesRes.data || []).map((p) => `- ${p.name} | Property ID: ${p.id} | ${p.address}, ${p.city} | Type: ${p.type} | Units: ${p.occupied_units}/${p.total_units}`).join("\n")}

Tenants (${tenantsRes.data?.length || 0}):
  ${(tenantsRes.data || []).map((t) => `- ${t.name} | Tenant ID: ${t.id} | Email: ${t.email} | Status: ${t.status} | Rent: ${t.monthly_rent} | Balance: ${t.balance} | Property ID: ${t.property_id || 'Missing property link'} | Unit ID: ${t.unit_id || 'Missing unit link'}`).join("\n")}

Invoices (${invoicesRes.data?.length || 0}):
  ${(invoicesRes.data || []).map((i) => `- ${i.invoice_number} | Invoice ID: ${i.id} | Amount: ${i.amount} | Due: ${i.due_date} | Status: ${i.status} | Paid: ${i.paid_amount} | Source: ${i.source} | Tenant ID: ${i.tenant_id || 'Missing tenant link'} | Property ID: ${i.property_id || 'Missing property link'} | Booking ID: ${i.booking_id || 'No booking link'}${i.guest_name ? ` | Guest: ${i.guest_name} (${i.guest_email || 'No guest email'})` : ''}`).join("\n")}

Maintenance (${maintenanceRes.data?.length || 0}):
  ${(maintenanceRes.data || []).map((m) => `- ${m.title} | Request ID: ${m.id} | ${m.priority} priority | ${m.status} | Created: ${m.created_at} | Property ID: ${m.property_id || 'Missing property link'} | Unit ID: ${m.unit_id || 'Missing unit link'} | Tenant ID: ${m.tenant_id || 'Missing tenant link'}`).join("\n")}

Leases (${leasesRes.data?.length || 0}):
  ${(leasesRes.data || []).map((l) => `- ${l.lease_number} | Lease ID: ${l.id} | ${l.start_date} to ${l.end_date} | Rent: ${l.monthly_rent} | Status: ${l.status} | Renewal: ${l.renewal_status} | Tenant ID: ${l.tenant_id || 'Missing tenant link'} | Property ID: ${l.property_id || 'Missing property link'} | Unit ID: ${l.unit_id || 'Missing unit link'}`).join("\n")}

Recent Payments (${paymentsRes.data?.length || 0}):
  ${(paymentsRes.data || []).slice(0, 50).map((p) => `- Payment ID: ${p.id} | Amount: ${p.amount} via ${p.method} | ${p.status} | ${p.created_at} | Source: ${p.source} | Tenant ID: ${p.tenant_id || 'Missing tenant link'} | Invoice ID: ${p.invoice_id || 'Missing invoice link'} | Booking ID: ${p.booking_id || 'No booking link'}${p.payer_name ? ` | Payer: ${p.payer_name} (${p.payer_email || 'No payer email'})` : ''}`).join("\n")}
`;

    const formattingRules = `
  Response rules:
  - Return valid GitHub-Flavored Markdown only. Do not return HTML or fenced code blocks.
  - Lead with a direct answer, then supporting detail. Avoid repeating the user's question.
  - Format every monetary value as RWF with thousands separators, for example RWF 1,500,000.
  - Use short headings and bullet lists for narrative information.
  - When comparing multiple records, use a valid markdown table. Put the header, separator, and every data row on separate lines. Keep tables to the most useful columns.
  - Do not emit pipe-delimited pseudo-tables inside a paragraph.
  - Distinguish tenant profile balances from invoices and payments. Never attribute an invoice, booking, or payment to a tenant unless its tenant_id supports that relationship.
  - Label missing relationships as "Missing tenant link" and call out material data limitations plainly.
  - Do not claim that no balance or activity exists when another provided record contradicts that claim; explain the scope of each metric instead.
  - If no matching records exist, state that clearly and suggest one useful next check. Never invent records or calculations.`;

    let systemPrompt = "";
    const userPrompt = query;

    if (action === "search") {
      systemPrompt = `You are a smart property management search assistant. Answer natural-language portfolio queries with concise, record-level results. If records match, summarize the answer in one sentence and present the records in a table.

    ${formattingRules}

Portfolio Data:
${dataContext}

Today's date: ${new Date().toISOString().split("T")[0]}`;
    } else if (action === "trends") {
      systemPrompt = `You are a property management trend analyst. Analyze only trends supported by the supplied data. Structure the response as: Overview, Key findings, Evidence, and Operational implications. State when the available data does not contain enough time-series history for a trend conclusion.

    ${formattingRules}

Portfolio Data:
${dataContext}

Today's date: ${new Date().toISOString().split("T")[0]}`;
    } else if (action === "report") {
      systemPrompt = `You are a property management reporting assistant. Generate a concise professional report structured as: report title, Executive summary, Key metrics table, Detailed findings, Recommended actions, and Data limitations. Include only sections supported by the supplied data.

    ${formattingRules}

Portfolio Data:
${dataContext}

Today's date: ${new Date().toISOString().split("T")[0]}`;
    } else {
      throw new Error("Invalid action. Use: search, trends, report");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
      if (response.status === 402) return jsonResponse(req, { error: "Payment required" }, 402);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...buildCorsHeaders(req), "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Smart search error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
