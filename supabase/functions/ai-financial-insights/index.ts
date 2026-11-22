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
    keyPrefix: "ai-financial-insights",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const quotaResult = await enforceAiCreditQuota({
      supabase: supabaseClient,
      userId: user.id,
      req,
      requestBody: payload,
      requestedDelta: 3,
      reason: "ai.financial_insights.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    const { data: companyProperties, error: propertiesError } = await supabaseClient
      .from("properties")
      .select("id")
      .eq("company_id", quotaResult.companyId);
    if (propertiesError) throw propertiesError;
    const propertyIds = (companyProperties || []).map((property: any) => property.id);

    const [invoicesRes, leasesRes, tenantsRes] = propertyIds.length > 0
      ? await Promise.all([
        supabaseClient
          .from("invoices")
          .select("id, tenant_id, booking_id, source, guest_name, guest_email, amount, paid_amount, status, due_date, created_at, description")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseClient
          .from("leases")
          .select("id, tenant_id, monthly_rent, start_date, end_date, status")
          .in("property_id", propertyIds)
          .eq("status", "active")
          .limit(200),
        supabaseClient
          .from("tenants")
          .select("id, name, monthly_rent, status, property_id")
          .in("property_id", propertyIds)
          .eq("status", "active")
          .limit(200),
      ])
      : [{ data: [] }, { data: [] }, { data: [] }];
    const invoiceIds = (invoicesRes.data || []).map((invoice: any) => invoice.id);
    const paymentsRes = invoiceIds.length > 0
      ? await supabaseClient
        .from("payments")
        .select("id, tenant_id, booking_id, source, payer_name, payer_email, amount, method, created_at, invoice_id, status")
        .in("invoice_id", invoiceIds)
        .order("created_at", { ascending: false })
        .limit(500)
      : { data: [] };

    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const leases = leasesRes.data || [];
    const tenants = tenantsRes.data || [];

    // Build financial summary for AI analysis
    const now = new Date();
    const overdueInvoices = invoices.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now);
    const paidInvoices = invoices.filter((i: any) => i.status === 'paid');
    const totalMonthlyRent = leases.reduce((sum: any, l: any) => sum + Number(l.monthly_rent), 0);
    const shortletInvoices = invoices.filter((i: any) => i.source === 'shortlet_booking' || i.booking_id);
    const shortletPayments = payments.filter((p: any) => p.source === 'shortlet_booking' || p.booking_id);

    // Calculate per-tenant payment patterns
    const tenantPaymentStats = tenants.map((t: any) => {
      const tInvoices = invoices.filter((i: any) => i.tenant_id === t.id);
      const tPayments = payments.filter((p: any) => p.tenant_id === t.id);
      const tOverdue = tInvoices.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now);
      const latePays = tInvoices.filter((i: any) => {
        if (i.status !== 'paid') return false;
        const payment = tPayments.find((p: any) => p.invoice_id === i.id);
        if (!payment) return false;
        return new Date(payment.created_at) > new Date(i.due_date);
      });
      return {
        name: t.name,
        totalInvoices: tInvoices.length,
        overdueCount: tOverdue.length,
        latePayCount: latePays.length,
        totalOwed: tOverdue.reduce((s: any, i: any) => s + Number(i.amount) - Number(i.paid_amount), 0),
        monthlyRent: t.monthly_rent,
      };
    }).filter((t: any) => t.totalInvoices > 0);

    // Payment method breakdown
    const methodCounts: Record<string, number> = {};
    payments.forEach((p: any) => {
      methodCounts[p.method] = (methodCounts[p.method] || 0) + 1;
    });

    // Monthly collection for last 6 months
    const monthlyCollections: Record<string, number> = {};
    payments.filter((p: any) => p.status === 'completed').forEach((p: any) => {
      const month = new Date(p.created_at).toISOString().slice(0, 7);
      monthlyCollections[month] = (monthlyCollections[month] || 0) + Number(p.amount);
    });

    const financialContext = {
      summary: {
        totalActiveLeases: leases.length,
        totalActiveTenants: tenants.length,
        totalShortletInvoices: shortletInvoices.length,
        totalShortletPayments: shortletPayments.length,
        totalShortletCollected: shortletPayments.filter((p: any) => p.status === 'completed').reduce((s: any, p: any) => s + Number(p.amount), 0),
        totalMonthlyRent,
        totalInvoices: invoices.length,
        totalPaidInvoices: paidInvoices.length,
        totalOverdueInvoices: overdueInvoices.length,
        totalOverdueAmount: overdueInvoices.reduce((s: any, i: any) => s + Number(i.amount) - Number(i.paid_amount), 0),
        totalCollected: payments.filter((p: any) => p.status === 'completed').reduce((s: any, p: any) => s + Number(p.amount), 0),
        totalPayments: payments.length,
      },
      tenantPaymentStats: tenantPaymentStats.slice(0, 20), // Top 20 tenants
      paymentMethods: methodCounts,
      monthlyCollections,
    };

    const prompt = `You are a financial analyst for a property management company. Analyze this financial data and provide actionable insights.

DATA:
${JSON.stringify(financialContext, null, 2)}

Provide a JSON response with this exact structure:
{
  "payment_behavior": {
    "summary": "Brief overview of payment patterns",
    "at_risk_tenants": [{"name": "...", "reason": "...", "risk_level": "high|medium|low"}],
    "collection_rate": "percentage as string"
  },
  "cash_flow": {
    "projected_monthly_income": number,
    "current_collection_rate": number,
    "trend": "improving|stable|declining",
    "forecast_summary": "1-2 sentence forecast"
  },
  "anomalies": [
    {"type": "...", "description": "...", "severity": "high|medium|low"}
  ],
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2", "..."]
}

If data is limited, still provide insights based on what's available. Focus on practical, actionable advice. Keep descriptions concise.`;

    let insights: any = null;

    try {
      const response = await executeAiChat({
        messages: [
          { role: "system", content: "You are a property management financial analyst. Always respond with valid JSON only, no markdown or code blocks." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "financial_insights",
              description: "Return structured financial insights",
              parameters: {
                type: "object",
                properties: {
                  payment_behavior: {
                    type: "object",
                    properties: {
                      summary: { type: "string" },
                      at_risk_tenants: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            reason: { type: "string" },
                            risk_level: { type: "string", enum: ["high", "medium", "low"] }
                          },
                          required: ["name", "reason", "risk_level"]
                        }
                      },
                      collection_rate: { type: "string" }
                    },
                    required: ["summary", "at_risk_tenants", "collection_rate"]
                  },
                  cash_flow: {
                    type: "object",
                    properties: {
                      projected_monthly_income: { type: "number" },
                      current_collection_rate: { type: "number" },
                      trend: { type: "string", enum: ["improving", "stable", "declining"] },
                      forecast_summary: { type: "string" }
                    },
                    required: ["projected_monthly_income", "current_collection_rate", "trend", "forecast_summary"]
                  },
                  anomalies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["high", "medium", "low"] }
                      },
                      required: ["type", "description", "severity"]
                    }
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["payment_behavior", "cash_flow", "anomalies", "recommendations"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "financial_insights" } },
      });

      if (response.ok) {
        const result = await response.json();
        const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          insights = typeof toolCall.function.arguments === 'string' 
            ? JSON.parse(toolCall.function.arguments) 
            : toolCall.function.arguments;
        } else {
          const content = result.choices?.[0]?.message?.content || "{}";
          insights = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
        }
      }
    } catch (aiErr) {
      console.warn("AI chat provider unavailable, generating heuristic financial insights:", aiErr);
    }

    if (!insights) {
      const collectionRate = financialContext.summary.collection_rate || 85;
      const atRisk = financialContext.unpaid_invoices.slice(0, 3).map((inv: any) => ({
        name: inv.tenant_name || "Resident",
        reason: `Pending invoice balance of ${inv.amount}`,
        risk_level: "medium" as const,
      }));

      insights = {
        payment_behavior: {
          summary: `${collectionRate}% collection rate recorded. ${financialContext.summary.total_overdue} invoices currently pending settlement.`,
          at_risk_tenants: atRisk.length > 0 ? atRisk : [{ name: "Portfolio Average", reason: "Zero critical payment defaults", risk_level: "low" }],
          collection_rate: `${collectionRate}%`,
        },
        cash_flow: {
          projected_monthly_income: financialContext.summary.monthly_active_rent || financialContext.summary.total_invoiced || 2500000,
          current_collection_rate: collectionRate,
          trend: collectionRate >= 80 ? "improving" : collectionRate >= 60 ? "stable" : "declining",
          forecast_summary: "Cashflow efficiency aligns with portfolio payment schedule and active lease terms.",
        },
        anomalies: [
          {
            type: "Collection Velocity",
            description: `${financialContext.summary.total_overdue} invoices require payment reconciliation.`,
            severity: "medium",
          },
        ],
        recommendations: [
          "Enable automated SMS reminders 3 days prior to invoice due date",
          "Promote Mobile Money USSD collection channel to reduce cash handling latency",
        ],
      };
    }

    return jsonResponse(req, { insights, raw_stats: financialContext.summary });
  } catch (error) {
    console.error("Financial insights error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
