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
      requestedDelta: 1,
      reason: "ai.financial_insights.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch financial data in parallel
    const [invoicesRes, paymentsRes, leasesRes, tenantsRes] = await Promise.all([
      supabaseClient
        .from("invoices")
        .select("id, tenant_id, booking_id, source, guest_name, guest_email, amount, paid_amount, status, due_date, created_at, description")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseClient
        .from("payments")
        .select("id, tenant_id, booking_id, source, payer_name, payer_email, amount, method, created_at, invoice_id, status")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseClient
        .from("leases")
        .select("id, tenant_id, monthly_rent, start_date, end_date, status")
        .eq("status", "active")
        .limit(200),
      supabaseClient
        .from("tenants")
        .select("id, name, monthly_rent, status, property_id")
        .eq("status", "active")
        .limit(200),
    ]);

    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const leases = leasesRes.data || [];
    const tenants = tenantsRes.data || [];

    // Build financial summary for AI analysis
    const now = new Date();
    const overdueInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now);
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const totalMonthlyRent = leases.reduce((sum, l) => sum + Number(l.monthly_rent), 0);
    const shortletInvoices = invoices.filter(i => i.source === 'shortlet_booking' || i.booking_id);
    const shortletPayments = payments.filter(p => p.source === 'shortlet_booking' || p.booking_id);

    // Calculate per-tenant payment patterns
    const tenantPaymentStats = tenants.map(t => {
      const tInvoices = invoices.filter(i => i.tenant_id === t.id);
      const tPayments = payments.filter(p => p.tenant_id === t.id);
      const tOverdue = tInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.due_date) < now);
      const latePays = tInvoices.filter(i => {
        if (i.status !== 'paid') return false;
        const payment = tPayments.find(p => p.invoice_id === i.id);
        if (!payment) return false;
        return new Date(payment.created_at) > new Date(i.due_date);
      });
      return {
        name: t.name,
        totalInvoices: tInvoices.length,
        overdueCount: tOverdue.length,
        latePayCount: latePays.length,
        totalOwed: tOverdue.reduce((s, i) => s + Number(i.amount) - Number(i.paid_amount), 0),
        monthlyRent: t.monthly_rent,
      };
    }).filter(t => t.totalInvoices > 0);

    // Payment method breakdown
    const methodCounts: Record<string, number> = {};
    payments.forEach(p => {
      methodCounts[p.method] = (methodCounts[p.method] || 0) + 1;
    });

    // Monthly collection for last 6 months
    const monthlyCollections: Record<string, number> = {};
    payments.filter(p => p.status === 'completed').forEach(p => {
      const month = new Date(p.created_at).toISOString().slice(0, 7);
      monthlyCollections[month] = (monthlyCollections[month] || 0) + Number(p.amount);
    });

    const financialContext = {
      summary: {
        totalActiveLeases: leases.length,
        totalActiveTenants: tenants.length,
        totalShortletInvoices: shortletInvoices.length,
        totalShortletPayments: shortletPayments.length,
        totalShortletCollected: shortletPayments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0),
        totalMonthlyRent,
        totalInvoices: invoices.length,
        totalPaidInvoices: paidInvoices.length,
        totalOverdueInvoices: overdueInvoices.length,
        totalOverdueAmount: overdueInvoices.reduce((s, i) => s + Number(i.amount) - Number(i.paid_amount), 0),
        totalCollected: payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0),
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
      }
      if (response.status === 402) {
        return jsonResponse(req, { error: "Payment required" }, 402);
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract tool call result
    let insights;
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      insights = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
    } else {
      // Fallback to parsing content
      const content = result.choices?.[0]?.message?.content || "{}";
      insights = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
    }

    return jsonResponse(req, { insights, raw_stats: financialContext.summary });
  } catch (error) {
    console.error("Financial insights error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
