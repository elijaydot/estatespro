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
    keyPrefix: "ai-maintenance-triage",
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const payload = await req.json();
    const { title, description, category } = payload;

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
      requestedDelta: 2,
      reason: "ai.maintenance_triage.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: "You are a maintenance triage expert for property management. Analyze maintenance requests and categorize them." 
          },
          { 
            role: "user", 
            content: `Analyze this maintenance request:\nCategory: ${category}\nTitle: ${title}\nDescription: ${description}\n\nDetermine the urgency and suggest a priority level.` 
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "triage_request",
            description: "Categorize and prioritize a maintenance request",
            parameters: {
              type: "object",
              properties: {
                suggested_priority: { 
                  type: "string", 
                  enum: ["low", "medium", "high", "urgent"],
                  description: "Suggested priority level"
                },
                urgency_category: {
                  type: "string",
                  enum: ["cosmetic", "routine", "important", "emergency"],
                  description: "Urgency classification"
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of the triage decision (1-2 sentences)"
                },
                estimated_response_time: {
                  type: "string",
                  description: "Suggested response timeframe e.g. '24-48 hours', 'Same day', '1 week'"
                }
              },
              required: ["suggested_priority", "urgency_category", "reasoning", "estimated_response_time"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "triage_request" } },
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

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    let triage = {
      suggested_priority: "medium",
      urgency_category: "routine",
      reasoning: "Unable to analyze. Default priority assigned.",
      estimated_response_time: "24-48 hours",
    };

    if (toolCall?.function?.arguments) {
      try {
        triage = JSON.parse(toolCall.function.arguments);
      } catch { /* keep defaults */ }
    }

    return jsonResponse(req, { triage });
  } catch (error) {
    console.error("Maintenance triage error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
