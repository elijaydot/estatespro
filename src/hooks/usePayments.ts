import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';

export interface Payment {
  id: string;
  invoice_id: string;
  tenant_id: string | null;
  booking_id?: string | null;
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
  payer_name?: string | null;
  payer_email?: string | null;
  source?: 'tenant' | 'shortlet_booking';
}

export function usePayments() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['payments', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from('payments')
        .select(`
          *,
          tenants:tenant_id(id, name, email, property_id, unit_id),
          invoices:invoice_id!inner(id, invoice_number, amount, property_id, properties:property_id!inner(id, name, company_id, companies:company_id(id, name)))
        `);

      if (activeCompanyId !== 'all') {
        query = query.eq('invoices.properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function usePayment(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['payments', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      let query = supabase
        .from('payments')
        .select(`
          *,
          tenants:tenant_id(id, name, email),
          invoices:invoice_id!inner(id, invoice_number, amount, property_id, properties:property_id!inner(id, name, company_id, companies:company_id(id, name)))
        `)
        .eq('id', id);

      if (activeCompanyId !== 'all') {
        query = query.eq('invoices.properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export interface CreatePaymentInput {
  invoice_id: string;
  tenant_id: string;
  amount: number;
  method: string;
  momo_phone?: string | null;
  momo_transaction_id?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentInput {
  id: string;
  amount?: number;
  method?: string;
  momo_phone?: string | null;
  momo_transaction_id?: string | null;
  reference?: string | null;
  receipt_number?: string | null;
  status?: string;
  notes?: string | null;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: CreatePaymentInput) => {
      // Use the secure server-side process_payment function
      // This ensures atomic transaction, proper validation, and prevents race conditions
      const { data, error } = await supabase.rpc('process_payment', {
        p_invoice_id: payment.invoice_id,
        p_tenant_id: payment.tenant_id,
        p_amount: payment.amount,
        p_method: payment.method,
        p_momo_phone: payment.momo_phone || null,
        p_momo_transaction_id: payment.momo_transaction_id || null,
        p_reference: payment.reference || null,
        p_notes: payment.notes || null,
      });

      if (error) throw error;

      return data; // Returns the new payment ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Success', description: 'Payment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payment }: UpdatePaymentInput) => {
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
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
