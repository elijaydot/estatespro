// MFA Enable: verify a TOTP code against the pending secret, flip enabled=true, and issue 10 recovery codes.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "https://esm.sh/otpauth@9.3.4";
import { checkRateLimit } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function deriveKey(): Promise<CryptoKey> {
  const material = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mfa-v1::" + material));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function decryptSecret(ct: string, iv: string): Promise<string> {
  const key = await deriveKey();
  const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, key, fromB64(ct));
  return new TextDecoder().decode(dec);
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { user: null, token: "" };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await sb.auth.getUser(token);
  return { user: data?.user ?? null, token };
}

function generateRecoveryCode(): string {
  // 10 chars from unambiguous alphabet, formatted XXXXX-XXXXX
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let s = "";
  for (const b of bytes) s += alpha[b % alpha.length];
  return s.slice(0, 5) + "-" + s.slice(5);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rateCheck = checkRateLimit(req, { keyPrefix: "mfa-enable", limit: 10, windowMs: 60_000 });
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { user, token } = await getUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code ?? "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Enter a 6-digit code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error } = await service.from("user_mfa")
      .select("secret_ciphertext, secret_iv, enabled")
      .eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!row?.secret_ciphertext) {
      return new Response(JSON.stringify({ error: "No pending MFA setup. Start setup first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secret = await decryptSecret(row.secret_ciphertext, row.secret_iv!);
    const totp = new OTPAuth.TOTP({
      algorithm: "SHA1", digits: 6, period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enable MFA
    await service.from("user_mfa").update({
      enabled: true,
      enrolled_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Generate 10 recovery codes; store via existing RPC (called as the user so auth.uid() works)
    const codes: string[] = Array.from({ length: 10 }, () => generateRecoveryCode());
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { error: codesErr } = await userClient.rpc("set_recovery_codes", { p_codes: codes });
    if (codesErr) throw codesErr;
    await userClient.rpc("log_security_event", {
      p_event_type: "mfa_enabled", p_metadata: {},
    });

    return new Response(JSON.stringify({ success: true, recovery_codes: codes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mfa-enable error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
