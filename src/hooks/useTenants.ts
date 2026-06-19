import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  emergency_contact: string | null;
  emergency_phone: string | null;
  employer: string | null;
  occupation: string | null;
  id_document: string | null;
  avatar_url: string | null;
  property_id: string | null;
  unit_id: string | null;
  move_in_date: string | null;
  lease_end_date: string | null;
  monthly_rent: number;
  security_deposit: number;
  balance: number;
  status: string;
  tenant_user_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useTenants() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['tenants', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('tenants')
        .select(`
          *,
          properties:property_id(id, name, company_id),
          units:unit_id(id, unit_number)
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

export function useTenant(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['tenants', id, activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('tenants')
        .select(`
          *,
          properties:property_id(id, name, company_id),
          units:unit_id(id, unit_number)
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

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tenants')
        .insert({ ...tenant, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Success', description: 'Tenant created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...tenant }: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update(tenant)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', variables.id] });
      toast({ title: 'Success', description: 'Tenant updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Success', description: 'Tenant deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
