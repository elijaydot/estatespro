import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { addMonths, addYears, format } from 'date-fns';

export function useRenewLease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      originalLeaseId,
      newStartDate,
      newEndDate,
      newMonthlyRent,
      newSecurityDeposit,
    }: {
      originalLeaseId: string;
      newStartDate: string;
      newEndDate: string;
      newMonthlyRent?: number;
      newSecurityDeposit?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the original lease
      const { data: originalLease, error: fetchError } = await supabase
        .from('leases')
        .select('*')
        .eq('id', originalLeaseId)
        .single();

      if (fetchError) throw fetchError;

      // Generate new lease number
      const prefix = 'LSE';
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newLeaseNumber = `${prefix}-${timestamp}-${random}`;

      // Create the renewed lease
      const { data: newLease, error: createError } = await supabase
        .from('leases')
        .insert({
          tenant_id: originalLease.tenant_id,
          property_id: originalLease.property_id,
          unit_id: originalLease.unit_id,
          lease_number: newLeaseNumber,
          start_date: newStartDate,
          end_date: newEndDate,
          monthly_rent: newMonthlyRent ?? originalLease.monthly_rent,
          security_deposit: newSecurityDeposit ?? originalLease.security_deposit,
          terms: originalLease.terms,
          special_conditions: originalLease.special_conditions,
          status: 'draft',
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update the original lease status to 'renewed' or keep as expired
      await supabase
        .from('leases')
        .update({ status: 'expired' })
        .eq('id', originalLeaseId);

      return newLease;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      toast({ title: 'Success', description: 'Lease renewed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function calculateRenewalDates(currentEndDate: string, durationMonths: number = 12) {
  const endDate = new Date(currentEndDate);
  const newStartDate = new Date(endDate);
  newStartDate.setDate(newStartDate.getDate() + 1);
  
  const newEndDate = addMonths(newStartDate, durationMonths);
  
  return {
    newStartDate: format(newStartDate, 'yyyy-MM-dd'),
    newEndDate: format(newEndDate, 'yyyy-MM-dd'),
  };
}
