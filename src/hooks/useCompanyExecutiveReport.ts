import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/useAuth';

export interface CompanyExecutiveReportRow {
  company_id: string;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  access_role: 'owner' | 'property_manager' | 'super_admin';
  property_count: number;
  unit_count: number;
  occupied_unit_count: number;
  occupancy_rate: number;
  active_tenant_count: number;
  team_member_count: number;
  total_collected: number;
  outstanding_balance: number;
  open_maintenance_count: number;
  ai_credits_used: number | null;
}

export function useCompanyExecutiveReport() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company-executive-report', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_accessible_company_executive_report' as never);
      if (error) throw error;
      return (data || []) as CompanyExecutiveReportRow[];
    },
    enabled: Boolean(user?.id),
  });
}