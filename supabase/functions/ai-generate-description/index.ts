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

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflight(req);

  const rateCheck = checkRateLimit(req, {
    keyPrefix: "ai-generate-description",
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const payload = await req.json();
    const { type, data } = payload;
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const quotaResult = await enforceAiCreditQuota({
      supabase: supabaseClient,
      userId: user.id,
      req,
      requestBody: typeof payload === "object" && payload ? payload as Record<string, unknown> : null,
      requestedDelta: 2,
      reason: "ai.generate_description.request",
    });

    if (!quotaResult.allowed) {
      return jsonResponse(req, { error: quotaResult.message }, quotaResult.status);
    }

    let prompt = "";
    if (type === "property") {
      prompt = `Generate a compelling, professional property listing description for a ${data.type || "residential"} property named "${data.name}" located at ${data.address}, ${data.city}, ${data.state}, ${data.country}. It has ${data.total_units || 0} units. Keep it concise (2-3 paragraphs), highlight location benefits, and make it appealing to potential tenants. Only return the description text, no headings or labels.`;
    } else if (type === "unit") {
      prompt = `Generate a compelling, professional unit listing description for Unit ${data.unit_number} in "${data.property_name}". Details: ${data.bedrooms} bedroom(s), ${data.bathrooms} bathroom(s), ${data.sqft} sqft, floor ${data.floor}, rent ${data.rent_amount}/month. Amenities: ${(data.amenities || []).join(", ") || "none listed"}. Keep it concise (1-2 paragraphs), highlight key features. Only return the description text.`;
    } else {
      throw new Error("Invalid type. Must be 'property' or 'unit'.");
    }

    const response = await executeAiChat({
      messages: [
        { role: "system", content: "You are a professional real estate copywriter. Write engaging, accurate property descriptions." },
        { role: "user", content: prompt },
      ],
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
    const description = result.choices?.[0]?.message?.content || "";

    return jsonResponse(req, { description });
  } catch (error) {
    console.error("Description generation error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
