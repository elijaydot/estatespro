import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';

export type AppRole = 'landlord' | 'property_manager' | 'tenant';

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return (data?.role as AppRole) || null;
    },
    enabled: !!user?.id,
  });

  return {
    role,
    isLoading,
    isLandlord: role === 'landlord',
    isPropertyManager: role === 'property_manager',
    isTenant: role === 'tenant',
    isManager: role === 'landlord' || role === 'property_manager',
  };
}
