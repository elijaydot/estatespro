import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/useActiveCompany';
import { assertQuotaAvailable, getCompanyIdForProperty } from '@/lib/saasGuards';

export interface UnitDocument {
  id: string;
  title: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  rent_amount: number;
  status: string;
  amenities: string[] | null;
  description: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string;

  // Step 1: Basic Information
  unit_code?: string | null;
  building_name?: string | null;
  wing?: string | null;
  unit_type?: string | null;
  unit_category?: string | null;
  documents?: UnitDocument[] | null;

  // Step 2: Specifications
  toilets?: number | null;
  floor_area_sqm?: number | null;
  has_balcony?: boolean | null;
  parking_spaces?: number | null;
  furnishing_status?: string | null;
  accessibility_features?: string[] | null;
  utilities_included?: string[] | null;
  view_type?: string | null;

  // Step 3: Rental Information
  market_rent?: number | null;
  security_deposit?: number | null;
  currency?: string | null;
  billing_frequency?: string | null;
  late_fee_rules?: Record<string, any> | null;
  revenue_target?: number | null;
  pricing_notes?: string | null;

  // Step 4: Occupancy Settings
  available_from?: string | null;
  max_occupants?: number | null;
  occupancy_type?: string | null;
  preferred_tenant_type?: string | null;
  notice_period_days?: number | null;
  move_in_rules?: string | null;

  // Step 5: Lease Defaults
  default_lease_term_months?: number | null;
  renewal_rules?: Record<string, any> | null;
  lease_category?: string | null;
  lease_templates?: Record<string, any>[] | null;
  required_documents?: string[] | null;

  // Step 6: Operations
  maintenance_responsibility?: string | null;
  inspection_frequency?: string | null;
  cleaning_schedule?: string | null;
  risk_rating?: string | null;
  operational_notes?: string | null;

  // Step 7: Data Quality
  completeness_score?: number | null;
  metadata?: Record<string, any> | null;

  // Relations
  properties?: {
    id: string;
    name: string;
    company_id?: string;
    companies?: { id: string; name: string } | null;
  } | null;
  tenants?: {
    id: string;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    status?: string | null;
    lease_start_date?: string | null;
    lease_end_date?: string | null;
    balance?: number | null;
  }[] | null;
  maintenance_requests?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  }[] | null;
}

export function useUnits(propertyId?: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['units', propertyId, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal && !propertyId
        ? 'properties:property_id(id, name, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('units')
        .select(`
          *,
          ${propertiesRelation},
          tenants(id, name, email, phone, status, lease_start_date, lease_end_date, balance),
          maintenance_requests(id, title, status, priority, created_at)
        `);

      if (!isGlobal) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query.order('unit_number', { ascending: true });

      if (error) throw error;
      return data as Unit[];
    },
    enabled: Boolean(activeCompanyId),
  });
}

export function useUnit(id: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['units', 'detail', id, activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) throw new Error('Select a company first');
      const isGlobal = activeCompanyId === 'all';
      const propertiesRelation = isGlobal
        ? 'properties:property_id(id, name, address, city, company_id, companies:company_id(id, name))'
        : 'properties:property_id!inner(id, name, address, city, company_id, companies:company_id(id, name))';

      let query = supabase
        .from('units')
        .select(`
          *,
          ${propertiesRelation},
          tenants(id, name, email, phone, status, lease_start_date, lease_end_date, balance),
          maintenance_requests(id, title, status, priority, created_at)
        `)
        .eq('id', id);

      if (!isGlobal) {
        query = query.eq('properties.company_id', activeCompanyId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as Unit;
    },
    enabled: Boolean(id && activeCompanyId),
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const companyId = await getCompanyIdForProperty(unit.property_id);
      await assertQuotaAvailable({
        companyId,
        quotaCode: 'units_managed',
        requestedDelta: 1,
      });

      const {
        properties,
        tenants,
        maintenance_requests,
        created_at,
        updated_at,
        user_id,
        id: _ignoredId,
        ...cleanFields
      } = unit as any;

      const { data, error } = await supabase
        .from('units')
        .insert({ ...cleanFields, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Unit created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...unit }: Partial<Unit> & { id: string }) => {
      // Strip joined relations and system fields so PostgREST never fails on schema cache
      const {
        properties,
        tenants,
        maintenance_requests,
        created_at,
        updated_at,
        user_id,
        id: _ignoredId,
        ...cleanFields
      } = unit as any;

      const { data, error } = await supabase
        .from('units')
        .update(cleanFields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Unit;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['units', 'detail', variables.id] });
      toast({ title: 'Success', description: 'Unit updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Success', description: 'Unit deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
