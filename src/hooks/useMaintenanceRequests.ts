import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  unit_id: string;
  property_id: string | null;
  tenant_id: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
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
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          units:unit_id(id, unit_number, property_id),
          properties:property_id(id, name, company_id),
          tenants:tenant_id(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (activeCompanyId) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useMaintenanceRequest(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['maintenance_requests', id, activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          units:unit_id(id, unit_number),
          properties:property_id(id, name, company_id),
          tenants:tenant_id(id, name, email)
        `)
        .eq('id', id);

      if (activeCompanyId) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
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
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update(request)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests', variables.id] });
      toast({ title: 'Success', description: 'Maintenance request updated successfully' });
    },
    onError: (error) => {
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
