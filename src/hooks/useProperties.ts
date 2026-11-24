import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { assertQuotaAvailable } from '@/lib/saasGuards';

export interface PropertyEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  email?: string;
}

export interface PropertyManagementContacts {
  phone?: string;
  email?: string;
  officeHours?: string;
}

export interface PropertyDocument {
  id: string;
  title: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  type: string;
  description: string | null;
  total_units: number;
  occupied_units: number;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  company_id?: string;
  companies?: { id: string; name: string } | null;

  // Step 1: Basic Information
  portfolio_name?: string | null;
  property_code?: string | null;
  category?: string | null;
  status?: string | null;
  opening_date?: string | null;
  documents?: PropertyDocument[] | null;

  // Step 2: Location & Address
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
  landmark?: string | null;
  time_zone?: string | null;
  upi?: string | null;

  // Step 3: Characteristics
  building_type?: string | null;
  property_usage?: string | null;
  number_of_buildings?: number | null;
  number_of_floors?: number | null;
  residential_units?: number | null;
  commercial_units?: number | null;
  parking_spaces?: number | null;
  land_area?: number | null;
  gross_floor_area?: number | null;
  year_built?: number | null;
  construction_status?: string | null;
  amenities?: string[] | null;
  accessibility_features?: string[] | null;
  security_features?: string[] | null;
  utilities?: string[] | null;

  // Step 4: Ownership & Management
  owner_name?: string | null;
  owner_account_id?: string | null;
  ownership_type?: string | null;
  management_company?: string | null;
  property_manager?: string | null;
  management_contacts?: PropertyManagementContacts | null;
  emergency_contacts?: PropertyEmergencyContact[] | null;
  ownership_notes?: string | null;

  // Step 5: Financial Profile
  currency?: string | null;
  revenue_target?: number | null;
  operating_budget?: number | null;
  acquisition_cost?: number | null;
  market_value?: number | null;
  insurance_policy_number?: string | null;
  insurance_provider?: string | null;
  insurance_expiry?: string | null;
  insurance_amount?: number | null;
  landlord_tin?: string | null;
  tax_rate?: number | null;
  cost_centre?: string | null;
  accounting_reference?: string | null;
  financial_notes?: string | null;

  // Step 6: Operational Settings
  maintenance_strategy?: string | null;
  inspection_frequency?: string | null;
  lease_rules?: Record<string, any> | null;
  target_occupancy_rate?: number | null;
  operational_notes?: string | null;
  property_policies?: Record<string, any> | null;
  risk_classification?: string | null;

  // Step 7: Data Quality
  completeness_score?: number | null;
  metadata?: Record<string, any> | null;
}

export function useProperties() {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['properties', activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from('properties')
        .select('*, companies:company_id(id, name)');

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useProperty(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['properties', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');

      let query = supabase
        .from('properties')
        .select('*, companies:company_id(id, name)')
        .eq('id', id);

      if (activeCompanyId !== 'all') {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as Property;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (property: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { company_id?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!activeCompanyId) throw new Error('Select a company first');
      if (property.company_id && property.company_id !== activeCompanyId) {
        throw new Error('Property company must match the active company');
      }

      await assertQuotaAvailable({
        companyId: activeCompanyId,
        quotaCode: 'properties_managed',
        requestedDelta: 1,
      });

      const { data, error } = await supabase
        .from('properties')
        .insert({ ...property, user_id: user.id, company_id: activeCompanyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Success', description: 'Property created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async ({ id, ...property }: Partial<Property> & { id: string }) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { data, error } = await supabase
        .from('properties')
        .update(property)
        .eq('id', id)
        .eq('company_id', activeCompanyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', variables.id] });
      toast({ title: 'Success', description: 'Property updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
        .eq('company_id', activeCompanyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: 'Success', description: 'Property deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
