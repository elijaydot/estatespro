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
    keyPrefix: "ai-document-intelligence",
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const payload = await req.json();
    const { action, leaseId, question, leaseIds } = payload;

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
      reason: "ai.document_intelligence.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch lease data based on action
    let leaseContext = "";

    if (action === "compare" && leaseIds?.length > 0) {
      const { data: leases } = await supabaseClient
        .from("leases")
        .select("*, tenants:tenant_id(name), properties:property_id(name, address), units:unit_id(unit_number)")
        .in("id", leaseIds);

      if (leases?.length) {
        leaseContext = leases.map((l, i: number) => `
Lease ${i + 1}: ${l.lease_number}
Property: ${l.properties?.name} (${l.properties?.address})
Unit: ${l.units?.unit_number}
Tenant: ${l.tenants?.name}
Period: ${l.start_date} to ${l.end_date}
Rent: ${l.monthly_rent}/month
Deposit: ${l.security_deposit}
Status: ${l.status}
Terms: ${l.terms || "N/A"}
Special Conditions: ${l.special_conditions || "N/A"}
`).join("\n---\n");
      }
    } else if (leaseId) {
      const { data: lease } = await supabaseClient
        .from("leases")
        .select("*, tenants:tenant_id(name, email, phone), properties:property_id(name, address, city), units:unit_id(unit_number, bedrooms, bathrooms, rent_amount)")
        .eq("id", leaseId)
        .maybeSingle();

      if (lease) {
        leaseContext = `
Lease Number: ${lease.lease_number}
Property: ${lease.properties?.name} at ${lease.properties?.address}, ${lease.properties?.city}
Unit: ${lease.units?.unit_number} (${lease.units?.bedrooms} bed, ${lease.units?.bathrooms} bath)
Tenant: ${lease.tenants?.name} (${lease.tenants?.email})
Period: ${lease.start_date} to ${lease.end_date}
Monthly Rent: ${lease.monthly_rent}
Security Deposit: ${lease.security_deposit}
Status: ${lease.status}
Terms: ${lease.terms || "No terms specified"}
Special Conditions: ${lease.special_conditions || "None"}
Renewal Status: ${lease.renewal_status || "N/A"}
Landlord Signed: ${lease.landlord_signed_at ? "Yes" : "No"}
Tenant Signed: ${lease.tenant_signed_at ? "Yes" : "No"}
`;
      }
    }

    let systemPrompt = "";
    let userPrompt = "";
  let tools: unknown[] = [];
  let toolChoice: unknown = undefined;

    switch (action) {
      case "qa":
        systemPrompt = `You are a helpful lease document assistant. Answer questions about the lease based on the provided data. Be accurate and concise. If information isn't available, say so.

Lease Data:
${leaseContext}`;
        userPrompt = question || "Summarize this lease.";
        break;

      case "extract":
        systemPrompt = `You are a lease document analyst. Extract key terms from the provided lease data.

Lease Data:
${leaseContext}`;
        userPrompt = "Extract all key terms, dates, financial obligations, and important clauses from this lease.";
        tools = [{
          type: "function",
          function: {
            name: "extract_terms",
            description: "Extract key terms from a lease document",
            parameters: {
              type: "object",
              properties: {
                key_dates: {
                  type: "array",
                  items: { type: "object", properties: { label: { type: "string" }, date: { type: "string" }, importance: { type: "string", enum: ["high", "medium", "low"] } }, required: ["label", "date", "importance"] }
                },
                financial_terms: {
                  type: "array",
                  items: { type: "object", properties: { label: { type: "string" }, amount: { type: "string" }, frequency: { type: "string" } }, required: ["label", "amount", "frequency"] }
                },
                obligations: {
                  type: "array",
                  items: { type: "object", properties: { party: { type: "string", enum: ["tenant", "landlord", "both"] }, description: { type: "string" } }, required: ["party", "description"] }
                },
                special_clauses: {
                  type: "array",
                  items: { type: "object", properties: { title: { type: "string" }, summary: { type: "string" }, risk_level: { type: "string", enum: ["low", "medium", "high"] } }, required: ["title", "summary", "risk_level"] }
                }
              },
              required: ["key_dates", "financial_terms", "obligations", "special_clauses"],
              additionalProperties: false
            }
          }
        }];
        toolChoice = { type: "function", function: { name: "extract_terms" } };
        break;

      case "summary":
        systemPrompt = `You are a lease document analyst. Generate a clear, structured summary of the lease.

Lease Data:
${leaseContext}`;
        userPrompt = "Generate a comprehensive summary of this lease including key dates, financial terms, and important conditions.";
        tools = [{
          type: "function",
          function: {
            name: "generate_summary",
            description: "Generate a structured lease summary",
            parameters: {
              type: "object",
              properties: {
                overview: { type: "string", description: "2-3 sentence overview" },
                parties: { type: "object", properties: { tenant: { type: "string" }, property: { type: "string" }, unit: { type: "string" } }, required: ["tenant", "property", "unit"] },
                duration: { type: "object", properties: { start: { type: "string" }, end: { type: "string" }, remaining_months: { type: "number" } }, required: ["start", "end", "remaining_months"] },
                financials: { type: "object", properties: { monthly_rent: { type: "string" }, security_deposit: { type: "string" }, total_lease_value: { type: "string" } }, required: ["monthly_rent", "security_deposit", "total_lease_value"] },
                status_notes: { type: "array", items: { type: "string" } },
                risk_flags: { type: "array", items: { type: "string" } }
              },
              required: ["overview", "parties", "duration", "financials", "status_notes", "risk_flags"],
              additionalProperties: false
            }
          }
        }];
        toolChoice = { type: "function", function: { name: "generate_summary" } };
        break;

      case "compare":
        systemPrompt = `You are a lease comparison analyst. Compare the provided leases and highlight differences.

Lease Data:
${leaseContext}`;
        userPrompt = "Compare these leases. Highlight differences in rent, terms, conditions, and any notable variations.";
        tools = [{
          type: "function",
          function: {
            name: "compare_leases",
            description: "Compare multiple leases",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Overall comparison summary" },
                differences: {
                  type: "array",
                  items: { type: "object", properties: { category: { type: "string" }, details: { type: "array", items: { type: "string" } } }, required: ["category", "details"] }
                },
                rent_comparison: {
                  type: "array",
                  items: { type: "object", properties: { lease: { type: "string" }, rent: { type: "string" }, per_sqft: { type: "string" } }, required: ["lease", "rent"] }
                },
                recommendations: { type: "array", items: { type: "string" } }
              },
              required: ["summary", "differences", "rent_comparison", "recommendations"],
              additionalProperties: false
            }
          }
        }];
        toolChoice = { type: "function", function: { name: "compare_leases" } };
        break;

      default:
        throw new Error("Invalid action. Use: qa, extract, summary, compare");
    }

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = toolChoice;
    } else {
      // For Q&A, use streaming
      body.stream = true;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
      if (response.status === 402) return jsonResponse(req, { error: "Payment required" }, 402);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // For Q&A, stream the response
    if (action === "qa") {
      return new Response(response.body, {
        headers: { ...buildCorsHeaders(req), "Content-Type": "text/event-stream" },
      });
    }

    // For structured actions, parse tool call
    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        return jsonResponse(req, { result: parsed });
      } catch {
        // fallback
      }
    }

    return jsonResponse(req, { error: "Failed to process document" }, 500);
  } catch (error) {
    console.error("Document intelligence error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
