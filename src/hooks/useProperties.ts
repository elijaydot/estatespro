import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { assertQuotaAvailable } from '@/lib/saasGuards';

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  type: string;
  description: string | null;
  total_units: number;
  occupied_units: number;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useProperties() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['properties', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const query = supabase
        .from('properties')
        .select('*')
        .eq('company_id', activeCompanyId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data as Property[];
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useProperty(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['properties', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');

      const query = supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('company_id', activeCompanyId);

      const { data, error } = await query.single();

      if (error) throw error;
      return data as Property;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (property: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { company_id?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!activeCompanyId) throw new Error('Select a company first');
      if (property.company_id && property.company_id !== activeCompanyId) {
        throw new Error('Property company must match the active company');
      }

      await assertQuotaAvailable({
        companyId: activeCompanyId,
        quotaCode: 'properties_managed',
        requestedDelta: 1,
      });

      const { data, error } = await supabase
        .from('properties')
        .insert({ ...property, user_id: user.id, company_id: activeCompanyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Success', description: 'Property created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async ({ id, ...property }: Partial<Property> & { id: string }) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { data, error } = await supabase
        .from('properties')
        .update(property)
        .eq('id', id)
        .eq('company_id', activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', variables.id] });
      toast({ title: 'Success', description: 'Property updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
        .eq('company_id', activeCompanyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Success', description: 'Property deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
