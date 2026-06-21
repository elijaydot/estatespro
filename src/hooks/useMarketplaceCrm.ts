import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface CrmAccount {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  website: string | null;
  owner_user_id: string | null;
  annual_revenue: number | null;
  account_type: string | null;
  created_at: string;
}

export interface CrmDeal {
  id: string;
  company_id: string;
  lead_id: string | null;
  account_id: string | null;
  contact_id: string | null;
  listing_id: string | null;
  unit_id: string | null;
  deal_name: string;
  amount: number | null;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  owner_user_id: string | null;
  created_at: string;
}

export interface CrmMeeting {
  id: string;
  company_id: string;
  title: string;
  related_type: string;
  related_id: string | null;
  host_user_id: string | null;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'done' | 'canceled';
  notes: string | null;
  created_at: string;
}

export interface CrmCall {
  id: string;
  company_id: string;
  subject: string;
  call_type: 'inbound' | 'outbound';
  related_type: string;
  related_id: string | null;
  contact_name: string | null;
  owner_user_id: string | null;
  started_at: string;
  duration_minutes: number;
  result: string | null;
  created_at: string;
}

export interface CrmCampaign {
  id: string;
  company_id: string;
  name: string;
  channel: string;
  status: string;
  budget_amount: number | null;
  spend_amount: number | null;
  starts_on: string | null;
  ends_on: string | null;
  open_rate: number | null;
  click_rate: number | null;
  bounce_rate: number | null;
  created_at: string;
}

export interface CrmDocument {
  id: string;
  company_id: string;
  related_type: string;
  related_id: string | null;
  title: string;
  storage_path: string;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface CrmVisit {
  id: string;
  company_id: string;
  related_type: string;
  related_id: string | null;
  locality: string | null;
  address_text: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'canceled';
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_at: string | null;
  proof_path: string | null;
  outcome: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CrmProject {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: 'planned' | 'active' | 'on_hold' | 'completed' | 'canceled';
  owner_user_id: string | null;
  due_date: string | null;
  progress_percent: number;
  created_at: string;
}

export interface CrmContact {
  id: string;
  lead_id: string;
  full_name: string;
  email: string | null;
  phone_e164: string;
  preferred_channel: string | null;
  created_at: string;
}

export interface CrmReportDefinition {
  id: string;
  folder: string;
  name: string;
  description: string;
}

export interface CrmTask {
  id: string;
  lead_id: string;
  task_type: string;
  owner_user_id: string;
  due_at: string;
  status: 'open' | 'done' | 'canceled';
  notes: string | null;
  created_at: string;
}

export interface CrmDealStageHistory {
  id: string;
  deal_id: string;
  company_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  changed_at: string;
}

export interface CrmTrustFlag {
  id: string;
  company_id: string;
  entity_type: 'company' | 'listing' | 'lead' | 'deal';
  entity_id: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  state: 'active' | 'cleared';
  source: 'verification' | 'moderation';
  source_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CrmDealHandoff {
  id: string;
  deal_id: string;
  company_id: string;
  status: 'pending' | 'requires_input' | 'ready' | 'in_progress' | 'completed' | 'failed';
  checklist_json: Record<string, unknown>;
  readiness_notes: string | null;
  tenant_id: string | null;
  lease_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmMarketplaceFunnelMetric {
  company_id: string;
  company_name: string;
  inquiries_30d: number;
  leads_open: number;
  deals_open: number;
  deals_won_30d: number;
  inquiry_to_won_rate_pct: number;
}

export interface CrmAutomationRule {
  id: string;
  company_id: string;
  name: string;
  event_type: string;
  conditions_json: Record<string, unknown>;
  actions_json: Array<Record<string, unknown>>;
  retry_limit: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmAutomationRun {
  id: string;
  rule_id: string;
  company_id: string;
  event_type: string;
  event_source_type: string;
  event_source_id: string | null;
  correlation_id: string | null;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  attempts: number;
  max_attempts: number;
  payload_json: Record<string, unknown>;
  result_json: Record<string, unknown>;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadContactRow {
  id: string;
  lead_id: string;
  full_name: string;
  email: string | null;
  phone_e164: string;
  preferred_channel: string | null;
  created_at: string;
}

interface LeadTaskRow {
  id: string;
  lead_id: string;
  task_type: string;
  owner_user_id: string;
  due_at: string;
  status: 'open' | 'done' | 'canceled';
  notes: string | null;
  created_at: string;
}

const REPORT_LIBRARY: CrmReportDefinition[] = [
  { id: 'email-top-click', folder: 'Email Reports', name: 'Top 10 Templates by Click Rate', description: 'Top templates by click-through rate.' },
  { id: 'email-top-open', folder: 'Email Reports', name: 'Top 10 Templates by Open Rate', description: 'Top templates by open rate.' },
  { id: 'email-activity', folder: 'Email Reports', name: 'Email and Activities Analytics Report', description: 'Emails sent/replied with cross-channel activity.' },
  { id: 'email-call', folder: 'Email Reports', name: 'Email and Call Analytics Report', description: 'Combined email and call engagement report.' },
  { id: 'email-top-users', folder: 'Email Reports', name: 'Top 10 Users', description: 'Top users by outbound email activity.' },
  { id: 'email-analytics', folder: 'Email Reports', name: 'Email Analytics', description: 'Summary of sent, opened, clicked, and bounced emails.' },
  { id: 'email-bounce', folder: 'Email Reports', name: 'Bounce Report', description: 'Email bounce reasons and trends.' },
  { id: 'meeting-plan-vs-realized', folder: 'Meeting Reports', name: 'Planned Vs Realized Meetings this Month', description: 'Planned meetings versus completed check-ins.' },
  { id: 'checkins-salesperson', folder: 'Meeting Reports', name: 'Number of Check-Ins by Salesperson', description: 'Monthly check-ins by team member.' },
  { id: 'checkins-locality', folder: 'Meeting Reports', name: 'Number of Check-Ins by Locality', description: 'Monthly check-ins grouped by locality.' },
  { id: 'contact-mailing-list', folder: 'Account and Contact Reports', name: 'Contact Mailing List', description: 'Current contact mailing roster.' },
  { id: 'deals-closing-month', folder: 'Deal and Revenue Reports', name: 'Deals Closing This Month', description: 'Deals with close dates in the current month.' },
  { id: 'verification-aging', folder: 'Trust and Risk Reports', name: 'Verification Queue Aging', description: 'How long publisher verification items stay pending.' },
  { id: 'inquiry-to-won-30d', folder: 'Deal and Revenue Reports', name: 'Inquiry to Won (30 days)', description: '30-day inquiry-to-won conversion by company.' },
  { id: 'trust-flag-load', folder: 'Trust and Risk Reports', name: 'Active Trust Flags', description: 'Count and severity of active trust flags from verification/moderation.' },
  { id: 'closed-won-handoff', folder: 'Operations Reports', name: 'Closed-Won Handoff Readiness', description: 'Deals marked closed won and handoff completion status.' },
];

function useCompanyTableQuery<T>(key: string, table: string, companyId?: string | null, select = '*') {
  return useQuery({
    queryKey: ['marketplace-crm', key, companyId],
    queryFn: async () => {
      if (!companyId) return [] as T[];
      const { data, error } = await supabase.from(table as never).select(select as never).eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!companyId,
  });
}

export function useCrmContacts(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'contacts', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmContact[];
      const { data, error } = await supabase
        .from('lead_contacts')
        .select('id, lead_id, full_name, email, phone_e164, preferred_channel, created_at, leads!inner(company_id)')
        .eq('leads.company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => {
        const typedRow = row as LeadContactRow;
        return {
          id: typedRow.id,
          lead_id: typedRow.lead_id,
          full_name: typedRow.full_name,
          email: typedRow.email,
          phone_e164: typedRow.phone_e164,
          preferred_channel: typedRow.preferred_channel,
          created_at: typedRow.created_at,
        };
      }) as CrmContact[];
    },
    enabled: !!companyId,
  });
}

export function useCrmAccounts(companyId?: string | null) {
  return useCompanyTableQuery<CrmAccount>('accounts', 'crm_accounts', companyId, 'id, company_id, name, phone, website, owner_user_id, annual_revenue, account_type, created_at');
}

export function useCrmDeals(companyId?: string | null) {
  return useCompanyTableQuery<CrmDeal>('deals', 'crm_deals', companyId, 'id, company_id, lead_id, account_id, contact_id, listing_id, unit_id, deal_name, amount, currency, stage, probability, expected_close_date, owner_user_id, created_at');
}

export function useCrmMeetings(companyId?: string | null) {
  return useCompanyTableQuery<CrmMeeting>('meetings', 'crm_meetings', companyId, 'id, company_id, title, related_type, related_id, host_user_id, starts_at, ends_at, status, notes, created_at');
}

export function useCrmCalls(companyId?: string | null) {
  return useCompanyTableQuery<CrmCall>('calls', 'crm_calls', companyId, 'id, company_id, subject, call_type, related_type, related_id, contact_name, owner_user_id, started_at, duration_minutes, result, created_at');
}

export function useCrmCampaigns(companyId?: string | null) {
  return useCompanyTableQuery<CrmCampaign>('campaigns', 'crm_campaigns', companyId, 'id, company_id, name, channel, status, budget_amount, spend_amount, starts_on, ends_on, open_rate, click_rate, bounce_rate, created_at');
}

export function useCrmDocuments(companyId?: string | null) {
  return useCompanyTableQuery<CrmDocument>('documents', 'crm_documents', companyId, 'id, company_id, related_type, related_id, title, storage_path, mime_type, uploaded_by, created_at');
}

export function useCrmVisits(companyId?: string | null) {
  return useCompanyTableQuery<CrmVisit>('visits', 'crm_visits', companyId, 'id, company_id, related_type, related_id, locality, address_text, status, check_in_at, check_in_lat, check_in_lng, check_out_at, proof_path, outcome, notes, created_by, created_at');
}

export function useCrmProjects(companyId?: string | null) {
  return useCompanyTableQuery<CrmProject>('projects', 'crm_projects', companyId, 'id, company_id, name, description, status, owner_user_id, due_date, progress_percent, created_at');
}

export function useCrmReportLibrary() {
  return useQuery({
    queryKey: ['marketplace-crm', 'report-library'],
    queryFn: async () => REPORT_LIBRARY,
  });
}

export function useCrmDealStageHistory(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'deal-stage-history', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmDealStageHistory[];

      const { data, error } = await supabase
        .from('crm_deal_stage_history')
        .select('id, deal_id, company_id, from_stage, to_stage, changed_by, reason, metadata, changed_at')
        .eq('company_id', companyId)
        .order('changed_at', { ascending: false })
        .limit(150);

      if (error) throw error;

      return (data || []).map((row) => ({
        ...(row as Omit<CrmDealStageHistory, 'metadata'>),
        metadata: row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : {},
      })) as CrmDealStageHistory[];
    },
    enabled: !!companyId,
  });
}

export function useCrmTrustFlags(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'trust-flags', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmTrustFlag[];

      const { data, error } = await supabase
        .from('crm_trust_flags')
        .select('id, company_id, entity_type, entity_id, severity, state, source, source_id, reason, metadata, created_at, updated_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      return (data || []).map((row) => ({
        ...(row as Omit<CrmTrustFlag, 'metadata'>),
        metadata: row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : {},
      })) as CrmTrustFlag[];
    },
    enabled: !!companyId,
  });
}

export function useCrmDealHandoffs(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'deal-handoffs', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmDealHandoff[];

      const { data, error } = await supabase
        .from('crm_deal_handoffs')
        .select('id, deal_id, company_id, status, checklist_json, readiness_notes, tenant_id, lease_id, started_at, completed_at, created_at, updated_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(150);

      if (error) throw error;

      return (data || []).map((row) => ({
        ...(row as Omit<CrmDealHandoff, 'checklist_json'>),
        checklist_json: row.checklist_json && typeof row.checklist_json === 'object'
          ? (row.checklist_json as Record<string, unknown>)
          : {},
      })) as CrmDealHandoff[];
    },
    enabled: !!companyId,
  });
}

export function useCrmMarketplaceFunnelMetrics(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'funnel-metrics', companyId],
    queryFn: async () => {
      if (!companyId) return null as CrmMarketplaceFunnelMetric | null;

      const { data, error } = await supabase
        .from('crm_marketplace_funnel_metrics')
        .select('company_id, company_name, inquiries_30d, leads_open, deals_open, deals_won_30d, inquiry_to_won_rate_pct')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return (data as CrmMarketplaceFunnelMetric | null) || null;
    },
    enabled: !!companyId,
  });
}

export function useCrmTasks(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'tasks', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmTask[];
      const { data, error } = await supabase
        .from('lead_tasks')
        .select('id, lead_id, task_type, owner_user_id, due_at, status, notes, created_at, leads!inner(company_id)')
        .eq('leads.company_id', companyId)
        .order('due_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => {
        const typedRow = row as LeadTaskRow;
        return {
          id: typedRow.id,
          lead_id: typedRow.lead_id,
          task_type: typedRow.task_type,
          owner_user_id: typedRow.owner_user_id,
          due_at: typedRow.due_at,
          status: typedRow.status,
          notes: typedRow.notes,
          created_at: typedRow.created_at,
        };
      }) as CrmTask[];
    },
    enabled: !!companyId,
  });
}

export function useCrmAutomationRules(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'automation-rules', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmAutomationRule[];

      const { data, error } = await supabase
        .from('crm_automation_rules' as never)
        .select('id, company_id, name, event_type, conditions_json, actions_json, retry_limit, is_active, created_by, created_at, updated_at' as never)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => {
        const typed = row as Omit<CrmAutomationRule, 'conditions_json' | 'actions_json'> & {
          conditions_json: unknown;
          actions_json: unknown;
        };

        return {
          ...typed,
          conditions_json: typed.conditions_json && typeof typed.conditions_json === 'object'
            ? (typed.conditions_json as Record<string, unknown>)
            : {},
          actions_json: Array.isArray(typed.actions_json)
            ? (typed.actions_json as Array<Record<string, unknown>>)
            : [],
        };
      }) as CrmAutomationRule[];
    },
    enabled: !!companyId,
  });
}

export function useCrmAutomationRuns(companyId?: string | null) {
  return useQuery({
    queryKey: ['marketplace-crm', 'automation-runs', companyId],
    queryFn: async () => {
      if (!companyId) return [] as CrmAutomationRun[];

      const { data, error } = await supabase
        .from('crm_automation_runs' as never)
        .select('id, rule_id, company_id, event_type, event_source_type, event_source_id, correlation_id, status, attempts, max_attempts, payload_json, result_json, last_error, next_retry_at, created_at, updated_at' as never)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      return (data || []).map((row) => {
        const typed = row as Omit<CrmAutomationRun, 'payload_json' | 'result_json'> & {
          payload_json: unknown;
          result_json: unknown;
        };

        return {
          ...typed,
          payload_json: typed.payload_json && typeof typed.payload_json === 'object'
            ? (typed.payload_json as Record<string, unknown>)
            : {},
          result_json: typed.result_json && typeof typed.result_json === 'object'
            ? (typed.result_json as Record<string, unknown>)
            : {},
        };
      }) as CrmAutomationRun[];
    },
    enabled: !!companyId,
  });
}

function buildCreateMutation<TInput extends Record<string, unknown>>(table: string, key: string) {
  return function useCreateEntity(companyId?: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (payload: TInput) => {
        if (!companyId) throw new Error('Active company is required');
        const { data, error } = await supabase.from(table as never).insert({ ...payload, company_id: companyId } as never).select('*').single();
        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['marketplace-crm', key, companyId] });
        toast({ title: 'Saved', description: 'Record created successfully.' });
      },
      onError: (error: Error) => {
        toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      },
    });
  };
}

function buildUpdateMutation<TInput extends Record<string, unknown>>(table: string, key: string) {
  return function useUpdateEntity(companyId?: string | null) {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, payload }: { id: string; payload: TInput }) => {
        if (!companyId) throw new Error('Active company is required');
        const { data, error } = await supabase
          .from(table as never)
          .update(payload as never)
          .eq('id', id)
          .eq('company_id', companyId)
          .select('*')
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['marketplace-crm', key, companyId] });
        toast({ title: 'Saved', description: 'Record updated successfully.' });
      },
      onError: (error: Error) => {
        toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
      },
    });
  };
}

export const useCreateCrmAccount = buildCreateMutation<Record<string, unknown>>('crm_accounts', 'accounts');
export const useCreateCrmDeal = buildCreateMutation<Record<string, unknown>>('crm_deals', 'deals');
export const useCreateCrmMeeting = buildCreateMutation<Record<string, unknown>>('crm_meetings', 'meetings');
export const useCreateCrmCall = buildCreateMutation<Record<string, unknown>>('crm_calls', 'calls');
export const useCreateCrmCampaign = buildCreateMutation<Record<string, unknown>>('crm_campaigns', 'campaigns');
export const useCreateCrmDocument = buildCreateMutation<Record<string, unknown>>('crm_documents', 'documents');
export const useCreateCrmVisit = buildCreateMutation<Record<string, unknown>>('crm_visits', 'visits');
export const useCreateCrmProject = buildCreateMutation<Record<string, unknown>>('crm_projects', 'projects');
export const useUpdateCrmAccount = buildUpdateMutation<Record<string, unknown>>('crm_accounts', 'accounts');
export const useUpdateCrmDeal = buildUpdateMutation<Record<string, unknown>>('crm_deals', 'deals');

export function useTransitionCrmDealStage(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      stage,
      probability,
      amount,
      accountId,
      contactId,
      leadId,
      listingId,
      unitId,
    }: {
      dealId: string;
      stage: string;
      probability: number;
      amount?: number | null;
      accountId?: string | null;
      contactId?: string | null;
      leadId?: string | null;
      listingId?: string | null;
      unitId?: string | null;
    }) => {
      if (!companyId) throw new Error('Active company is required');

      const payload: Record<string, unknown> = {
        stage,
        probability,
      };

      if (amount !== undefined) payload.amount = amount;
      if (accountId !== undefined) payload.account_id = accountId;
      if (contactId !== undefined) payload.contact_id = contactId;
      if (leadId !== undefined) payload.lead_id = leadId;
      if (listingId !== undefined) payload.listing_id = listingId;
      if (unitId !== undefined) payload.unit_id = unitId;

      const { data, error } = await supabase
        .from('crm_deals')
        .update(payload)
        .eq('id', dealId)
        .eq('company_id', companyId)
        .select('id, company_id, lead_id, account_id, contact_id, listing_id, unit_id, deal_name, amount, currency, stage, probability, expected_close_date, owner_user_id, created_at')
        .single();

      if (error) throw error;
      return data as CrmDeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'deals', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'deal-stage-history', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'deal-handoffs', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'tasks', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'funnel-metrics', companyId] });
      toast({ title: 'Deal Updated', description: 'Stage transition applied successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Stage Transition Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCrmTaskStatus(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: CrmTask['status'] }) => {
      if (!companyId) throw new Error('Active company is required');

      const { data, error } = await supabase
        .from('lead_tasks')
        .update({
          status,
          completed_at: status === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .select('id, lead_id, task_type, owner_user_id, due_at, status, notes, created_at')
        .single();

      if (error) throw error;
      return data as CrmTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'tasks', companyId] });
      toast({ title: 'Task Updated', description: 'Task status updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Task Update Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCrmMeetingStatus(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId, status, notes }: { meetingId: string; status: CrmMeeting['status']; notes?: string | null }) => {
      if (!companyId) throw new Error('Active company is required');

      const payload: Record<string, unknown> = { status };
      if (notes !== undefined) payload.notes = notes;

      const { data, error } = await supabase
        .from('crm_meetings')
        .update(payload)
        .eq('id', meetingId)
        .eq('company_id', companyId)
        .select('id, company_id, title, related_type, related_id, host_user_id, starts_at, ends_at, status, notes, created_at')
        .single();

      if (error) throw error;
      return data as CrmMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'meetings', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'tasks', companyId] });
      toast({ title: 'Meeting Updated', description: 'Meeting disposition saved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Meeting Update Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCrmVisit(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, payload }: { visitId: string; payload: Partial<CrmVisit> }) => {
      if (!companyId) throw new Error('Active company is required');

      const { data, error } = await supabase
        .from('crm_visits')
        .update(payload)
        .eq('id', visitId)
        .eq('company_id', companyId)
        .select('id, company_id, related_type, related_id, locality, address_text, status, check_in_at, check_in_lat, check_in_lng, check_out_at, proof_path, outcome, notes, created_by, created_at')
        .single();

      if (error) throw error;
      return data as CrmVisit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'visits', companyId] });
      toast({ title: 'Visit Updated', description: 'Visit workflow status saved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Visit Update Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useStartCrmDealHandoff(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ handoffId }: { handoffId: string }) => {
      const { data, error } = await supabase.rpc('start_crm_deal_handoff' as never, {
        p_handoff_id: handoffId,
      } as never);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'deal-handoffs', companyId] });
      toast({ title: 'Handoff Started', description: 'Deal handoff moved to in-progress.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Handoff Start Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCompleteCrmDealHandoff(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      handoffId,
      tenantName,
      tenantEmail,
      tenantPhone,
      leaseStart,
      leaseEnd,
      monthlyRent,
      securityDeposit,
    }: {
      handoffId: string;
      tenantName: string;
      tenantEmail: string;
      tenantPhone: string;
      leaseStart: string;
      leaseEnd: string;
      monthlyRent: number;
      securityDeposit?: number;
    }) => {
      const { data, error } = await supabase.rpc('crm_complete_handoff' as never, {
        p_handoff_id: handoffId,
        p_tenant_name: tenantName,
        p_tenant_email: tenantEmail,
        p_tenant_phone: tenantPhone,
        p_lease_start: leaseStart,
        p_lease_end: leaseEnd,
        p_monthly_rent: monthlyRent,
        p_security_deposit: securityDeposit || 0,
      } as never);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'deal-handoffs', companyId] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-crm', 'deals', companyId] });
      toast({ title: 'Handoff Completed', description: 'Tenant and lease draft were created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Handoff Completion Failed', description: error.message, variant: 'destructive' });
    },
  });
}
