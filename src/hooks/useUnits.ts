import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { assertQuotaAvailable, getCompanyIdForProperty } from '@/lib/saasGuards';

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent_amount: number;
  status: string;
  amenities: string[] | null;
  description: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useUnits(propertyId?: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['units', propertyId, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from('units')
        .select(`
          *,
          properties:property_id!inner(id, name, company_id)
        `)
        .eq('properties.company_id', activeCompanyId)
        .order('unit_number', { ascending: true });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useUnit(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['units', 'detail', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const query = supabase
        .from('units')
        .select(`
          *,
          properties:property_id!inner(id, name, company_id)
        `)
        .eq('id', id)
        .eq('properties.company_id', activeCompanyId);

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const companyId = await getCompanyIdForProperty(unit.property_id);
      await assertQuotaAvailable({
        companyId,
        quotaCode: 'units_managed',
        requestedDelta: 1,
      });

      const { data, error } = await supabase
        .from('units')
        .insert({ ...unit, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Unit created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...unit }: Partial<Unit> & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(unit)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['units', 'detail', variables.id] });
      toast({ title: 'Success', description: 'Unit updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Unit deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
