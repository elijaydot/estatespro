// MFA Setup: generate a fresh TOTP secret, store ciphertext (enabled=false), return otpauth URI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "https://esm.sh/otpauth@9.3.4";
import { encode as b32encode } from "https://deno.land/std@0.224.0/encoding/base32.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ISSUER = "FishGate";

async function deriveKey(): Promise<CryptoKey> {
  const material = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mfa-v1::" + material));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptSecret(plain: string): Promise<{ ct: string; iv: string }> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return { ct: b64(new Uint8Array(enc)), iv: b64(iv) };
}

async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Prevent re-setup if already enabled (must disable first)
    const { data: existing } = await service.from("user_mfa")
      .select("enabled").eq("user_id", user.id).maybeSingle();
    if (existing?.enabled) {
      return new Response(JSON.stringify({ error: "MFA already enabled. Disable it first to re-enroll." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 20-byte secret -> base32 (compatible with all TOTP apps)
    const raw = crypto.getRandomValues(new Uint8Array(20));
    const secretB32 = b32encode(raw).replace(/=+$/, "");

    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: user.email || user.id,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretB32),
    });

    const { ct, iv } = await encryptSecret(secretB32);

    const { error: upsertErr } = await service.from("user_mfa").upsert({
      user_id: user.id,
      enabled: false,
      secret_ciphertext: ct,
      secret_iv: iv,
      enrolled_at: null,
    });
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({
      secret: secretB32,
      otpauth_uri: totp.toString(),
      issuer: ISSUER,
      account: user.email,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("mfa-setup error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
