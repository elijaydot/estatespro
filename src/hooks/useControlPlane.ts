import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  role: 'security_auditor' | 'support_operator' | 'billing_operator';
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

export function useControlPlaneEvents(limit = 100) {
  return useQuery({
    queryKey: ['control-plane-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_events' as never)
        .select('id, source, event_type, module, action, severity, result_status, actor_user_id, company_id, correlation_id, risk_score, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

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
        .select('id, severity, status, alert_type, title, description, company_id, correlation_id, created_at, updated_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(limit);

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

      if (error) throw error;
      return (data || []) as PlatformDriftCheck[];
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
        .insert({ user_id: input.userId, role: input.role });

      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-operator-roles'] });
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
