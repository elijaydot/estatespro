import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  checkRateLimit,
  handleCorsPreflight,
} from "../_shared/security.ts";
import { enforceAiCreditQuota } from "../_shared/saas-quota.ts";
import { executeAiChat } from "../_shared/ai-provider.ts";

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function getPortfolioContext(supabase: ReturnType<typeof createClient>, companyId: string) {
  const propertiesRes = await supabase
    .from('properties')
    .select('id, name, total_units, occupied_units')
    .eq('company_id', companyId);

  const properties = propertiesRes.data || [];
  const propertyIds = properties.map((property) => property.id);
  if (propertyIds.length === 0) {
    return 'Portfolio Summary:\n- Properties: 0\n- Units: 0\n- Active Tenants: 0\n- Revenue (Last 30 days): 0\n- Pending Maintenance: 0';
  }

  const [unitsRes, tenantsRes, maintenanceRes, invoicesRes] = await Promise.all([
    supabase.from('units').select('id, status').in('property_id', propertyIds),
    supabase.from('tenants').select('id, status').in('property_id', propertyIds),
    supabase.from('maintenance_requests').select('id, status, priority').in('property_id', propertyIds),
    supabase.from('invoices').select('id').in('property_id', propertyIds),
  ]);

  const units = unitsRes.data || [];
  const tenants = tenantsRes.data || [];
  const maintenance = maintenanceRes.data || [];
  const invoiceIds = (invoicesRes.data || []).map((invoice) => invoice.id);
  const paymentsRes = invoiceIds.length > 0
    ? await supabase
      .from('payments')
      .select('amount, created_at, status')
      .in('invoice_id', invoiceIds)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    : { data: [] };
  const payments = paymentsRes.data || [];

  const occupancyRate = units.length > 0 
    ? Math.round((units.filter((u) => u.status === 'occupied').length / units.length) * 100)
    : 0;

  const revenue30d = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum: number, p) => sum + Number(p.amount), 0);

  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const pendingMaintenance = maintenance.filter((m) => m.status === 'submitted' || m.status === 'in_progress').length;

  return `
Portfolio Summary:
- Properties: ${properties.length}
- Units: ${units.length} (${occupancyRate}% occupied)
- Active Tenants: ${activeTenants}
- Revenue (Last 30 days): ${revenue30d}
- Pending Maintenance: ${pendingMaintenance}
`.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "ai-chat",
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const body = await req.json();
    const { messages } = body;
    
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

    const correlationId = createCorrelationId();
    const quotaResult = await enforceAiCreditQuota({
      supabase: supabaseClient,
      userId,
      req,
      requestBody: typeof body === "object" && body ? body as Record<string, unknown> : null,
      requestedDelta: 2,
      correlationId,
      reason: "ai.chat.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    const context = await getPortfolioContext(supabaseClient, quotaResult.companyId);
    
    const systemPrompt = `You are a helpful AI assistant for a property management platform. You help landlords and property managers understand their portfolio data, answer questions about properties, tenants, and operations.

${context}

Provide clear, concise answers based on the user's portfolio data. If you don't have specific information, let them know what data is available.`;

    const response = await executeAiChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...buildCorsHeaders(req), "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
