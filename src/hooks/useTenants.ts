import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { assertQuotaAvailable, getCompanyIdForProperty } from '@/lib/saasGuards';
import { calculateTenantCompleteness } from '@/lib/tenantProfileCompleteness';

export interface TenantDocument {
  id: string;
  title: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  emergency_contact: string | null;
  emergency_phone: string | null;
  employer: string | null;
  occupation: string | null;
  id_document: string | null;
  avatar_url: string | null;
  property_id: string | null;
  unit_id: string | null;
  move_in_date: string | null;
  lease_end_date: string | null;
  monthly_rent: number;
  security_deposit: number;
  balance: number;
  status: string;
  tenant_user_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;

  // Step 1: Identity
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  national_id?: string | null;
  passport_number?: string | null;

  // Step 2: Contact Information
  secondary_phone?: string | null;
  alternative_email?: string | null;
  whatsapp_number?: string | null;
  preferred_contact_method?: string | null;
  emergency_contact_relationship?: string | null;

  // Step 3: Address Information
  previous_address?: string | null;
  current_address?: string | null;
  employer_address?: string | null;
  mailing_address?: string | null;

  // Step 4: Employment & Financial Profile
  employment_status?: string | null;
  monthly_income?: number | null;
  income_verification_status?: string | null;
  guarantor_name?: string | null;
  guarantor_contact?: string | null;
  guarantor_relationship?: string | null;
  credit_assessment_notes?: string | null;

  // Step 5: Lease Information
  expected_move_out_date?: string | null;
  lease_type?: string | null;
  lease_start_date?: string | null;
  occupancy_type?: string | null;
  additional_occupants?: any[] | null;

  // Step 6: Documents
  documents?: TenantDocument[] | null;

  // Step 7: Preferences & Notes
  communication_preferences?: Record<string, any> | null;
  resident_preferences?: Record<string, any> | null;
  special_requirements?: string | null;
  accessibility_requirements?: string | null;
  pet_information?: string | null;
  vehicle_information?: string | null;
  notes?: string | null;

  // Step 8: Quality & Risk Assessment
  completeness_score?: number | null;
  risk_level?: string | null;
  metadata?: Record<string, any> | null;

  // Joined Relations
  properties?: {
    id: string;
    name: string;
    company_id?: string;
    companies?: { id: string; name: string } | null;
  } | null;
  units?: {
    id: string;
    unit_number: string;
    floor?: number;
    bedrooms?: number;
    rent_amount?: number;
  } | null;
}

export function useTenants() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['tenants', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      // Stage 1: Rich query with properties and units
      try {
        let query = supabase
          .from('tenants')
          .select(`
            *,
            ${propertiesRelation},
            units:unit_id(id, unit_number, floor, bedrooms, rent_amount)
          `);

        if (!isGlobal) {
          query = query.eq('properties.company_id', activeCompanyId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data as Tenant[];
        }
        if (error) {
          console.warn('Stage 1 useTenants query notice:', error.message);
        }
      } catch (err) {
        console.warn('Stage 1 useTenants exception:', err);
      }

      // Stage 2: Property ID in-list query (resolves company properties first)
      try {
        let propQuery = supabase.from('properties').select('id');
        if (!isGlobal) {
          propQuery = propQuery.eq('company_id', activeCompanyId);
        }
        const { data: propRows } = await propQuery;
        const validPropIds = (propRows || []).map((p) => p.id);

        if (validPropIds.length > 0) {
          const { data, error } = await supabase
            .from('tenants')
            .select('*, properties:property_id(id, name, company_id), units:unit_id(id, unit_number)')
            .in('property_id', validPropIds)
            .order('created_at', { ascending: false });

          if (!error && data) {
            return data as Tenant[];
          }
        }
      } catch (err) {
        console.warn('Stage 2 useTenants exception:', err);
      }

      // Stage 3: Broad fallback
      const { data, error } = await supabase
        .from('tenants')
        .select('*, properties:property_id(id, name, company_id), units:unit_id(id, unit_number)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Tenant[];
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useTenant(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['tenants', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      try {
        let query = supabase
          .from('tenants')
          .select(`
            *,
            ${propertiesRelation},
            units:unit_id(id, unit_number, floor, bedrooms, rent_amount)
          `)
          .eq('id', id);

        if (!isGlobal) {
          query = query.eq('properties.company_id', activeCompanyId);
        }

        const { data, error } = await query.single();
        if (!error && data) return data as Tenant;
      } catch (err) {
        console.warn('Stage 1 useTenant detail exception:', err);
      }

      // Fallback detail query
      const { data, error } = await supabase
        .from('tenants')
        .select('*, properties:property_id(id, name, company_id), units:unit_id(id, unit_number)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (tenant: Partial<Tenant>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let companyId: string | null = activeCompanyId || null;
      if (tenant.property_id) {
        companyId = await getCompanyIdForProperty(tenant.property_id);
      }

      if (companyId) {
        await assertQuotaAvailable({
          companyId,
          quotaCode: 'active_tenants',
          requestedDelta: 1,
        });
      }

      // Calculate completeness score
      const { score } = calculateTenantCompleteness(tenant);

      // Defensively strip joined relations and system fields
      const {
        properties,
        units,
        created_at,
        updated_at,
        user_id,
        id: _ignoredId,
        ...cleanFields
      } = tenant as any;

      // Ensure full name is unified
      const fullName = cleanFields.name || `${cleanFields.first_name || ''} ${cleanFields.last_name || ''}`.trim() || 'Resident';

      const { data, error } = await supabase
        .from('tenants')
        .insert({
          ...cleanFields,
          name: fullName,
          completeness_score: score,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Success', description: 'Resident created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...tenant }: Partial<Tenant> & { id: string }) => {
      // Calculate updated completeness score
      const { score } = calculateTenantCompleteness(tenant);

      // Defensively strip joined relations and system fields so PostgREST never fails on schema cache
      const {
        properties,
        units,
        created_at,
        updated_at,
        user_id,
        id: _ignoredId,
        ...cleanFields
      } = tenant as any;

      if (cleanFields.first_name || cleanFields.last_name) {
        cleanFields.name = cleanFields.name || `${cleanFields.first_name || ''} ${cleanFields.last_name || ''}`.trim();
      }

      const { data, error } = await supabase
        .from('tenants')
        .update({
          ...cleanFields,
          completeness_score: score,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', variables.id] });
      toast({ title: 'Success', description: 'Resident profile updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({ title: 'Success', description: 'Resident removed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
