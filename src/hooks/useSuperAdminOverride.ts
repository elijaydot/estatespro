import { useEffect, useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';

const STORAGE_KEY = 'fishgate.super_admin_platform_override';

function parseStoredOverride(value: string | null) {
  if (value === null) return true;
  return value === '1' || value.toLowerCase() === 'true';
}

export function useSuperAdminOverride() {
  const { role, isLoading } = useUserRole();
  const [overrideEnabled, setOverrideEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOverrideEnabled(parseStoredOverride(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  const updateOverride = (enabled: boolean) => {
    setOverrideEnabled(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    }
  };

  const canOverride = role === 'super_admin';
  const isOverrideActive = canOverride && overrideEnabled;

  return {
    canOverride,
    overrideEnabled,
    isOverrideActive,
    setOverrideEnabled: updateOverride,
    isLoadingRole: isLoading,
  };
}
