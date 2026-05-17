// MFA Verify: validates a 6-digit TOTP code OR a recovery code. Used at login.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "https://esm.sh/otpauth@9.3.4";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, token } = await getUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.code ?? "").trim();
    const isRecovery = Boolean(body?.recovery) || /^[A-Za-z0-9]{5}-?[A-Za-z0-9]{5}$/.test(rawCode);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: row } = await service.from("user_mfa")
      .select("secret_ciphertext, secret_iv, enabled")
      .eq("user_id", user.id).maybeSingle();

    if (!row?.enabled) {
      return new Response(JSON.stringify({ error: "MFA is not enabled for this account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    let ok = false;
    if (isRecovery) {
      const { data, error } = await userClient.rpc("consume_recovery_code", { p_code: rawCode.toUpperCase() });
      if (error) throw error;
      ok = data === true;
    } else {
      const code = rawCode.replace(/\s+/g, "");
      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: "Enter a 6-digit code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const secret = await decryptSecret(row.secret_ciphertext!, row.secret_iv!);
      const totp = new OTPAuth.TOTP({
        algorithm: "SHA1", digits: 6, period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      ok = totp.validate({ token: code, window: 1 }) !== null;
    }

    if (!ok) {
      await userClient.rpc("log_security_event", {
        p_event_type: "mfa_verify_failed",
        p_metadata: { method: isRecovery ? "recovery" : "totp" },
      });
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await service.from("user_mfa")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("user_id", user.id);
    await userClient.rpc("log_security_event", {
      p_event_type: "mfa_verified",
      p_metadata: { method: isRecovery ? "recovery" : "totp" },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mfa-verify error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
