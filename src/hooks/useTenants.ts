import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { assertQuotaAvailable, getCompanyIdForProperty } from '@/lib/saasGuards';

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
      if (!activeCompanyId) return [];
      let query = supabase
        .from('tenants')
        .select(`
          *,
          properties:property_id!inner(id, name, company_id, companies:company_id(id, name)),
          units:unit_id(id, unit_number)
        `);

      if (activeCompanyId !== 'all') {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useTenant(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['tenants', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      let query = supabase
        .from('tenants')
        .select(`
          *,
          properties:property_id!inner(id, name, company_id, companies:company_id(id, name)),
          units:unit_id(id, unit_number)
        `)
        .eq('id', id);

      if (activeCompanyId !== 'all') {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let companyId: string | null = activeCompanyId || null;
      if (tenant.property_id) {
        companyId = await getCompanyIdForProperty(tenant.property_id);
      }

      if (companyId) {
        await assertQuotaAvailable({
          companyId,
          quotaCode: 'active_tenants',
          requestedDelta: 1,
        });
      }

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
