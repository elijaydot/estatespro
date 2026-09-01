import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/supabase-client-types.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "ai-predictive-analytics",
    limit: 25,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;

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
      requestBody: payload,
      requestedDelta: 3,
      reason: "ai.predictive_analytics.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    const propertiesRes = await supabaseClient
      .from("properties")
      .select("*")
      .eq("company_id", quotaResult.companyId)
      .limit(100);
    const propertyIds = (propertiesRes.data || []).map((property: any) => property.id);
    const [unitsRes, tenantsRes, leasesRes, invoicesRes, maintenanceRes] = propertyIds.length > 0
      ? await Promise.all([
        supabaseClient.from("units").select("id, property_id, unit_number, status, rent_amount, bedrooms, bathrooms, sqft").in("property_id", propertyIds).limit(500),
        supabaseClient.from("tenants").select("id, name, status, monthly_rent, balance, move_in_date, lease_end_date, property_id, unit_id").in("property_id", propertyIds).limit(200),
        supabaseClient.from("leases").select("id, lease_number, start_date, end_date, monthly_rent, status, tenant_id, property_id, renewal_status").in("property_id", propertyIds).limit(200),
        supabaseClient.from("invoices").select("id, amount, due_date, status, paid_amount, paid_at, tenant_id, created_at").in("property_id", propertyIds).limit(1000),
        supabaseClient.from("maintenance_requests").select("id, title, priority, status, created_at, completed_at, property_id, unit_id").in("property_id", propertyIds).limit(500),
      ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
    const invoiceIds = (invoicesRes.data || []).map((invoice: any) => invoice.id);
    const paymentsRes = invoiceIds.length > 0
      ? await supabaseClient.from("payments").select("id, amount, method, status, created_at, tenant_id").in("invoice_id", invoiceIds).limit(1000)
      : { data: [] };

    const properties = propertiesRes.data || [];
    const units = unitsRes.data || [];
    const tenants = tenantsRes.data || [];
    const leases = leasesRes.data || [];
    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const maintenance = maintenanceRes.data || [];

    type PriorityKey = "urgent" | "high" | "medium" | "low";

    // Build analytics context
    const totalUnits = units.length;
    const occupiedUnits = units.filter((u: any) => u.status === "occupied").length;
    const vacantUnits = units.filter((u: any) => u.status === "vacant").length;
    const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0";

    const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paid_amount || 0), 0);
    const overdueInvoices = invoices.filter((i: any) => i.status === "overdue" || (i.status !== "paid" && new Date(i.due_date) < new Date()));

    const activeLeasesExpiring = leases.filter((l: any) => {
      const end = new Date(l.end_date);
      const now = new Date();
      const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      return l.status === "active" && end <= threeMonths && end > now;
    });

    const maintenancePending = maintenance.filter((m: any) => m.status !== "completed" && m.status !== "cancelled");
    const maintenanceByPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
    maintenance.forEach((m: any) => {
      if (m.priority in maintenanceByPriority) {
        const priority = m.priority as PriorityKey;
        maintenanceByPriority[priority] += 1;
      }
    });

    const dataContext = `
PORTFOLIO SUMMARY:
- Properties: ${properties.length}
- Total Units: ${totalUnits} (Occupied: ${occupiedUnits}, Vacant: ${vacantUnits})
- Occupancy Rate: ${occupancyRate}%
- Active Tenants: ${tenants.filter((t: any) => t.status === "active").length}

FINANCIAL DATA:
- Total Invoiced: ${totalInvoiced}
- Total Collected: ${totalPaid}
- Collection Rate: ${totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : "0"}%
- Overdue Invoices: ${overdueInvoices.length} (Total: ${overdueInvoices.reduce((s: number, i: any) => s + (i.amount - i.paid_amount), 0)})

LEASE DATA:
- Active Leases: ${leases.filter((l: any) => l.status === "active").length}
- Expiring in 90 days: ${activeLeasesExpiring.length}
- Renewal Status: ${leases.filter((l: any) => l.renewal_status === "renewed").length} renewed, ${leases.filter((l: any) => l.renewal_status === "not_renewed").length} not renewed

MAINTENANCE:
- Total Requests: ${maintenance.length}
- Pending: ${maintenancePending.length}
- By Priority: Urgent: ${maintenanceByPriority.urgent}, High: ${maintenanceByPriority.high}, Medium: ${maintenanceByPriority.medium}, Low: ${maintenanceByPriority.low}

PROPERTY DETAILS:
${properties.map((p: any) => `- ${p.name}: ${p.occupied_units}/${p.total_units} units occupied`).join("\n")}

LEASE DETAILS (expiring soon):
${activeLeasesExpiring.map((l: any) => {
  const tenant = tenants.find((t: any) => t.id === l.tenant_id);
  return `- ${l.lease_number}: ${tenant?.name || "Unknown"}, ends ${l.end_date}, rent ${l.monthly_rent}`;
}).join("\n")}

MONTHLY PAYMENT TRENDS:
${(() => {
  const monthlyPayments: Record<string, number> = {};
  payments.forEach((p: any) => {
    const month = p.created_at?.substring(0, 7);
    if (month) monthlyPayments[month] = (monthlyPayments[month] || 0) + (p.amount || 0);
  });
  return Object.entries(monthlyPayments).sort().slice(-6).map(([m, a]) => `- ${m}: ${a}`).join("\n");
})()}

Today: ${new Date().toISOString().split("T")[0]}
`;

    const response = await executeAiChat({
      messages: [
        {
          role: "system",
          content: `You are a predictive analytics expert for property management. Analyze the portfolio data and provide forecasts and predictions. Use heuristic analysis since historical data may be limited.

${dataContext}`
        },
        {
          role: "user",
          content: "Generate comprehensive predictive analytics for this property portfolio."
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "generate_predictions",
          description: "Generate structured predictions and forecasts for the property portfolio",
          parameters: {
            type: "object",
            properties: {
              occupancy_forecast: {
                type: "object",
                properties: {
                  current_rate: { type: "string" },
                  forecast_30d: { type: "string" },
                  forecast_60d: { type: "string" },
                  forecast_90d: { type: "string" },
                  trend: { type: "string", enum: ["increasing", "stable", "decreasing"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  factors: { type: "array", items: { type: "string" } }
                },
                required: ["current_rate", "forecast_30d", "forecast_60d", "forecast_90d", "trend", "confidence", "factors"]
              },
              maintenance_predictions: {
                type: "object",
                properties: {
                  predicted_monthly_cost: { type: "string" },
                  high_risk_categories: { type: "array", items: { type: "string" } },
                  seasonal_risks: { type: "array", items: { type: "string" } },
                  preventative_actions: { type: "array", items: { type: "string" } },
                  risk_level: { type: "string", enum: ["high", "medium", "low"] }
                },
                required: ["predicted_monthly_cost", "high_risk_categories", "seasonal_risks", "preventative_actions", "risk_level"]
              },
              lease_renewal_scoring: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tenant_name: { type: "string" },
                    lease_end: { type: "string" },
                    renewal_likelihood: { type: "string", enum: ["high", "medium", "low"] },
                    reasoning: { type: "string" }
                  },
                  required: ["tenant_name", "lease_end", "renewal_likelihood", "reasoning"]
                }
              },
              revenue_projections: {
                type: "object",
                properties: {
                  projected_monthly: { type: "string" },
                  projected_quarterly: { type: "string" },
                  projected_annual: { type: "string" },
                  growth_rate: { type: "string" },
                  risks: { type: "array", items: { type: "string" } },
                  opportunities: { type: "array", items: { type: "string" } }
                },
                required: ["projected_monthly", "projected_quarterly", "projected_annual", "growth_rate", "risks", "opportunities"]
              }
            },
            required: ["occupancy_forecast", "maintenance_predictions", "lease_renewal_scoring", "revenue_projections"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "generate_predictions" } },
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
      if (response.status === 402) return jsonResponse(req, { error: "Payment required" }, 402);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        return jsonResponse(req, { predictions: parsed });
      } catch { /* fall through */ }
    }

    return jsonResponse(req, { error: "Failed to generate predictions" }, 500);
  } catch (error) {
    console.error("Predictive analytics error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
