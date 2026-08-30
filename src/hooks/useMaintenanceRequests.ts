import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { createCorrelationId, emitAuditEvent } from '@/lib/auditEvents';

export interface MaintenanceRequest {
  actual_cost: number | null;
  id: string;
  title: string;
  description: string;
  estimated_cost: number | null;
  unit_id: string;
  property_id: string | null;
  tenant_id: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  vendor_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useMaintenanceRequests() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['maintenance_requests', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          units:unit_id(id, unit_number, property_id),
          ${propertiesRelation},
          tenants:tenant_id(id, name, email),
          vendors:vendor_id(id, name)
        `);

      if (!isGlobal) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useMaintenanceRequest(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['maintenance_requests', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          units:unit_id(id, unit_number),
          ${propertiesRelation},
          tenants:tenant_id(id, name, email),
          vendors:vendor_id(id, name)
        `)
        .eq('id', id);

      if (!isGlobal) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<MaintenanceRequest, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({ ...request, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await emitAuditEvent({
        source: 'maintenance_requests',
        eventType: 'maintenance.request.created',
        severity: 'info',
        entityType: 'maintenance_request',
        entityId: data.id,
        actorUserId: user.id,
        correlationId: createCorrelationId('maintenance-create'),
        details: {
          property_id: data.property_id,
          unit_id: data.unit_id,
          tenant_id: data.tenant_id,
          priority: data.priority,
          status: data.status,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
      toast({ title: 'Success', description: 'Maintenance request created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...request }: Partial<MaintenanceRequest> & { id: string }) => {
      const { data: previousRow, error: previousError } = await supabase
        .from('maintenance_requests')
        .select('status, assigned_to, vendor_id, priority')
        .eq('id', id)
        .single();

      if (previousError) throw previousError;

      const { data, error } = await supabase
        .from('maintenance_requests')
        .update(request)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        data,
        previousStatus: previousRow.status,
        previousAssignedTo: previousRow.assigned_to,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests', variables.id] });

      const nextStatus = result.data.status;
      const previousStatus = result.previousStatus;
      const statusChanged = previousStatus !== nextStatus;

      void emitAuditEvent({
        source: 'maintenance_requests',
        eventType: statusChanged ? 'maintenance.request.status_changed' : 'maintenance.request.updated',
        severity: 'info',
        entityType: 'maintenance_request',
        entityId: variables.id,
        correlationId: createCorrelationId('maintenance-update'),
        details: {
          previous_status: previousStatus,
          next_status: nextStatus,
          previous_assigned_to: result.previousAssignedTo,
          next_assigned_to: result.data.assigned_to,
          next_vendor_id: result.data.vendor_id,
          priority: result.data.priority,
        },
      });

      toast({ title: 'Success', description: 'Maintenance request updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
      toast({ title: 'Success', description: 'Maintenance request deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
