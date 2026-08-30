import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface VendorPayment {
  id: string;
  company_id: string;
  vendor_id: string;
  maintenance_request_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: string | null;
  reference_number: string | null;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type VendorPaymentInput = Pick<VendorPayment, 'vendor_id' | 'maintenance_request_id' | 'amount' | 'currency' | 'status' | 'payment_method' | 'reference_number' | 'paid_at' | 'notes'>;

const paymentsKey = (companyId: string | null, vendorId?: string) => ['vendor-payments', companyId, vendorId ?? 'all'] as const;

export function useVendorPayments(vendorId?: string) {
  const { activeCompanyId } = useActiveCompany();
  return useQuery({
    queryKey: paymentsKey(activeCompanyId, vendorId),
    enabled: Boolean(activeCompanyId),
    queryFn: async () => {
      let query = supabase
        .from('vendor_payments' as never)
        .select('*' as never)
        .order('created_at', { ascending: false });
      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId as string);
      }
      if (vendorId) query = query.eq('vendor_id', vendorId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as VendorPayment[];
    },
  });
}

export function useCreateVendorPayment() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VendorPaymentInput) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('vendor_payments' as never)
        .insert({ ...input, company_id: activeCompanyId, created_by: user.id } as never)
        .select('*' as never)
        .single();
      if (error) throw error;
      return data as unknown as VendorPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payments', activeCompanyId] });
      toast({ title: 'Payment recorded' });
    },
    onError: (error: Error) => toast({ title: 'Payment creation failed', description: error.message, variant: 'destructive' }),
  });
}

export function useUpdateVendorPayment() {
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<VendorPaymentInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('vendor_payments' as never)
        .update(input as never)
        .eq('company_id', activeCompanyId as string)
        .eq('id', id)
        .select('*' as never)
        .single();
      if (error) throw error;
      return data as unknown as VendorPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payments', activeCompanyId] });
      toast({ title: 'Payment updated' });
    },
    onError: (error: Error) => toast({ title: 'Payment update failed', description: error.message, variant: 'destructive' }),
  });
}

export function summarizeVendorPayments(payments: VendorPayment[]) {
  return payments.reduce(
    (summary, payment) => {
      if (payment.status === 'paid') summary.paid += payment.amount;
      if (payment.status === 'pending') summary.pending += payment.amount;
      return summary;
    },
    { paid: 0, pending: 0 },
  );
}