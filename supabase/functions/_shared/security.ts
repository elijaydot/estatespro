type RateLimitConfig = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type SignatureConfig = {
  headerName?: string;
  secretEnv?: string;
  required?: boolean;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function parseAllowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get("origin")?.trim();
  const allowedOrigins = parseAllowedOrigins();

  if (!origin) {
    return allowedOrigins[0] ?? "*";
  }

  if (allowedOrigins.length === 0) {
    return origin;
  }

  return allowedOrigins.includes(origin) ? origin : null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }

  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildCorsHeaders(req: Request, methods = "POST, OPTIONS") {
  const origin = resolveOrigin(req);

  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fishgate-signature",
    "Access-Control-Allow-Methods": methods,
    "Vary": "Origin",
  };
}

export function handleCorsPreflight(req: Request, methods = "POST, OPTIONS") {
  const origin = resolveOrigin(req);

  if (origin === null) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: {
        ...buildCorsHeaders(req, methods),
        "Content-Type": "application/json",
      },
    });
  }

  return new Response(null, { headers: buildCorsHeaders(req, methods) });
}

export function checkRateLimit(req: Request, config: RateLimitConfig) {
  const key = `${config.keyPrefix}:${getClientIp(req)}`;
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, config.limit - existing.count),
    retryAfterMs: 0,
  };
}

export async function validateRequestSignature(
  req: Request,
  payload: string,
  config: SignatureConfig = {},
): Promise<boolean> {
  const headerName = config.headerName ?? "x-fishgate-signature";
  const secretEnv = config.secretEnv ?? "EDGE_REQUEST_SIGNING_SECRET";
  const required = config.required ?? false;

  const secret = Deno.env.get(secretEnv)?.trim() ?? "";
  if (!secret) {
    return !required;
  }

  const incomingSignature = req.headers.get(headerName)?.trim();
  if (!incomingSignature) {
    return !required;
  }

  const expectedSignature = await hmacSha256Hex(secret, payload);
  return timingSafeEqual(incomingSignature.toLowerCase(), expectedSignature.toLowerCase());
}
