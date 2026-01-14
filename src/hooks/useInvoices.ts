import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface Invoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
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
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          tenants:tenant_id(id, name, email),
          properties:property_id(id, name),
          units:unit_id(id, unit_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          tenants:tenant_id(id, name, email),
          properties:property_id(id, name),
          units:unit_id(id, unit_number)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
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
