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
        .select('id, severity, status, alert_type, title, description, company_id, correlation_id, created_at')
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
