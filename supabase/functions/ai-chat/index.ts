import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getPortfolioContext(supabase: any, userId: string) {
  const [propertiesRes, unitsRes, tenantsRes, maintenanceRes, paymentsRes] = await Promise.all([
    supabase.from('properties').select('id, name, total_units, occupied_units').eq('user_id', userId),
    supabase.from('units').select('id, status').eq('user_id', userId),
    supabase.from('tenants').select('id, status').eq('user_id', userId),
    supabase.from('maintenance_requests').select('id, status, priority').eq('user_id', userId),
    supabase.from('payments').select('amount, created_at, status').eq('user_id', userId).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const properties = propertiesRes.data || [];
  const units = unitsRes.data || [];
  const tenants = tenantsRes.data || [];
  const maintenance = maintenanceRes.data || [];
  const payments = paymentsRes.data || [];

  const occupancyRate = units.length > 0 
    ? Math.round((units.filter((u: any) => u.status === 'occupied').length / units.length) * 100)
    : 0;

  const revenue30d = payments
    .filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const activeTenants = tenants.filter((t: any) => t.status === 'active').length;
  const pendingMaintenance = maintenance.filter((m: any) => m.status === 'submitted' || m.status === 'in_progress').length;

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
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

    const context = await getPortfolioContext(supabaseClient, userId);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a helpful AI assistant for a property management platform. You help landlords and property managers understand their portfolio data, answer questions about properties, tenants, and operations.

${context}

Provide clear, concise answers based on the user's portfolio data. If you don't have specific information, let them know what data is available.`;

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
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
