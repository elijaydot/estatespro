import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';

export interface Invoice {
  id: string;
  invoice_number: string;
  tenant_id: string | null;
  booking_id?: string | null;
  property_id: string | null;
  unit_id: string | null;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  guest_name?: string | null;
  guest_email?: string | null;
  source?: 'tenant' | 'shortlet_booking';
}

export function useInvoices() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['invoices', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('invoices')
        .select(`
          *,
          tenants:tenant_id(id, name, email),
          ${propertiesRelation},
          units:unit_id(id, unit_number)
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

export function useInvoice(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['invoices', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('invoices')
        .select(`
          *,
          tenants:tenant_id(id, name, email),
          ${propertiesRelation},
          units:unit_id(id, unit_number)
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

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'invoice_number'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invoices')
        .insert({ 
          ...invoice, 
          user_id: user.id,
          invoice_number: `INV-${Date.now()}`
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Success', description: 'Invoice created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...invoice }: Partial<Invoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(invoice)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.id] });
      toast({ title: 'Success', description: 'Invoice updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Success', description: 'Invoice deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
