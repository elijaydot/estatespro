import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function getErrorMessage(error: unknown) {
  if (!error) return '';
  if (error instanceof Error) return error.message || '';
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return String(error);
}

function isMissingControlPlaneBackendObject(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('could not find the function public.')
    || message.includes('in the schema cache')
    || message.includes('pgrst202')
    || (message.includes('relation') && message.includes('does not exist') && message.includes('platform_'));
}

function emptyCompanyAdminSnapshot(companyId: string | null): CompanyAdminSnapshot {
  return {
    company: {
      id: companyId || 'unknown',
      name: null,
      email: null,
      phone: null,
      owner_id: null,
      created_at: null,
      updated_at: null,
      is_verified: null,
    },
    portfolio: {
      property_count: 0,
      unit_count: 0,
      tenant_count: 0,
      active_member_count: 0,
    },
    operations: {
      open_alert_count: 0,
      abuse_signal_count: 0,
      risk_decision_count: 0,
    },
    billing: {
      active_subscription_count: 0,
      active_addon_count: 0,
    },
  };
}

export type ControlPlaneEvent = {
  id: string;
  source: string;
  event_type: string;
  module: string;
  action: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  result_status: 'success' | 'warning' | 'blocked' | 'denied' | 'error';
  actor_user_id: string | null;
  company_id: string | null;
  correlation_id: string;
  risk_score: number;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type GovernanceAlert = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  alert_type: string;
  title: string;
  description: string | null;
  company_id: string | null;
  correlation_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type EntitlementDecision = {
  id: string;
  company_id: string;
  actor_user_id: string | null;
  module: string;
  action: string;
  entitlement_key: string;
  allowed: boolean;
  decision_reason: string | null;
  correlation_id: string;
  risk_score: number;
  created_at: string;
};

export type UsageSnapshot = {
  id: string;
  company_id: string;
  product_code: string;
  quota_code: string;
  used_value: number;
  soft_limit: number;
  hard_limit: number;
  remaining: number;
  usage_percent: number;
  limit_state: string;
  snapshot_at: string;
};

export type PlatformOperatorRole = {
  id: string;
  user_id: string;
  role: 'security_auditor' | 'support_operator' | 'billing_operator' | 'marketplace_reviewer';
  created_at: string;
};

export type PlatformAnalyticsSnapshot = {
  id: string;
  snapshot_window: string;
  snapshot_start: string;
  snapshot_end: string;
  total_events: number;
  blocked_events: number;
  denied_events: number;
  high_risk_events: number;
  entitlement_allowed: number;
  entitlement_denied: number;
  open_alerts: number;
  critical_open_alerts: number;
  usage_pressure_count: number;
  created_at: string;
};

export type PlatformDriftCheck = {
  id: string;
  check_key: string;
  status: 'ok' | 'warning' | 'critical';
  observed_value: number;
  threshold_value: number;
  window_start: string;
  window_end: string;
  alert_id: string | null;
  created_at: string;
};

export type PendingPaymentAttemptRow = {
  attempt_id: string;
  company_id: string;
  subscription_id: string;
  gateway: 'paystack' | 'flutterwave';
  payment_status: 'pending' | 'processing';
  pending_verification_count: number;
  last_pending_verification_at: string | null;
  last_pending_provider_status: string | null;
  last_pending_reference: string | null;
  updated_at: string;
};

export type PendingVerificationHealthRow = {
  company_id: string;
  pending_attempt_count: number;
  max_pending_verification_count: number;
  oldest_pending_verification_at: string | null;
  latest_pending_verification_at: string | null;
};

export type PlatformPhase10RunResult = {
  snapshot_id: string;
  window_start: string;
  window_end: string;
  total_events: number;
  entitlement_denial_rate: number;
  high_risk_rate: number;
  critical_open_alerts: number;
  usage_pressure_count: number;
  webhook_dead_letters: number;
  correlation_id: string;
};

export type GovernanceAlertStatus = GovernanceAlert['status'];

export type CompanyDirectoryRecord = {
  id: string;
  name: string | null;
  email: string | null;
};

export type UserDirectoryRecord = {
  user_id: string;
  name: string | null;
  email: string | null;
};

export type PaginatedDirectoryResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type CompanyAdminSnapshot = {
  company: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    owner_id: string | null;
    created_at: string | null;
    updated_at: string | null;
    is_verified: boolean | null;
  };
  portfolio: {
    property_count: number;
    unit_count: number;
    tenant_count: number;
    active_member_count: number;
  };
  operations: {
    open_alert_count: number;
    abuse_signal_count: number;
    risk_decision_count: number;
  };
  billing: {
    active_subscription_count: number;
    active_addon_count: number;
  };
};

export type BillingCatalogProduct = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type BillingCatalogPlan = {
  id: string;
  code: string;
  name: string;
  tier: string;
  description: string | null;
  product_id: string;
  product_code: string;
  product_name: string;
  product_sort_order: number;
  plan_sort_order: number;
  amount_minor: number | null;
  currency_code: string | null;
  billing_interval: string | null;
};

export type BillingCatalogAddon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  attach_scope: string;
  sort_order: number;
  amount_minor: number | null;
  currency_code: string | null;
  billing_interval: string | null;
};

export type BillingCatalog = {
  products: BillingCatalogProduct[];
  plans: BillingCatalogPlan[];
  addons: BillingCatalogAddon[];
};

export type CompanyBillingContext = {
  subscriptions: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  payment_attempts: Array<Record<string, unknown>>;
  subscription_events: Array<Record<string, unknown>>;
  subscription_change_log: Array<Record<string, unknown>>;
  addons: Array<Record<string, unknown>>;
};

export type RevenueMetrics = {
  currency_code: string;
  mrr_minor: number;
  addon_mrr_minor: number;
  arr_minor: number;
  open_invoices_minor: number;
  open_invoice_count: number;
  failed_attempt_count_30d: number;
  active_companies: number;
  dunning_companies: number;
  quota_pressure_companies_7d: number;
  plan_mix: Array<{
    plan_code: string;
    plan_name: string;
    plan_tier: string;
    active_subscriptions: number;
  }>;
};

export type EntitlementOverrideRow = {
  id: string;
  company_id: string;
  entitlement_key: string;
  decision: 'allow' | 'deny';
  reason: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
};

export type ActiveSuspensionRow = {
  id: string;
  principal_type: 'company' | 'user';
  principal_id: string;
  reason: string;
  created_by: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type ImpersonationSessionRow = {
  id: string;
  session_id: string;
  actor_user_id: string;
  target_user_id: string;
  company_id: string | null;
  reason: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type RiskQueueRow = {
  row_type: 'governance_alert' | 'abuse_signal' | 'risk_decision';
  row_id: string;
  company_id: string | null;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  title: string;
  detail: string;
  score: number;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
};

export type RiskTriageActionRow = {
  id: string;
  row_type: 'governance_alert' | 'abuse_signal' | 'risk_decision';
  row_id: string;
  triage_status: 'acknowledged' | 'resolved' | 'escalated' | 'false_positive';
  company_id: string | null;
  actor_user_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type SessionRevocationHistoryRow = {
  id: string;
  created_at: string;
  result_status: 'success' | 'warning' | 'blocked' | 'denied' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  company_id: string | null;
  actor_user_id: string | null;
  correlation_id: string | null;
  principal_type: 'company' | 'user' | string | null;
  principal_id: string | null;
  revoked_sessions: number;
  revoked_impersonation_sessions: number;
  reason: string | null;
  module: string;
  action: string;
};

export type EntitlementKeyCatalogRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string;
};

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, (match) => `\\${match}`);
}

export function useControlPlaneEvents(limit = 100) {
  return useQuery({
    queryKey: ['control-plane-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_events' as never)
        .select('id, source, event_type, module, action, severity, result_status, actor_user_id, company_id, correlation_id, risk_score, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as ControlPlaneEvent[];
    },
  });
}

export function useControlPlaneAlerts(limit = 100) {
  return useQuery({
    queryKey: ['control-plane-alerts', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('governance_alerts' as never)
        .select('id, severity, status, alert_type, title, description, company_id, correlation_id, metadata, created_at, updated_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as GovernanceAlert[];
    },
  });
}

export function useEntitlementDecisions(limit = 100) {
  return useQuery({
    queryKey: ['entitlement-decisions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entitlement_decisions' as never)
        .select('id, company_id, actor_user_id, module, action, entitlement_key, allowed, decision_reason, correlation_id, risk_score, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as EntitlementDecision[];
    },
  });
}

export function useUsageSnapshots(limit = 100) {
  return useQuery({
    queryKey: ['usage-snapshots', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_snapshots' as never)
        .select('id, company_id, product_code, quota_code, used_value, soft_limit, hard_limit, remaining, usage_percent, limit_state, snapshot_at')
        .order('snapshot_at', { ascending: false })
        .limit(limit);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as UsageSnapshot[];
    },
  });
}

export function usePlatformOperatorRoles(limit = 200) {
  return useQuery({
    queryKey: ['platform-operator-roles', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_operator_roles' as never)
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as PlatformOperatorRole[];
    },
  });
}

export function usePlatformAnalyticsSnapshots(limit = 20) {
  return useQuery({
    queryKey: ['platform-analytics-snapshots', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_analytics_snapshots' as never)
        .select('id, snapshot_window, snapshot_start, snapshot_end, total_events, blocked_events, denied_events, high_risk_events, entitlement_allowed, entitlement_denied, open_alerts, critical_open_alerts, usage_pressure_count, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as PlatformAnalyticsSnapshot[];
    },
  });
}

export function usePlatformDriftChecks(limit = 50) {
  return useQuery({
    queryKey: ['platform-drift-checks', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_drift_checks' as never)
        .select('id, check_key, status, observed_value, threshold_value, window_start, window_end, alert_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as PlatformDriftCheck[];
    },
  });
}

export function useCompanyDirectory(page: number, pageSize = 20, search = '') {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));

  return useQuery({
    queryKey: ['control-plane-company-directory', safePage, safePageSize, search],
    queryFn: async (): Promise<PaginatedDirectoryResult<CompanyDirectoryRecord>> => {
      const from = (safePage - 1) * safePageSize;
      const to = from + safePageSize - 1;

      let query = supabase
        .from('companies' as never)
        .select('id, name, email', { count: 'exact' })
        .order('name', { ascending: true, nullsFirst: false })
        .range(from, to);

      const trimmed = search.trim();
      if (trimmed.length > 0) {
        const term = `%${escapeLike(trimmed)}%`;
        query = query.or(`id.ilike.${term},name.ilike.${term},email.ilike.${term}`);
      }

      const { data, error, count } = await query;

      if (error && isMissingControlPlaneBackendObject(error)) {
        return {
          rows: [],
          page: safePage,
          pageSize: safePageSize,
          totalCount: 0,
        };
      }
      if (error) throw error;

      return {
        rows: (data || []) as CompanyDirectoryRecord[],
        page: safePage,
        pageSize: safePageSize,
        totalCount: count || 0,
      };
    },
  });
}

export function useUserDirectory(page: number, pageSize = 20, search = '') {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(5, pageSize));

  return useQuery({
    queryKey: ['control-plane-user-directory', safePage, safePageSize, search],
    queryFn: async (): Promise<PaginatedDirectoryResult<UserDirectoryRecord>> => {
      const from = (safePage - 1) * safePageSize;
      const to = from + safePageSize - 1;

      let query = supabase
        .from('profiles' as never)
        .select('user_id, name, email', { count: 'exact' })
        .order('name', { ascending: true, nullsFirst: false })
        .range(from, to);

      const trimmed = search.trim();
      if (trimmed.length > 0) {
        const term = `%${escapeLike(trimmed)}%`;
        query = query.or(`user_id.ilike.${term},name.ilike.${term},email.ilike.${term}`);
      }

      const { data, error, count } = await query;

      if (error && isMissingControlPlaneBackendObject(error)) {
        return {
          rows: [],
          page: safePage,
          pageSize: safePageSize,
          totalCount: 0,
        };
      }
      if (error) throw error;

      return {
        rows: (data || []) as UserDirectoryRecord[],
        page: safePage,
        pageSize: safePageSize,
        totalCount: count || 0,
      };
    },
  });
}

export function useCompanyAdminSnapshot(companyId: string | null) {
  return useQuery({
    queryKey: ['control-plane-company-admin-snapshot', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyAdminSnapshot> => {
      const { data, error } = await supabase.rpc('platform_get_company_admin_snapshot' as never, {
        p_company_id: companyId,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) {
        return emptyCompanyAdminSnapshot(companyId);
      }
      if (error) throw error;
      return (data || emptyCompanyAdminSnapshot(companyId)) as CompanyAdminSnapshot;
    },
  });
}

export function useCompanyBillingContext(companyId: string | null, limit = 25) {
  return useQuery({
    queryKey: ['control-plane-company-billing-context', companyId, limit],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyBillingContext> => {
      const { data, error } = await supabase.rpc('platform_get_company_billing_context' as never, {
        p_company_id: companyId,
        p_limit: limit,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) {
        return {
          subscriptions: [],
          invoices: [],
          payment_attempts: [],
          subscription_events: [],
          subscription_change_log: [],
          addons: [],
        } as CompanyBillingContext;
      }
      if (error) throw error;
      return (data || {
        subscriptions: [],
        invoices: [],
        payment_attempts: [],
        subscription_events: [],
        subscription_change_log: [],
        addons: [],
      }) as CompanyBillingContext;
    },
  });
}

export function useBillingCatalog() {
  return useQuery({
    queryKey: ['control-plane-billing-catalog'],
    queryFn: async (): Promise<BillingCatalog> => {
      const { data, error } = await supabase.rpc('platform_get_billing_catalog' as never);

      if (error) {
        // Some environments may not have monetization RPCs deployed yet.
        // Return empty catalog so the control-plane UI can degrade gracefully.
        return { products: [], plans: [], addons: [] };
      }
      return (data || { products: [], plans: [], addons: [] }) as BillingCatalog;
    },
  });
}

export function useRevenueMetrics(currencyCode = 'USD') {
  return useQuery({
    queryKey: ['control-plane-revenue-metrics', currencyCode],
    queryFn: async (): Promise<RevenueMetrics> => {
      const { data, error } = await supabase.rpc('platform_get_revenue_metrics' as never, {
        p_currency_code: currencyCode,
      } as never);

      if (error) {
        return {
          currency_code: currencyCode,
          mrr_minor: 0,
          addon_mrr_minor: 0,
          arr_minor: 0,
          open_invoices_minor: 0,
          open_invoice_count: 0,
          failed_attempt_count_30d: 0,
          active_companies: 0,
          dunning_companies: 0,
          quota_pressure_companies_7d: 0,
          plan_mix: [],
        } as RevenueMetrics;
      }
      return (data || {
        currency_code: currencyCode,
        mrr_minor: 0,
        addon_mrr_minor: 0,
        arr_minor: 0,
        open_invoices_minor: 0,
        open_invoice_count: 0,
        failed_attempt_count_30d: 0,
        active_companies: 0,
        dunning_companies: 0,
        quota_pressure_companies_7d: 0,
        plan_mix: [],
      }) as RevenueMetrics;
    },
  });
}

export function useEntitlementOverrides(companyId: string | null = null, onlyActive = true, limit = 200) {
  return useQuery({
    queryKey: ['control-plane-entitlement-overrides', companyId, onlyActive, limit],
    queryFn: async (): Promise<EntitlementOverrideRow[]> => {
      const { data, error } = await supabase.rpc('platform_list_entitlement_overrides' as never, {
        p_company_id: companyId,
        p_only_active: onlyActive,
        p_limit: limit,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as EntitlementOverrideRow[];
    },
  });
}

export function useSetEntitlementOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      entitlementKey: string;
      decision: 'allow' | 'deny';
      reason: string;
      expiresAt?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_set_entitlement_override' as never, {
        p_company_id: input.companyId,
        p_entitlement_key: input.entitlementKey,
        p_decision: input.decision,
        p_reason: input.reason,
        p_expires_at: input.expiresAt || null,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-entitlement-overrides'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-company-admin-snapshot', variables.companyId] }),
      ]);
    },
  });
}

export function useRevokeEntitlementOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      overrideId: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_revoke_entitlement_override' as never, {
        p_override_id: input.overrideId,
        p_reason: input.reason || null,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['control-plane-entitlement-overrides'] });
    },
  });
}

export function useActiveSuspensions(principalType: 'company' | 'user' | 'all' = 'all', limit = 200) {
  const rpcType = principalType === 'all' ? null : principalType;

  return useQuery({
    queryKey: ['control-plane-active-suspensions', principalType, limit],
    queryFn: async (): Promise<ActiveSuspensionRow[]> => {
      const { data, error } = await supabase.rpc('platform_list_active_suspensions' as never, {
        p_principal_type: rpcType,
        p_limit: limit,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as ActiveSuspensionRow[];
    },
  });
}

export function useSetPrincipalSuspension() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      principalType: 'company' | 'user';
      principalId: string;
      suspend: boolean;
      reason: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_set_principal_suspension' as never, {
        p_principal_type: input.principalType,
        p_principal_id: input.principalId,
        p_suspend: input.suspend,
        p_reason: input.reason,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-active-suspensions'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-risk-queue'] }),
      ]);
    },
  });
}

export function useImpersonationSessions(onlyActive = true, limit = 100) {
  return useQuery({
    queryKey: ['control-plane-impersonation-sessions', onlyActive, limit],
    queryFn: async (): Promise<ImpersonationSessionRow[]> => {
      const { data, error } = await supabase.rpc('platform_list_impersonation_sessions' as never, {
        p_only_active: onlyActive,
        p_limit: limit,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as ImpersonationSessionRow[];
    },
  });
}

export function useStartImpersonationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      targetUserId: string;
      companyId?: string | null;
      reason: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_start_impersonation_session' as never, {
        p_target_user_id: input.targetUserId,
        p_company_id: input.companyId || null,
        p_reason: input.reason,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-impersonation-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-events'] }),
      ]);
    },
  });
}

export function useStopImpersonationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      impersonationSessionId: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_stop_impersonation_session' as never, {
        p_impersonation_session_id: input.impersonationSessionId,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-impersonation-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-events'] }),
      ]);
    },
  });
}

export function useRiskQueue(companyId: string | null = null, limit = 200) {
  return useQuery({
    queryKey: ['control-plane-risk-queue', companyId, limit],
    queryFn: async (): Promise<RiskQueueRow[]> => {
      const { data, error } = await supabase.rpc('platform_get_risk_queue' as never, {
        p_company_id: companyId,
        p_limit: limit,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as RiskQueueRow[];
    },
  });
}

export function useRiskQueueTriageActions(companyId: string | null = null, limit = 200) {
  return useQuery({
    queryKey: ['control-plane-risk-triage-actions', companyId, limit],
    queryFn: async (): Promise<RiskTriageActionRow[]> => {
      let query = supabase
        .from('platform_risk_queue_triage_actions' as never)
        .select('id, row_type, row_id, triage_status, company_id, actor_user_id, notes, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error && isMissingControlPlaneBackendObject(error)) return [];
      if (error) throw error;
      return (data || []) as RiskTriageActionRow[];
    },
  });
}

export function useRiskQueueTriageActionsPage(input: {
  companyId?: string | null;
  actorUserId?: string | null;
  triageStatus?: 'all' | 'acknowledged' | 'resolved' | 'escalated' | 'false_positive';
  createdAfter?: string | null;
  createdBefore?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, input.page || 1);
  const safePageSize = Math.min(100, Math.max(5, input.pageSize || 20));
  const triageStatus = input.triageStatus || 'all';

  return useQuery({
    queryKey: [
      'control-plane-risk-triage-actions-page',
      input.companyId || null,
      input.actorUserId || null,
      triageStatus,
      input.createdAfter || null,
      input.createdBefore || null,
      safePage,
      safePageSize,
    ],
    queryFn: async (): Promise<PaginatedDirectoryResult<RiskTriageActionRow>> => {
      const { data, error } = await supabase.rpc('platform_get_risk_queue_triage_actions_page' as never, {
        p_company_id: input.companyId || null,
        p_actor_user_id: input.actorUserId || null,
        p_triage_status: triageStatus === 'all' ? null : triageStatus,
        p_created_after: input.createdAfter || null,
        p_created_before: input.createdBefore || null,
        p_page: safePage,
        p_page_size: safePageSize,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) {
        return {
          rows: [],
          page: safePage,
          pageSize: safePageSize,
          totalCount: 0,
        };
      }
      if (error) throw error;

      const payload = (data || {}) as {
        rows?: RiskTriageActionRow[];
        page?: number;
        page_size?: number;
        total_count?: number;
      };

      return {
        rows: payload.rows || [],
        page: payload.page || safePage,
        pageSize: payload.page_size || safePageSize,
        totalCount: payload.total_count || 0,
      };
    },
  });
}

export function useSessionRevocationHistoryPage(input: {
  companyId?: string | null;
  actorUserId?: string | null;
  principalType?: 'all' | 'company' | 'user';
  createdAfter?: string | null;
  createdBefore?: string | null;
  resultStatus?: 'all' | 'success' | 'warning' | 'blocked' | 'denied' | 'error';
  severity?: 'all' | 'info' | 'warning' | 'error' | 'critical';
  correlationId?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const safePage = Math.max(1, input.page || 1);
  const safePageSize = Math.min(200, Math.max(10, input.pageSize || 50));
  const principalType = input.principalType || 'all';
  const resultStatus = input.resultStatus || 'all';
  const severity = input.severity || 'all';

  return useQuery({
    queryKey: [
      'control-plane-session-revocation-history-page',
      input.companyId || null,
      input.actorUserId || null,
      principalType,
      input.createdAfter || null,
      input.createdBefore || null,
      resultStatus,
      severity,
      input.correlationId || null,
      safePage,
      safePageSize,
    ],
    queryFn: async (): Promise<PaginatedDirectoryResult<SessionRevocationHistoryRow>> => {
      const { data, error } = await supabase.rpc('platform_get_session_revocation_history_page' as never, {
        p_company_id: input.companyId || null,
        p_actor_user_id: input.actorUserId || null,
        p_principal_type: principalType === 'all' ? null : principalType,
        p_created_after: input.createdAfter || null,
        p_created_before: input.createdBefore || null,
        p_result_status: resultStatus === 'all' ? null : resultStatus,
        p_severity: severity === 'all' ? null : severity,
        p_correlation_id: input.correlationId || null,
        p_page: safePage,
        p_page_size: safePageSize,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) {
        return {
          rows: [],
          page: safePage,
          pageSize: safePageSize,
          totalCount: 0,
        };
      }
      if (error) throw error;

      const payload = (data || {}) as {
        rows?: SessionRevocationHistoryRow[];
        page?: number;
        page_size?: number;
        total_count?: number;
      };

      return {
        rows: payload.rows || [],
        page: payload.page || safePage,
        pageSize: payload.page_size || safePageSize,
        totalCount: payload.total_count || 0,
      };
    },
  });
}

export function useTriageRiskQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      rowType: 'governance_alert' | 'abuse_signal' | 'risk_decision';
      rowId: string;
      triageStatus: 'acknowledged' | 'resolved' | 'escalated' | 'false_positive';
      notes?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_triage_risk_queue_item' as never, {
        p_row_type: input.rowType,
        p_row_id: input.rowId,
        p_triage_status: input.triageStatus,
        p_notes: input.notes || null,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-risk-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-events'] }),
      ]);
    },
  });
}

export function useRevokeActivePlatformSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      principalType: 'company' | 'user';
      principalId: string;
      reason: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_revoke_active_platform_sessions' as never, {
        p_principal_type: input.principalType,
        p_principal_id: input.principalId,
        p_reason: input.reason,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as {
        applied: boolean;
        revoked_sessions: number;
        revoked_impersonation_sessions: number;
      };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-impersonation-sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-events'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-session-revocation-history-page'] }),
      ]);
    },
  });
}

export function useEntitlementKeyCatalog(limit = 500) {
  return useQuery({
    queryKey: ['control-plane-entitlement-key-catalog', limit],
    queryFn: async (): Promise<EntitlementKeyCatalogRow[]> => {
      const { data, error } = await supabase
        .from('saas_entitlement_keys' as never)
        .select('id, key, name, description, module')
        .order('module', { ascending: true })
        .order('name', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []) as EntitlementKeyCatalogRow[];
    },
  });
}

export function usePendingPaymentAttempts(limit = 100, companyId: string | null = null) {
  return useQuery({
    queryKey: ['pending-payment-attempts', companyId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('saas_get_pending_payment_attempts' as never, {
        p_company_id: companyId,
        p_limit: limit,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) return [] as PendingPaymentAttemptRow[];
      if (error) throw error;
      return (data || []) as PendingPaymentAttemptRow[];
    },
  });
}

export function usePendingVerificationHealth(limit = 100, companyId: string | null = null) {
  return useQuery({
    queryKey: ['pending-verification-health', companyId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('saas_get_pending_verification_health' as never, {
        p_company_id: companyId,
        p_limit: limit,
      } as never);

      if (error && isMissingControlPlaneBackendObject(error)) return [] as PendingVerificationHealthRow[];
      if (error) throw error;
      return (data || []) as PendingVerificationHealthRow[];
    },
  });
}

export function useRunPlatformPhase10() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('platform_phase10_run_all' as never, {
        p_window: '24 hours',
        p_emit_alerts: true,
      } as never);

      if (error) throw error;
      return data as unknown as PlatformPhase10RunResult;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform-analytics-snapshots'] }),
        queryClient.invalidateQueries({ queryKey: ['platform-drift-checks'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-events'] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-alerts'] }),
      ]);
    },
  });
}

export function useUpdateGovernanceAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: GovernanceAlertStatus;
    }) => {
      const resolvedAt = input.status === 'resolved' ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('governance_alerts' as never)
        .update({ status: input.status, resolved_at: resolvedAt } as never)
        .eq('id', input.id);

      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['control-plane-alerts'] });
    },
  });
}

export function useAssignPlatformOperatorRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      role: PlatformOperatorRole['role'];
    }) => {
      const { error } = await supabase
        .from('platform_operator_roles' as never)
        .insert({ user_id: input.userId, role: input.role } as never);

      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-operator-roles'] });
    },
  });
}

export function useAdminChangeCompanyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      productCode: string;
      newPlanCode: string;
      currencyCode?: string;
      reason?: string;
      correlationId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_admin_change_company_plan' as never, {
        p_company_id: input.companyId,
        p_product_code: input.productCode,
        p_new_plan_code: input.newPlanCode,
        p_currency_code: input.currencyCode || 'USD',
        p_reason: input.reason || null,
        p_correlation_id: input.correlationId || null,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-company-admin-snapshot', variables.companyId] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-company-billing-context', variables.companyId] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-revenue-metrics'] }),
      ]);
    },
  });
}

export function useAdminSetCompanyAddonStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      companyId: string;
      addonCode: string;
      enabled: boolean;
      notes?: string;
      trialEndAt?: string | null;
      endAt?: string | null;
      correlationId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('platform_admin_set_company_addon_status' as never, {
        p_company_id: input.companyId,
        p_addon_code: input.addonCode,
        p_enabled: input.enabled,
        p_notes: input.notes || null,
        p_trial_end_at: input.trialEndAt || null,
        p_end_at: input.endAt || null,
        p_correlation_id: input.correlationId || null,
        p_metadata: input.metadata || {},
      } as never);

      if (error) throw error;
      return data as unknown as Record<string, unknown>;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['control-plane-company-admin-snapshot', variables.companyId] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-company-billing-context', variables.companyId] }),
        queryClient.invalidateQueries({ queryKey: ['control-plane-revenue-metrics'] }),
      ]);
    },
  });
}

export function useRemovePlatformOperatorRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_operator_roles' as never)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-operator-roles'] });
    },
  });
}
