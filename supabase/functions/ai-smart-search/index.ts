import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";

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
    const { query, action } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !data?.claims) throw new Error("Unauthorized");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch all relevant data for context
    const [propertiesRes, tenantsRes, invoicesRes, maintenanceRes, leasesRes, paymentsRes] = await Promise.all([
      supabaseClient.from("properties").select("id, name, address, city, type, total_units, occupied_units").limit(100),
      supabaseClient.from("tenants").select("id, name, email, phone, status, monthly_rent, balance, property_id, unit_id").limit(200),
      supabaseClient.from("invoices").select("id, invoice_number, amount, due_date, status, paid_amount, tenant_id, property_id, booking_id, source, guest_name, guest_email, description").limit(500),
      supabaseClient.from("maintenance_requests").select("id, title, description, priority, status, created_at, property_id, unit_id, tenant_id").limit(200),
      supabaseClient.from("leases").select("id, lease_number, start_date, end_date, monthly_rent, status, tenant_id, property_id, unit_id, renewal_status").limit(200),
      supabaseClient.from("payments").select("id, amount, method, status, created_at, tenant_id, booking_id, source, payer_name, payer_email, invoice_id").limit(500),
    ]);

    const dataContext = `
Properties (${propertiesRes.data?.length || 0}):
  ${(propertiesRes.data || []).map((p) => `- ${p.name}: ${p.address}, ${p.city} | Type: ${p.type} | Units: ${p.occupied_units}/${p.total_units}`).join("\n")}

Tenants (${tenantsRes.data?.length || 0}):
  ${(tenantsRes.data || []).map((t) => `- ${t.name}: ${t.email} | Status: ${t.status} | Rent: ${t.monthly_rent} | Balance: ${t.balance}`).join("\n")}

Invoices (${invoicesRes.data?.length || 0}):
  ${(invoicesRes.data || []).map((i) => `- ${i.invoice_number}: ${i.amount} due ${i.due_date} | Status: ${i.status} | Paid: ${i.paid_amount} | Source: ${i.source}${i.guest_name ? ` | Guest: ${i.guest_name}` : ''}`).join("\n")}

Maintenance (${maintenanceRes.data?.length || 0}):
  ${(maintenanceRes.data || []).map((m) => `- ${m.title}: ${m.priority} priority | ${m.status} | Created: ${m.created_at}`).join("\n")}

Leases (${leasesRes.data?.length || 0}):
  ${(leasesRes.data || []).map((l) => `- ${l.lease_number}: ${l.start_date} to ${l.end_date} | Rent: ${l.monthly_rent} | Status: ${l.status}`).join("\n")}

Recent Payments (${paymentsRes.data?.length || 0}):
  ${(paymentsRes.data || []).slice(0, 50).map((p) => `- ${p.amount} via ${p.method} | ${p.status} | ${p.created_at} | Source: ${p.source}${p.payer_name ? ` | Payer: ${p.payer_name}` : ''}`).join("\n")}
`;

    let systemPrompt = "";
    const userPrompt = query;

    if (action === "search") {
      systemPrompt = `You are a smart property management search assistant. Answer natural language queries about the portfolio data. Be specific with numbers and names. Format responses clearly with markdown.

Portfolio Data:
${dataContext}

Today's date: ${new Date().toISOString().split("T")[0]}`;
    } else if (action === "trends") {
      systemPrompt = `You are a property management trend analyst. Analyze patterns and trends in the data. Provide insights with specific numbers.

Portfolio Data:
${dataContext}

Today's date: ${new Date().toISOString().split("T")[0]}`;
    } else if (action === "report") {
      systemPrompt = `You are a property management reporting assistant. Generate clear, professional reports based on the data. Include key metrics, summaries, and actionable insights. Use markdown formatting with headers, tables, and bullet points.

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
