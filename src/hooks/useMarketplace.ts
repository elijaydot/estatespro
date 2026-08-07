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
import {
  applyPublisherVerificationDecision,
  applyVerificationDocumentDecision,
} from '@/lib/reviewerDecisions';
import { mapManagedListingsWithInquiryCount } from '@/lib/marketplaceManagedListings';

export interface CrmLead {
  id: string;
  company_id: string;
  listing_id: string | null;
  pipeline_kind: 'leasing' | 'renewal' | 'collections';
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

export interface CrmLeadActivity {
  id: string;
  lead_id: string;
  activity_type: 'inquiry' | 'call' | 'sms' | 'whatsapp' | 'email' | 'note' | 'viewing' | 'status_change';
  channel: string | null;
  actor_user_id: string | null;
  payload_json: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface CrmLeadTask {
  id: string;
  lead_id: string;
  task_type: string;
  owner_user_id: string;
  due_at: string;
  status: 'open' | 'done' | 'canceled';
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CrmAssignableUser {
  user_id: string;
  role: string;
  name: string;
  email: string;
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

export interface VacantMarketplaceUnit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  description: string | null;
  property_name: string;
  city: string;
  state: string;
}

export interface CreateMarketplaceListingInput {
  unitId: string;
  propertyId: string;
  title: string;
  description: string;
  city: string;
  area?: string | null;
  rentAmount: number;
  currency?: string;
  bedrooms: number;
  bathrooms: number;
  availableFrom?: string | null;
  mediaPaths?: string[];
}

export interface ModerationCase {
  id: string;
  entity_type: string;
  entity_id: string;
  reason_code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  state: 'open' | 'in_review' | 'resolved' | 'dismissed';
  queue: string;
  assigned_moderator: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublisherVerification {
  id: string;
  company_id: string;
  state: 'pending' | 'verified' | 'rejected' | 'needs_review';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  last_submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationDocument {
  id: string;
  verification_id: string;
  document_type: 'id_card' | 'business_registration' | 'utility_bill' | 'other';
  storage_path: string;
  state: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ReviewerPublisherVerificationQueueItem {
  id: string;
  company_id: string;
  company_name: string;
  state: PublisherVerification['state'];
  last_submitted_at: string;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

export interface ReviewerVerificationDocumentQueueItem {
  id: string;
  verification_id: string;
  company_id: string;
  company_name: string;
  document_type: VerificationDocument['document_type'];
  storage_path: string;
  state: VerificationDocument['state'];
  rejection_reason: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface ReviewerPublisherDecisionHistoryItem {
  id: string;
  company_id: string;
  company_name: string;
  state: Exclude<PublisherVerification['state'], 'pending'>;
  reviewed_by: string | null;
  reviewed_at: string;
  rejection_reason: string | null;
}

export interface ReviewerVerificationDocumentHistoryItem {
  id: string;
  verification_id: string;
  company_id: string;
  company_name: string;
  document_type: VerificationDocument['document_type'];
  state: Exclude<VerificationDocument['state'], 'pending'>;
  reviewed_by: string | null;
  reviewed_at: string;
  rejection_reason: string | null;
}

export interface ReviewerModerationCaseQueueItem extends ModerationCase {
  company_id: string;
  company_name: string;
}

export interface ReviewerModerationCaseHistoryItem extends ReviewerModerationCaseQueueItem {
  state: 'resolved' | 'dismissed';
  resolved_by: string;
  resolved_at: string;
  resolution_notes: string;
}

export interface ReviewerProfile {
  user_id: string;
  name: string;
  email: string;
}

type LeadRow = {
  id: string;
  company_id: string;
  listing_id: string | null;
  pipeline_kind?: CrmLead['pipeline_kind'];
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
  lead_contacts:
    | Array<{ full_name: string | null; email: string | null; phone_e164: string | null }>
    | { full_name: string | null; email: string | null; phone_e164: string | null }
    | null;
};

type ManagedListingRow = Omit<ManagedMarketplaceListing, 'inquiry_count'>;

function normalizeLeadContacts(contacts: LeadRow['lead_contacts']) {
  if (!contacts) return [];
  return Array.isArray(contacts) ? contacts : [contacts];
}

type LeadActivityRow = {
  id: string;
  lead_id: string;
  activity_type: CrmLeadActivity['activity_type'];
  channel: string | null;
  actor_user_id: string | null;
  payload_json: unknown;
  occurred_at: string;
  created_at: string;
};

type LeadTaskRow = {
  id: string;
  lead_id: string;
  task_type: string;
  owner_user_id: string;
  due_at: string;
  status: CrmLeadTask['status'];
  notes: string | null;
  completed_at: string | null;
  created_at: string;
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
      return fetchMarketplaceListings(params);
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

      const currentSchemaResult = await supabase
        .from('leads')
        .select('id, company_id, listing_id, pipeline_kind, stage, status, priority, score, assigned_to, created_at, last_activity_at, converted_at, lost_reason, marketplace_listings(title, slug), lead_contacts(full_name, email, phone_e164)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const usesLegacySchema = currentSchemaResult.error?.code === '42703'
        && currentSchemaResult.error.message.includes('pipeline_kind');
      const legacySchemaResult = usesLegacySchema
        ? await supabase
            .from('leads')
            .select('id, company_id, listing_id, stage, status, priority, score, assigned_to, created_at, last_activity_at, converted_at, lost_reason, marketplace_listings(title, slug), lead_contacts(full_name, email, phone_e164)')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
        : null;
      const data = legacySchemaResult?.data ?? currentSchemaResult.data;
      const error = legacySchemaResult?.error ?? (usesLegacySchema ? null : currentSchemaResult.error);

      if (error) throw error;

      return ((data || []) as LeadRow[]).map((lead) => {
        const contacts = normalizeLeadContacts(lead.lead_contacts);
        return {
          ...lead,
          pipeline_kind: lead.pipeline_kind || 'leasing',
          listing_title: lead.marketplace_listings?.title ?? null,
          listing_slug: lead.marketplace_listings?.slug ?? null,
          contact_name: contacts[0]?.full_name ?? null,
          contact_email: contacts[0]?.email ?? null,
          contact_phone: contacts[0]?.phone_e164 ?? null,
        };
      }) as CrmLead[];
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

export function useCrmLeadActivities(leadId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'crm-lead-activities', leadId],
    queryFn: async () => {
      if (!leadId) return [] as CrmLeadActivity[];

      const { data, error } = await supabase
        .from('lead_activities')
        .select('id, lead_id, activity_type, channel, actor_user_id, payload_json, occurred_at, created_at')
        .eq('lead_id', leadId)
        .order('occurred_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return ((data || []) as LeadActivityRow[]).map((row) => ({
        ...row,
        payload_json: row.payload_json && typeof row.payload_json === 'object'
          ? (row.payload_json as Record<string, unknown>)
          : {},
      })) as CrmLeadActivity[];
    },
    enabled: !!leadId,
  });
}

export function useCrmLeadTasks(leadId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'crm-lead-tasks', leadId],
    queryFn: async () => {
      if (!leadId) return [] as CrmLeadTask[];

      const { data, error } = await supabase
        .from('lead_tasks')
        .select('id, lead_id, task_type, owner_user_id, due_at, status, notes, completed_at, created_at')
        .eq('lead_id', leadId)
        .order('due_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []) as LeadTaskRow[] as CrmLeadTask[];
    },
    enabled: !!leadId,
  });
}

export function useCrmAssignableUsers(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'crm-assignable-users', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmAssignableUser[];

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('owner_id')
        .eq('id', companyId)
        .maybeSingle();

      if (companyError) throw companyError;

      const { data: members, error: memberError } = await supabase
        .from('company_members')
        .select('user_id, role, status')
        .eq('company_id', companyId)
        .eq('status', 'approved');

      if (memberError) throw memberError;

      const userRoleMap = new Map<string, string>();

      if (company?.owner_id) userRoleMap.set(company.owner_id, 'landlord');

      (members || []).forEach((member) => {
        if (member?.user_id) {
          userRoleMap.set(member.user_id, member.role || userRoleMap.get(member.user_id) || 'property_manager');
        }
      });

      const userIds = Array.from(userRoleMap.keys());
      if (userIds.length === 0) return [] as CrmAssignableUser[];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      const profileMap = new Map((profiles || []).map((profile) => [profile.user_id, profile]));

      return userIds.map((userId) => {
        const profile = profileMap.get(userId);
        return {
          user_id: userId,
          role: userRoleMap.get(userId) || 'property_manager',
          name: profile?.name || 'Team member',
          email: profile?.email || 'No email',
        };
      });
    },
    enabled: !!companyId,
  });
}

export function useAssignCrmLead(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      assigneeUserId,
      actorUserId,
    }: {
      leadId: string;
      assigneeUserId: string | null;
      actorUserId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({
          assigned_to: assigneeUserId,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select('id, assigned_to')
        .single();

      if (error) throw error;

      const payloadJson: Record<string, unknown> = { assigned_to: assigneeUserId };

      const { error: activityError } = await supabase.from('lead_activities').insert({
        lead_id: leadId,
        activity_type: 'status_change',
        channel: 'internal',
        actor_user_id: actorUserId || null,
        payload_json: payloadJson,
        occurred_at: new Date().toISOString(),
      } as never);

      if (activityError) throw activityError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-leads', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-lead-activities'] });
      toast({ title: 'Lead Assignment Updated', description: 'Lead owner updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Assignment Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateCrmLeadTask(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      ownerUserId,
      dueAt,
      notes,
      taskType,
    }: {
      leadId: string;
      ownerUserId: string;
      dueAt: string;
      notes?: string;
      taskType?: string;
    }) => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .insert({
          lead_id: leadId,
          task_type: taskType || 'follow_up',
          owner_user_id: ownerUserId,
          due_at: dueAt,
          status: 'open',
          notes: notes || null,
        })
        .select('id, lead_id, task_type, owner_user_id, due_at, status, notes, completed_at, created_at')
        .single();

      if (error) throw error;
      return data as CrmLeadTask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-lead-tasks', variables.leadId] });
      toast({ title: 'Task Created', description: 'Follow-up task added to lead workflow.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Task Create Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCrmLeadTaskStatus(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      leadId,
      status,
    }: {
      taskId: string;
      leadId: string;
      status: CrmLeadTask['status'];
    }) => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .update({
          status,
          completed_at: status === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .select('id, lead_id, task_type, owner_user_id, due_at, status, notes, completed_at, created_at')
        .single();

      if (error) throw error;
      return data as CrmLeadTask;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-lead-tasks', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-leads', companyId] });
      toast({ title: 'Task Updated', description: 'Task status updated.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Task Update Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateCrmLeadNote(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      actorUserId,
      note,
    }: {
      leadId: string;
      actorUserId?: string | null;
      note: string;
    }) => {
      const cleanNote = note.trim();
      if (!cleanNote) throw new Error('Note is required');

      const { data, error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          activity_type: 'note',
          channel: 'internal',
          actor_user_id: actorUserId || null,
          payload_json: { note: cleanNote },
          occurred_at: new Date().toISOString(),
        })
        .select('id, lead_id, activity_type, channel, actor_user_id, payload_json, occurred_at, created_at')
        .single();

      if (error) throw error;
      return data as CrmLeadActivity;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-lead-activities', variables.leadId] });
      toast({ title: 'Note Added', description: 'Lead note saved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Note Save Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useConvertCrmLead(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId }: { leadId: string }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('leads')
        .update({
          stage: 'converted',
          status: 'won',
          converted_at: now,
          last_activity_at: now,
        })
        .eq('id', leadId)
        .select('id, stage, status, converted_at')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-leads', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'crm-lead-activities'] });
      toast({ title: 'Lead Converted', description: 'Lead marked as converted and won.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Convert Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useManagedMarketplaceListings(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'managed-listings', companyId],
    queryFn: async () => {
      if (!companyId) return [] as ManagedMarketplaceListing[];

      const { data, error } = await supabase.rpc('get_managed_marketplace_listings_with_inquiry_counts' as never, {
        p_company_id: companyId,
      } as never);

      if (error) throw error;
      return mapManagedListingsWithInquiryCount((data || []) as Array<ManagedListingRow & { inquiry_count: number | string | null }>);
    },
    enabled: !!companyId,
  });
}

export function useVacantUnpublishedUnits(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'vacant-unpublished-units', companyId],
    queryFn: async () => {
      if (!companyId) return [] as VacantMarketplaceUnit[];

      const [unitsResult, listingsResult] = await Promise.all([
        supabase
          .from('units')
          .select('id, property_id, unit_number, bedrooms, bathrooms, rent_amount, description, properties:property_id!inner(id, name, city, state, company_id)')
          .eq('status', 'vacant')
          .eq('properties.company_id', companyId)
          .order('unit_number', { ascending: true }),
        supabase
          .from('marketplace_listings')
          .select('unit_id')
          .eq('company_id', companyId)
          .neq('status', 'archived')
          .not('unit_id', 'is', null),
      ]);

      if (unitsResult.error) throw unitsResult.error;
      if (listingsResult.error) throw listingsResult.error;

      const listedUnitIds = new Set((listingsResult.data || []).map((row) => row.unit_id).filter(Boolean));
      return ((unitsResult.data || []) as Array<Record<string, unknown>>)
        .filter((row) => !listedUnitIds.has(String(row.id)))
        .map((row) => {
          const property = row.properties as { name?: string; city?: string; state?: string } | null;
          return {
            id: String(row.id),
            property_id: String(row.property_id),
            unit_number: String(row.unit_number),
            bedrooms: Number(row.bedrooms || 0),
            bathrooms: Number(row.bathrooms || 0),
            rent_amount: Number(row.rent_amount || 0),
            description: (row.description as string | null) || null,
            property_name: property?.name || 'Property',
            city: property?.city || '',
            state: property?.state || '',
          };
        }) as VacantMarketplaceUnit[];
    },
    enabled: !!companyId,
  });
}

function marketplaceSlugPart(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function useCreateMarketplaceListing(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMarketplaceListingInput) => {
      if (!companyId) throw new Error('Select a company first');
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError || new Error('Not authenticated');

      const slugBase = [marketplaceSlugPart(input.title), marketplaceSlugPart(input.city)].filter(Boolean).join('-') || 'listing';
      let listing: { id: string; title: string; slug: string } | null = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8 + attempt * 2);
        const { data, error } = await supabase
          .from('marketplace_listings')
          .insert({
            company_id: companyId,
            property_id: input.propertyId,
            unit_id: input.unitId,
            title: input.title.trim(),
            slug: `${slugBase}-${suffix}`,
            description: input.description.trim() || null,
            city: input.city.trim(),
            area: input.area?.trim() || null,
            rent_amount: input.rentAmount,
            currency: input.currency || 'NGN',
            bedrooms: input.bedrooms,
            bathrooms: input.bathrooms,
            available_from: input.availableFrom || null,
            status: 'draft',
            created_by: authData.user.id,
          })
          .select('id, title, slug')
          .single();

        if (!error) {
          listing = data;
          break;
        }
        if (error.code !== '23505' || !error.message.toLowerCase().includes('slug')) throw error;
      }

      if (!listing) throw new Error('Could not generate a unique listing slug. Please try again.');

      if (input.mediaPaths?.length) {
        const { error: mediaError } = await supabase.from('listing_media').insert(
          input.mediaPaths.map((storagePath, index) => ({
            listing_id: listing!.id,
            storage_path: storagePath,
            media_type: 'image',
            sort_order: index,
            is_cover: index === 0,
          })),
        );
        if (mediaError) throw mediaError;
      }

      return listing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'managed-listings', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'vacant-unpublished-units', companyId] });
      toast({ title: 'Draft listing created', description: 'Review the listing, then publish when verification is complete.' });
    },
    onError: (error: Error) => {
      const duplicateUnit = error.message.includes('uq_marketplace_listings_active_unit');
      toast({
        title: 'Listing creation failed',
        description: duplicateUnit ? 'This unit already has a non-archived marketplace listing.' : error.message,
        variant: 'destructive',
      });
    },
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
      const message =
        error.message?.includes('ONLY_LANDLORD_CAN_CHANGE_LISTING_STATUS')
          ? 'Only landlords can publish or pause listings.'
          : error.message?.includes('VERIFICATION_REQUIRED_BEFORE_PUBLISH')
            ? 'Listing must be verified before going live.'
            : error.message;
      toast({ title: 'Publish Toggle Failed', description: message, variant: 'destructive' });
    },
  });
}

export function useHandlePendingListingRemoval(companyId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, action }: { listingId: string; action: 'confirm' | 'keep_live' }) => {
      const { error } = await supabase.rpc('handle_pending_listing_removal' as never, {
        p_listing_id: listingId,
        p_action: action,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'managed-listings', companyId] });
      queryClient.invalidateQueries({ queryKey: ['operational-alerts', companyId] });
      toast({ title: variables.action === 'confirm' ? 'Listing removed' : 'Listing restored', description: variables.action === 'confirm' ? 'The listing has been archived.' : 'The override was logged and the listing is live again.' });
    },
    onError: (error: Error) => toast({ title: 'Listing update failed', description: error.message, variant: 'destructive' }),
  });
}

export function useModerationCases(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'moderation-cases', companyId],
    queryFn: async () => {
      if (!companyId) return [] as ModerationCase[];

      const { data, error } = await supabase
        .from('moderation_cases' as never)
        .select('id, entity_type, entity_id, reason_code, severity, state, queue, assigned_moderator, resolved_by, resolved_at, resolution_notes, opened_at, closed_at, created_at, updated_at')
        .eq('company_id', companyId)
        .order('opened_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []) as ModerationCase[];
    },
    enabled: !!companyId,
  });
}

export function useUpdateModerationCaseState(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      state,
      assignedModerator,
      resolutionNotes,
    }: {
      caseId: string;
      state: ModerationCase['state'];
      assignedModerator?: string | null;
      resolutionNotes?: string;
    }) => {
      const now = new Date().toISOString();
      const shouldClose = state === 'resolved' || state === 'dismissed';
      const updatePayload: {
        state: ModerationCase['state'];
        resolution_notes: string | null;
        closed_at: string | null;
        assigned_moderator?: string | null;
      } = {
        state,
        resolution_notes: resolutionNotes ?? null,
        closed_at: shouldClose ? now : null,
      };

      if (assignedModerator !== undefined) {
        updatePayload.assigned_moderator = assignedModerator;
      }

      const { data, error } = await supabase
        .from('moderation_cases' as never)
        .update(updatePayload as never)
        .eq('id', caseId)
        .select('id, state')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'moderation-cases', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-moderation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-moderation-history'] });
      toast({ title: 'Moderation Updated', description: 'Case state updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Moderation Update Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function usePublisherVerification(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'publisher-verification', companyId],
    queryFn: async () => {
      if (!companyId) return null as PublisherVerification | null;

      const { data, error } = await supabase
        .from('publisher_verifications')
        .select('id, company_id, state, verified_by, verified_at, rejection_reason, last_submitted_at, created_at, updated_at')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return (data || null) as PublisherVerification | null;
    },
    enabled: !!companyId,
  });
}

export function useVerificationDocuments(verificationId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'verification-documents', verificationId],
    queryFn: async () => {
      if (!verificationId) return [] as VerificationDocument[];

      const { data, error } = await supabase
        .from('verification_documents')
        .select('id, verification_id, document_type, storage_path, state, reviewed_by, reviewed_at, rejection_reason, created_at')
        .eq('verification_id', verificationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VerificationDocument[];
    },
    enabled: !!verificationId,
  });
}

export function useSubmitPublisherVerification(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Active company is required');

      const { data: existing, error: existingError } = await supabase
        .from('publisher_verifications')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (existingError) throw existingError;

      const payload = {
        state: 'pending' as const,
        rejection_reason: null,
        last_submitted_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { data, error } = await supabase
          .from('publisher_verifications')
          .update(payload)
          .eq('id', existing.id)
          .select('id, company_id, state, verified_by, verified_at, rejection_reason, last_submitted_at, created_at, updated_at')
          .single();
        if (error) throw error;
        return data as PublisherVerification;
      }

      const { data, error } = await supabase
        .from('publisher_verifications')
        .insert({
          company_id: companyId,
          state: 'pending',
          last_submitted_at: new Date().toISOString(),
        })
        .select('id, company_id, state, verified_by, verified_at, rejection_reason, last_submitted_at, created_at, updated_at')
        .single();

      if (error) throw error;
      return data as PublisherVerification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'publisher-verification', companyId] });
      toast({ title: 'Verification Submitted', description: 'Publisher verification has been submitted for review.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Verification Submit Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddVerificationDocument(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      verificationId,
      documentType,
      storagePath,
    }: {
      verificationId: string;
      documentType: VerificationDocument['document_type'];
      storagePath: string;
    }) => {
      if (!companyId) throw new Error('Active company is required');

      const { data, error } = await supabase
        .from('verification_documents')
        .insert({
          verification_id: verificationId,
          document_type: documentType,
          storage_path: storagePath,
          state: 'pending',
        })
        .select('id, verification_id, document_type, storage_path, state, reviewed_by, reviewed_at, rejection_reason, created_at')
        .single();

      if (error) throw error;
      return data as VerificationDocument;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'verification-documents', variables.verificationId] });
      toast({ title: 'Document Added', description: 'Verification document has been attached.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Document Add Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useIsInternalMarketplaceReviewer(userId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'is-internal-reviewer', userId || 'anonymous'],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('is_internal_marketplace_reviewer' as never, {
        _user_id: userId,
      } as never);

      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!userId,
  });
}

export function useReviewerPublisherVerificationQueue(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'reviewer-publisher-queue', companyId || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('publisher_verifications')
        .select('id, company_id, state, last_submitted_at, rejection_reason, verified_by, verified_at, companies:company_id(name)')
        .in('state', ['pending', 'needs_review'])
        .order('last_submitted_at', { ascending: true })
        .limit(300);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as Array<Record<string, unknown>>).map((row) => {
        const company = row.companies as { name?: string } | null;
        return {
          id: String(row.id),
          company_id: String(row.company_id),
          company_name: company?.name || 'Unknown company',
          state: row.state as PublisherVerification['state'],
          last_submitted_at: String(row.last_submitted_at),
          rejection_reason: (row.rejection_reason as string | null) || null,
          verified_by: (row.verified_by as string | null) || null,
          verified_at: (row.verified_at as string | null) || null,
        };
      }) as ReviewerPublisherVerificationQueueItem[];
    },
  });
}

export function useReviewerModerationCaseQueue(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'reviewer-moderation-queue', companyId || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('moderation_cases' as never)
        .select('id, company_id, entity_type, entity_id, reason_code, severity, state, queue, assigned_moderator, resolved_by, resolved_at, resolution_notes, opened_at, closed_at, created_at, updated_at, companies:company_id(name)')
        .in('state', ['open', 'in_review'])
        .order('opened_at', { ascending: true })
        .limit(300);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as Array<Record<string, unknown>>).map((row) => {
        const company = row.companies as { name?: string } | null;
        return {
          ...row,
          company_id: String(row.company_id),
          company_name: company?.name || 'Unknown company',
        };
      }) as ReviewerModerationCaseQueueItem[];
    },
  });
}

export function useReviewerModerationCaseHistory(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'reviewer-moderation-history', companyId || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('moderation_cases' as never)
        .select('id, company_id, entity_type, entity_id, reason_code, severity, state, queue, assigned_moderator, resolved_by, resolved_at, resolution_notes, opened_at, closed_at, created_at, updated_at, companies:company_id(name)')
        .in('state', ['resolved', 'dismissed'])
        .not('resolved_at', 'is', null)
        .order('resolved_at', { ascending: false })
        .limit(200);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as Array<Record<string, unknown>>).map((row) => {
        const company = row.companies as { name?: string } | null;
        return {
          ...row,
          company_id: String(row.company_id),
          company_name: company?.name || 'Unknown company',
        };
      }) as ReviewerModerationCaseHistoryItem[];
    },
  });
}

export function useReviewerVerificationDocumentQueue(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'reviewer-document-queue', companyId || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('verification_documents')
        .select('id, verification_id, document_type, storage_path, state, rejection_reason, created_at, reviewed_by, reviewed_at, publisher_verifications!inner(company_id, companies:company_id(name))')
        .eq('state', 'pending')
        .order('created_at', { ascending: true })
        .limit(500);

      if (companyId) {
        query = query.eq('publisher_verifications.company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as Array<Record<string, unknown>>).map((row) => {
        const pv = row.publisher_verifications as { company_id?: string; companies?: { name?: string } | null } | null;
        return {
          id: String(row.id),
          verification_id: String(row.verification_id),
          company_id: String(pv?.company_id || ''),
          company_name: pv?.companies?.name || 'Unknown company',
          document_type: row.document_type as VerificationDocument['document_type'],
          storage_path: String(row.storage_path),
          state: row.state as VerificationDocument['state'],
          rejection_reason: (row.rejection_reason as string | null) || null,
          created_at: String(row.created_at),
          reviewed_by: (row.reviewed_by as string | null) || null,
          reviewed_at: (row.reviewed_at as string | null) || null,
        };
      }) as ReviewerVerificationDocumentQueueItem[];
    },
  });
}

export function useReviewerPublisherDecisionHistory(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'reviewer-publisher-history', companyId || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('publisher_verifications')
        .select('id, company_id, state, verified_by, verified_at, rejection_reason, companies:company_id(name)')
        .in('state', ['verified', 'rejected', 'needs_review'])
        .not('verified_at', 'is', null)
        .order('verified_at', { ascending: false })
        .limit(150);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as Array<Record<string, unknown>>).map((row) => {
        const company = row.companies as { name?: string } | null;
        return {
          id: String(row.id),
          company_id: String(row.company_id),
          company_name: company?.name || 'Unknown company',
          state: row.state as Exclude<PublisherVerification['state'], 'pending'>,
          reviewed_by: (row.verified_by as string | null) || null,
          reviewed_at: String(row.verified_at),
          rejection_reason: (row.rejection_reason as string | null) || null,
        };
      }) as ReviewerPublisherDecisionHistoryItem[];
    },
  });
}

export function useReviewerVerificationDocumentHistory(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace', 'reviewer-document-history', companyId || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('verification_documents')
        .select('id, verification_id, document_type, state, reviewed_by, reviewed_at, rejection_reason, publisher_verifications!inner(company_id, companies:company_id(name))')
        .in('state', ['approved', 'rejected'])
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(200);

      if (companyId) {
        query = query.eq('publisher_verifications.company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as Array<Record<string, unknown>>).map((row) => {
        const pv = row.publisher_verifications as { company_id?: string; companies?: { name?: string } | null } | null;
        return {
          id: String(row.id),
          verification_id: String(row.verification_id),
          company_id: String(pv?.company_id || ''),
          company_name: pv?.companies?.name || 'Unknown company',
          document_type: row.document_type as VerificationDocument['document_type'],
          state: row.state as Exclude<VerificationDocument['state'], 'pending'>,
          reviewed_by: (row.reviewed_by as string | null) || null,
          reviewed_at: String(row.reviewed_at),
          rejection_reason: (row.rejection_reason as string | null) || null,
        };
      }) as ReviewerVerificationDocumentHistoryItem[];
    },
  });
}

export function useReviewerProfiles(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const key = uniqueIds.slice().sort().join(',');

  return useQuery({
    queryKey: ['marketplace', 'reviewer-profiles', key],
    queryFn: async () => {
      if (uniqueIds.length === 0) return [] as ReviewerProfile[];

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', uniqueIds);

      if (error) throw error;
      return (data || []) as ReviewerProfile[];
    },
    enabled: uniqueIds.length > 0,
  });
}

export function useReviewerDecisionOnPublisherVerification(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      verificationId,
      state,
      rejectionReason,
      companyId: actionCompanyId,
    }: {
      verificationId: string;
      state: PublisherVerification['state'];
      rejectionReason?: string | null;
      companyId?: string | null;
    }) => {
      return applyPublisherVerificationDecision<PublisherVerification>(supabase as never, {
        verificationId,
        state,
        rejectionReason,
        companyId: actionCompanyId || companyId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'publisher-verification', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-publisher-queue'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-publisher-history'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-document-history'] });
      toast({ title: 'Verification Reviewed', description: 'Publisher verification decision saved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Decision Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReviewerDecisionOnVerificationDocument(verificationId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      state,
      rejectionReason,
      verificationId: actionVerificationId,
    }: {
      documentId: string;
      state: VerificationDocument['state'];
      rejectionReason?: string | null;
      verificationId?: string | null;
    }) => {
      return applyVerificationDocumentDecision<VerificationDocument>(supabase as never, {
        documentId,
        state,
        rejectionReason,
        verificationId: actionVerificationId || verificationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'verification-documents', verificationId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-document-queue'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-document-history'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'reviewer-publisher-history'] });
      toast({ title: 'Document Reviewed', description: 'Document review decision saved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Document Decision Failed', description: error.message, variant: 'destructive' });
    },
  });
}
