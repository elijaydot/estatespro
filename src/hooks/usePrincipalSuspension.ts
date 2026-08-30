import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usePrincipalSuspension(
  principalType: 'company' | 'user',
  principalId: string | null | undefined,
  enabled = true,
) {
  const isValidUuid = Boolean(principalId && principalId !== 'all' && UUID_REGEX.test(principalId));

  return useQuery({
    queryKey: ['principal-suspension', principalType, principalId],
    enabled: enabled && isValidUuid,
    queryFn: async () => {
      if (!principalId || !isValidUuid) return false;
      const { data, error } = await supabase.rpc('platform_is_principal_suspended' as never, {
        p_principal_type: principalType,
        p_principal_id: principalId,
      } as never);

      if (error) throw error;
      return Boolean(data);
    },
  });
}
