import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface CompanySettings {
  id: string | null;
  user_id: string;
  company_id: string | null;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

type CompanySettingsUpdateInput = Partial<Omit<CompanySettings, 'id' | 'user_id' | 'company_id' | 'created_at' | 'updated_at'>>;

export function useCompanySettings(companyId?: string | null) {
  return useQuery({
    queryKey: ['company_settings', companyId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      if (!companyId) {
        return {
          id: null,
          user_id: user.id,
          company_id: null,
          company_name: null,
          company_email: null,
          company_phone: null,
          company_address: null,
          logo_url: null,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
        } as CompanySettings;
      }

      const { data: companyRow, error: companyError } = await supabase
        .from('companies')
        .select('id, name, email, phone, address, logo_url, created_at, updated_at')
        .eq('id', companyId)
        .maybeSingle();

      if (companyError) throw companyError;

      if (companyRow) {
        return {
          id: companyRow.id,
          user_id: user.id,
          company_id: companyRow.id,
          company_name: companyRow.name ?? null,
          company_email: companyRow.email ?? null,
          company_phone: companyRow.phone ?? null,
          company_address: companyRow.address ?? null,
          logo_url: companyRow.logo_url ?? null,
          created_at: companyRow.created_at,
          updated_at: companyRow.updated_at,
        } as CompanySettings;
      }

      return null;
    },
    enabled: companyId !== undefined,
  });
}

export function useUpdateCompanySettings(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: CompanySettingsUpdateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!companyId) throw new Error('No active company selected');

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .update({
          name: settings.company_name ?? null,
          email: settings.company_email ?? null,
          phone: settings.company_phone ?? null,
          address: settings.company_address ?? null,
          logo_url: settings.logo_url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId)
        .select()
        .single();

      if (companyError) throw companyError;

      return companyData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings'] });
      queryClient.invalidateQueries({ queryKey: ['my_companies'] });
      queryClient.invalidateQueries({ queryKey: ['active-company-options'] });
      toast({ title: 'Success', description: 'Company profile updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export async function uploadCompanyLogo(file: File, companyId?: string | null): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  if (!companyId) throw new Error('No active company selected');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${companyId}/logo-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('company-logos')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('company-logos')
    .getPublicUrl(fileName);

  return publicUrl;
}
