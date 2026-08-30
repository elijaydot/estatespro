import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export type OperationalAlertType =
  | 'lease_expiry'
  | 'vacant_unit'
  | 'overdue_payment'
  | 'vendor_document_expiring'
  | 'listing_deal_closed';

export type OperationalAlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface OperationalAlert {
  id: string;
  company_id: string;
  alert_type: OperationalAlertType;
  severity: 'info' | 'warning' | 'critical';
  status: OperationalAlertStatus;
  title: string;
  description: string | null;
  reference_table: 'leases' | 'units' | 'invoices' | 'vendor_documents' | 'marketplace_listings';
  reference_id: string;
  metadata: Record<string, unknown>;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertThreshold {
  id?: string;
  company_id: string;
  alert_type: OperationalAlertType;
  threshold_days: number;
  enabled: boolean;
}

export const DEFAULT_ALERT_THRESHOLDS: Partial<Record<OperationalAlertType, number>> = {
  lease_expiry: 30,
  vacant_unit: 14,
  overdue_payment: 0,
  vendor_document_expiring: 30,
};

const alertsKey = (companyId: string | null) => ['operational-alerts', companyId] as const;
const openCountKey = (companyId: string | null) => ['operational-alerts', companyId, 'open-count'] as const;
const thresholdsKey = (companyId: string | null) => ['alert-thresholds', companyId] as const;

function useAlertRealtime() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activeCompanyId) return;

    const channel = supabase
      .channel(`operational-alerts-${activeCompanyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_alerts',
          ...(activeCompanyId !== 'all' ? { filter: `company_id=eq.${activeCompanyId}` } : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: alertsKey(activeCompanyId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompanyId, queryClient]);
}

export function useOperationalAlerts(status?: OperationalAlertStatus | 'active') {
  const { activeCompanyId } = useActiveCompany();
  useAlertRealtime();

  return useQuery({
    queryKey: [...alertsKey(activeCompanyId), status ?? 'all'],
    enabled: Boolean(activeCompanyId),
    queryFn: async () => {
      let query = supabase
        .from('operational_alerts' as never)
        .select('*, companies:company_id(id, name)' as never)
        .order('created_at', { ascending: false });

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId as string);
      }

      if (status === 'active') query = query.in('status', ['open', 'acknowledged']);
      else if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as OperationalAlert[];
    },
  });
}

export function useOpenOperationalAlertCount() {
  const { activeCompanyId } = useActiveCompany();
  useAlertRealtime();

  return useQuery({
    queryKey: openCountKey(activeCompanyId),
    enabled: Boolean(activeCompanyId),
    queryFn: async () => {
      let query = supabase
        .from('operational_alerts' as never)
        .select('*' as never, { count: 'exact', head: true })
        .in('status', ['open', 'acknowledged']);

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId as string);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useUpdateAlertStatus(status: 'acknowledged' | 'resolved' | 'dismissed') {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const payload: Record<string, string | null> = { status };
      if (status === 'acknowledged') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        payload.acknowledged_by = user.id;
        payload.acknowledged_at = new Date().toISOString();
      }
      if (status === 'resolved') payload.resolved_at = new Date().toISOString();

      let query = supabase
        .from('operational_alerts' as never)
        .update(payload as never)
        .eq('id', id);

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId as string);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: alertsKey(activeCompanyId) }),
    onError: (error: Error) => toast({ title: 'Alert update failed', description: error.message, variant: 'destructive' }),
  });
}

export function useAcknowledgeOperationalAlert() {
  return useUpdateAlertStatus('acknowledged');
}

export function useAcknowledgeOperationalAlerts() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!activeCompanyId || ids.length === 0) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('operational_alerts' as never)
        .update({
          status: 'acknowledged',
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        } as never)
        .eq('company_id', activeCompanyId)
        .eq('status', 'open')
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: alertsKey(activeCompanyId) });
      toast({ title: 'Alerts acknowledged', description: `${ids.length} alert${ids.length === 1 ? '' : 's'} updated.` });
    },
    onError: (error: Error) => toast({ title: 'Bulk update failed', description: error.message, variant: 'destructive' }),
  });
}

export function useDismissOperationalAlert() {
  return useUpdateAlertStatus('dismissed');
}

export function useResolveOperationalAlert() {
  return useUpdateAlertStatus('resolved');
}

export function useAlertThresholds() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: thresholdsKey(activeCompanyId),
    enabled: Boolean(activeCompanyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_thresholds' as never)
        .select('*' as never)
        .eq('company_id', activeCompanyId as string);
      if (error) throw error;
      return data as unknown as AlertThreshold[];
    },
  });
}

export function useUpsertAlertThreshold() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threshold: Omit<AlertThreshold, 'id' | 'company_id'>) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { error } = await supabase
        .from('alert_thresholds' as never)
        .upsert({ ...threshold, company_id: activeCompanyId } as never, { onConflict: 'company_id,alert_type' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: thresholdsKey(activeCompanyId) }),
    onError: (error: Error) => toast({ title: 'Threshold update failed', description: error.message, variant: 'destructive' }),
  });
}

export function useEvaluateOperationalAlerts() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { data, error } = await supabase.functions.invoke('evaluate-operational-alerts', {
        body: { companyId: activeCompanyId },
      });
      if (error) throw error;
      return data as { success: boolean; result: { created: number; resolved: number } };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: alertsKey(activeCompanyId) });
      toast({
        title: 'Alerts refreshed',
        description: `${data.result.created} created, ${data.result.resolved} resolved`,
      });
    },
    onError: (error: Error) => toast({ title: 'Alert refresh failed', description: error.message, variant: 'destructive' }),
  });
}