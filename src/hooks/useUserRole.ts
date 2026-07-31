import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { isAbortLikeError } from '@/lib/errors';

export type AppRole = 'super_admin' | 'landlord' | 'property_manager' | 'tenant';

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user_role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // profiles.role is the source of truth for app authorization.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        if (!isAbortLikeError(profileError)) {
          console.error('Error fetching user role from profiles:', profileError);
        }
      }

      const profileRole = (profileData?.role as AppRole | null) ?? null;
      if (profileRole) {
        return profileRole;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (!isAbortLikeError(error)) {
          console.error('Error fetching user role from user_roles:', error);
        }
      }

      return (data?.role as AppRole | null) ?? null;
    },
    enabled: !!user?.id,
  });

  return {
    role,
    isLoading,
    isSuperAdmin: role === 'super_admin',
    isLandlord: role === 'landlord',
    isPropertyManager: role === 'property_manager',
    isTenant: role === 'tenant',
    isManager: role === 'landlord' || role === 'property_manager' || role === 'super_admin',
  };
}
