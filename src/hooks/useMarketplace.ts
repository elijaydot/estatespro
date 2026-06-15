import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  createMarketplaceInquiry,
  fetchMarketplaceListingDetail,
  fetchMarketplaceListings,
  generateIdempotencyKey,
  type MarketplaceInquiryPayload,
  type MarketplaceInquiryResponse,
  type MarketplaceListParams,
} from '@/lib/marketplaceApi';

export interface CrmLead {
  id: string;
  company_id: string;
  listing_id: string | null;
  stage: string;
  status: string;
  priority: string;
  score: number;
  assigned_to: string | null;
  created_at: string;
  last_activity_at: string | null;
  converted_at: string | null;
  lost_reason: string | null;
  listing_title?: string | null;
  listing_slug?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface ManagedMarketplaceListing {
  id: string;
  company_id: string;
  title: string;
  slug: string;
  status: string;
  verification_state: string;
  city: string;
  area: string | null;
  rent_amount: number;
  currency: string;
  published_at: string | null;
  inquiry_count: number;
  created_at: string;
}

type LeadRow = {
  id: string;
  company_id: string;
  listing_id: string | null;
  stage: string;
  status: string;
  priority: string;
  score: number;
  assigned_to: string | null;
  created_at: string;
  last_activity_at: string | null;
  converted_at: string | null;
  lost_reason: string | null;
  marketplace_listings: { title: string | null; slug: string | null } | null;
  lead_contacts: Array<{ full_name: string | null; email: string | null; phone_e164: string | null }> | null;
};

type LeadStageUpdatePayload = {
  stage: string;
  last_activity_at: string;
  status?: 'won' | 'lost';
  converted_at?: string;
};

type ListingPublishUpdatePayload = {
  status: 'live' | 'paused';
  paused_at: string | null;
  published_at: string | null;
};

export function useMarketplaceListings(params: MarketplaceListParams = {}) {
  return useQuery({
    queryKey: ['marketplace', 'public-list', params],
    queryFn: async () => {
      const response = await fetchMarketplaceListings(params);
      return response.data || [];
    },
  });
}

export function useMarketplaceListingDetail(idOrSlug?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'public-detail', idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) throw new Error('idOrSlug is required');
      const response = await fetchMarketplaceListingDetail(idOrSlug);
      return response.data;
    },
    enabled: Boolean(idOrSlug),
  });
}

export function useCreateMarketplaceInquiry() {
  return useMutation({
    mutationFn: async ({
      payload,
      idempotencyKey,
    }: {
      payload: MarketplaceInquiryPayload;
      idempotencyKey?: string;
    }): Promise<MarketplaceInquiryResponse['data']> => {
      const key = idempotencyKey || generateIdempotencyKey();
      const response = await createMarketplaceInquiry(payload, key);
      return response.data;
    },
    onSuccess: (data) => {
      const description = data.reused
        ? 'Inquiry already exists for this request key'
        : 'Inquiry created successfully';
      toast({ title: 'Marketplace Inquiry', description });
    },
    onError: (error: Error) => {
      toast({
        title: 'Inquiry failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCrmLeads(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'crm-leads', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmLead[];

      const { data, error } = await supabase
        .from('leads')
        .select('id, company_id, listing_id, stage, status, priority, score, assigned_to, created_at, last_activity_at, converted_at, lost_reason, marketplace_listings(title, slug), lead_contacts(full_name, email, phone_e164)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data || []) as LeadRow[]).map((lead) => ({
        ...lead,
        listing_title: lead.marketplace_listings?.title ?? null,
        listing_slug: lead.marketplace_listings?.slug ?? null,
        contact_name: lead.lead_contacts?.[0]?.full_name ?? null,
        contact_email: lead.lead_contacts?.[0]?.email ?? null,
        contact_phone: lead.lead_contacts?.[0]?.phone_e164 ?? null,
      })) as CrmLead[];
    },
    enabled: !!companyId,
  });
}

export function useUpdateCrmLeadStage(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
      const payload: LeadStageUpdatePayload = {
        stage,
        last_activity_at: new Date().toISOString(),
      };

      if (stage === 'converted') {
        payload.status = 'won';
        payload.converted_at = new Date().toISOString();
      }

      if (stage === 'lost') {
        payload.status = 'lost';
      }

      const { data, error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-leads', companyId] });
      toast({ title: 'Lead Updated', description: 'Lead stage updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useManagedMarketplaceListings(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'managed-listings', companyId],
    queryFn: async () => {
      if (!companyId) return [] as ManagedMarketplaceListing[];

      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('id, company_id, title, slug, status, verification_state, city, area, rent_amount, currency, published_at, inquiry_count, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ManagedMarketplaceListing[];
    },
    enabled: !!companyId,
  });
}

export function useToggleMarketplacePublish(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      publish,
    }: {
      listingId: string;
      publish: boolean;
    }) => {
      const status = publish ? 'live' : 'paused';
      const payload: ListingPublishUpdatePayload = {
        status,
        paused_at: publish ? null : new Date().toISOString(),
        published_at: publish ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('marketplace_listings')
        .update(payload)
        .eq('id', listingId)
        .select('id, title, status')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'managed-listings', companyId] });
      const action = data.status === 'live' ? 'published' : 'paused';
      toast({ title: 'Listing Updated', description: `${data.title} has been ${action}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Publish Toggle Failed', description: error.message, variant: 'destructive' });
    },
  });
}
