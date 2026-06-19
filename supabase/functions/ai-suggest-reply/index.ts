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
    keyPrefix: "ai-suggest-reply",
    limit: 40,
    windowMs: 60_000,
  });

  if (!rateCheck.allowed) {
    return jsonResponse(req, { error: "Rate limit exceeded" }, 429);
  }

  try {
    const { messages, tenantName } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const conversationContext = messages.map((m) => 
      `${m.isFromMe ? "Property Manager" : tenantName}: ${m.content}`
    ).join("\n");

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
            content: "You are a professional property management assistant. Generate 3 short suggested replies for the property manager to respond to tenant messages. Be professional, helpful, and concise. Return a JSON array of 3 strings." 
          },
          { role: "user", content: `Conversation with tenant "${tenantName}":\n${conversationContext}\n\nGenerate 3 suggested replies.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_replies",
            description: "Return 3 suggested reply options",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                  description: "3 suggested reply texts"
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_replies" } },
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
    let suggestions: string[] = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      } catch {
        suggestions = ["Thank you for reaching out. I'll look into this.", "I'll get back to you shortly with more details.", "Thanks for letting me know. I'll take care of it."];
      }
    }

    return jsonResponse(req, { suggestions });
  } catch (error) {
    console.error("Suggest reply error:", error);
    return jsonResponse(req, { error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
