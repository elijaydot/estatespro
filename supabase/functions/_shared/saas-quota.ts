import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

type SupabaseClient = ReturnType<typeof createClient>;

type QuotaCheckResult = {
  allowed: boolean;
  reason: string;
  used_value: number;
  projected_used_value: number;
  soft_limit: number;
  hard_limit: number;
  remaining: number;
};

function extractFirstString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

async function canUserAccessCompany(
  supabase: SupabaseClient,
  userId: string,
  companyId: string,
): Promise<boolean> {
  const [{ data: profile }, { data: ownedCompany }, { data: membership }, { data: tenant }] = await Promise.all([
    supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle(),
    supabase.from("companies").select("id").eq("id", companyId).eq("owner_id", userId).maybeSingle(),
    supabase
      .from("company_members")
      .select("company_id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("properties:property_id!inner(company_id)")
      .eq("tenant_user_id", userId)
      .eq("properties.company_id", companyId)
      .limit(1)
      .maybeSingle(),
  ]);

  return profile?.role === "super_admin" || Boolean(ownedCompany || membership || tenant);
}

export async function resolveCompanyIdForUser(
  supabase: SupabaseClient,
  userId: string,
  requestBody?: Record<string, unknown> | null,
  req?: Request,
): Promise<string | null> {
  const fromBody = extractFirstString([
    requestBody?.companyId,
    requestBody?.activeCompanyId,
    requestBody?.company_id,
  ]);

  const fromHeader = extractFirstString([
    req?.headers.get("x-company-id"),
    req?.headers.get("x-active-company-id"),
  ]);

  const requestedCompanyId = fromBody || fromHeader;
  if (requestedCompanyId) {
    return await canUserAccessCompany(supabase, userId, requestedCompanyId)
      ? requestedCompanyId
      : null;
  }

  const { data: memberCompany } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .in("role", ["landlord", "property_manager"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberCompany?.company_id) return memberCompany.company_id as string;

  const { data: ownedCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ownedCompany?.id) return ownedCompany.id as string;

  const { data: tenantCompany } = await supabase
    .from("tenants")
    .select("properties:property_id(company_id)")
    .eq("tenant_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tenantCompanyId = tenantCompany?.properties && typeof tenantCompany.properties === "object"
    ? (tenantCompany.properties as { company_id?: string | null }).company_id
    : null;

  if (tenantCompanyId) return tenantCompanyId;

  return null;
}

export async function enforceAiCreditQuota(params: {
  supabase: SupabaseClient;
  userId: string;
  req: Request;
  requestBody?: Record<string, unknown> | null;
  requestedDelta?: number;
  correlationId?: string;
  reason?: string;
}): Promise<{ allowed: true; companyId: string; quota: QuotaCheckResult } | { allowed: false; status: number; message: string }> {
  const { supabase, userId, req, requestBody, requestedDelta = 1, correlationId, reason } = params;

  const companyId = await resolveCompanyIdForUser(supabase, userId, requestBody ?? null, req);
  if (!companyId) {
    return {
      allowed: false,
      status: 403,
      message: "No company context found for AI quota enforcement.",
    };
  }

  const { data: quotaData, error: quotaError } = await supabase.rpc("saas_check_quota", {
    p_company_id: companyId,
    p_quota_code: "ai_credits_monthly",
    p_requested_delta: requestedDelta,
    p_product_code: "core_property",
  });

  if (quotaError) {
    return {
      allowed: false,
      status: 500,
      message: quotaError.message || "Failed to check AI credit quota.",
    };
  }

  const quota = (quotaData || {}) as QuotaCheckResult;

  if (!quota.allowed) {
    return {
      allowed: false,
      status: 402,
      message: "AI credits monthly quota exceeded. Upgrade your plan or add credits to continue.",
    };
  }

  const { error: meterError } = await supabase.rpc("saas_record_usage", {
    p_company_id: companyId,
    p_quota_code: "ai_credits_monthly",
    p_delta: requestedDelta,
    p_product_code: "core_property",
    p_correlation_id: correlationId ?? null,
    p_metadata: {
      reason: reason ?? "ai.inference.request",
      path: new URL(req.url).pathname,
      projected_used_value: quota.projected_used_value,
      soft_limit: quota.soft_limit,
      hard_limit: quota.hard_limit,
      remaining: quota.remaining,
    },
  });

  if (meterError) {
    return {
      allowed: false,
      status: 500,
      message: meterError.message || "Failed to reserve AI credits.",
    };
  }

  return {
    allowed: true,
    companyId,
    quota,
  };
}
