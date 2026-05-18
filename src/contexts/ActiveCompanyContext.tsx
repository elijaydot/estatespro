import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

export type CompanyOption = {
  id: string;
  name: string;
};

type ActiveCompanyContextType = {
  activeCompanyId: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  companies: CompanyOption[];
  isLoading: boolean;
};

const ActiveCompanyContext = createContext<ActiveCompanyContextType | undefined>(undefined);

function getStorageKey(userId?: string) {
  return `fishgate_active_company_${userId || 'anon'}`;
}

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['active-company-options', user?.id, role],
    queryFn: async (): Promise<CompanyOption[]> => {
      if (!user?.id) return [];

      if (role === 'landlord') {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as CompanyOption[];
      }

      if (role === 'property_manager') {
        const { data, error } = await supabase
          .from('company_members')
          .select('company_id, status, companies:company_id(id, name)')
          .eq('user_id', user.id)
          .eq('status', 'approved');

        if (error) throw error;

        return (data || [])
          .map((item: any) => item.companies)
          .filter(Boolean) as CompanyOption[];
      }

      if (role === 'tenant') {
        const { data, error } = await supabase
          .from('tenants')
          .select('properties:property_id(company_id, companies:company_id(id, name))')
          .eq('tenant_user_id', user.id)
          .limit(10);

        if (error) throw error;

        const mapped = (data || [])
          .map((item: any) => item.properties?.companies)
          .filter(Boolean) as CompanyOption[];

        const unique = new Map<string, CompanyOption>();
        mapped.forEach((company) => {
          if (!unique.has(company.id)) {
            unique.set(company.id, company);
          }
        });

        return Array.from(unique.values());
      }

      return [];
    },
    enabled: !!user?.id && !!role,
  });

  useEffect(() => {
    if (!user?.id) {
      setActiveCompanyIdState(null);
      return;
    }

    if (companies.length === 0) {
      setActiveCompanyIdState(null);
      return;
    }

    const savedCompany = localStorage.getItem(getStorageKey(user.id));
    const hasSaved = savedCompany && companies.some((company) => company.id === savedCompany);

    if (hasSaved) {
      setActiveCompanyIdState(savedCompany);
      return;
    }

    setActiveCompanyIdState(companies[0].id);
  }, [companies, user?.id]);

  const setActiveCompanyId = (companyId: string | null) => {
    setActiveCompanyIdState(companyId);
    if (!user?.id) return;

    if (companyId) {
      localStorage.setItem(getStorageKey(user.id), companyId);
    } else {
      localStorage.removeItem(getStorageKey(user.id));
    }
  };

  const value = useMemo(
    () => ({
      activeCompanyId,
      setActiveCompanyId,
      companies,
      isLoading,
    }),
    [activeCompanyId, companies, isLoading]
  );

  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>;
}

export function useActiveCompany() {
  const context = useContext(ActiveCompanyContext);
  if (!context) {
    throw new Error('useActiveCompany must be used within an ActiveCompanyProvider');
  }
  return context;
}
