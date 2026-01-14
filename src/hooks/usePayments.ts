import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface Payment {
  id: string;
  invoice_id: string;
  tenant_id: string;
  amount: number;
  method: string;
  momo_phone: string | null;
  momo_transaction_id: string | null;
  reference: string | null;
  receipt_number: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  user_id: string;
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenants:tenant_id(id, name, email, property_id, unit_id),
          invoices:invoice_id(id, invoice_number, amount)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenants:tenant_id(id, name, email),
          invoices:invoice_id(id, invoice_number, amount)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'created_at' | 'user_id' | 'receipt_number'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payments')
        .insert({ 
          ...payment, 
          user_id: user.id 
        })
        .select()
        .single();

      if (error) throw error;

      // Update invoice paid_amount
      if (payment.status === 'completed') {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('paid_amount, amount')
          .eq('id', payment.invoice_id)
          .single();

        if (invoice) {
          const newPaidAmount = invoice.paid_amount + payment.amount;
          const newStatus = newPaidAmount >= invoice.amount ? 'paid' : 
                           newPaidAmount > 0 ? 'partial' : 'pending';
          
          await supabase
            .from('invoices')
            .update({ 
              paid_amount: newPaidAmount,
              status: newStatus,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : null
            })
            .eq('id', payment.invoice_id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Success', description: 'Payment recorded successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payment }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(payment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Success', description: 'Payment updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
