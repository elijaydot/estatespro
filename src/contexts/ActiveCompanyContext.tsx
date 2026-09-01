import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { ActiveCompanyContext, ActiveCompanyContextType } from './active-company-context-shared';

export type CompanyOption = {
  id: string;
  name: string;
  email?: string | null;
  address?: string | null;
};

type CompanyMemberCompanyRow = {
  companies: CompanyOption | null;
};

type TenantCompanyRow = {
  properties: {
    companies: CompanyOption | null;
  } | null;
};

function getStorageKey(userId?: string) {
  return `fishgate_active_company_${userId || 'anon'}`;
}

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
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

        return ((data || []) as CompanyMemberCompanyRow[])
          .map((item) => item.companies)
          .filter(Boolean) as CompanyOption[];
      }

      if (role === 'tenant') {
        const { data, error } = await supabase
          .from('tenants')
          .select('properties:property_id(company_id, companies:company_id(id, name))')
          .eq('tenant_user_id', user.id)
          .limit(10);

        if (error) throw error;

        const mapped = ((data || []) as TenantCompanyRow[])
          .map((item) => item.properties?.companies)
          .filter(Boolean) as CompanyOption[];

        const unique = new Map<string, CompanyOption>();
        mapped.forEach((company) => {
          if (!unique.has(company.id)) {
            unique.set(company.id, company);
          }
        });

        return Array.from(unique.values());
      }

      if (role === 'super_admin') {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;
        const allCompanies = (data || []) as CompanyOption[];
        return [
          { id: 'all', name: '🌐 All Companies (Global View)' },
          ...allCompanies,
        ];
      }

      return [];
    },
    enabled: !!user?.id && !!role,
  });

  const { data: storedDefaultCompanyId = null, isLoading: isDefaultLoading } = useQuery({
    queryKey: ['profile-default-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('default_company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.default_company_id || null;
    },
    enabled: Boolean(user?.id),
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

    if (isDefaultLoading) return;

    if (role === 'super_admin') {
      setActiveCompanyIdState('all');
      return;
    }

    const hasAccessibleDefault = storedDefaultCompanyId
      && companies.some((company) => company.id === storedDefaultCompanyId);

    if (hasAccessibleDefault) {
      setActiveCompanyIdState(storedDefaultCompanyId);
      localStorage.setItem(getStorageKey(user.id), storedDefaultCompanyId);
      return;
    }

    const savedCompany = localStorage.getItem(getStorageKey(user.id));
    const hasSaved = savedCompany && companies.some((company) => company.id === savedCompany);

    if (hasSaved) {
      setActiveCompanyIdState(savedCompany);
      return;
    }

    setActiveCompanyIdState(companies[0].id);
  }, [companies, isDefaultLoading, role, storedDefaultCompanyId, user?.id]);

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );
  const validatedActiveCompanyId = activeCompany?.id ?? null;
  const defaultCompanyId = storedDefaultCompanyId && companies.some((company) => company.id === storedDefaultCompanyId)
    ? storedDefaultCompanyId
    : null;
  const isResolved = !isLoading && !isDefaultLoading && (companies.length === 0 || activeCompany !== null);

  const setActiveCompanyId = useCallback((companyId: string | null) => {
    const validatedCompanyId = companyId && companies.some((company) => company.id === companyId)
      ? companyId
      : null;
    setActiveCompanyIdState(validatedCompanyId);
    if (!user?.id) return;

    if (validatedCompanyId) {
      localStorage.setItem(getStorageKey(user.id), validatedCompanyId);
    } else {
      localStorage.removeItem(getStorageKey(user.id));
    }
  }, [companies, user?.id]);

  const setDefaultCompanyId = useCallback(async (companyId: string) => {
    if (!user?.id || !companies.some((company) => company.id === companyId)) {
      throw new Error('Select a company you can access.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ default_company_id: companyId })
      .eq('user_id', user.id);
    if (error) throw error;

    queryClient.setQueryData(['profile-default-company', user.id], companyId);
  }, [companies, queryClient, user?.id]);

  const value = useMemo(
    () => ({
      activeCompanyId: validatedActiveCompanyId,
      activeCompany,
      setActiveCompanyId,
      defaultCompanyId,
      setDefaultCompanyId,
      companies,
      isLoading: isLoading || isDefaultLoading,
      isResolved,
    }),
    [activeCompany, companies, defaultCompanyId, isDefaultLoading, isLoading, isResolved, setActiveCompanyId, setDefaultCompanyId, validatedActiveCompanyId]
  );

  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>;
}
