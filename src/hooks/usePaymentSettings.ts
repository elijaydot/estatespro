import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface PaymentSettings {
  id: string;
  user_id: string;
  company_id: string | null;
  property_id: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_branch: string | null;
  momo_provider: string | null;
  momo_number: string | null;
  momo_name: string | null;
  flutterwave_enabled: boolean;
  flutterwave_public_key: string | null;
  flutterwave_secret_key: string | null;
  paystack_enabled: boolean;
  paystack_public_key: string | null;
  paystack_secret_key: string | null;
  preferred_method: string | null;
  payment_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaymentSettings(companyId?: string, propertyId?: string) {
  const queryClient = useQueryClient();
  const paymentSettingsSelect = [
    'id',
    'user_id',
    'company_id',
    'property_id',
    'bank_name',
    'bank_account_number',
    'bank_account_name',
    'bank_branch',
    'momo_provider',
    'momo_number',
    'momo_name',
    'flutterwave_enabled',
    'flutterwave_public_key',
    'paystack_enabled',
    'paystack_public_key',
    'preferred_method',
    'payment_instructions',
    'created_at',
    'updated_at',
  ].join(',');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings', companyId, propertyId],
    queryFn: async () => {
      let query = supabase.from('landlord_payment_settings').select(paymentSettingsSelect);
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      } else if (companyId) {
        query = query.eq('company_id', companyId).is('property_id', null);
      } else {
        // Global default (user-level): no company and no property.
        query = query.is('company_id', null).is('property_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        // Secrets are write-only and intentionally never returned to the client.
        flutterwave_secret_key: null,
        paystack_secret_key: null,
      } as PaymentSettings;
    },
    enabled: true,
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<PaymentSettings> & { company_id?: string; property_id?: string }) => {
      const { company_id, property_id, ...settingsData } = data;

      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('landlord_payment_settings')
          .update(settingsData)
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('landlord_payment_settings')
          .insert({
            ...settingsData,
            company_id: company_id || null,
            property_id: property_id || null,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast({ title: 'Success', description: 'Payment settings saved successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
