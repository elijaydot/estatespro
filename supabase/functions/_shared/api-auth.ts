export type ApiTier = "limited" | "full";
export type ApiScope =
  | "pm:read"
  | "pm:write"
  | "marketplace:read"
  | "marketplace:write"
  | "crm:read"
  | "crm:write";

export type ApiKeyRecord = {
  id: string;
  company_id: string;
  key_prefix: string;
  scopes: ApiScope[];
  tier: ApiTier;
  rate_limit_per_min: number;
};

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export type ApiAuthClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        is(column: string, value: null): { maybeSingle(): QueryResult<ApiKeyRecord> };
      };
    };
  };
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): QueryResult<unknown>;
};

export type ApiAuthSuccess = {
  ok: true;
  key: ApiKeyRecord;
  tier: ApiTier;
  rateLimit: { remaining: number; resetAt: string };
};

export type ApiAuthFailure = {
  ok: false;
  status: 401 | 403 | 429 | 500;
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(apiKey)));
}

export async function generateApiKey(environment: "test" | "live" = "live") {
  const token = randomToken(32);
  const plaintext = `fg_${environment}_${token}`;
  return {
    plaintext,
    hash: await hashApiKey(plaintext),
    prefix: `fg_${environment}_${token.slice(0, 8)}`,
  };
}

export function parseBearerKey(req: Request): string | null {
  const authorization = req.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+(fg_(?:test|live)_[A-Za-z0-9_-]{32,})$/i);
  return match?.[1] ?? null;
}

function normalizeRpcScalar<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return (data as T | null) ?? null;
}

function lowerTier(storedTier: ApiTier, entitledTier: string): ApiTier | null {
  if (entitledTier === "full") return storedTier;
  if (entitledTier === "limited") return "limited";
  return null;
}

export async function authenticateApiRequest(
  req: Request,
  client: ApiAuthClient,
): Promise<ApiAuthResult> {
  const plaintext = parseBearerKey(req);
  if (!plaintext) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "A valid FishGate bearer key is required." };
  }

  const keyHash = await hashApiKey(plaintext);
  const keyResult = await client
    .from("api_keys")
    .select("id,company_id,key_prefix,scopes,tier,rate_limit_per_min")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (keyResult.error) {
    return { ok: false, status: 500, code: "authentication_unavailable", message: "API authentication is temporarily unavailable." };
  }
  if (!keyResult.data) {
    return { ok: false, status: 401, code: "invalid_api_key", message: "The API key is invalid or revoked." };
  }

  const accessResult = await client.rpc("api_get_access_level", {
    p_company_id: keyResult.data.company_id,
  });
  if (accessResult.error) {
    return { ok: false, status: 500, code: "entitlement_unavailable", message: "API entitlement could not be evaluated." };
  }

  const effectiveTier = lowerTier(keyResult.data.tier, String(normalizeRpcScalar(accessResult.data) ?? "none"));
  if (!effectiveTier) {
    return { ok: false, status: 403, code: "api_access_not_entitled", message: "This company plan does not include API access." };
  }

  const limitResult = await client.rpc("api_consume_rate_limit", {
    p_api_key_id: keyResult.data.id,
  });
  const limit = normalizeRpcScalar<{ allowed: boolean; remaining: number; reset_at: string }>(limitResult.data);
  if (limitResult.error || !limit) {
    return { ok: false, status: 500, code: "rate_limit_unavailable", message: "The API rate limit could not be evaluated." };
  }
  if (!limit.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((Date.parse(limit.reset_at) - Date.now()) / 1000));
    return { ok: false, status: 429, code: "rate_limit_exceeded", message: "The API rate limit has been exceeded.", retryAfterSeconds };
  }

  return {
    ok: true,
    key: keyResult.data,
    tier: effectiveTier,
    rateLimit: { remaining: limit.remaining, resetAt: limit.reset_at },
  };
}

export function authorizeApiAccess(
  auth: ApiAuthSuccess,
  requiredScope: ApiScope,
  requiredTier: ApiTier = "limited",
): ApiAuthFailure | null {
  if (!auth.key.scopes.includes(requiredScope)) {
    return { ok: false, status: 403, code: "scope_denied", message: `The API key requires the ${requiredScope} scope.` };
  }
  if (requiredTier === "full" && auth.tier !== "full") {
    return { ok: false, status: 403, code: "upgrade_required", message: "This endpoint requires Full API access." };
  }
  return null;
}