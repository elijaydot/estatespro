import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { useSuperAdminOverride } from '@/hooks/useSuperAdminOverride';

export type SaasEntitlementKey =
  | 'marketplace.listings.manage'
  | 'marketplace.moderation.view'
  | 'crm.leads.manage'
  | 'crm.deals.manage'
  | 'crm.calls_meetings.manage'
  | 'crm.automation.manage'
  | 'ai.assistant.enabled';

export type SaasQuotaCode =
  | 'units_managed'
  | 'properties_managed'
  | 'active_tenants'
  | 'property_manager_seats'
  | 'ai_credits_monthly';

export type SaasQuotaSnapshot = {
  quota_code: string;
  soft_limit: number;
  hard_limit: number;
  used_value: number;
  remaining: number;
  limit_state: string;
  usage_percent: number;
};

type SaasAccessResult = {
  entitlements: Record<SaasEntitlementKey, boolean>;
  quotas: SaasQuotaSnapshot[];
};

const ENTITLEMENT_KEYS: SaasEntitlementKey[] = [
  'marketplace.listings.manage',
  'marketplace.moderation.view',
  'crm.leads.manage',
  'crm.deals.manage',
  'crm.calls_meetings.manage',
  'crm.automation.manage',
  'ai.assistant.enabled',
];

const EMPTY_ENTITLEMENTS: Record<SaasEntitlementKey, boolean> = {
  'marketplace.listings.manage': false,
  'marketplace.moderation.view': false,
  'crm.leads.manage': false,
  'crm.deals.manage': false,
  'crm.calls_meetings.manage': false,
  'crm.automation.manage': false,
  'ai.assistant.enabled': false,
};

export function useSaasAccess() {
  const { activeCompanyId } = useActiveCompany();
  const { isOverrideActive } = useSuperAdminOverride();

  const query = useQuery({
    queryKey: ['saas-access', activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<SaasAccessResult> => {
      if (!activeCompanyId) {
        return { entitlements: EMPTY_ENTITLEMENTS, quotas: [] };
      }

      const entitlementResults = await Promise.all(
        ENTITLEMENT_KEYS.map(async (entitlementKey) => {
          const { data, error } = await supabase.rpc('saas_has_entitlement' as never, {
            p_company_id: activeCompanyId,
            p_entitlement_key: entitlementKey,
            p_product_code: 'core_property',
          } as never);

          if (error) throw error;
          return [entitlementKey, Boolean(data)] as const;
        })
      );

      const entitlements = entitlementResults.reduce<Record<SaasEntitlementKey, boolean>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, { ...EMPTY_ENTITLEMENTS });

      const { data: quotaRows, error: quotaError } = await supabase.rpc('saas_get_quota_snapshot' as never, {
        p_company_id: activeCompanyId,
        p_product_code: 'core_property',
      } as never);

      if (quotaError) throw quotaError;

      const quotas = Array.isArray(quotaRows)
        ? (quotaRows as SaasQuotaSnapshot[])
        : [];

      return { entitlements, quotas };
    },
  });

  const quotaByCode = useMemo(() => {
    const map = new Map<string, SaasQuotaSnapshot>();
    (query.data?.quotas || []).forEach((quota) => {
      map.set(quota.quota_code, quota);
    });
    return map;
  }, [query.data?.quotas]);

  return {
    ...query,
    entitlements: isOverrideActive
      ? ENTITLEMENT_KEYS.reduce<Record<SaasEntitlementKey, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, { ...EMPTY_ENTITLEMENTS })
      : (query.data?.entitlements ?? EMPTY_ENTITLEMENTS),
    quotas: query.data?.quotas ?? [],
    quotaByCode,
  };
}
