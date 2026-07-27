import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePrincipalSuspension(
  principalType: 'company' | 'user',
  principalId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['principal-suspension', principalType, principalId],
    enabled: enabled && Boolean(principalId),
    queryFn: async () => {
      if (!principalId) return false;
      const { data, error } = await supabase.rpc('platform_is_principal_suspended' as never, {
        p_principal_type: principalType,
        p_principal_id: principalId,
      } as never);

      if (error) throw error;
      return Boolean(data);
    },
  });
}
