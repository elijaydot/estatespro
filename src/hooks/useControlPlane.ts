import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ControlPlaneEvent = {
  id: string;
  source: string;
  event_type: string;
  module: string;
  action: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  result_status: 'success' | 'warning' | 'blocked' | 'denied' | 'error';
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
  module: string;
  action: string;
  entitlement_key: string;
  allowed: boolean;
  decision_reason: string | null;
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

export function useControlPlaneEvents(limit = 100) {
  return useQuery({
    queryKey: ['control-plane-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_audit_events' as never)
        .select('id, source, event_type, module, action, severity, result_status, company_id, correlation_id, risk_score, created_at')
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
        .select('id, company_id, module, action, entitlement_key, allowed, decision_reason, risk_score, created_at')
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
