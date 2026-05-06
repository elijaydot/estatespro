import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';

export interface RecurringBill {
  id: string;
  property_id: string | null;
  tenant_id: string | null;
  name: string;
  bill_type: string;
  amount: number;
  frequency: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useRecurringBills(propertyId?: string, tenantId?: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['recurring_bills', propertyId, tenantId, activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('recurring_bills')
        .select(`
          *,
          properties:property_id(id, name),
          tenants:tenant_id(id, name)
        `)
        .order('created_at', { ascending: false });

      if (activeCompanyId) {
        const { data: scopedProperties, error: scopedPropertiesError } = await supabase
          .from('properties')
          .select('id')
          .eq('company_id', activeCompanyId);

        if (scopedPropertiesError) throw scopedPropertiesError;

        const propertyIds = (scopedProperties || []).map((property) => property.id);
        if (propertyIds.length === 0) {
          return [];
        }

        query = query.in('property_id', propertyIds);
      }

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRecurringBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: Omit<RecurringBill, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('recurring_bills')
        .insert({ ...bill, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_bills'] });
      toast({ title: 'Success', description: 'Recurring bill created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRecurringBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...bill }: Partial<RecurringBill> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_bills')
        .update(bill)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_bills'] });
      toast({ title: 'Success', description: 'Recurring bill updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteRecurringBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_bills'] });
      toast({ title: 'Success', description: 'Recurring bill deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
