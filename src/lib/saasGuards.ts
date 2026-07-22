import { supabase } from '@/integrations/supabase/client';

export type SaasQuotaCode =
  | 'units_managed'
  | 'properties_managed'
  | 'active_tenants'
  | 'property_manager_seats'
  | 'ai_credits_monthly';

type QuotaCheckResponse = {
  allowed: boolean;
  reason: 'ok' | 'soft_limit_warning' | 'hard_limit_exceeded' | string;
  used_value: number;
  requested_delta: number;
  projected_used_value: number;
  soft_limit: number;
  hard_limit: number;
  remaining: number;
  plan_id: string;
  quota_code: string;
  product_code: string;
};

const quotaLabels: Record<SaasQuotaCode, string> = {
  properties_managed: 'properties',
  units_managed: 'units',
  active_tenants: 'active tenants',
  property_manager_seats: 'property manager seats',
  ai_credits_monthly: 'AI credits',
};

function buildQuotaExceededMessage(quotaCode: SaasQuotaCode) {
  return `Your plan has reached its ${quotaLabels[quotaCode]} limit. Upgrade your plan in Billing to continue.`;
}

export async function assertQuotaAvailable(params: {
  companyId: string;
  quotaCode: SaasQuotaCode;
  requestedDelta?: number;
  productCode?: string;
}) {
  const { companyId, quotaCode, requestedDelta = 1, productCode = 'core_property' } = params;

  const { data, error } = await supabase.rpc('saas_check_quota' as never, {
    p_company_id: companyId,
    p_quota_code: quotaCode,
    p_requested_delta: requestedDelta,
    p_product_code: productCode,
  } as never);

  if (error) {
    throw error;
  }

  const payload = (data || {}) as QuotaCheckResponse;

  if (!payload.allowed) {
    throw new Error(buildQuotaExceededMessage(quotaCode));
  }

  return payload;
}

export async function getCompanyIdForProperty(propertyId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('company_id')
    .eq('id', propertyId)
    .single();

  if (error) {
    throw error;
  }

  if (!data?.company_id) {
    throw new Error('Property is not linked to a company.');
  }

  return data.company_id as string;
}
