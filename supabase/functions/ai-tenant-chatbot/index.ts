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

async function getTenantContext(supabase: ReturnType<typeof createClient>, userId: string) {
  // Get tenant record
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, properties:property_id(name, address, city), units:unit_id(unit_number, bedrooms, bathrooms)')
    .eq('tenant_user_id', userId)
    .maybeSingle();

  if (!tenant) return "No tenant record found.";

  // Get lease, invoices, maintenance in parallel
  const [leaseRes, invoiceRes, maintenanceRes] = await Promise.all([
    supabase.from('leases').select('start_date, end_date, monthly_rent, status').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(1),
    supabase.from('invoices').select('invoice_number, amount, due_date, status, paid_amount').eq('tenant_id', tenant.id).order('due_date', { ascending: false }).limit(5),
    supabase.from('maintenance_requests').select('title, status, priority, created_at').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(5),
  ]);

  const lease = leaseRes.data?.[0];
  const invoices = invoiceRes.data || [];
  const maintenance = maintenanceRes.data || [];

  return `
Tenant: ${tenant.name}
Property: ${tenant.properties?.name || 'N/A'} at ${tenant.properties?.address || 'N/A'}, ${tenant.properties?.city || 'N/A'}
Unit: ${tenant.units?.unit_number || 'N/A'} (${tenant.units?.bedrooms || 0} bed, ${tenant.units?.bathrooms || 0} bath)
Monthly Rent: ${tenant.monthly_rent}
${lease ? `Lease: ${lease.start_date} to ${lease.end_date}, Status: ${lease.status}` : 'No active lease'}

Recent Invoices:
${invoices.map((inv) => `- ${inv.invoice_number}: ${inv.amount} due ${inv.due_date} (${inv.status}, paid: ${inv.paid_amount})`).join('\n') || 'None'}

Recent Maintenance:
${maintenance.map((m) => `- ${m.title}: ${m.status} (${m.priority})`).join('\n') || 'None'}
`.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "ai-tenant-chatbot",
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const { messages } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: claimsError } = await supabaseClient.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (claimsError || !userId) throw new Error("Unauthorized");

    const context = await getTenantContext(supabaseClient, userId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a helpful tenant portal assistant for a property management system. Help tenants with questions about their lease, payments, maintenance, and general property inquiries.

${context}

Guidelines:
- Be friendly, professional, and concise
- Answer based on the tenant's actual data when available
- For payment questions, reference their actual invoices and due dates
- For maintenance, help them understand how to submit requests and track status
- If you can't answer something specific, suggest they contact their property manager through the Messages section
- Never make up information that isn't in the context`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
      }
      if (response.status === 402) {
        return jsonResponse(req, { error: "Payment required" }, 402);
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...buildCorsHeaders(req), "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Tenant chatbot error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
